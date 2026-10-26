# Andi & Sada — Ivory Nocturne

Versi desain baru dari referensi andi-sada-premium-v2: ivory, olive charcoal, champagne gold, foto lengkung, tipografi besar, dan galeri album horizontal. Dibuat dengan HTML, CSS, dan JavaScript murni, tanpa framework, CDN, atau langkah build.

## Cara membuka

1. Ekstrak seluruh ZIP.
2. Buka `index.html` di Chrome, Edge, Firefox, atau Safari modern.
3. Jangan memisahkan folder `assets` dari file HTML, CSS, dan JS.

Untuk hosting, unggah `index.html`, `styles.css`, `script.js`, dan seluruh folder `assets` ke direktori publik hosting. Untuk pratinjau lokal lewat HTTP, dari folder ini jalankan `python3 -m http.server 8080`, lalu buka `http://localhost:8080`.

## Isi paket

- `index.html`: seluruh konten undangan dan struktur menu/modal.
- `styles.css`: gaya visual, tata letak responsif, transisi, dan aturan reduced motion.
- `script.js`: slider, hamburger menu, autoscroll, musik, galeri, kalender, salin rekening, RSVP lokal.
- `assets/`: foto, font lokal, musik, film, dan keterangan sumber/lisensi dari referensi.

## Interaksi

- Menu hamburger yang selalu dapat diakses di desktop dan mobile. Tidak ada daftar tautan navigasi di header maupun bottom navbar.
- Slider pembuka dengan reveal mask, zoom lambat, tombol sebelumnya/berikutnya, pause, tombol panah keyboard, dan swipe sentuh.
- Galeri horizontal dengan scroll snap, pilihan autoplay, serta lightbox dengan Escape, panah keyboard, dan swipe.
- Tombol **Autoscroll** di kanan bawah; ketuk lagi untuk jeda. Kecepatan default 32 px/detik. Scroll manual, interaksi formulir, membuka modal, atau pindah tab menghentikannya agar kontrol tetap di tangan pengunjung.
- Musik mulai setelah menekan **Buka undangan** atau tombol musik. Memutar video menghentikan musik agar suara tidak bertumpuk.
- Tombol animasi untuk jeda; preferensi reduced motion perangkat dihormati.
- Kalender `.ics` terpisah untuk pemberkatan dan kerja adat; waktu disimpan dalam UTC dengan sumber WIB. Jam selesai pemberkatan tidak ditentukan karena sumber hanya menyebut “selesai”.
- Salin rekening BCA/BRI dari modal tanda kasih.
- Nama tamu melalui parameter URL: `index.html?to=Budi%20dan%20Keluarga`. Nama dipasang sebagai teks, bukan HTML.

## Mengubah isi

- Nama lengkap, orang tua, alamat, tanggal tampilan, rekening, tautan peta dan Instagram: edit `index.html`.
- Nama tamu bawaan, durasi slider, kecepatan autoscroll dan tanggal hitung mundur: objek `settings` di bagian awal `script.js`.
- Tanggal kalender `.ics`: cari bagian `data-calendar` di `script.js`. Sesuaikan juga tanggal di HTML dan `settings` jika acara berubah.
- Warna: variabel pada `:root` di `styles.css`.
- Foto: ganti aset yang dirujuk di `index.html` atau ubah nama file pada atribut `src`.

## RSVP dan tanggal

Formulir menyimpan satu konfirmasi pada perangkat/browser yang sama dan menyediakan unduhan `.txt`. Formulir belum mengirim ke mempelai atau database. Untuk penggunaan RSVP bersama, sambungkan ke backend atau layanan formulir pilihan Anda. Jangan mengganti pesan status menjadi “terkirim” tanpa integrasi tersebut.

Tanggal mengikuti referensi: pemberkatan 4 September 2026, kerja adat 25–26 September 2026. Jika dibuka setelah acara, hitung mundur tetap nol dan menampilkan “Hari bahagia telah dirayakan”. Foto, musik, film, identitas, dan nomor rekening berasal dari template yang diberikan.

Seluruh tampilan, foto, font, musik, dan film tersedia lokal. Tautan Google Maps, Instagram, dan YouTube memerlukan internet. Penyimpanan lokal dan clipboard dapat dibatasi oleh pengaturan browser, terutama pada mode `file://`; tersedia pesan fallback dan unduhan konfirmasi.

## Pemeriksaan

Sintaks JavaScript, referensi ID, anchor internal, serta ketersediaan seluruh aset lokal diperiksa. Pratinjau browser otomatis tidak tersedia pada lingkungan pembuatan; tampilan dan interaksi belum diverifikasi langsung di browser desktop/mobile. Sebelum digunakan untuk undangan publik, buka di perangkat target dan periksa tanggal, lokasi, serta rekening.
