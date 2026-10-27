# Perbaikan CSRF dan login bersamaan

Tanggal verifikasi: 27 Oktober 2026. Perubahan diterapkan pada kode dalam ZIP ini; server/domain produksi belum diakses atau diperbarui.

## Yang diperbaiki

1. **Pengguna satu Wi-Fi tidak lagi berbagi kuota login.** Sebelumnya, semua POST login dari satu IP dihitung, termasuk login berhasil. Pengguna ke-11 dalam lima menit mendapat HTTP 429. Pengujian sebelum perbaikan berhasil mereproduksi masalah ini. Sekarang hanya kegagalan autentikasi yang dihitung, per pasangan akun dan IP. Login berhasil menghapus hitungan kegagalan pasangan tersebut.
2. **Formulir login mengambil token CSRF terbaru sebelum mengirim.** Ini menangani formulir lama/tab lain dan dua tab yang pertama kali dibuka sebelum cookie tersedia. Jika token berubah di antara pengambilan token dan POST, browser mencoba ulang satu kali dengan token baru. Permintaan dari origin/referer yang salah, kata sandi salah, jaringan terputus, dan pembatas percobaan tidak dicoba ulang otomatis.
3. **Tombol login mencegah pengiriman ganda.** Gangguan jaringan menampilkan pesan dan membuka kembali tombol. Tanpa JavaScript, form POST Django tetap bisa digunakan. Jika token native kedaluwarsa, tampil form baru dengan pesan yang jelas; pengguna perlu memasukkan kata sandi kembali.
4. **Konfigurasi domain tidak mudah berbeda-beda.** Origin pada `PUBLIC_BASE_URL` otomatis masuk `CSRF_TRUSTED_ORIGINS`, dan hostname-nya masuk `ALLOWED_HOSTS`. Origin tambahan tetap harus disebutkan secara eksplisit. HTTP lokal dan HTTPS produksi tetap menggunakan pengaturan cookie masing-masing.
5. **Contoh konfigurasi lokal disertakan.** `.env.example` yang dirujuk script setup tidak tersedia di ZIP awal; file itu sekarang tersedia. Database, akun, dan kata sandi tidak disertakan.

Middleware CSRF, pemeriksaan Origin/Referer, validasi kata sandi, pergantian token saat login, dan pemeriksaan tujuan `next` tetap aktif. Tidak ada `csrf_exempt` atau penerimaan ulang POST yang ditolak di sisi server. Kata sandi tidak dimasukkan ke URL, respons, atau penyimpanan browser.

## Memasang pembaruan

1. Cadangkan instalasi dan database/media yang sekarang.
2. Ekstrak ZIP ke folder sementara, lalu salin kode ke folder aplikasi. **Pertahankan `.env`, `var/`, dan volume database/media milik instalasi lama.** Jangan menggantinya dengan file contoh.
3. Periksa `.env` produksi. Contoh berikut harus disesuaikan dengan domain sebenarnya:

   ```dotenv
   DEBUG=False
   DOMAIN=rewamore.my.id
   PUBLIC_BASE_URL=https://rewamore.my.id
   ALLOWED_HOSTS=rewamore.my.id
   CSRF_TRUSTED_ORIGINS=https://rewamore.my.id
   TRUST_PROXY=True
   ```

   `TRUST_PROXY=True` digunakan dengan reverse proxy yang menimpa header forwarding, seperti Caddy pada paket ini. Pertahankan `SECRET_KEY` dan `POSTGRES_PASSWORD` yang sudah ada. Seluruh proses/instance aplikasi harus memakai `SECRET_KEY` yang sama dan database sesi bersama. Jangan mengubah cookie produksi menjadi tidak aman atau menggunakan wildcard CSRF untuk menyelesaikan masalah domain.

4. Untuk Docker Compose:

   ```bash
   docker compose up -d --build
   docker compose exec web python manage.py check --deploy
   ```

   Entrypoint otomatis menjalankan migrasi dan `collectstatic`. Tidak ada migrasi model baru dari perbaikan ini. Untuk instalasi tanpa Docker, jalankan `python manage.py collectstatic --noinput`, lalu restart proses Django/Gunicorn dengan konfigurasi yang benar.

5. Jika memakai CDN, kosongkan cache halaman login lama dan atur bypass cache untuk `/accounts/*`, `/dashboard/*`, `/admin/*`. Buka ulang halaman login melalui HTTPS pada domain yang sama. Pastikan cookie diizinkan. Uji dua akun dari perangkat berbeda.

Produksi menggunakan PostgreSQL sesuai `compose.yaml`; SQLite disediakan untuk percobaan lokal. Banyak perangkat/browser memiliki sesi sendiri. Tab dalam satu profil browser berbagi cookie dan satu identitas login; gunakan profil atau browser berbeda untuk dua akun berbeda pada komputer yang sama.

## Hasil verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| Suite Django dengan tes regresi login dan CSRF aktif | 49 tes lulus (32 sebelumnya + 17 baru) |
| Formulir JavaScript: token terbaru, klik ganda, retry terbatas, gangguan jaringan, dan redirect | 9 tes lulus |
| HTTP serentak melalui 3 proses Gunicorn | 24 akun berbeda berhasil login dari satu IP |
| HTTP serentak memakai akun yang sama | 24 sesi/perangkat berhasil login dari satu IP |
| Logout satu perangkat | Sesi perangkat lain tetap aktif |
| Uji HTTP alur undangan | Login, pembuatan, tamu/CSV, publikasi, dan RSVP lulus |
| Pemeriksaan Django dan `check --deploy` | Lulus tanpa masalah |
| Konsistensi migrasi | Tidak ada perubahan model tertinggal |

Uji HTTP serentak menggunakan cookie jar independen, database/cache sementara, dan kata sandi acak dengan autentikasi Django normal. Setelah satu percobaan awal kehilangan sesi pada pemeriksaan dashboard, empat pengulangan dengan log lebih rinci lulus berturut-turut; kegagalan awal belum dapat direproduksi kembali. Pengujian ini membuktikan skenario yang dijalankan, bukan jaminan kapasitas tanpa batas atau keberhasilan pada semua konfigurasi hosting. PostgreSQL, Caddy, HTTPS/DNS produksi, dan browser nyata pada perangkat pengguna belum diuji dari lingkungan ini. Uji JavaScript menggunakan jsdom.

## Mengulang pengujian

```bash
python manage.py test invitations
python scripts/smoke_login_concurrent.py
python scripts/smoke_http.py
python manage.py check
python manage.py check --deploy
python manage.py makemigrations --check --dry-run
npm ci
npm run test:login
```

Jalankan `check --deploy` dengan `.env` produksi. Uji HTTP membuat database/cache sementara dan tidak memakai data pengguna yang sudah ada. Node.js hanya diperlukan untuk uji DOM.

## Berkas utama yang berubah

- `invitations/auth.py`: token endpoint, respons JSON/form, pesan kegagalan CSRF, dan kuota kegagalan autentikasi.
- `invitations/views.py`: fungsi pembentukan kunci pembatas dipakai ulang; perilaku batas RSVP tetap sama.
- `config/settings.py`, `config/urls.py`: konfigurasi origin, CSRF failure view, dan URL token.
- `templates/registration/login.html`, `static/studio/login.js`: pembaruan token dan pengiriman login.
- Tes regresi, panduan deployment, dan `.env.example`.

Referensi resmi: [rotasi token CSRF saat login](https://docs.djangoproject.com/en/5.2/ref/csrf/), [pengaturan origin CSRF](https://docs.djangoproject.com/en/5.2/ref/settings/#csrf-trusted-origins), dan [batas atomisitas operasi cache](https://docs.djangoproject.com/en/5.2/topics/cache/#cache-incr).
