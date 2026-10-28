import re
from urllib.parse import urlsplit

from django import forms
from django.core.exceptions import ValidationError
from django.utils.text import slugify

from .models import Attendance, Invitation
from .validators import normalized_guest_name, validate_content_url, validate_upload


class InvitationForm(forms.ModelForm):
    event_date = forms.DateTimeField(label="Tanggal dan jam acara utama", required=False, help_text="Waktu Indonesia Barat (Asia/Jakarta), untuk hitung mundur dan kalender. Teks jadwal tiap acara dapat diubah di editor bagian Acara.", widget=forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"), input_formats=["%Y-%m-%dT%H:%M"])

    class Meta:
        model = Invitation
        fields = ["title", "groom_name", "bride_name", "slug", "event_date"]
        labels = {"title": "Nama proyek undangan"}
        help_texts = {
            "slug": "Contoh: riswan-dan-iin. Mengubah alamat membuat tautan lama tidak berlaku.",
            "event_date": "Waktu Indonesia Barat (Asia/Jakarta), dipakai untuk hitung mundur dan kalender.",
        }
        widgets = {"slug": forms.TextInput(attrs={"placeholder": "riswan-dan-iin"})}

    def clean_slug(self):
        value = self.cleaned_data["slug"].lower()
        if slugify(value) != value:
            raise ValidationError("Gunakan huruf kecil, angka, dan tanda hubung.")
        return value


class ContentURLField(forms.CharField):
    def validate(self, value):
        super().validate(value)
        validate_content_url(value)


class SectionForm(forms.Form):
    section_enabled = forms.BooleanField(label="Tampilkan bagian ini", required=False, initial=True)

    def __init__(self, *args, section, invitation, **kwargs):
        self.section = section
        self.invitation = invitation
        super().__init__(*args, **kwargs)
        self.fields["section_enabled"].initial = invitation.sections.get(section["key"], True)
        for field in section.get("fields", []):
            key, kind = field["key"], field.get("type", "text")
            initial = invitation.content.get(key, field.get("default", ""))
            opts = {"label": field["label"], "required": False, "initial": initial}
            if kind in {"image", "audio", "video", "url"}:
                f = ContentURLField(max_length=2048, widget=forms.TextInput(attrs={"placeholder": "https://..."}), **opts)
            elif kind == "color":
                f = forms.RegexField(regex=r"^#[0-9a-fA-F]{6}$", max_length=7, widget=forms.TextInput(attrs={"type": "color"}), **opts)
            elif kind == "number":
                f = forms.IntegerField(min_value=0, max_value=1000000, **opts)
            elif kind in {"datetime", "datetime-local"}:
                f = forms.DateTimeField(widget=forms.DateTimeInput(attrs={"type": "datetime-local"}), **opts)
            elif kind == "date":
                f = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}), **opts)
            else:
                f = forms.CharField(max_length=10000 if kind == "textarea" else 3000, widget=forms.Textarea(attrs={"rows": 3}) if kind == "textarea" else forms.TextInput(), **opts)
            self.fields[f"field_{key}"] = f
            if kind in {"image", "audio", "video"}:
                accept = {"image": ".jpg,.jpeg,.png,.webp", "audio": ".mp3,.wav,.ogg", "video": ".mp4,.webm"}[kind]
                self.fields[f"upload_{key}"] = forms.FileField(label="Unggah berkas baru", required=False, widget=forms.FileInput(attrs={"accept": accept}))

    def clean(self):
        cleaned = super().clean()
        for field in self.section.get("fields", []):
            kind, key = field.get("type"), field["key"]
            file = cleaned.get(f"upload_{key}")
            if file:
                try:
                    validate_upload(file, kind)
                except ValidationError as exc:
                    self.add_error(f"upload_{key}", exc)
            value = cleaned.get(f"field_{key}", "")
            if kind in {"image", "audio", "video"} and value and not str(value).startswith(("/static/", "/media/", "https://", "http://")):
                self.add_error(f"field_{key}", "Sumber media harus berupa URL http/https atau berkas yang diunggah.")
            # Uploaded media is scoped to an invitation. A copied direct URL must
            # not attach another owner's private working asset to this project.
            if kind in {"image", "audio", "video"} and isinstance(value, str) and value.startswith("/media/"):
                existing = value == self.invitation.content.get(key)
                owned = self.invitation.assets.filter(file=value.removeprefix("/media/")).exists()
                if not existing and not owned:
                    self.add_error(f"field_{key}", "Unggah berkas untuk undangan ini atau gunakan URL eksternal.")
        return cleaned


class BulkGuestForm(forms.Form):
    names = forms.CharField(label="Nama tamu, satu nama per baris", max_length=100000, widget=forms.Textarea(attrs={"rows": 10, "placeholder": "Adrian dan Pasangan\nIin Sinurat dan Pasangan"}))

    def clean_names(self):
        lines = [normalized_guest_name(name) for name in self.cleaned_data["names"].splitlines() if name.strip()]
        if not lines:
            raise ValidationError("Masukkan sekurangnya satu nama tamu.")
        if len(lines) > 500:
            raise ValidationError("Maksimal 500 nama per sekali impor.")
        if any(len(name) > 180 for name in lines):
            raise ValidationError("Nama tamu maksimal 180 karakter.")
        if any(any(ord(c) < 32 for c in name) for name in lines):
            raise ValidationError("Nama tamu mengandung karakter yang tidak diperbolehkan.")
        return lines


class AttendanceForm(forms.ModelForm):
    website = forms.CharField(required=False, widget=forms.HiddenInput)
    party_size = forms.IntegerField(min_value=1, max_value=10, required=False, initial=1)

    class Meta:
        model = Attendance
        fields = ["name", "attendance", "party_size", "message", "publish_message"]

    def clean_name(self):
        name = normalized_guest_name(self.cleaned_data["name"])
        if len(name) > 180:
            raise ValidationError("Nama maksimal 180 karakter.")
        return name

    def clean_party_size(self):
        return self.cleaned_data.get("party_size") or 1

    def clean(self):
        cleaned = super().clean()
        # Public guestbook is part of the invitation experience. Publish any non-empty
        # message on this invitation without requiring a separate checkbox.
        cleaned["publish_message"] = bool((cleaned.get("message") or "").strip())
        return cleaned

    def clean_website(self):
        if self.cleaned_data.get("website"):
            raise ValidationError("Permintaan tidak dapat diproses.")
        return ""

