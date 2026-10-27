# Pembaruan editor contoh tema

1. Cadangkan database dan media sebelum memperbarui aplikasi. Salin kode proyek baru tanpa mengganti database atau folder media yang sudah ada.
2. Pasang dependensi dari requirements.txt, jalankan `python manage.py migrate`, lalu `python manage.py collectstatic --noinput`. Mulai ulang layanan aplikasi sesuai dokumen DEPLOY_VPS.md. Tidak perlu menjalankan import_themes jika tema sudah tersedia.
3. Akun pengelola harus memiliki status staff (`is_staff=True`). Menu Koleksi tema menampilkan tombol Edit preview bagi akun staff. Pengelola dapat mengubah setiap bagian dan menyimpannya; tautan Lihat desain tetap terbuka tanpa login. Isian contoh ini terpisah dari undangan klien yang dibuat melalui Gunakan tema.
4. Pastikan PUBLIC_BASE_URL berisi alamat HTTPS publik dan media di /media/ disajikan oleh server web sesuai konfigurasi deploy. Gambar thumbnail dan media yang diunggah harus dapat diakses tanpa login oleh crawler. WhatsApp dapat menyimpan thumbnail lama dalam cache; periksa menggunakan tautan yang dapat diakses publik.
5. Berkas contoh disimpan di bawah media/theme-examples/; sertakan folder media dalam pencadangan. Jangan menghapus file yang masih digunakan oleh preview.
