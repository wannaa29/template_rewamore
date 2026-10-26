"""Copy the ten supplied themes without changing their visual design.
Run only when importing the original template.zip again. The shared runtime patches are automatically applied after the fresh copy.
"""
from pathlib import Path
import argparse
import shutil
import re

SOURCE_LOCATIONS = {'1':'1/dist','2':'2/dist','3':'3/kelvin-chyntia/dist','4':'4/dist','5':'5','6':'6','7':'7','8':'8','9':'9','10':'10/dist'}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--project', type=Path, default=Path(__file__).resolve().parents[1])
    args=parser.parse_args()
    for slug, location in SOURCE_LOCATIONS.items():
        source=args.source/location
        runtime=args.project/'static'/'themes'/slug
        originals=args.project/'theme_sources'/slug
        docs=args.project/'docs'/'themes'/slug
        runtime.mkdir(parents=True,exist_ok=True)
        originals.mkdir(parents=True,exist_ok=True)
        docs.mkdir(parents=True,exist_ok=True)
        shutil.copy2(source/'index.html', originals/'index.html')
        index_html=(source/'index.html').read_text(encoding='utf-8')
        inline_number=0
        for match in re.finditer(r'<script(?![^>]*\bsrc\s*=)[^>]*>(.*?)</script\s*>',index_html,re.S|re.I):
            if match.group(1).strip():
                inline_number+=1
                (runtime/f'source-inline-{inline_number}.js').write_text(match.group(1),encoding='utf-8')
        for path in source.rglob('*'):
            if not path.is_file() or path.name=='index.html':
                continue
            relative=path.relative_to(source)
            if any(part.startswith('.') for part in relative.parts):
                continue
            if path.suffix.lower() in {'.js','.css','.jpg','.jpeg','.png','.webp','.gif','.svg','.mp3','.mp4','.wav','.ogg','.woff','.woff2','.ttf','.otf','.txt','.json'}:
                target=runtime/relative
                target.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(path,target)
        for path in (args.source/slug).rglob('*.md'):
            target=docs/path.name
            shutil.copy2(path,target)
        print(f'Theme {slug}: {source} -> {runtime}')
    from patch_theme_runtime import patch_all
    patch_all(args.project/'static'/'themes')

if __name__=='__main__': main()
