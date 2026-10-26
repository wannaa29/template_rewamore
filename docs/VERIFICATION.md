# Verifikasi implementasi

Pemeriksaan dilakukan pada 24 Oktober 2026. Semua data uji dibuat untuk pengembangan. Arsip proyek tidak memuat akun uji, password, database uji, `.env`, atau unggahan uji.

## Hasil akhir

- **32 tes Django lulus.**
- **10 dari 10 tema lulus uji DOM JavaScript.**
- Uji HTTP Gunicorn lulus, termasuk 10 tautan dari 10 nama dan penyimpanan RSVP.
- Tidak ada perubahan migrasi yang tertinggal.
- Pemeriksaan konfigurasi produksi Django lulus tanpa peringatan.

## Pemeriksaan yang dijalankan

- Suite Django menguji alur undangan, pemisahan pemilik, draf/publikasi, unggahan, URL tamu, CSV, RSVP, validasi, serta renderer kesepuluh tema.
- Pemeriksaan sumber tema mencakup teks/footer, placeholder personalisasi, sinkronisasi gambar galeri dan lightbox, pilihan hadir/tidak hadir, tautan aset lokal, bagian tersembunyi, dan injeksi HTML/JSON.
- Uji HTTP menjalankan Gunicorn dengan database sementara, lalu melakukan login ber-CSRF, membuat undangan, menguji draf, memasukkan 10 nama, memeriksa 10 tautan CSV, menerbitkan undangan, mengirim RSVP, dan membaca respons tersimpan.
- Uji DOM JavaScript mengeksekusi skrip asli yang telah diadaptasi pada 10 tema. Diperiksa: buka sampul, nama tamu, foto pengganti, foto lightbox, kalender, pengiriman RSVP, dan tidak adanya penyimpanan RSVP lokal palsu.
- `manage.py check`, konsistensi migrasi, pemeriksaan produksi `check --deploy`, serta sintaks JavaScript diperiksa.

## Mengulang pengujian

Aktifkan virtualenv terlebih dahulu:

```bash
python manage.py test invitations --verbosity 1
python manage.py makemigrations --check --dry-run
python manage.py check
python scripts/smoke_http.py
```

Uji DOM opsional memerlukan Node.js sesuai `package.json`. Node.js tidak diperlukan untuk aplikasi Django:

```bash
npm ci
npm run test:dom
```

Pada sistem dengan nama interpreter berbeda, tetapkan `PYTHON` ke Python dalam virtualenv untuk uji DOM. Dependensi JavaScript tersebut hanya dipakai dalam pengembangan, bukan oleh server aplikasi.

## Batas bukti pengujian

Uji DOM memakai simulasi API browser, jaringan, audio, dan gambar. Hasilnya tidak membuktikan kesesuaian visual piksel, keberhasilan decoding setiap media, pemutaran YouTube, perilaku browser ponsel tertentu, atau kebijakan autoplay. Browser terkelola pada lingkungan pengerjaan tidak menjangkau server lokal proyek; pemeriksaan visual browser penuh belum dilakukan.

Konfigurasi Docker Compose/Caddy telah disediakan dan diperiksa sebagai kode, tetapi container VPS, penerbitan sertifikat, DNS domain, dan deployment publik belum dijalankan. Uji pada perangkat tujuan setelah instalasi tetap diperlukan.

Gambar eksternal tema 3 dan 4 tidak ada dalam arsip sumber. Percobaan mengakses salah satu gambar sumber dari lingkungan ini mendapat HTTP 403. Gambar contoh lokal menjadi fallback bila gambar gagal; unggah foto klien untuk mengganti ketergantungan itu.

Pemisahan halaman draf dan pemilik diuji. URL media tidak memakai autentikasi karena media harus dapat dimuat oleh penerima undangan. Parameter `to` berfungsi sebagai sapaan, bukan autentikasi tamu.
