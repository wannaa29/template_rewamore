"""Regression coverage from the independent all-theme code review."""
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

from bs4 import BeautifulSoup
from django.conf import settings
from django.test import SimpleTestCase

from invitations.forms import SectionForm
from invitations.models import Invitation, Theme
from invitations.theme_engine import THEMES, fields_for, get_theme_schema, initial_content, render_invitation, safe_url


class ThemeIntegrationSecurityTests(SimpleTestCase):
    def invitation(self, slug):
        theme = Theme(slug=slug, schema=get_theme_schema(slug))
        return Invitation(theme=theme, title="Riswan & Iin", groom_name="Riswan",
                          bride_name="Iin", slug="riswan-dan-iin",
                          content=initial_content(theme, "Riswan", "Iin"))

    def test_malformed_urls_are_validation_errors_not_server_errors(self):
        section = {"key": "link", "label": "Tautan", "fields": [
            {"key": "url", "label": "Tautan", "type": "url", "default": "https://example.com"}
        ]}
        for value in ("https://[", "https://example.com:abc", "https://example.com:99999"):
            with self.subTest(value=value):
                form = SectionForm({"field_url": value}, section=section, invitation=self.invitation("1"))
                self.assertFalse(form.is_valid())
                self.assertIn("field_url", form.errors)
                self.assertEqual(safe_url(value, "/static/fallback.png"), "/static/fallback.png")

    def test_every_theme_has_working_attendance_choices(self):
        for slug in THEMES:
            with self.subTest(theme=slug):
                soup = BeautifulSoup(render_invitation(self.invitation(slug)), "html.parser")
                form = soup.select_one("#rsvpForm, #rsvp-form")
                self.assertIsNotNone(form)
                choices = form.select('input[name="attendance"], select[name="attendance"] option, select#attendance option')
                values = {choice.get("value") for choice in choices if choice.get("value")}
                self.assertGreaterEqual(len(values), 2, "RSVP requires valid, selectable attendance values")

    def test_guest_query_cannot_break_out_of_runtime_json(self):
        attack = '</script><script id="injected-script">alert(1)</script>'
        for slug in THEMES:
            with self.subTest(theme=slug):
                soup = BeautifulSoup(render_invitation(self.invitation(slug), guest_name=attack), "html.parser")
                self.assertIsNone(soup.find(id="injected-script"))
                runtime = json.loads(soup.find(id="rewamore-data").string)
                self.assertEqual(runtime["guest"], attack)
                self.assertTrue(all(node.get("type") == "application/json" or node.get("src") for node in soup.find_all("script")))

    def test_text_editor_does_not_turn_markup_into_html(self):
        attack = '<img src=x onerror=alert(1) id="injected-image">'
        for slug in THEMES:
            with self.subTest(theme=slug):
                invitation = self.invitation(slug)
                field = next(f for f in fields_for(invitation.theme.schema) if f.get("target") == "text")
                invitation.content[field["key"]] = attack
                soup = BeautifulSoup(render_invitation(invitation), "html.parser")
                self.assertIsNone(soup.find(id="injected-image"))
                self.assertIn(attack, soup.get_text())

    def test_every_local_rendered_asset_exists(self):
        for slug in THEMES:
            with self.subTest(theme=slug):
                soup = BeautifulSoup(render_invitation(self.invitation(slug)), "html.parser")
                references = []
                for node in soup.find_all(True):
                    for attr in ("src", "data-src", "poster"):
                        if node.get(attr):
                            references.append(node[attr])
                    if node.name == "link" and node.get("href"):
                        references.append(node["href"])
                for reference in references:
                    parsed = urlsplit(reference)
                    if not parsed.netloc and parsed.path.startswith(settings.STATIC_URL):
                        relative = unquote(parsed.path.removeprefix(settings.STATIC_URL))
                        self.assertTrue((Path(settings.BASE_DIR) / "static" / relative).is_file(), reference)

    def test_replaced_gallery_media_does_not_retain_responsive_old_image(self):
        for slug in THEMES:
            invitation = self.invitation(slug)
            candidates = [field for field in fields_for(invitation.theme.schema) if field.get("target") == "image"]
            with self.subTest(theme=slug):
                self.assertTrue(candidates)
                field = candidates[0]
                invitation.content[field["key"]] = "/media/invitations/1/replacement.webp"
                soup = BeautifulSoup(render_invitation(invitation), "html.parser")
                node = soup.find(attrs={"data-rw-node": field["node"]})
                self.assertNotIn("srcset", node.attrs)
                self.assertNotIn("data-srcset", node.attrs)
                self.assertIn("/media/invitations/1/replacement.webp", (node.get("src"), node.get("data-src")))

    def test_hidden_sections_remain_inert_without_breaking_script_targets(self):
        for slug in THEMES:
            invitation = self.invitation(slug)
            sections = [section for section in invitation.theme.schema["sections"] if section.get("can_hide")]
            with self.subTest(theme=slug):
                self.assertTrue(sections)
                section = sections[0]
                invitation.sections = {section["key"]: False}
                soup = BeautifulSoup(render_invitation(invitation), "html.parser")
                node = soup.find(attrs={"data-rw-section": section["key"]})
                self.assertIsNotNone(node)
                self.assertIn("hidden", node.attrs)
                self.assertIn("display:none!important", node.get("style", ""))
