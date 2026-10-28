"""Adapt the supplied HTML themes into safe, section-based invitation documents.

Templates are trusted project assets. Editable values are always plain text or
validated URLs; client content is never evaluated as HTML, JS or a Django template.
Deterministic node and child positions preserve inline markup and original design.
"""
from __future__ import annotations

import copy
from functools import lru_cache
import json
import posixpath
from pathlib import Path
import re
from urllib.parse import quote, urlsplit, urlunsplit

from bs4 import BeautifulSoup, Comment, NavigableString
from django.conf import settings
from django.middleware.csrf import get_token
from django.templatetags.static import static
from django.utils import timezone

THEMES = {
    '1': ('Burgundy Promise', 'Nuansa burgundy dengan foto editorial dan transisi lembut.'),
    '2': ('Burgundy Chapters', 'Cerita visual dalam bab, galeri bergerak, dan sentuhan burgundy.'),
    '3': ('Botanical Portrait', 'Potret layar penuh dengan warna hijau botani. Foto bawaan memakai sumber eksternal.'),
    '4': ('The Atelier', 'Komposisi editorial berwarna sage. Foto bawaan memakai sumber eksternal.'),
    '5': ('Ivory Romance', 'Nuansa gading dengan foto oval, ornamen halus, dan tipografi klasik.'),
    '6': ('Ivory Nocturne', 'Undangan editorial gading dengan tata letak luas dan galeri foto.'),
    '7': ('A Promise, A Lifetime', 'Undangan burgundy dengan sampul sinematik dan cerita pasangan.'),
    '8': ('Nocturne Pearl', 'Nuansa mutiara dengan susunan foto, sampul, dan aksen editorial.'),
    '9': ('Noir Atelier', 'Nuansa hitam dan emas dengan pembuka pintu dan fotografi dramatis.'),
    '10': ('Burgundy Signature', 'Edisi burgundy dengan rangkaian bab dan galeri bergaya editorial.'),
}
SKIP_TAGS = {'script', 'style', 'svg', 'noscript', 'template'}
URL_ATTRS = ('src', 'href', 'poster', 'data-src', 'data-gallery', 'data-full', 'data-image', 'data-bg')
COLOR_PATTERN = re.compile(r'^#[0-9a-fA-F]{3,8}$')


def _project_root():
    return Path(settings.BASE_DIR)


def _slug(slug):
    slug = str(slug)
    if slug not in THEMES:
        raise ValueError('Tema tidak tersedia.')
    return slug


def asset_url(slug, url):
    """Resolve only relative theme resources, preserving external and anchor URLs."""
    value = str(url or '').strip()
    if not value or value.startswith(('#', '/', 'data:', 'blob:')):
        return value
    parsed = urlsplit(value)
    if parsed.scheme:
        return value
    path = posixpath.normpath(parsed.path)
    if path.startswith('../') or path == '..':
        return ''
    resolved = static(f'themes/{_slug(slug)}/{path.lstrip("./")}')
    return urlunsplit(('', '', resolved, parsed.query, parsed.fragment))


def safe_url(value, default=''):
    """Defense in depth beyond the editor forms; no executable schemes allowed."""
    value = str(value or '').strip()
    if any(ord(c) < 32 for c in value) or '\\' in value:
        return default
    try:
        parts = urlsplit(value)
        _ = parts.port
    except ValueError:
        return default
    if parts.scheme.lower() not in ('', 'https', 'http', 'mailto', 'tel'):
        return default
    if not parts.scheme and (value.startswith('//') or (value and not value.startswith(('/', '#')))):
        return default
    return value


def _context(node):
    own = node.get('alt') or node.get('aria-label') or node.get('id')
    if own:
        return re.sub(r'\s+', ' ', own).strip()[:82]
    text = node.get_text(' ', strip=True)
    if text:
        return text[:82]
    return ' '.join(node.get('class', []))[:60] or node.name


def _section_label(token):
    lower = token.lower()
    mapping = [
        (('cover', 'opening'), 'Sampul'),
        (('home', 'hero', 'beranda'), 'Pembuka'),
        (('welcome', 'blessing', 'manifesto', 'prologue'), 'Pengantar & doa'),
        (('couple', 'mempelai'), 'Mempelai'),
        (('story', 'cerita', 'chapter'), 'Cerita pasangan'),
        (('save-date', 'countdown'), 'Hitung mundur'),
        (('event', 'acara'), 'Acara & lokasi'),
        (('gallery', 'galeri', 'memory-ribbon'), 'Galeri foto'),
        (('film', 'video'), 'Video'),
        (('gift', 'hadiah'), 'Amplop digital'),
        (('rsvp', 'wishes', 'ucapan'), 'Ucapan & kehadiran'),
        (('closing',), 'Penutup'),
        (('footer',), 'Footer'),
        (('photo', 'vow'), 'Foto & kutipan'),
        (('music', 'audio'), 'Musik'),
        (('desktop',), 'Panel desktop'),
    ]
    for tokens, label in mapping:
        if any(t in lower for t in tokens):
            return label
    return ' '.join(token.replace('-', ' ').split()).capitalize() or 'Bagian tambahan'


def _is_dynamic_text(node):
    ident = node.get('id', '').lower()
    return ('countdown' in ident and any(x in ident for x in ('days', 'hours', 'minutes', 'seconds'))) or ident in {
        'slidenumber', 'gallerycounter', 'lightboxcounter', 'wishcount', 'guestcount',
        'countdownlabel','countdownstatus','countdown-caption','countdownnote','guestname',
    } or node.has_attr('data-count') or node.has_attr('data-guest') or ('guest-name' in node.get('class', []))


@lru_cache(maxsize=16)
def _compile(slug):
    slug = _slug(slug)
    raw = (_project_root() / 'theme_sources' / slug / 'index.html').read_text(encoding='utf-8')
    soup = BeautifulSoup(raw, 'html.parser')
    # Two originals contain missing opening <option> tags. Repair before extracting fields.
    if slug in ('6','9'):
        select=soup.find('select',id='attendance')
        if select and len(select.find_all('option')) < 3:
            select.clear()
            for option_value,option_label in [('', 'Pilih kehadiran'),('yes','Dengan senang hati, hadir'),('no','Maaf, belum bisa hadir'),('maybe','Belum dapat memastikan')]:
                option=soup.new_tag('option',value=option_value)
                option.string=option_label
                select.append(option)
    for option in soup.select('option:not([value])'):
        option['value']=option.get_text(strip=True)
    inline_number=0
    for script in soup.find_all('script'):
        if not script.get('src') and script.get_text().strip():
            inline_number+=1
            script.clear()
            script['src']=f'source-inline-{inline_number}.js'
    for index, node in enumerate(soup.find_all(True), 1):
        node['data-rw-node'] = f'n{index:04d}'
    groups = {}
    roots = {}
    used_keys = set()

    def ensure_group(key, label, root=None, can_hide=False):
        if key not in groups:
            groups[key] = {'key': key, 'label': label, 'can_hide': can_hide, 'fields': []}
        if root:
            root['data-rw-section'] = key
            roots[root['data-rw-node']] = key
        return groups[key]

    ensure_group('metadata', 'Judul halaman & pratinjau tautan')
    for node in soup.find_all(True):
        # Theme 5's desktop-only left/right story panel lives in an <aside>,
        # not a <section>. Give it its own editor section so its hero photo is
        # discoverable and replaceable instead of being buried in general fields.
        if node.name in ('section','footer','dialog') or node.get('id') in ('cover', 'openingDialog') or (node.name == 'aside' and any(cls in node.get('class', []) for cls in ('desktop-panel', 'desktop-story'))):
            token = node.get('id') or ('footer' if node.name == 'footer' else next(iter(node.get('class', [])), 'bagian'))
            key = re.sub(r'[^a-z0-9]+', '-', token.lower()).strip('-')
            base = key
            n = 2
            while key in used_keys:
                key = f'{base}-{n}'
                n += 1
            used_keys.add(key)
            label = _section_label(token)
            if node.name == 'dialog' and label != 'Sampul':
                label += ' (dialog)'
            can_hide = label not in ('Sampul', 'Pembuka') and 'saved' not in key
            ensure_group(key, label, node, can_hide)

    def group_for(node):
        if node.name in ('audio',) or (node.name == 'source' and node.parent.name == 'audio'):
            return ensure_group('music', 'Musik')
        for parent in [node, *node.parents]:
            if parent.name == 'head':
                return groups['metadata']
            nodeid = parent.get('data-rw-node') if hasattr(parent, 'get') else None
            if nodeid in roots:
                return groups[roots[nodeid]]
        return ensure_group('general', 'Navigasi, dialog & teks tambahan')

    def field(node, kind, default, label, **target):
        suffix=target.get('attr') or target.get('target','value')
        if target.get('target')=='text': suffix=f'text{target["child"]}'
        key=f'{node.get("data-rw-node")}_{suffix}'.replace('-','_')
        entry = {'key': key, 'label': label[:130], 'type': kind,
                 'default': default, 'node': node.get('data-rw-node') if node else None, **target}
        if target.get('target')=='text' and len(str(default).strip())==1:
            monogram=next((p for p in [node,*node.parents] if hasattr(p,'get') and any(any(token in c for token in ('monogram','emblem','mark','crest')) for c in p.get('class',[]))),None)
            if monogram:
                letters=[t for t in monogram.descendants if isinstance(t,NavigableString) and str(t).strip().isalpha() and len(str(t).strip())==1]
                original=node.contents[target['child']]
                position=next((i for i,t in enumerate(letters) if t is original),0)
                entry['identity']='bride_initial' if (position==0 and slug=='5') or (position>0 and slug!='5') else 'groom_initial'
        group_for(node)['fields'].append(entry)
        return entry

    for node in soup.find_all(True):
        if node.name in SKIP_TAGS or any(p.name in SKIP_TAGS for p in node.parents):
            continue
        group_for(node)
        if not _is_dynamic_text(node):
            for i, child in enumerate(list(node.contents)):
                if isinstance(child, NavigableString) and not isinstance(child, Comment) and child.strip() and re.search(r'\w', child, re.UNICODE):
                    original = str(child)
                    text = original.strip()
                    kind = 'textarea' if len(text) > 95 or '\n' in text else 'text'
                    label = ('Judul halaman' if node.name == 'title' else 'Teks') + ': ' + text[:90]
                    field(node, kind, text, label, target='text', child=i,
                          leading=original[:len(original)-len(original.lstrip())],
                          trailing=original[len(original.rstrip()):])
        if node.name == 'meta' and (node.get('name') == 'description' or node.get('property') in ('og:title','og:description','og:image')):
            prop = node.get('property') or node.get('name')
            default = node.get('content', '')
            if prop == 'og:image':
                # External hosted preview URLs in source are replaced by an actual bundled photo.
                first = soup.find('img', src=True)
                if first and urlsplit(default).hostname and 'chatgpt.site' in (urlsplit(default).hostname or ''):
                    default = first['src']
                default = asset_url(slug, default)
            field(node, 'image' if prop == 'og:image' else 'textarea', default, f'Metadata {prop}', target='attr', attr='content')
        if node.name == 'img' and (node.get('src') or node.get('data-src')):
            default = asset_url(slug, node.get('data-src') or node.get('src'))
            field(node, 'image', default, f'Foto: {_context(node)}', target='image')
        if node.name in ('audio','video','source'):
            default = node.get('data-src') or node.get('src')
            if node.name == 'audio' and not default and slug in ('3','4'):
                default = 'assets/ambient.wav'
            if default:
                kind = 'audio' if node.name == 'audio' or node.parent.name == 'audio' else 'video'
                field(node, kind, asset_url(slug, default), 'Musik latar' if kind=='audio' else f'Video: {_context(node)}', target='media')
            if node.name == 'video' and node.get('poster'):
                field(node, 'image', asset_url(slug, node['poster']), 'Gambar sampul video', target='attr', attr='poster')
        for attr in ('alt','aria-label','placeholder','data-caption','data-title'):
            if node.get(attr) and not (attr=='aria-label' and node.name in ('svg','symbol','use')):
                field(node, 'text', str(node[attr]), f'{"Deskripsi foto" if attr == "alt" else "Label"}: {_context(node)}', target='attr', attr=attr)
        if node.name=='a' and node.get('href') and not node['href'].startswith('#'):
            field(node, 'url', asset_url(slug, node['href']), f'Tautan: {_context(node)}', target='attr', attr='href')
        if node.has_attr('data-copy'):
            field(node, 'text', str(node['data-copy']), f'Nomor yang disalin: {_context(node)}', target='attr', attr='data-copy')
        if node.get('datetime'):
            field(node, 'text', str(node['datetime']), 'Tanggal semantik', target='attr', attr='datetime')
        style = node.get('style', '')
        for match in re.finditer(r'url\([\"\']?([^\)\"\']+)[\"\']?\)', style):
            if not match.group(1).startswith('data:'):
                field(node, 'image', asset_url(slug,match.group(1)), f'Latar: {_context(node)}', target='background', original=match.group(0))

    # Decorative image backgrounds live in CSS rather than HTML, but remain editable.
    decoration = ensure_group('decorations', 'Ornamen & latar')
    css_count = 0
    seen = set()
    for css_file in sorted((_project_root()/'static'/'themes'/slug).rglob('*.css')):
        css_text = css_file.read_text(encoding='utf-8', errors='replace')
        for rule in re.finditer(r'([^{}]+)\{([^{}]*)\}', css_text):
            selector, declarations = rule.groups()
            selector = re.sub(r'/\*.*?\*/', '', selector, flags=re.S).strip()
            if not selector or selector.startswith('@'):
                continue
            for match in re.finditer(r'(?:background(?:-image)?)\s*:[^;{}]*url\([\"\']?([^\)\"\']+)[\"\']?\)', declarations):
                resource = match.group(1)
                if resource.startswith('data:') or selector in seen:
                    continue
                seen.add(selector)
                css_count += 1
                css_rel = css_file.relative_to(_project_root()/'static'/'themes'/slug).as_posix()
                resolved = posixpath.normpath(posixpath.join(posixpath.dirname(css_rel), resource))
                decoration['fields'].append({'key':f'decoration_{css_count}', 'label':f'Gambar ornamen {css_count}: {selector}',
                    'type':'image','default':asset_url(slug,resolved),'target':'css-background','selector':selector})

    runtime = ensure_group('runtime', 'Kalender, video & pengaturan interaktif')
    runtime_fields = [
        ('runtime_calendar_title','Judul acara pada kalender','text','Pernikahan kami'),
        ('runtime_calendar_location','Lokasi acara pada kalender','text',''),
        ('runtime_video_id','ID video YouTube (kosongkan jika tidak digunakan)','text',''),
    ]
    for i, caption in enumerate(('Dalam satu doa','Dalam satu janji','Untuk selamanya'),1):
        runtime_fields.append((f'runtime_slide_caption_{i}', f'Keterangan slider {i}', 'text', caption))
    if slug in ('3','4'):
        for i in range(1, (3 if slug == '3' else 4)):
            for suffix,label in [('bank','Nama bank'),('name','Nama pemilik rekening'),('number','Nomor rekening')]:
                runtime_fields.append((f'runtime_gift_{i}_{suffix}',f'Rekening {i}: {label}','text',''))
    runtime['fields'] = [dict(key=key,label=label,type=kind,default=default,target='runtime') for key,label,kind,default in runtime_fields]
    schema = {'version': 1, 'sections': [g for g in groups.values() if g['fields']], 'external_assets': slug in ('3','4')}
    return str(soup), schema


def get_theme_schema(slug):
    return copy.deepcopy(_compile(_slug(slug))[1])


def fields_for(schema):
    for group in schema.get('sections', []):
        yield from group.get('fields', [])


def _replace_names(value, slug, groom, bride):
    # Replace whole original names before aliases; multiline surname fragments
    # are cleared rather than attaching a different family's name to the client.
    exact = {
        'Pdt. Andi Dwi Pranata Ginting, M.Th.':groom,
        'Andi Dwi Pranata Ginting':groom,
        'Pdt. Andi Dwi Pranata':groom, 'Pdt. Andi Dwi':groom,
        'Pranata Ginting, M.Th.':'', 'Ginting, M.Th.':'',
        'Persada Sagala, S.P.':bride, 'Persada Sagala':bride,
        'Kelvin Rayner Christian Nainggolan':groom,
        'Kelvin Rayner Christian':groom, 'Kelvin Rayner':groom,
        'Christian Nainggolan':'', 'Nainggolan':'',
        'Chyntia Claudia Aritonang':bride, 'Chyntia Claudia':bride,
        'Aritonang':'', 'dr Dwi Endah Misdina':bride,
        'DWI ENDAH MISDINA':bride.upper(),
        'Evan Ahmad Al-Gafar Napitupulu':groom,
        'EVAN AHMAD AL GAFAR NAPITUPULU':groom.upper(),
    }
    if value in exact:
        return exact[value]
    pairs = [('Kelvin', groom), ('Chyntia', bride)] if slug in ('3','4') else [('Evan',groom),('Endah',bride)] if slug=='5' else [('Andi',groom),('Sada',bride)]
    replacements = {old.casefold():new for old,new in exact.items() if new and len(old.split())>2}
    replacements.update({old.casefold():new for old,new in pairs})
    pattern = r'(?<!\w)(?:'+'|'.join(re.escape(old) for old in sorted(replacements,key=len,reverse=True))+r')(?!\w)'
    def replace(match):
        replacement=replacements[match.group().casefold()]
        return replacement.upper() if match.group().isupper() else replacement
    # One pass ensures a new client name is never matched as another source alias.
    return re.sub(pattern,replace,value,flags=re.I)


def initial_content(theme, groom_name, bride_name):
    slug = _slug(theme.slug)
    content = {}
    for field in fields_for(theme.schema or get_theme_schema(slug)):
        value = field.get('default','')
        if field['type'] in ('text','textarea'):
            value = _replace_names(str(value),slug,groom_name,bride_name)
        if field.get('identity')=='groom_initial': value=groom_name[:1].upper()
        if field.get('identity')=='bride_initial': value=bride_name[:1].upper()
        content[field['key']] = value
    content['runtime_calendar_title'] = f'Pernikahan {groom_name} & {bride_name}'
    return content


def theme_preview(slug):
    _, schema = _compile(_slug(slug))
    for section in schema['sections']:
        if section['label'] in ('Sampul','Pembuka'):
            for field in section['fields']:
                if field['type']=='image' and field.get('target')=='image':
                    return field['default']
    return next((f['default'] for f in fields_for(schema) if f['type']=='image'),'')


def _rewrite_assets(soup, slug):
    for node in soup.find_all(True):
        if node.name == 'a' and node.get('href','').startswith(('https://','http://')):
            node['rel'] = 'noopener noreferrer'
        for attr in URL_ATTRS:
            if node.get(attr):
                node[attr] = asset_url(slug,node[attr])
        for attr in ('srcset','data-srcset'):
            if node.get(attr):
                entries=[]
                for item in node[attr].split(','):
                    parts=item.strip().split()
                    if parts:
                        entries.append(' '.join([asset_url(slug,parts[0]),*parts[1:]]))
                node[attr]=', '.join(entries)
        if node.get('style'):
            node['style']=re.sub(r'url\([\"\']?([^\)\"\']+)[\"\']?\)',lambda m:'url("'+asset_url(slug,m.group(1))+'")',node['style'])


def render_invitation(invitation, request=None, guest_name='', preview=False):
    slug = _slug(invitation.theme.slug)
    html, compiled_schema = _compile(slug)
    schema = compiled_schema  # never trust editable DB schema as HTML locators
    soup = BeautifulSoup(html,'html.parser')
    _rewrite_assets(soup,slug)
    nodes={node['data-rw-node']:node for node in soup.select('[data-rw-node]')}
    content=invitation.content or {}
    css=[]
    copy_pairs=[]
    for button in soup.select('[data-copy]'):
        card=button.find_parent(class_=lambda c:c and c in ('bank','bank-card'))
        number=card.select_one('.account, .account-number, .bank-number') if card else None
        if number:
            copy_pairs.append((button,number,button.get('data-copy',''),number.get_text(strip=True)))
    for field in fields_for(schema):
        key=field['key']
        value=str(content.get(key,field.get('default','')) or '')
        kind=field['type']
        if kind in ('url','image','audio','video'):
            value=safe_url(value,field.get('default',''))
        target=field.get('target')
        if target=='css-background':
            escaped=quote(value,safe='/:?=&%#@+;,~-_.')
            css.append(f'{field["selector"]}{{background-image:url("{escaped}")!important}}')
            continue
        node=nodes.get(field.get('node'))
        if node is None:
            continue
        if target=='text':
            child_index=field['child']
            if child_index<len(node.contents) and isinstance(node.contents[child_index],NavigableString):
                node.contents[child_index].replace_with(NavigableString(field.get('leading','')+value+field.get('trailing','')))
        elif target=='attr':
            node[field['attr']]=value
        elif target in ('image','media'):
            changed=value != field.get('default','')
            if node.has_attr('data-src'):
                node['data-src']=value
            if node.has_attr('src') or node.name in ('audio','source') or not node.has_attr('data-src'):
                node['src']=value
            if changed:
                node.attrs.pop('srcset',None)
                node.attrs.pop('data-srcset',None)
                if target=='image':
                    gallery=node.find_parent(attrs={'data-gallery':True})
                    if gallery:
                        gallery['data-gallery']=value
                        for attr in ('data-src','data-full'):
                            if gallery.has_attr(attr): gallery[attr]=value
                    parent=node.parent
                    if parent:
                        for fallback in parent.select('noscript img'):
                            fallback['src']=value
                            fallback.attrs.pop('srcset',None)
        elif target=='background':
            escaped=quote(value,safe='/:?=&%#@+;,~-_.')
            node['style']=re.sub(r'url\([\"\']?([^\)\"\']+)[\"\']?\)',f'url("{escaped}")',node.get('style',''),count=1)
    # Keep non-JavaScript image fallbacks synchronized with the editable image.
    for fallback in soup.select('noscript img'):
        wrapper=fallback.find_parent('noscript')
        real=next((img for img in wrapper.parent.select('img') if not img.find_parent('noscript')),None) if wrapper and wrapper.parent else None
        if real:
            fallback['src']=real.get('data-src') or real.get('src','')
            fallback['alt']=real.get('alt','')
            srcset=real.get('data-srcset') or real.get('srcset')
            if srcset: fallback['srcset']=srcset
            else: fallback.attrs.pop('srcset',None)
    # A bank number and its copy button must never disagree after a single edit.
    for button,number,original_copy,original_visible in copy_pairs:
        visible=number.get_text(strip=True)
        copied=button.get('data-copy','')
        if copied != original_copy and visible == original_visible:
            number.clear(); number.append(NavigableString(copied))
        else:
            button['data-copy']=visible
    # Disabled sections stay in DOM so original animation code can safely initialize.
    states=invitation.sections or {}
    for section in schema['sections']:
        if section.get('can_hide') and states.get(section['key']) is False:
            for node in soup.select(f'[data-rw-section="{section["key"]}"]'):
                node['hidden']=''
                node['aria-hidden']='true'
                node['data-rw-disabled']='true'
                node['style']=node.get('style','')+';display:none!important;'
            for anchor in soup.find_all('a',href='#'+section['key']):
                anchor['hidden']=''
                anchor['style']='display:none!important'
    # Names from query string are always plain text.
    guest=str(guest_name or 'Tamu Undangan')[:180]
    for node in soup.select('[data-guest], .guest-name'):
        node.clear(); node.append(NavigableString(guest))
    direct=soup.find(id='guestName')
    if direct and direct.name not in ('input','textarea'):
        direct.clear(); direct.append(NavigableString(guest))
    for selector in ('input[name="name"]','input#guestName','input#guest-name'):
        for node in soup.select(selector):
            node['value']=guest
            node['maxlength']='180'
    for node in soup.select('input#rsvpName, input#rsvp-name'):
        node['maxlength']='180'
    event_date=getattr(invitation,'event_date',None)
    runtime={
        'videoId':str(content.get('runtime_video_id','')),
        'calendarTitle':str(content.get('runtime_calendar_title',invitation.title)),
        'calendarLocation':str(content.get('runtime_calendar_location','')),
        'slides':[{'caption':str(content.get(f'runtime_slide_caption_{i}',f'Kenangan {i}'))} for i in range(1,4)],
        'giftAccounts':[{part:str(content.get(f'runtime_gift_{i}_{part}','')) for part in ('bank','name','number')} for i in range(1,(3 if slug == '3' else 4))
            if content.get(f'runtime_gift_{i}_number')],
    }
    audio=soup.find('audio')
    if audio:
        runtime['music']=audio.get('data-src') or audio.get('src') or ''
    data={
        'id':invitation.pk,'slug':invitation.slug,'themeSlug':slug,
        'guest':guest,'groomName':invitation.groom_name,'brideName':invitation.bride_name,
        'title':invitation.title,'eventDate':event_date.isoformat() if event_date else '',
        'rsvpUrl':f'/{invitation.slug}/rsvp/','wishesUrl':f'/{invitation.slug}/wishes/',
        'csrfToken':get_token(request) if request else '', 'preview':bool(preview), 'runtime':runtime,
    }
    # Botanical Portrait uses two deliberately styled gift cards.
    if slug == '3':
        gift_cards = soup.select('.gift-account, .bank-card')
        for extra_card in gift_cards[2:]:
            extra_card.decompose()

    # Give every invitation its own full-width guestbook page, separate from the RSVP form.
    # The public feed is invitation-scoped by the slug-specific wishes endpoint.
    # The bundled themes use several naming conventions. Resolve the form by
    # known IDs first, then fall back to a form inside an RSVP/wishes section so
    # newly added themes receive the same persisted guestbook automatically.
    rsvp_form = soup.select_one('#rsvpForm, #rsvp-form, form[data-rsvp-form], form[name="rsvp"]')
    if rsvp_form is None:
        rsvp_section_candidate = soup.select_one('section#rsvp, section#ucapan, section#wishes, section.rsvp, section.rsvp-section, [data-rsvp-section]')
        if rsvp_section_candidate:
            rsvp_form = rsvp_section_candidate.find('form')
    if rsvp_form is None:
        rsvp_form = next((form for form in soup.find_all('form') if any(token in ' '.join(form.get('class', [])).lower() for token in ('rsvp', 'wish', 'ucapan'))), None)
    if rsvp_form:
        # Hide legacy, theme-native guestbooks so there is one consistent persisted feed.
        for legacy in soup.select('#prayerBook, #wishesList, #wishPaginationWrap, .prayer-book, .legacy-guestbook, [data-legacy-guestbook]'):
            legacy['hidden'] = ''
            legacy['aria-hidden'] = 'true'
            legacy['style'] = (legacy.get('style', '') + ';display:none!important;')

        page = soup.new_tag('section', attrs={'id': 'rw-guestbook-page', 'class': 'rw-guestbook-page section-pad section-anchor', 'aria-labelledby': 'rw-guestbook-title', 'data-rw-guestbook-page': 'true'})
        guestbook = soup.new_tag('div', attrs={'class': 'rw-guestbook', 'data-rw-guestbook': 'true'})
        heading = soup.new_tag('div', attrs={'class': 'rw-guestbook-heading'})
        eyebrow = soup.new_tag('p', attrs={'class': 'rw-guestbook-eyebrow'}); eyebrow.string = 'DOA DARI KELUARGA & SAHABAT'
        title_node = soup.new_tag('h2', id='rw-guestbook-title'); title_node.string = 'Ucapan & doa'
        sub = soup.new_tag('p'); sub.string = 'Setiap doa tersimpan di halaman undangan ini.'
        heading.extend([eyebrow, title_node, sub])
        slider = soup.new_tag('div', attrs={'class': 'rw-wishes-slider', 'data-rw-wishes-slider': 'true'})
        prev = soup.new_tag('button', attrs={'type': 'button', 'class': 'rw-wishes-arrow', 'data-rw-wishes-prev': 'true', 'aria-label': 'Ucapan sebelumnya'}); prev.string = '←'
        track = soup.new_tag('div', attrs={'class': 'rw-wishes-track', 'data-rw-wishes-track': 'true', 'aria-live': 'polite', 'tabindex': '0', 'aria-label': 'Slider ucapan terbaru'})
        empty = soup.new_tag('p', attrs={'class': 'rw-wishes-empty'}); empty.string = 'Belum ada ucapan yang dibagikan.'
        track.append(empty)
        nxt = soup.new_tag('button', attrs={'type': 'button', 'class': 'rw-wishes-arrow', 'data-rw-wishes-next': 'true', 'aria-label': 'Ucapan berikutnya'}); nxt.string = '→'
        slider.extend([prev, track, nxt])
        controls = soup.new_tag('div', attrs={'class': 'rw-wishes-controls'})
        count = soup.new_tag('span', attrs={'data-rw-wishes-count': 'true'}); count.string = '0 ucapan'
        view_all = soup.new_tag('button', attrs={'type': 'button', 'class': 'rw-wishes-all', 'data-rw-wishes-all': 'true'}); view_all.string = 'Lihat semua ucapan'
        controls.extend([count, view_all]); guestbook.extend([heading, slider, controls]); page.append(guestbook)
        rsvp_section = rsvp_form.find_parent('section', id='rsvp') or rsvp_form.find_parent('section', class_='rsvp-section') or rsvp_form.find_parent('section')
        if rsvp_section:
            rsvp_section.insert_after(page)
        else:
            rsvp_form.insert_after(page)
        modal = soup.new_tag('div', attrs={'class': 'rw-wishes-modal', 'data-rw-wishes-modal': 'true', 'hidden': '', 'role': 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rw-wishes-modal-title'})
        dialog = soup.new_tag('div', attrs={'class': 'rw-wishes-dialog'})
        modal_head = soup.new_tag('div', attrs={'class': 'rw-wishes-modal-head'})
        modal_title = soup.new_tag('h2', id='rw-wishes-modal-title'); modal_title.string = 'Semua ucapan'
        close = soup.new_tag('button', attrs={'type': 'button', 'class': 'rw-wishes-close', 'data-rw-wishes-close': 'true', 'aria-label': 'Tutup ucapan'}); close.string = '×'
        modal_head.extend([modal_title, close])
        list_node = soup.new_tag('div', attrs={'class': 'rw-wishes-list', 'data-rw-wishes-list': 'true'})
        dialog.extend([modal_head, list_node]); modal.append(dialog); soup.body.append(modal)
        if soup.head:
            css_link = soup.new_tag('link', rel='stylesheet', href=static('studio/guestbook.css'))
            soup.head.append(css_link)

    json_node=soup.new_tag('script',id='rewamore-data',type='application/json')
    json_node.string=json.dumps(data,ensure_ascii=False).replace('<','\\u003C').replace('>','\\u003E').replace('&','\\u0026')
    bridge=soup.new_tag('script',src=static('studio/invitation.js'))
    if soup.head:
        soup.head.insert(0,bridge)
        soup.head.insert(0,json_node)
        if css:
            style=soup.new_tag('style');style.string='\n'.join(css);soup.head.append(style)
        # Social crawlers need metadata in the initial HTML and an absolute image URL.
        if request:
            origin = settings.PUBLIC_BASE_URL.rstrip('/') or request.build_absolute_uri('/').rstrip('/')
            def meta(prop, value):
                node = soup.find('meta', attrs={'property': prop})
                if node is None:
                    node = soup.new_tag('meta', property=prop)
                    soup.head.append(node)
                node['content'] = value
            image_meta = soup.find('meta', attrs={'property':'og:image'})
            image = image_meta.get('content', '') if image_meta else ''
            if not image:
                image = getattr(invitation.theme, 'preview_image', '') or theme_preview(slug)
            if image.startswith('/'):
                image = origin + image
            if image.startswith(('https://', 'http://')):
                meta('og:image', image)
            title = (f'Pratinjau {getattr(invitation.theme, "name", slug)} | Rewamore' if preview and invitation.pk is None
                     else f'{invitation.title} | Rewamore')
            existing_title = soup.find('meta', attrs={'property':'og:title'})
            existing_desc = soup.find('meta', attrs={'property':'og:description'})
            meta('og:title', existing_title.get('content') or title if existing_title else title)
            description = 'Lihat desain undangan digital Rewamore.' if preview else 'Dengan penuh sukacita, kami mengundang Anda untuk merayakan hari istimewa kami.'
            meta('og:description', existing_desc.get('content') or description if existing_desc else description)
            meta('og:type', 'website')
            meta('og:url', origin + request.path)
    return str(soup)
