# Revisi Mobile Guestbook dan RSVP

## Perubahan
- Memperbaiki slider guestbook pada layar ponsel dengan grid tiga kolom: tombol kiri, area kartu yang fleksibel, tombol kanan.
- Membatasi lebar card agar tidak melampaui track atau layar dan menghilangkan minimum-width yang membuat tombol tertutup.
- Memperkecil ukuran kartu dan tombol pada layar kecil, menjaga heading di tengah, dan mencegah horizontal overflow.
- Menghapus checkbox dan teks persetujuan publikasi dari formulir RSVP.
- Setiap pesan ucapan yang tidak kosong otomatis ditandai untuk tampil pada guestbook undangan terkait; RSVP tanpa pesan tetap tersimpan tetapi tidak membuat kartu ucapan kosong.
- Memperbarui tes alur RSVP agar mencerminkan perilaku tanpa checkbox.

## Pemeriksaan
- `python -m py_compile invitations/forms.py invitations/views.py invitations/theme_engine.py` berhasil.
- `node --check static/studio/invitation.js` berhasil.
- `python manage.py check` belum dapat dijalankan karena Django tidak terpasang di lingkungan pemeriksaan (`ModuleNotFoundError: django`).

## Penerapan
Jalankan migrasi yang diperlukan bila ada, kemudian `python manage.py check` dan tes workflow setelah dependensi proyek terpasang. Restart server dan lakukan hard refresh pada browser ponsel.
