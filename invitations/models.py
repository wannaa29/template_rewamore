import uuid
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.urls import reverse

from .validators import normalized_guest_name, validate_invitation_slug, validate_upload


def asset_path(instance, filename):
    return f"invitations/{instance.invitation_id}/{uuid.uuid4().hex}{Path(filename).suffix.lower()}"


class Theme(models.Model):
    slug = models.SlugField(unique=True, max_length=60)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    schema = models.JSONField(default=dict)
    preview_image = models.CharField(max_length=2048, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class Invitation(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draf"
        PUBLISHED = "published", "Terbit"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="invitations")
    theme = models.ForeignKey(Theme, on_delete=models.PROTECT, related_name="invitations")
    title = models.CharField(max_length=160)
    groom_name = models.CharField("Nama mempelai pria", max_length=100)
    bride_name = models.CharField("Nama mempelai wanita", max_length=100)
    slug = models.SlugField("Alamat undangan", unique=True, max_length=160, validators=[validate_invitation_slug])
    event_date = models.DateTimeField("Tanggal dan waktu acara utama", blank=True, null=True)
    content = models.JSONField(default=dict)
    sections = models.JSONField(default=dict)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-pk"]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse("invitations:public", kwargs={"slug": self.slug})

    def public_url(self, base_url=None):
        return (base_url if base_url is not None else settings.PUBLIC_BASE_URL).rstrip("/") + self.get_absolute_url()

    @property
    def is_published(self):
        return self.status == self.Status.PUBLISHED


class MediaAsset(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="invitation_assets")
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name="assets")
    file = models.FileField(upload_to=asset_path, max_length=250)
    kind = models.CharField(max_length=10, choices=[("image", "Gambar"), ("audio", "Audio"), ("video", "Video")])
    original_name = models.CharField(max_length=250)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.invitation_id and self.owner_id != self.invitation.owner_id:
            raise ValidationError("Pemilik berkas harus sama dengan pemilik undangan.")
        if self.file and not self.file._committed:
            validate_upload(self.file, self.kind)


class Guest(models.Model):
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name="guests")
    name = models.CharField(max_length=180)
    name_key = models.CharField(max_length=540, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["pk"]
        constraints = [models.UniqueConstraint(fields=["invitation", "name_key"], name="unique_guest_per_invitation")]

    def save(self, *args, **kwargs):
        self.name = normalized_guest_name(self.name)
        self.name_key = self.name.casefold()
        return super().save(*args, **kwargs)

    def invitation_url(self, base_url=None):
        return self.invitation.public_url(base_url) + "?to=" + quote(self.name, safe="")

    def __str__(self):
        return self.name


class Attendance(models.Model):
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name="responses")
    name = models.CharField(max_length=180)
    attendance = models.CharField(max_length=8, choices=[("yes", "Hadir"), ("no", "Tidak hadir"), ("maybe", "Belum pasti")])
    party_size = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(10)])
    message = models.TextField(blank=True, max_length=2000)
    publish_message = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name}: {self.get_attendance_display()}"

