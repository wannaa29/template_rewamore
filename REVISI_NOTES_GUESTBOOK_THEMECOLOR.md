# Revisi Guestbook Semua Tema

Perubahan terbaru:
- Menyembunyikan heading guestbook lama seperti `Words of love` yang tampil terpisah di beberapa tema.
- Judul guestbook bersama diganti menjadi **Words of love.** dan ditempatkan di dalam card/section guestbook.
- Heading guestbook dipusatkan agar lebih rapi.
- Tombol navigasi slider dipaksa tampil horizontal kiri-kanan melalui layout flex yang lebih robust.
- Menambahkan `data-rw-theme-slug` agar warna guestbook mengikuti kelompok warna tema (burgundy, sage/green, ivory, noir).
- Modal daftar semua ucapan ikut mewarisi warna tema.
- Override khusus Template 5 diperbarui agar kontrol guestbook tidak lagi tersusun vertikal.

Pemeriksaan:
- `python -m py_compile invitations/theme_engine.py` berhasil.

Langkah setelah deploy:
- Jalankan `python manage.py import_themes`
- Hard refresh browser untuk membersihkan cache CSS/JS.
