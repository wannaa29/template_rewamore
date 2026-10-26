from django.contrib import admin
from .models import Attendance, Guest, Invitation, MediaAsset, Theme


@admin.register(Theme)
class ThemeAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    readonly_fields = ("schema",)


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "theme", "status", "updated_at")
    list_filter = ("status", "theme")
    search_fields = ("title", "slug", "owner__username")
    readonly_fields = ("content", "sections", "created_at", "updated_at")


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ("name", "invitation", "created_at")
    search_fields = ("name", "invitation__title")


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("name", "invitation", "attendance", "party_size", "publish_message", "created_at")
    list_filter = ("attendance", "publish_message")
    search_fields = ("name", "invitation__title")


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("original_name", "invitation", "kind", "created_at")
    readonly_fields = ("owner", "invitation", "file", "kind", "original_name", "created_at")

    def has_add_permission(self, request):
        return False

