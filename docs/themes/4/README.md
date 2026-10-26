# Kelvin & Chyntia · The Atelier Edition

Versi kedua undangan pernikahan dengan desain editorial khusus. Proyek pertama tetap terpisah. Dibuat menggunakan HTML, CSS, dan JavaScript murni, tanpa framework atau proses build.

## Menjalankan

Buka `dist/index.html` di browser, atau jalankan dari folder proyek:

```bash
python3 -m http.server 8080 --directory dist
```

Kemudian buka `http://localhost:8080/?to=Ricardo`. Nama tamu dapat diganti, misalnya `?to=Nama%20Tamu`.

## Arah desain

Palet sage pucat dan tinta hijau tua; Bodoni Moda untuk judul dan Manrope untuk teks. Tata letak memakai ruang kosong yang lebar, dua potret berselang, foto cerita yang melekat saat digulir, serta galeri asimetris. Pembuka menggunakan dua panel seperti tirai.

| Bagian | Atelier Edition |
| --- | --- |
| Cover | Komposisi kertas dan foto, nama tamu, animasi tirai |
| Hero | Nama mempelai besar, slideshow, foto kecil berlapis |
| Profil | Dua potret dengan posisi berselang |
| Cerita | Foto melekat dan empat bagian cerita |
| Acara | Tipografi tanggal besar, countdown, lokasi, kalender |
| Galeri | 8 foto awal, 12 tambahan, lightbox, keyboard dan swipe |
| Navigasi | Panel besar dengan tautan bagian halaman |
| RSVP | Validasi, ucapan, penyimpanan browser terpisah |
| Gift | Dialog dan salin rekening setelah dikonfigurasi |
| Souvenir | Kartu kenang-kenangan personal |

## Berkas

- `dist/index.html`: isi halaman, foto, nama, profil, teks, dan lokasi.
- `dist/styles.css`: seluruh desain, breakpoint, dan animasi.
- `dist/script.js`: interaksi, lazy loading, dialog, serta RSVP.
- `dist/config.js`: tanggal, musik, volume, dan rekening.
- `dist/boot.js`: aktivasi mode JavaScript untuk progressive enhancement.
- `dist/assets/ambient.wav`: musik piano sintetis orisinal, 24 detik.

## Konfigurasi

Ubah `window.WEDDING_CONFIG` pada `config.js`:

```js
{
  date: '2026-05-09T10:00:00+07:00',
  endDate: '2026-05-09T15:00:00+07:00',
  music: 'assets/ambient.wav',
  volume: 0.28,
  event: {
    title: 'The Wedding of Kelvin & Chyntia',
    venue: 'HKBP Medan Sudirman',
    address: 'Jl. Jend. Sudirman 17-A, Medan'
  },
  giftAccounts: []
}
```

Rekening dapat ditambahkan dengan objek `{ bank: 'Nama bank', name: 'Nama pemilik', number: 'Nomor rekening' }`. Jangan memakai data contoh sebagai rekening nyata. Tanggal dan lokasi yang terlihat di halaman juga perlu diperbarui pada HTML jika konfigurasi acara diganti.

Tema dapat disesuaikan melalui variabel CSS di `:root`. Personalisasi nama tamu memakai `textContent`; ucapan tidak dirender sebagai HTML.

## Perilaku dan batas versi statis

- Animasi reveal dan lazy loading memakai IntersectionObserver. Slideshow berhenti ketika keluar layar atau tab tidak aktif. Preferensi `prefers-reduced-motion` dihormati.
- Musik dimulai setelah tamu membuka undangan. Volume default 0.28.
- Tanggal referensi, 9 Mei 2026, sudah lewat. Countdown tetap nol dan menampilkan keterangan yang sesuai.
- RSVP disimpan dengan key `kelvin-chyntia-atelier-rsvp-v1` di browser. Ucapan versi pertama tidak tercampur. Belum ada backend, pengiriman ke mempelai, atau sinkronisasi antarperangkat.
- Nomor rekening belum diisi. Kartu souvenir bukan sistem validasi penukaran atau check-in.
- Foto memakai URL publik yang sama dengan referensi By Attari, tidak disalin ke paket. Foto dan Google Fonts memerlukan internet. Ganti `src`, `data-src`, dan `data-gallery` dengan aset lokal yang Anda berhak gunakan untuk pemakaian mandiri. Font memiliki fallback lokal.
- Clipboard dan fullscreen bergantung pada dukungan browser. Kalender diunduh sebagai berkas `.ics`.

## Verifikasi

Sintaks JavaScript, kesesuaian ID dengan hook interaksi, anchor navigasi, keberadaan aset lokal, struktur CSS, dan jumlah galeri diperiksa sebelum pengemasan. Pemeriksaan visual dan interaksi langsung pada browser belum terverifikasi karena layanan preview lingkungan kerja tidak tersedia. Uji di perangkat tujuan sebelum memakai undangan untuk tamu sebenarnya.
