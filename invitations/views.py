import csv
import hashlib
import io
import ipaddress
import re
from datetime import date, datetime
from urllib.parse import quote

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.clickjacking import xframe_options_sameorigin
from PIL import Image, ImageOps

from .forms import AttendanceForm, BulkGuestForm, InvitationForm, SectionForm
from .models import Attendance, Guest, Invitation, MediaAsset, Theme
from .theme_engine import initial_content, render_invitation


def owned_invitation(request, pk):
    return get_object_or_404(Invitation.objects.select_related("theme"), pk=pk, owner=request.user)


def base_url(request):
    return settings.PUBLIC_BASE_URL.rstrip("/") or request.build_absolute_uri("/").rstrip("/")


def limited(request, scope, limit, seconds):
    # REMOTE_ADDR is populated by the trusted reverse proxy. Never trust a
    # client-supplied X-Forwarded-For without enforcing the proxy boundary.
    identity = request.META.get("REMOTE_ADDR", "unknown")
    if getattr(settings, "TRUST_PROXY", False):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        try:
            identity = str(ipaddress.ip_address(forwarded))
        except ValueError:
            pass
    key = "rewamore:rate:" + hashlib.sha256(f"{scope}:{identity}".encode()).hexdigest()
    if cache.add(key, 1, seconds):
        return False
    try:
        return cache.incr(key) > limit
    except ValueError:
        cache.set(key, 1, seconds)
        return False


@login_required
def dashboard(request):
    invitations = Invitation.objects.filter(owner=request.user).select_related("theme").annotate(guest_count=Count("guests", distinct=True), response_count=Count("responses", distinct=True))
    stats = {
        "total": invitations.count(),
        "published": invitations.filter(status=Invitation.Status.PUBLISHED).count(),
        "draft": invitations.filter(status=Invitation.Status.DRAFT).count(),
        "guests": Guest.objects.filter(invitation__owner=request.user).count(),
    }
    return render(request, "studio/dashboard.html", {"invitations": invitations, "stats": stats})


@login_required
def themes(request):
    return render(request, "studio/themes.html", {"themes": Theme.objects.all()})


@login_required
@never_cache
@xframe_options_sameorigin
def theme_preview(request, theme_slug):
    theme = get_object_or_404(Theme, slug=theme_slug)
    invitation = Invitation(owner=request.user, theme=theme, title="Pratinjau tema", groom_name="Riswan", bride_name="Iin", slug="pratinjau-tema", content=initial_content(theme, "Riswan", "Iin"), sections={})
    html = render_invitation(invitation, request=request, guest_name="Adrian dan Pasangan", preview=True)
    return HttpResponse(html)


@login_required
def create(request, theme_slug):
    theme = get_object_or_404(Theme, slug=theme_slug)
    form = InvitationForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        invitation = form.save(commit=False)
        invitation.owner = request.user
        invitation.theme = theme
        invitation.content = initial_content(theme, invitation.groom_name, invitation.bride_name)
        try:
            with transaction.atomic():
                invitation.save()
        except IntegrityError:
            form.add_error("slug", "Alamat sudah dipakai. Pilih alamat lain.")
        else:
            messages.success(request, "Undangan dibuat sebagai draf. Sesuaikan setiap bagian sebelum menerbitkan.")
            return redirect("invitations:edit", pk=invitation.pk)
    return render(request, "studio/create.html", {"form": form, "theme": theme})


@login_required
def invitation_settings(request, pk):
    invitation = owned_invitation(request, pk)
    old_names = (invitation.groom_name, invitation.bride_name)
    form = InvitationForm(request.POST or None, instance=invitation)
    if request.method == "POST" and form.is_valid():
        try:
            with transaction.atomic():
                updated = form.save(commit=False)
                # Replace complete names in editable prose, including composite
                # cover/footer/calendar titles. Leave URLs and image filenames
                # untouched; substitution is simultaneous to prevent cascading.
                mapping = {old.casefold(): new for old, new in zip(old_names, (updated.groom_name, updated.bride_name)) if old}
                pattern = re.compile(r"(?<!\w)(?:" + "|".join(re.escape(name) for name in sorted(mapping, key=len, reverse=True)) + r")(?!\w)", re.IGNORECASE)
                def replace_name(match):
                    old = match.group(0)
                    new = mapping.get(old.casefold(), old)
                    return new.upper() if old.isupper() else new.lower() if old.islower() else new
                text_keys = {field["key"] for section in updated.theme.schema.get("sections", []) for field in section.get("fields", []) if field.get("type") in {"text", "textarea"}}
                updated.content = {key: pattern.sub(replace_name, value) if key in text_keys and isinstance(value, str) else value for key, value in updated.content.items()}
                for section in updated.theme.schema.get("sections", []):
                    for field in section.get("fields", []):
                        identity = field.get("identity")
                        if identity in {"groom_initial", "bride_initial"}:
                            name = updated.groom_name if identity == "groom_initial" else updated.bride_name
                            updated.content[field["key"]] = name[:1].upper()
                updated.save()
        except IntegrityError:
            form.add_error("slug", "Alamat sudah dipakai. Pilih alamat lain.")
        else:
            messages.success(request, "Pengaturan disimpan. Nama pada teks undangan ikut diperbarui; periksa kembali nama lengkap setiap mempelai.")
            return redirect("invitations:settings", pk=invitation.pk)
    return render(request, "studio/create.html", {"form": form, "theme": invitation.theme, "invitation": invitation})


def save_asset(invitation, upload, kind):
    name = upload.name
    if kind == "image":
        # Re-encode images to discard appended executable content and EXIF.
        with Image.open(upload) as original:
            image = ImageOps.exif_transpose(original)
            output = io.BytesIO()
            has_alpha = "A" in image.getbands() or "transparency" in image.info
            image.convert("RGBA" if has_alpha else "RGB").save(output, format="WEBP", quality=90)
        upload = ContentFile(output.getvalue(), name="photo.webp")
    asset = MediaAsset(owner=invitation.owner, invitation=invitation, file=upload, kind=kind, original_name=name[:250])
    asset.full_clean()
    asset.save()
    return asset.file.url


@login_required
def edit(request, pk):
    invitation = owned_invitation(request, pk)
    sections = invitation.theme.schema.get("sections", [])
    if not sections:
        messages.error(request, "Tema belum mempunyai skema. Jalankan perintah import_themes.")
        return redirect("invitations:dashboard")
    section_key = request.GET.get("section", sections[0]["key"])
    active = next((s for s in sections if s["key"] == section_key), None)
    if not active:
        raise Http404("Bagian tidak ditemukan")
    form = SectionForm(request.POST or None, request.FILES or None, section=active, invitation=invitation)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            # Lock before merging one section so parallel edits to different
            # sections do not overwrite the whole saved JSON document.
            current = Invitation.objects.select_for_update().get(pk=invitation.pk, owner=request.user)
            content = dict(current.content)
            for field in active.get("fields", []):
                key, kind = field["key"], field.get("type", "text")
                value = form.cleaned_data.get(f"field_{key}", "")
                if isinstance(value, (date, datetime)):
                    value = value.isoformat()
                if value is None:
                    value = ""
                upload = form.cleaned_data.get(f"upload_{key}")
                if upload:
                    value = save_asset(current, upload, kind)
                content[key] = value
            current.content = content
            enabled = form.cleaned_data["section_enabled"] if active.get("can_hide", True) else True
            current.sections = dict(current.sections, **{active["key"]: enabled})
            current.save(update_fields=["content", "sections", "updated_at"])
        messages.success(request, f'Bagian "{active["label"]}" berhasil disimpan.')
        return redirect(reverse("invitations:edit", args=[pk]) + "?section=" + quote(section_key))
    editor_fields = []
    for field in active.get("fields", []):
        key = field["key"]
        editor_fields.append({**field, "value": invitation.content.get(key, field.get("default", "")), "bound": form[f"field_{key}"], "upload": form[f"upload_{key}"] if f"upload_{key}" in form.fields else None})
    return render(request, "studio/edit.html", {"invitation": invitation, "sections": sections, "active_section": active, "form": form, "editor_fields": editor_fields, "public_url": invitation.public_url(base_url(request))})


@login_required
@require_POST
def publish(request, pk):
    invitation = owned_invitation(request, pk)
    action = request.POST.get("action", "publish")
    if action not in {"publish", "unpublish"}:
        return HttpResponse("Aksi tidak dikenali.", status=400)
    invitation.status = Invitation.Status.PUBLISHED if action == "publish" else Invitation.Status.DRAFT
    invitation.save(update_fields=["status", "updated_at"])
    messages.success(request, "Undangan diterbitkan dan siap dibagikan." if action == "publish" else "Undangan dikembalikan menjadi draf. Tautan publik dinonaktifkan.")
    return redirect("invitations:guests", pk=pk)


@login_required
@require_POST
def duplicate(request, pk):
    original = owned_invitation(request, pk)
    import uuid
    clone = Invitation.objects.create(owner=request.user, theme=original.theme, title=(original.title[:145] + " (Salinan)"), groom_name=original.groom_name, bride_name=original.bride_name, slug=original.slug[:145] + "-" + uuid.uuid4().hex[:8], event_date=original.event_date, content=original.content, sections=original.sections, status=Invitation.Status.DRAFT)
    messages.success(request, "Salinan draf dibuat. Daftar tamu dan konfirmasi tidak ikut disalin.")
    return redirect("invitations:settings", pk=clone.pk)


@login_required
@require_POST
def delete(request, pk):
    invitation = owned_invitation(request, pk)
    invitation.delete()
    messages.success(request, "Undangan telah dihapus. Tautan publiknya tidak lagi tersedia.")
    return redirect("invitations:dashboard")


@login_required
def guests(request, pk):
    invitation = owned_invitation(request, pk)
    if request.method == "POST" and request.POST.get("action") == "delete":
        try:
            guest_id = int(request.POST.get("guest_id", ""))
        except (ValueError, TypeError):
            raise Http404("Tamu tidak ditemukan")
        get_object_or_404(Guest, pk=guest_id, invitation=invitation).delete()
        messages.success(request, "Nama tamu dihapus dari daftar.")
        return redirect("invitations:guests", pk=pk)
    form = BulkGuestForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        if invitation.guests.count() + len(form.cleaned_data["names"]) > 10000:
            form.add_error("names", "Satu undangan dibatasi 10.000 nama tamu.")
        else:
            added = 0
            with transaction.atomic():
                for name in form.cleaned_data["names"]:
                    _, created = Guest.objects.get_or_create(invitation=invitation, name_key=name.casefold(), defaults={"name": name})
                    added += created
            messages.success(request, f"{added} nama baru ditambahkan. Nama duplikat dilewati.")
            return redirect("invitations:guests", pk=pk)
    records = invitation.guests.all()
    guest_rows = []
    for guest in records:
        url = guest.invitation_url(base_url(request))
        message = f"Yth. {guest.name}, dengan hormat kami mengundang Anda dalam pernikahan {invitation.groom_name} dan {invitation.bride_name}. Silakan membuka undangan berikut: {url}"
        guest_rows.append({"guest": guest, "url": url, "whatsapp_url": "https://wa.me/?text=" + quote(message, safe="")})
    return render(request, "studio/guests.html", {"invitation": invitation, "form": form, "guests": records, "guest_rows": guest_rows, "public_url": invitation.public_url(base_url(request)), "responses": invitation.responses.all()[:200]})


def csv_safe(value):
    value = str(value)
    return "'" + value if value.startswith(("=", "+", "-", "@", "\t", "\r")) else value


@login_required
@require_GET
def export_guests(request, pk):
    invitation = owned_invitation(request, pk)
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="tamu-{invitation.slug}.csv"'
    response.write("\ufeff")
    writer = csv.writer(response)
    writer.writerow(["Nama tamu", "Tautan undangan"])
    for guest in invitation.guests.all():
        writer.writerow([csv_safe(guest.name), guest.invitation_url(base_url(request))])
    return response


@login_required
@never_cache
@xframe_options_sameorigin
def preview(request, pk):
    invitation = owned_invitation(request, pk)
    return HttpResponse(render_invitation(invitation, request=request, guest_name=request.GET.get("to", "Adrian dan Pasangan")[:180], preview=True))


@require_GET
@never_cache
def public(request, slug):
    invitation = get_object_or_404(Invitation.objects.select_related("theme"), slug=slug, status=Invitation.Status.PUBLISHED)
    guest_name = request.GET.get("to", "Tamu Undangan")[:180]
    return HttpResponse(render_invitation(invitation, request=request, guest_name=guest_name, preview=False))


@require_POST
def rsvp(request, slug):
    invitation = get_object_or_404(Invitation, slug=slug, status=Invitation.Status.PUBLISHED)
    if limited(request, f"rsvp:{invitation.pk}", 10, 600):
        return JsonResponse({"ok": False, "message": "Terlalu banyak kiriman. Coba kembali dalam beberapa menit."}, status=429)
    form = AttendanceForm(request.POST)
    if not form.is_valid():
        return JsonResponse({"ok": False, "message": "Periksa kembali nama dan konfirmasi kehadiran Anda.", "errors": form.errors}, status=400)
    attendance = form.save(commit=False)
    attendance.invitation = invitation
    attendance.save()
    return JsonResponse({"ok": True, "message": "Terima kasih, konfirmasi Anda telah tersimpan."}, status=201)


@require_GET
@never_cache
def wishes(request, slug):
    invitation = get_object_or_404(Invitation, slug=slug, status=Invitation.Status.PUBLISHED)
    items = invitation.responses.filter(publish_message=True).exclude(message="")[:50]
    return JsonResponse({"wishes": [{"name": item.name, "message": item.message, "attendance": item.attendance, "created_at": item.created_at.isoformat()} for item in items]})

