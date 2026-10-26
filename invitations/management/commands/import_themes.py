from django.core.management.base import BaseCommand
from invitations.models import Theme
from invitations.theme_engine import THEMES, get_theme_schema, theme_preview

class Command(BaseCommand):
    help = 'Import/update the ten bundled invitation theme schemas without changing invitation content.'

    def handle(self, *args, **options):
        for slug, (name, description) in THEMES.items():
            obj, created = Theme.objects.update_or_create(slug=slug, defaults={
                'name':name, 'description':description,
                'schema':get_theme_schema(slug), 'preview_image':theme_preview(slug),
            })
            sections=obj.schema['sections']
            self.stdout.write(f'{slug}. {name}: {len(sections)} sections, {sum(len(s["fields"]) for s in sections)} editable fields')
        self.stdout.write(self.style.SUCCESS('All ten themes ready.'))
