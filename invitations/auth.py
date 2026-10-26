from django.contrib.auth.views import LoginView
from django.http import HttpResponse
from .views import limited


class StudioLoginView(LoginView):
    template_name = "registration/login.html"
    redirect_authenticated_user = True

    def post(self, request, *args, **kwargs):
        if limited(request, "login", 10, 300):
            return HttpResponse("Terlalu banyak percobaan masuk. Silakan coba lagi dalam lima menit.", status=429)
        return super().post(request, *args, **kwargs)

