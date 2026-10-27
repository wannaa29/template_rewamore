import unicodedata

from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.views import LoginView
from django.core.cache import cache
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.urls import reverse
from django.views.csrf import csrf_failure as default_csrf_failure
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET

from .views import rate_limit_key


LOGIN_FAILURE_LIMIT = 10
LOGIN_FAILURE_WINDOW = 300
INVALID_LOGIN_MESSAGE = 'Nama pengguna atau kata sandi belum sesuai. Silakan periksa kembali.'


def wants_json(request):
    return 'application/json' in request.headers.get('Accept', '')


@never_cache
@require_GET
def csrf_token(request):
    # get_token masks the existing browser secret; it does not rotate it.
    # Same-origin JS can refresh a stale form without exposing a token in a URL.
    return JsonResponse({'csrfToken': get_token(request)})


@never_cache
def csrf_failure(request, reason=''):
    if request.path != reverse('login'):
        return default_csrf_failure(request, reason=reason)

    # A fresh token cannot repair an untrusted Origin/Referer. Keep those
    # requests rejected, and let only token/cookie failures request one retry.
    retryable = reason.startswith(('CSRF cookie', 'CSRF token', 'CSRFToken from'))
    message = (
        'Sesi formulir telah diperbarui. Silakan masukkan kata sandi dan coba masuk kembali. '
        'Pastikan cookie situs diizinkan.' if retryable else
        'Alamat asal login tidak sesuai. Buka kembali halaman login pada alamat situs '
        'yang benar. Hubungi pengelola jika masalah berlanjut.'
    )
    if wants_json(request):
        return JsonResponse({'code': 'csrf_failed', 'retryable': retryable,
                             'message': message}, status=403)
    # The rejected POST is never authenticated or replayed server-side.
    # Return an unbound form so passwords never enter the response HTML.
    return render(request, 'registration/login.html', {
        'form': AuthenticationForm(request=request, initial={
            'username': request.POST.get('username', ''),
        }),
        'next': request.POST.get('next', ''),
        'login_error': message,
    }, status=403)


class StudioLoginView(LoginView):
    template_name = "registration/login.html"
    redirect_authenticated_user = True

    def post(self, request, *args, **kwargs):
        # A shared Wi-Fi/proxy must not share a single login quota. Successful
        # logins never consume it, including the same account on many devices.
        username = unicodedata.normalize('NFKC', request.POST.get('username', '').strip()).casefold()
        self.failure_key = rate_limit_key(request, f'login-failures:{username}')
        if cache.get(self.failure_key, 0) >= LOGIN_FAILURE_LIMIT:
            message = 'Terlalu banyak percobaan gagal untuk akun ini. Silakan coba lagi dalam lima menit.'
            if wants_json(request):
                response = JsonResponse({'message': message}, status=429)
            else:
                response = self.render_to_response(self.get_context_data(
                    form=self.get_form(), login_error=message,
                ), status=429)
            response['Retry-After'] = str(LOGIN_FAILURE_WINDOW)
            return response
        return super().post(request, *args, **kwargs)

    def form_invalid(self, form):
        if not cache.add(self.failure_key, 1, LOGIN_FAILURE_WINDOW):
            try:
                cache.incr(self.failure_key)
            except ValueError:
                # The cache entry may have expired between add and incr.
                cache.set(self.failure_key, 1, LOGIN_FAILURE_WINDOW)
        if wants_json(self.request):
            return JsonResponse({'message': INVALID_LOGIN_MESSAGE}, status=400)
        return super().form_invalid(form)

    def form_valid(self, form):
        response = super().form_valid(form)
        cache.delete(self.failure_key)
        if wants_json(self.request):
            # Reuse Django's validated next URL and normal session/token rotation.
            return JsonResponse({'redirect': response.url})
        return response

