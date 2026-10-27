import io
import tempfile
from bs4 import BeautifulSoup
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from invitations.models import Invitation, Theme, ThemeExample
from invitations.theme_engine import get_theme_schema, initial_content, fields_for, theme_preview

@override_settings(PUBLIC_BASE_URL='https://rewamore.my.id')
class ThemeExampleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = get_user_model().objects.create_user('admin', password='test', is_staff=True)
        cls.user = get_user_model().objects.create_user('user', password='test')
        cls.theme = Theme.objects.create(slug='1', name='Tema satu', schema=get_theme_schema('1'), preview_image=theme_preview('1'))

    def test_edit_saved_shared_and_separate_from_customer(self):
        self.client.force_login(self.admin)
        schema = self.theme.schema
        section = next(s for s in schema['sections'] if any(f['type'] == 'text' and f.get('target') == 'text' for f in s['fields']))
        field = next(f for f in section['fields'] if f['type'] == 'text' and f.get('target') == 'text')
        url = reverse('invitations:edit_theme_example', args=['1']) + '?section=' + section['key']
        self.assertEqual(self.client.get(url).status_code, 200)
        initial = initial_content(self.theme, 'Riswan', 'Iin')
        payload = {'section_enabled': 'on'}
        payload.update({f'field_{f["key"]}': initial.get(f['key'], '') for f in section['fields']})
        payload['field_' + field['key']] = 'CONTOH PERUBAHAN ADMIN'
        self.assertEqual(self.client.post(url, payload).status_code, 302)
        self.assertEqual(ThemeExample.objects.get(theme=self.theme).content[field['key']], 'CONTOH PERUBAHAN ADMIN')
        self.client.logout()
        response = self.client.get(reverse('invitations:theme_preview', args=['1']))
        self.assertContains(response, 'CONTOH PERUBAHAN ADMIN')
        self.assertNotEqual(initial_content(self.theme, 'Riswan', 'Iin')[field['key']], 'CONTOH PERUBAHAN ADMIN')
        self.assertEqual(Invitation.objects.count(), 0)
        self.assertEqual(self.client.post(url, payload).status_code, 302)
        self.client.force_login(self.user)
        self.assertEqual(self.client.post(url, payload).status_code, 302)
        self.assertEqual(ThemeExample.objects.get(theme=self.theme).content[field['key']], 'CONTOH PERUBAHAN ADMIN')

    def test_upload_image_and_open_advanced_fields(self):
        self.client.force_login(self.admin)
        section = next(s for s in self.theme.schema['sections'] if any(f['type']=='image' for f in s['fields']))
        field = next(f for f in section['fields'] if f['type']=='image')
        url = reverse('invitations:edit_theme_example', args=['1']) + '?section=' + section['key']
        initial = initial_content(self.theme, 'Riswan', 'Iin')
        payload = {'section_enabled':'on'}
        payload.update({f'field_{f["key"]}': initial.get(f['key'], '') for f in section['fields']})
        out = io.BytesIO(); Image.new('RGB', (30, 30), 'red').save(out, format='PNG')
        payload['upload_' + field['key']] = SimpleUploadedFile('sample.png', out.getvalue(), content_type='image/png')
        with tempfile.TemporaryDirectory() as media, self.settings(MEDIA_ROOT=media):
            response = self.client.post(url, payload)
            self.assertEqual(response.status_code, 302, response.content[:3000])
            example = ThemeExample.objects.get(theme=self.theme)
            self.assertTrue(example.content[field['key']].startswith('/media/theme-examples/'))
            self.assertEqual(example.assets.count(), 1)
