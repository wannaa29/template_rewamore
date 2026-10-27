from django.urls import path
from . import views

app_name = "invitations"
urlpatterns = [
    path("dashboard/", views.dashboard, name="dashboard"),
    path("dashboard/themes/", views.themes, name="themes"),
    path("dashboard/themes/<slug:theme_slug>/preview/", views.theme_preview, name="theme_preview"),
    path("dashboard/themes/<slug:theme_slug>/edit-example/", views.edit_theme_example, name="edit_theme_example"),
    path("dashboard/themes/<slug:theme_slug>/create/", views.create, name="create"),
    path("dashboard/<int:pk>/edit/", views.edit, name="edit"),
    path("dashboard/<int:pk>/settings/", views.invitation_settings, name="settings"),
    path("dashboard/<int:pk>/guests/", views.guests, name="guests"),
    path("dashboard/<int:pk>/guests/export/", views.export_guests, name="export_guests"),
    path("dashboard/<int:pk>/publish/", views.publish, name="publish"),
    path("dashboard/<int:pk>/duplicate/", views.duplicate, name="duplicate"),
    path("dashboard/<int:pk>/delete/", views.delete, name="delete"),
    path("dashboard/<int:pk>/preview/", views.preview, name="preview"),
    path("<slug:slug>/rsvp/", views.rsvp, name="rsvp"),
    path("<slug:slug>/wishes/", views.wishes, name="wishes"),
    path("<slug:slug>/", views.public, name="public"),
]

