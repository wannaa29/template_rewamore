from pathlib import Path
from types import SimpleNamespace
import json
from urllib.parse import urlsplit

from bs4 import BeautifulSoup
from django.conf import settings
from django.test import RequestFactory, SimpleTestCase

from invitations.theme_engine import THEMES, fields_for, get_theme_schema, initial_content, render_invitation


class ThemeRenderingTests(SimpleTestCase):
    def invitation(self, slug='1'):
        theme=SimpleNamespace(slug=slug, schema=get_theme_schema(slug))
        return SimpleNamespace(pk=1,theme=theme,content=initial_content(theme,'Riswan','Iin'),sections={},
            groom_name='Riswan',bride_name='Iin',slug='riswan-dan-iin',title='Riswan dan Iin',event_date=None)

    def test_all_ten_original_themes_render_with_resolved_assets(self):
        for slug in THEMES:
            with self.subTest(theme=slug):
                inv=self.invitation(slug)
                soup=BeautifulSoup(render_invitation(inv,guest_name='Adrian dan Pasangan'),'html.parser')
                self.assertGreater(len(list(fields_for(inv.theme.schema))),200)
                data=json.loads(soup.find(id='rewamore-data').string)
                self.assertEqual(data['themeSlug'],slug)
                self.assertEqual(data['guest'],'Adrian dan Pasangan')
                self.assertEqual(data['rsvpUrl'],'/riswan-dan-iin/rsvp/')
                for node in soup.find_all(['script','img','link','audio','source']):
                    for attr in ('src','href','data-src'):
                        value=node.get(attr,'')
                        if value.startswith('/static/'):
                            file=Path(settings.BASE_DIR)/'static'/urlsplit(value).path.removeprefix('/static/')
                            self.assertTrue(file.is_file(),f'{slug}: missing {file}')
                for script in soup.find_all('script'):
                    self.assertTrue(script.get('src') or script.get('type')=='application/json')

    def test_custom_text_and_guest_are_escaped_not_executed(self):
        inv=self.invitation()
        field=next(f for f in fields_for(inv.theme.schema) if f['type']=='text' and f.get('target')=='text')
        inv.content[field['key']]='<img src=x onerror=alert(1)>'
        html=render_invitation(inv,guest_name='</script><script>alert(1)</script>')
        soup=BeautifulSoup(html,'html.parser')
        self.assertIsNone(soup.find('img',onerror=True))
        self.assertIn('&lt;img',html)
        self.assertNotIn('<script>alert(1)</script>',html)
        self.assertEqual(json.loads(soup.find(id='rewamore-data').string)['guest'],'</script><script>alert(1)</script>')

    def test_gallery_upload_updates_thumbnail_lightbox_and_srcset(self):
        inv=self.invitation('5')
        gallery=next(s for s in inv.theme.schema['sections'] if s['key']=='gallery')
        field=next(f for f in gallery['fields'] if f.get('target')=='image')
        inv.content[field['key']]='/media/invitations/1/new-photo.webp'
        soup=BeautifulSoup(render_invitation(inv),'html.parser')
        image=soup.find(attrs={'data-rw-node':field['node']})
        self.assertEqual(image['data-src'],'/media/invitations/1/new-photo.webp')
        self.assertFalse(image.has_attr('srcset'))
        self.assertFalse(image.has_attr('data-srcset'))
        self.assertEqual(image.find_parent(attrs={'data-gallery':True})['data-gallery'],'/media/invitations/1/new-photo.webp')

    def test_unsafe_url_in_database_is_not_rendered(self):
        inv=self.invitation()
        field=next(f for f in fields_for(inv.theme.schema) if f['type']=='url')
        inv.content[field['key']]='javascript:alert(document.cookie)'
        html=render_invitation(inv)
        self.assertNotIn('javascript:alert(document.cookie)',html)

    def test_hidden_section_keeps_dom_but_hides_section(self):
        inv=self.invitation()
        inv.sections={'gallery':False,'home':False}
        soup=BeautifulSoup(render_invitation(inv),'html.parser')
        self.assertEqual(soup.find(id='gallery')['data-rw-disabled'],'true')
        self.assertIn('display:none!important',soup.find(id='gallery')['style'])
        self.assertFalse(soup.find(id='home').has_attr('data-rw-disabled'))

    def test_theme_three_music_and_accounts_available(self):
        inv=self.invitation('3')
        self.assertTrue(any(f['type']=='audio' for f in fields_for(inv.theme.schema)))
        inv.content.update(runtime_gift_1_bank='Bank Test',runtime_gift_1_name='Riswan',runtime_gift_1_number='012345')
        soup=BeautifulSoup(render_invitation(inv),'html.parser')
        data=json.loads(soup.find(id='rewamore-data').string)
        self.assertEqual(data['runtime']['giftAccounts'][0]['number'],'012345')
        self.assertEqual(data['runtime']['music'],'/static/themes/3/assets/ambient.wav')

    def test_csrf_token_emitted_for_public_form(self):
        inv=self.invitation()
        soup=BeautifulSoup(render_invitation(inv,request=RequestFactory().get('/riswan-dan-iin/')),'html.parser')
        data=json.loads(soup.find(id='rewamore-data').string)
        self.assertGreater(len(data['csrfToken']),30)

    def test_visible_bank_number_and_copy_value_stay_synchronized(self):
        inv=self.invitation('1')
        field=next(f for f in fields_for(inv.theme.schema) if f.get('target')=='text' and f['default']=='0251632960')
        inv.content[field['key']]='0123456789'
        soup=BeautifulSoup(render_invitation(inv),'html.parser')
        number=soup.find(attrs={'data-rw-node':field['node']})
        self.assertEqual(number.find_parent(class_='bank-card').find(attrs={'data-copy':True})['data-copy'],'0123456789')

    def test_editing_attendance_label_does_not_change_option_value(self):
        inv=self.invitation('6')
        soup=BeautifulSoup(render_invitation(inv),'html.parser')
        self.assertTrue(all(option.has_attr('value') for option in soup.select('select option')))


class Theme5DesktopPhotoSchemaTests(SimpleTestCase):
    def test_theme_5_desktop_story_photo_is_editable_in_own_section(self):
        schema = get_theme_schema('5')
        panel = next(section for section in schema['sections'] if section['key'] == 'desktop-story')
        photo = next(field for field in panel['fields'] if field.get('target') == 'image')
        self.assertEqual(photo['type'], 'image')
        self.assertTrue(photo['default'].endswith('img/couple-close-960.webp'))

    def test_custom_desktop_story_photo_replaces_responsive_default(self):
        theme = SimpleNamespace(slug='5', schema=get_theme_schema('5'))
        content = initial_content(theme, 'Riswan', 'Iin')
        panel = next(section for section in theme.schema['sections'] if section['key'] == 'desktop-story')
        field = next(field for field in panel['fields'] if field.get('target') == 'image')
        content[field['key']] = '/media/invitations/custom-desktop.webp'
        inv = SimpleNamespace(pk=1, theme=theme, content=content, sections={},
            groom_name='Riswan', bride_name='Iin', slug='riswan-dan-iin',
            title='Riswan dan Iin', event_date=None)
        soup = BeautifulSoup(render_invitation(inv, guest_name='Tamu'), 'html.parser')
        photo = soup.select_one('img.desktop-photo')
        self.assertEqual(photo.get('data-src'), '/media/invitations/custom-desktop.webp')
        self.assertNotIn('data-srcset', photo.attrs)
