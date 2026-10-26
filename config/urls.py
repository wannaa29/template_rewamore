from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth.views import LogoutView
from django.http import JsonResponse
from django.urls import include, path
from django.views.generic import RedirectView

from invitations.auth import StudioLoginView

def health(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('', RedirectView.as_view(pattern_name='invitations:dashboard', permanent=False)),
    path('health/', health, name='health'),
    path('admin/', admin.site.urls),
    path('accounts/login/', StudioLoginView.as_view(template_name='registration/login.html'), name='login'),
    path('accounts/logout/', LogoutView.as_view(), name='logout'),
    path('', include('invitations.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = 'Rewamore Administration'
admin.site.site_title = 'Rewamore'
admin.site.index_title = 'Pengelolaan studio undangan'
