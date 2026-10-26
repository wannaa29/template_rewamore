# Andi & Sada — The Garnet Folio

Versi desain baru dari `sada.zip`: undangan dengan palet burgundy–champagne, pembukaan folio, tata letak editorial, dan fotografi asli Andi & Sada. HTML, CSS, dan JavaScript murni. Tidak memerlukan npm, framework, atau proses build.

## Cara membuka

1. Ekstrak seluruh isi ZIP.
2. Buka `index.html` di browser modern.
3. Tekan **Buka undangan**. Musik hanya dimulai setelah interaksi ini dan dapat dijeda.

Untuk hosting statis, unggah seluruh isi folder ke direktori publik hosting, dengan `index.html` di folder utama. Jangan memindahkan folder `img`, `fonts`, `audio`, `css`, atau `js` secara terpisah.

Foto, font dan musik utama tersedia lokal. Google Maps, Instagram dan video YouTube membutuhkan koneksi internet. Tautan personal baru bisa dipakai pengunjung lain setelah website diunggah ke hosting.

## Peningkatan desain

- Palet garnet/burgundy dan champagne yang mengikuti warna busana adat dalam foto.
- Pembukaan seperti dua lembar undangan; versi mobile memakai sampul foto yang menyatu dengan bidang burgundy.
- Hero editorial berukuran penuh dengan tipografi besar, bingkai foto dan monogram.
- Slideshow crossfade dengan sebelumnya, berikutnya dan jeda/lanjut.
- Profil mempelai asimetris; bagian acara, film, hadiah dan penutup dirancang ulang.
- Galeri editorial dengan keterangan foto, pemuatan bertahap, lightbox, zoom, swipe, tombol panah dan Escape.
- Reveal saat bagian masuk layar; transisi hover yang halus; navigasi bagian aktif dan indikator baca.
- Foto WebP responsif, dimensi foto dicadangkan, video dimuat setelah diminta, musik tidak diunduh sebelum pembukaan.
- Reduced motion dan hemat data dihormati; slideshow berhenti ketika keluar viewport atau tab tidak aktif. Gulir tetap mengikuti browser.
- Validasi formulir inline, pemulihan fokus dialog, konfirmasi penghapusan catatan, dan status gagal memuat foto.

## Personalisasi tamu

Tambahkan parameter `to` pada URL publik:

```text
https://domain-anda.com/?to=Nama%20Tamu%20dan%20Pasangan
```

Tombol **Personalisasi tautan undangan** pada bagian akhir membantu membuat tautan tersebut. Nama ditampilkan sebagai teks, bukan HTML.

## Isi yang dipertahankan

Nama mempelai, nama orang tua, rekening, Maps, Instagram dan YouTube tetap mengikuti paket asal. Jadwal tetap:

- Pemberkatan: 4 September 2026, 14.00 WIB, GBKP Runggun Bandarlampung.
- Kerja Adat Mulihi Bulang: 25–26 September 2026, 09.00 WIB, Jambur Serbaguna Padang Cermin, Langkat.

Kalender memakai zona waktu WIB yang dikonversi ke UTC. Waktu selesai tidak ditentukan. Karena tanggal ini sudah lewat, hitung mundur menampilkan pesan terima kasih; tanggal tidak diubah menjadi tanggal rekaan.

## Ucapan dan kehadiran

**Formulir masih menyimpan data hanya di perangkat pengunjung menggunakan localStorage. Data belum dikirim kepada mempelai dan belum tersinkron antarperangkat.** Keterangan tersebut juga terlihat di antarmuka. Jika penyimpanan diblokir, halaman menyatakan ucapan hanya ditampilkan sementara.

Untuk buku tamu dan RSVP terpusat, sambungkan formulir ke backend/database sebelum menjualnya sebagai layanan RSVP online. Tidak ada endpoint pengiriman yang dibuat secara diam-diam. Jangan menaruh kunci privat atau kata sandi database di kode browser.

## Mengedit

| Kebutuhan | Berkas |
|---|---|
| Nama, profil, acara, rekening, tautan | `index.html` |
| Tanggal kalender dan hitung mundur | `js/app.js`: `calendarEvents` dan `setupCountdown()` |
| Warna, ukuran, jarak, responsif, animasi | `css/style.css`: token `:root` dan aturan komponen |
| Foto | `img/`; sesuaikan `src`, `data-src`, `srcset`, `data-srcset`, ukuran dan alt di HTML |
| Musik | `audio/wedding-theme.mp3` dan atribut `data-src` pada elemen audio |
| Arah visual untuk pengembangan berikutnya | `DESIGN.md` |
| Ringkasan pengujian | `VALIDATION.md` |

Saat mengganti domain, isi `og:image` dengan URL absolut foto yang tersedia di domain publik Anda. Paket ini mempertahankan URL gambar pratinjau dari versi sumber; gambar utama di halaman tetap lokal.

Foto sumber umumnya 719–760 piksel lebar. Nama `-960.webp` berasal dari paket awal dan bukan klaim resolusi 960 piksel. Tidak ada peningkatan detail foto yang diklaim. Foto dan musik mengikuti hak pemilik masing-masing; font lokal disertai lisensi OFL. Sumber media awal dipertahankan di `asset-sources.json`.
