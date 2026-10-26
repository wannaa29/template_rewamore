# Andi & Sada — premium invitation

Undangan HTML, CSS, dan JavaScript murni tanpa framework atau proses build. Konten dan foto mengacu pada undangan Andi & Sada yang diberikan. Musik dan video asli tetap menjadi milik pemegang hak masing-masing; penggunaan di proyek ini mengikuti permintaan pembuatan ulang referensi. Pastikan izin aset sesuai untuk penggunaan komersial di luar undangan ini.

## Menjalankan

Buka `dist/index.html` langsung untuk meninjau desain, atau sajikan folder `dist` melalui hosting statis/localhost. HTTPS disarankan untuk clipboard dan pemutar YouTube. Seluruh foto, font, film foto, dan musik tersedia lokal di `dist/assets`; hanya video YouTube, Instagram, dan peta yang membutuhkan layanan eksternal.

Contoh server lokal dari folder proyek:

```sh
python3 -m http.server 8080 --directory dist
```

Kemudian buka `http://localhost:8080/?to=Nama%20Tamu%20dan%20Pasangan`.

## Berkas utama

- `dist/index.html`: konten undangan, jadwal acara, profil, dialog rekening dan pemutar.
- `dist/styles.css`: seluruh desain, layout responsif, transisi, reduced motion, dan gaya cetak.
- `dist/motion.css`: edisi animasi terbaru, transisi foto masuk/keluar, tirai pembuka, layout chapter, dan filmstrip bergerak. Berkas ini wajib disertakan.
- `dist/app.js`: semua interaksi, validasi, carousel, media, dialog dan kalender.
- `dist/config.js`: nama tamu default, penghitung waktu, caption slider, video ID dan ekspor kalender.
- `dist/assets`: foto, font lokal, musik dan film foto MP4.

## Mengganti isi

Ubah nama dan teks di `index.html`. Jika tanggal berubah, perbarui tampilan tanggal di HTML **dan** `eventStart`, `eventEnd`, serta `calendar` di `config.js`. Kalender menggunakan UTC; `02:00Z` berarti pukul 09.00 WIB. Ubah nomor rekening hanya setelah memverifikasi pemiliknya; perbarui teks rekening dan atribut `data-copy` bersamaan.

Tautan `?to=Nama%20Tamu` menampilkan nama tamu melalui `textContent`, sehingga teks tamu tidak dijalankan sebagai HTML. Default disesuaikan dengan tautan referensi yang diberikan.

## Media dan animasi

Edisi 2 menambahkan dua slider sinematik dengan tiga variasi transisi: slide horizontal, curtain reveal, dan depth zoom. Foto bergerak masuk/keluar selama 1,8 detik, dengan jeda antarslide 3,4 detik; transisi pertama dimulai setelah 2,6 detik. Zoom/pan bekerja di dalam foto, terpisah dari perpindahan panel. Hover tidak lagi membekukan slider utama. Ada pula pembuka tirai 2 detik, chapter layar penuh, filmstrip foto bergerak, reveal yang berulang saat scroll kembali, dan transisi lightbox.

Jika perangkat mengaktifkan reduced motion, tekan **Aktifkan animasi** untuk mengaktifkan gerakan secara eksplisit. Tombol jeda, panah, dot navigation, keyboard, dan swipe tetap tersedia. File HTML, kedua CSS, kedua JS, dan folder aset harus berada dalam struktur yang sama agar semuanya berjalan.

- Tombol **Buka undangan** memulai audio dari tindakan pengguna. Browser dapat menolak autoplay bersuara sebelum interaksi. Tidak ada cara HTML yang dapat menjamin bypass pembatasan browser.
- Film foto lokal adalah montage asli dari foto referensi: H.264, 1280×720, 18 detik, tanpa audio. Diputar otomatis hanya ketika terlihat, setelah undangan dibuka. Musik menggunakan pemutar terpisah.
- Tombol **Tonton video MBS** membuka video YouTube asli. Musik latar dijeda agar tidak bertumpuk; media video dapat dibatasi oleh koneksi, consent, atau kebijakan YouTube.
- Slider mendukung tombol, keyboard, swipe, jeda, dan berhenti saat tab tersembunyi. Preferensi `prefers-reduced-motion` dan kontrol animasi dihormati.
- Video dan musik berhenti saat tab tersembunyi; kontrol pengguna dipertahankan selama halaman aktif.

## Jadwal asli

Sumber menyebut pemberkatan **4 September 2026, 14.00 WIB**, dan Kerja Adat Mulihi Bulang **25–26 September 2026, 09.00 WIB**. Perbedaan tanggal ini dipertahankan. Setelah acara berakhir, countdown bernilai nol dan menampilkan “Hari istimewa telah dirayakan”; tanggal tidak diganti ke masa depan secara otomatis.

## RSVP

Formulir adalah **pratinjau frontend lokal**. Data disimpan di `localStorage` browser dan dapat diunduh sebagai TXT. Data tidak dikirim kepada pasangan, tidak tersinkron antarperangkat, dan tidak menciptakan komentar palsu. Formulir memberitahukan batasan ini sebelum pengguna mengisi. Backend/API harus dihubungkan secara terpisah untuk menerima RSVP secara nyata. Jika penyimpanan browser tidak tersedia, hasil tetap dapat diunduh selama sesi.

## Pemeriksaan

JavaScript diperiksa dengan `node --check`. Audit statis desain memeriksa kontrak aksesibilitas dan pola UI. Validasi berkas memeriksa ID duplikat, tautan internal, referensi media/font, struktur HTML, dan CSS. Media diverifikasi dengan FFprobe. Infrastruktur preview browser pada sesi pembuatan tidak tersedia; pengujian visual/interaksi browser nyata belum dapat diselesaikan. Lakukan uji perangkat sebelum dibagikan kepada tamu.

Versi hosting pertama bersifat privat. Kode yang disertakan dapat dipasang di hosting statis milik Anda.
