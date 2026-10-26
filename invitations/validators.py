"""Validation shared by studio forms and persisted upload records."""
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlsplit

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError


RESERVED_SLUGS = {"dashboard", "admin", "accounts", "static", "media", "health", "robots.txt", "favicon.ico"}


def validate_invitation_slug(value):
    if value.lower() in RESERVED_SLUGS:
        raise ValidationError("Alamat ini dipakai oleh sistem. Pilih alamat undangan lain.")


def normalized_guest_name(value):
    return " ".join(unicodedata.normalize("NFKC", value).split())


def validate_content_url(value):
    if not value:
        return
    if any(ord(char) < 32 for char in value) or "\\" in value:
        raise ValidationError("Tautan mengandung karakter yang tidak diperbolehkan.")
    try:
        parsed = urlsplit(value)
        _ = parsed.port
    except ValueError as exc:
        raise ValidationError("Format alamat atau port pada tautan tidak valid.") from exc
    if value.startswith("#"):
        return
    if value.startswith(("/static/", "/media/")) and not parsed.netloc:
        return
    if parsed.scheme in {"https", "http"} and parsed.hostname and not any(c.isspace() for c in parsed.netloc) and not parsed.username and not parsed.password:
        return
    if parsed.scheme == "mailto" and "@" in parsed.path:
        return
    if parsed.scheme == "tel" and re.fullmatch(r"[+0-9() .-]+", parsed.path):
        return
    raise ValidationError("Gunakan tautan http/https, mailto, tel, atau aset yang telah diunggah.")


def validate_upload(file, kind):
    limits = {"image": 10, "audio": 20, "video": 50}
    extensions = {"image": {".jpg", ".jpeg", ".png", ".webp"}, "audio": {".mp3", ".wav", ".ogg"}, "video": {".mp4", ".webm"}}
    if kind not in limits:
        raise ValidationError("Jenis unggahan tidak dikenali.")
    if file.size > limits[kind] * 1024 * 1024:
        raise ValidationError(f"Ukuran berkas maksimal {limits[kind]} MB.")
    ext = Path(file.name).suffix.lower()
    if ext not in extensions[kind]:
        raise ValidationError("Format berkas tidak sesuai. SVG dan berkas HTML tidak diperbolehkan.")
    try:
        if kind == "image":
            with Image.open(file) as image:
                if image.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ValidationError("Gunakan gambar JPEG, PNG, atau WebP.")
                if image.width * image.height > 40_000_000:
                    raise ValidationError("Resolusi gambar maksimal 40 megapiksel.")
                image.verify()
        else:
            signature = file.read(32)
            good = (
                (ext == ".mp3" and (signature.startswith(b"ID3") or (len(signature) > 1 and signature[0] == 255 and signature[1] & 224 == 224)))
                or (ext == ".wav" and signature.startswith(b"RIFF") and signature[8:12] == b"WAVE")
                or (ext == ".ogg" and signature.startswith(b"OggS"))
                or (ext == ".mp4" and signature[4:8] == b"ftyp")
                or (ext == ".webm" and signature.startswith(b"\x1aE\xdf\xa3"))
            )
            if not good:
                raise ValidationError("Isi berkas tidak cocok dengan format audio/video yang dipilih.")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValidationError("Berkas gambar rusak atau tidak dapat dibaca.") from exc
    finally:
        file.seek(0)

