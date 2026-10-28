# Revisi RSVP dan Buku Ucapan

## Perubahan
- Buku ucapan dipindahkan menjadi section halaman penuh tersendiri, terpisah dari formulir RSVP. Section ditempatkan setelah section RSVP agar alur halaman lebih jelas.
- Tampilan buku ucapan memakai slider horizontal berbentuk kartu, dengan tombol sebelumnya/berikutnya, scroll-snap, dan auto-slide ketika konten melampaui lebar tampilan.
- Empat ucapan terbaru ditampilkan pada slider. Tombol “Lihat semua ucapan” membuka modal yang memuat seluruh ucapan publik.
- Layout disesuaikan untuk desktop, tablet, dan ponsel, termasuk lebar kartu, jarak, tombol navigasi, serta daftar modal satu kolom pada layar sempit.
- Buku ucapan bawaan tema disembunyikan agar tidak tampil ganda dengan komponen bersama.
- RSVP dan ucapan tetap tersimpan pada model Attendance dengan foreign key ke Invitation. Endpoint RSVP dan ucapan menggunakan slug undangan tertentu, sehingga data dua klien yang memakai tema sama tidak tercampur.
- Ucapan hanya masuk feed publik bila tamu menyetujui publikasi. RSVP tanpa persetujuan tetap tersimpan sebagai data privat undangan.
- Menambahkan tes otomatis yang memeriksa pemisahan feed ucapan untuk dua undangan dengan tema yang sama.

## Pemeriksaan
- `python -m compileall -q invitations config` berhasil.
- `node --check static/studio/invitation.js` berhasil.
- Pengujian Django belum bisa dijalankan pada lingkungan ini karena paket Django tidak terpasang. Setelah dependensi proyek dipasang, jalankan `python manage.py check` dan `python manage.py test invitations.tests.test_workflow`.
