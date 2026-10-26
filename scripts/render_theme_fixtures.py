"""Generate disposable theme fixtures on stdout for the optional DOM smoke test.

No database or files are written; execute with the Django virtualenv active.
"""
import os,sys,json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ['DJANGO_SETTINGS_MODULE']='config.settings'
import django;django.setup()
from invitations.models import Theme,Invitation
from invitations.theme_engine import render_invitation,initial_content,get_theme_schema,THEMES,_compile
from django.test import RequestFactory
from django.utils.dateparse import parse_datetime
from bs4 import BeautifulSoup
out=[]
for slug,(name,desc) in THEMES.items():
 theme=Theme(slug=slug,name=name,description=desc,schema=get_theme_schema(slug))
 inv=Invitation(pk=900+int(theme.slug),theme=theme,title='Pernikahan Riswan & Iin',groom_name='Riswan',bride_name='Iin',slug='riswan-iin-'+theme.slug,content=initial_content(theme,'Riswan','Iin'),sections={},event_date=parse_datetime('2027-11-06T10:00:00+07:00'))
 fields=[f for section in theme.schema['sections'] for f in section['fields']]
 image=next((f for f in fields if f['type']=='image' and f.get('target')=='image'),None)
 if image:inv.content[image['key']]='/media/custom-client-photo.webp'
 compiled=BeautifulSoup(_compile(theme.slug)[0],'html.parser')
 def clickable(f):
  el=compiled.find(attrs={'data-rw-node':f.get('node')})
  return bool(el and (el.find_parent(attrs={'data-gallery':True}) or el.find_parent(attrs={'data-gallery-index':True}) or el.find_parent(class_='gallery-photo')))
 for sec in theme.schema['sections']:
  if sec['key'] in ('gallery','galeri'):
   gal=next((f for f in sec['fields'] if f['type']=='image' and f.get('target')=='image' and clickable(f)),None)
   if gal: inv.content[gal['key']]='/media/client-gallery.webp';break
 inv.content['runtime_calendar_title']='Pernikahan Riswan & Iin'
 inv.content['runtime_calendar_location']='Gedung Riswan, Jakarta'
 req=RequestFactory().get('/',HTTP_HOST='localhost')
 out.append({'theme':theme.slug,'html':render_invitation(inv,request=req,guest_name='Adrian & Pasangan',preview=False)})
print(json.dumps(out))
