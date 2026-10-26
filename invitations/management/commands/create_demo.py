from datetime import datetime
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from invitations.models import Guest, Invitation, Theme
from invitations.theme_engine import initial_content


class Command(BaseCommand):
    help = "Buat contoh undangan draf untuk akun yang sudah ada, tanpa membuat password bawaan."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--theme", default="1")

    def handle(self, *args, **options):
        try:
            user = get_user_model().objects.get(username=options["username"])
            theme = Theme.objects.get(slug=options["theme"])
        except get_user_model().DoesNotExist as exc:
            raise CommandError("Akun tidak ditemukan. Jalankan createsuperuser terlebih dahulu.") from exc
        except Theme.DoesNotExist as exc:
            raise CommandError("Tema tidak ditemukan. Jalankan import_themes terlebih dahulu.") from exc
        invitation, created = Invitation.objects.get_or_create(slug="riswan-dan-iin", defaults={"owner": user, "theme": theme, "title": "Pernikahan Riswan & Iin", "groom_name": "Riswan", "bride_name": "Iin", "event_date": datetime(2027, 6, 19, 10, 0, tzinfo=ZoneInfo("Asia/Jakarta")), "content": initial_content(theme, "Riswan", "Iin")})
        if invitation.owner_id != user.pk:
            raise CommandError("Slug contoh telah dipakai akun lain. Data tidak diubah.")
        if created:
            for name in ["Adrian dan Pasangan", "Iin Sinurat dan Pasangan"]:
                Guest.objects.create(invitation=invitation, name=name)
        self.stdout.write(self.style.SUCCESS(f"Contoh {'dibuat' if created else 'sudah tersedia'} sebagai {invitation.get_status_display()}: /dashboard/{invitation.pk}/edit/"))

