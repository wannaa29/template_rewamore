# Catatan Revisi Rewamore

## Perubahan
- Memastikan preview editor memakai URL dengan cache-buster saat halaman editor dibuka, sehingga perubahan yang sudah disimpan tidak bergantung pada cache iframe.
- Mempertahankan monogram yang disimpan pada konten tema; runtime tidak lagi menimpa monogram pilihan klien dengan inisial nama otomatis.
- Menambahkan aturan responsive bersama untuk membungkus nama panjang dan mencegah judul pasangan melebar keluar layar pada perangkat mobile.
- Menambahkan komponen ucapan bersama di bawah formulir RSVP pada seluruh tema yang memiliki formulir RSVP.
- Komponen ucapan menampilkan empat ucapan terbaru, berotasi otomatis dari kanan ke kiri jika jumlah ucapan lebih dari empat, dan membuka modal berisi seluruh ucapan ketika kartu atau tombol “Lihat semua ucapan” dipilih.
- Ucapan hanya dimuat dari kiriman yang menyetujui publikasi. Data ucapan ditampilkan menggunakan textContent agar teks tamu tidak dieksekusi sebagai HTML.
- Tema 3 menggunakan maksimal dua rekening hadiah pada konfigurasi runtime dan editor.
- Endpoint ucapan mengembalikan seluruh ucapan publik, bukan membatasi daftar menjadi 50 item.

## Pemeriksaan
- Pemeriksaan sintaks Python (`compileall`) berhasil.
- Pemeriksaan sintaks JavaScript dengan `node --check` berhasil untuk runtime undangan dan studio.
- Pemeriksaan struktur HTML statis memastikan kesepuluh sumber tema memiliki formulir RSVP.
- Pemeriksaan Django end-to-end belum dapat dijalankan di lingkungan ini karena paket Django tidak tersedia di runtime. Jalankan `pip install -r requirements.txt`, kemudian `python manage.py check` dan tes proyek sebelum deploy.
