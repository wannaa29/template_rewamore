import io
import tempfile
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from PIL import Image

from invitations.forms import BulkGuestForm, InvitationForm, SectionForm
from invitations.models import Attendance, Guest, Invitation, Theme
from invitations.views import limited


@override_settings(PUBLIC_BASE_URL="https://rewamore.my.id")
class WorkflowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user("owner", password="testing-Only-82")
        cls.other = get_user_model().objects.create_user("other", password="testing-Only-83")
        cls.section = {"key": "cover", "label": "Sampul", "fields": [
            {"key": "t0001", "label": "Judul", "type": "text", "default": "Judul awal"},
            {"key": "a0001", "label": "Foto", "type": "image", "default": "/static/themes/1/assets/photo.jpg"},
            {"key": "a0002", "label": "Peta", "type": "url", "default": "https://maps.google.com"},
        ]}
        cls.theme = Theme.objects.create(slug="1", name="Tema satu", schema={"sections": [cls.section]})
        cls.invitation = Invitation.objects.create(owner=cls.owner, theme=cls.theme, title="Riswan & Iin", groom_name="Riswan", bride_name="Iin", slug="riswan-dan-iin", content={"t0001": "Judul awal", "a0001": "/static/themes/1/assets/photo.jpg", "a0002": "https://maps.google.com", "other_section": "tetap"})

    def setUp(self):
        cache.clear()
        self.client.force_login(self.owner)

    def test_theme_preview_is_public_read_only_and_has_share_metadata(self):
        self.client.logout()
        url = reverse("invitations:theme_preview", args=[self.theme.slug])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'property="og:image"')
        self.assertContains(response, 'https://rewamore.my.id/static/')
        self.assertContains(response, 'property="og:url"')
        self.assertEqual(self.client.post(url).status_code, 405)
        self.assertEqual(self.client.get(reverse("invitations:preview", args=[self.invitation.pk])).status_code, 302)
        self.assertEqual(self.client.post(reverse("invitations:edit", args=[self.invitation.pk])).status_code, 302)

    def test_guest_links_use_percent_spaces_and_escape_special_characters(self):
        guest = Guest.objects.create(invitation=self.invitation, name="Iin Sinurat dan Pasangan")
        self.assertEqual(guest.invitation_url(), "https://rewamore.my.id/riswan-dan-iin/?to=Iin%20Sinurat%20dan%20Pasangan")
        guest.name = "A & B / C?"
        guest.save()
        self.assertTrue(guest.invitation_url().endswith("?to=A%20%26%20B%20%2F%20C%3F"))

    def test_bulk_names_deduplicate_unicode_whitespace_and_case(self):
        url = reverse("invitations:guests", args=[self.invitation.pk])
        response = self.client.post(url, {"names": "Adrian dan Pasangan\n  adrian   dan Pasangan \nIin Sinurat dan Pasangan"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.invitation.guests.count(), 2)
        self.assertEqual(self.invitation.guests.first().name, "Adrian dan Pasangan")

    def test_bulk_requires_names_and_limits_size(self):
        self.assertFalse(BulkGuestForm({"names": " "}).is_valid())
        self.assertFalse(BulkGuestForm({"names": "x" * 181}).is_valid())
        self.assertFalse(BulkGuestForm({"names": "\n".join(str(i) for i in range(501))}).is_valid())

    def test_other_user_cannot_edit_export_preview_or_publish(self):
        self.client.force_login(self.other)
        for action in ["edit", "settings", "guests", "export_guests", "preview"]:
            response = self.client.get(reverse(f"invitations:{action}", args=[self.invitation.pk]))
            self.assertEqual(response.status_code, 404, action)
        for action in ["publish", "duplicate", "delete"]:
            response = self.client.post(reverse(f"invitations:{action}", args=[self.invitation.pk]))
            self.assertEqual(response.status_code, 404, action)

    def test_draft_is_private_publish_and_unpublish_are_post_only(self):
        self.assertEqual(self.client.get(self.invitation.get_absolute_url()).status_code, 404)
        url = reverse("invitations:publish", args=[self.invitation.pk])
        self.assertEqual(self.client.get(url).status_code, 405)
        self.client.post(url, {"action": "publish"})
        with patch("invitations.views.render_invitation", return_value="published"):
            self.assertEqual(self.client.get(self.invitation.get_absolute_url()).status_code, 200)
        self.client.post(url, {"action": "unpublish"})
        self.assertEqual(self.client.get(self.invitation.get_absolute_url()).status_code, 404)

    def test_section_save_only_updates_known_fields(self):
        url = reverse("invitations:edit", args=[self.invitation.pk]) + "?section=cover"
        response = self.client.post(url, {"field_t0001": "Nama baru", "field_a0001": "/static/themes/1/assets/photo.jpg", "field_a0002": "https://maps.google.com", "field_other_section": "diserang", "section_enabled": "on"})
        self.assertEqual(response.status_code, 302)
        self.invitation.refresh_from_db()
        self.assertEqual(self.invitation.content["t0001"], "Nama baru")
        self.assertEqual(self.invitation.content["other_section"], "tetap")
        self.assertTrue(self.invitation.sections["cover"])

    def test_invalid_section_and_javascript_url_rejected(self):
        url = reverse("invitations:edit", args=[self.invitation.pk])
        self.assertEqual(self.client.get(url + "?section=../../secret").status_code, 404)
        form = SectionForm({"field_a0002": "javascript:alert(1)"}, section=self.section, invitation=self.invitation)
        self.assertFalse(form.is_valid())
        self.assertIn("field_a0002", form.errors)
        form = SectionForm({"field_a0001": "/media/invitations/999/stolen.jpg"}, section=self.section, invitation=self.invitation)
        self.assertFalse(form.is_valid())

    def test_uploaded_image_is_reencoded_and_owned(self):
        data = io.BytesIO()
        Image.new("RGB", (32, 24), "red").save(data, format="PNG")
        image = SimpleUploadedFile("my-photo.png", data.getvalue(), content_type="image/png")
        url = reverse("invitations:edit", args=[self.invitation.pk]) + "?section=cover"
        with tempfile.TemporaryDirectory() as folder, override_settings(MEDIA_ROOT=folder):
            response = self.client.post(url, {"field_t0001": "Nama baru", "field_a0001": "", "field_a0002": "", "upload_a0001": image, "section_enabled": "on"})
            self.assertEqual(response.status_code, 302)
            self.invitation.refresh_from_db()
            asset = self.invitation.assets.get()
            self.assertEqual(asset.owner, self.owner)
            self.assertTrue(asset.file.name.endswith(".webp"))
            self.assertEqual(self.invitation.content["a0001"], asset.file.url)
            with Image.open(asset.file.path) as actual:
                self.assertEqual(actual.format, "WEBP")

    def test_fake_image_and_svg_rejected(self):
        for name in ["image.jpg", "image.svg"]:
            fake = SimpleUploadedFile(name, b"<svg onload='alert(1)'></svg>", content_type="image/jpeg")
            form = SectionForm({}, {"upload_a0001": fake}, section=self.section, invitation=self.invitation)
            self.assertFalse(form.is_valid())
            self.assertIn("upload_a0001", form.errors)

    def test_reserved_slug_is_rejected(self):
        for slug in ["admin", "dashboard", "media", "accounts"]:
            form = InvitationForm({"title": "Test", "groom_name": "A", "bride_name": "B", "slug": slug})
            self.assertFalse(form.is_valid(), slug)
            self.assertIn("slug", form.errors)

    def test_csv_formula_injection_is_neutralized(self):
        Guest.objects.create(invitation=self.invitation, name="=HYPERLINK(x)")
        response = self.client.get(reverse("invitations:export_guests", args=[self.invitation.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertIn("'=HYPERLINK(x)", response.content.decode())

    def test_rsvp_persists_and_public_wishes_require_consent(self):
        self.invitation.status = Invitation.Status.PUBLISHED
        self.invitation.save()
        url = reverse("invitations:rsvp", args=[self.invitation.slug])
        response = self.client.post(url, {"name": "Adrian", "attendance": "yes", "party_size": 2, "message": "Pesan pribadi"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Attendance.objects.get().party_size, 2)
        wishes = reverse("invitations:wishes", args=[self.invitation.slug])
        self.assertEqual(self.client.get(wishes).json()["wishes"], [])
        self.client.post(url, {"name": "Iin", "attendance": "maybe", "party_size": 1, "message": "Selamat!", "publish_message": "true"})
        self.assertEqual(len(self.client.get(wishes).json()["wishes"]), 1)

    def test_rsvp_validation_csrf_and_rate_limit(self):
        self.invitation.status = Invitation.Status.PUBLISHED
        self.invitation.save()
        url = reverse("invitations:rsvp", args=[self.invitation.slug])
        secure = Client(enforce_csrf_checks=True)
        self.assertEqual(secure.post(url, {"name": "A", "attendance": "yes"}).status_code, 403)
        self.assertEqual(self.client.post(url, {"name": "A", "attendance": "wrong", "party_size": 50}).status_code, 400)
        for _ in range(9):
            self.client.post(url, {"name": "A", "attendance": "yes"})
        self.assertEqual(self.client.post(url, {"name": "A", "attendance": "yes"}).status_code, 429)

    def test_duplicate_is_draft_and_guests_are_not_copied(self):
        Guest.objects.create(invitation=self.invitation, name="Adrian")
        self.client.post(reverse("invitations:duplicate", args=[self.invitation.pk]))
        clone = Invitation.objects.exclude(pk=self.invitation.pk).get()
        self.assertEqual(clone.status, Invitation.Status.DRAFT)
        self.assertEqual(clone.content, self.invitation.content)
        self.assertEqual(clone.guests.count(), 0)

    def test_identity_names_update_composite_text_without_changing_urls(self):
        self.invitation.content["t0001"] = "Pernikahan RISWAN & IIN, bersama Riswan dan Iin."
        self.invitation.content["a0002"] = "https://example.com/Riswan-Iin/"
        self.invitation.save()
        response = self.client.post(reverse("invitations:settings", args=[self.invitation.pk]), {"title": "Nadia & Raka", "groom_name": "Raka", "bride_name": "Nadia", "slug": self.invitation.slug, "event_date": "2027-06-19T10:00"})
        self.assertEqual(response.status_code, 302)
        self.invitation.refresh_from_db()
        self.assertEqual(self.invitation.content["t0001"], "Pernikahan RAKA & NADIA, bersama Raka dan Nadia.")
        self.assertEqual(self.invitation.content["a0002"], "https://example.com/Riswan-Iin/")

    def test_dashboard_requires_authentication(self):
        self.client.logout()
        response = self.client.get(reverse("invitations:dashboard"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/accounts/login/", response.url)

