# Andi & Sada — Noir Atelier

Revisi visual dan motion dari paket Ivory Nocturne, menggunakan foto serta informasi dari template asli Andi & Sada.

## Membuka undangan

Ekstrak ZIP, lalu buka `index.html` pada browser modern. Simpan `styles.css`, `script.js`, dan folder `assets` di sampingnya. Semua foto, font, audio, dan video tersedia lokal; tidak ada framework, CDN, atau build yang perlu dijalankan.

Untuk hosting, unggah seluruh isi folder ini ke direktori publik hosting. Peta, Instagram, dan YouTube memerlukan koneksi internet.

## Perubahan pada revisi ini

- Arah visual baru: espresso, warm black, antique champagne, dan ivory. Foto memenuhi panggung pembuka dengan tepian atmosferik; nama mempelai tampil besar di atas foto.
- Opening layar penuh: monogram, garis bingkai, tekstur halus, teks masuk bertahap, lalu dua panel terbuka untuk menampilkan undangan.
- Dua slider sinematik independen: pembuka dan bagian janji. Tiga variasi perpindahan — directional reveal, center curtain, dan depth reveal — dengan pan/zoom perlahan. Klik cepat diantrekan agar gambar tidak saling menumpuk.
- Reveal gambar menggunakan mask; judul masuk baris demi baris; marquee bergerak perlahan; foto penutup memiliki parallax ringan.
- Menu hamburger untuk desktop dan mobile, dengan animasi masuk/keluar dan tautan bertahap. Tidak ada daftar navigasi di navbar atau bottom bar.
- Kontrol vertikal kecil: musik, autoscroll, dan motion. Ikon 15–16 px; label tampil saat hover/fokus, bukan toolbar horizontal.
- Album foto dengan bingkai cetak, drag mouse, swipe sentuh, tombol arah, autoplay opsional, dan lightbox.
- Preferensi reduced motion, pause, serta tab tersembunyi ditangani. Transisi tetap dapat dilewati ketika perangkat meminta pengurangan gerak.

## Audio otomatis

Elemen audio menggunakan `autoplay`, `loop`, dan preload lokal. JavaScript juga mencoba `play()` saat halaman dimuat. Jika browser mengizinkan autoplay bersuara, musik langsung berjalan.

Browser yang memblokir autoplay bersuara membutuhkan interaksi pengguna. Pada browser tersebut musik dicoba lagi langsung saat tombol pembuka atau interaksi pertama dilakukan. Ini batas browser; tidak dapat dipaksa dengan HTML/JavaScript. Tombol musik tetap bisa digunakan untuk pause/resume. Setelah pengunjung mematikan musik, interaksi lain tidak menyalakannya lagi. Memutar film menghentikan musik latar.

## Autoscroll

Ketuk ikon mouse/scroll di sisi kanan bawah untuk mulai; ikon berubah menjadi pause. Kecepatan default 30 px/detik. Scroll manual, klik lain, fokus formulir, membuka modal, tab tersembunyi, dan akhir halaman menghentikan autoscroll. Pengunjung dapat menjalankannya kembali kapan saja.

## Mengedit

- `index.html`: identitas, orang tua, jadwal, lokasi, rekening, URL, foto, dan semua teks undangan.
- `styles.css`: warna pada `:root`, tata letak, breakpoint, dan animasi.
- `script.js`: objek `settings` di bagian awal untuk nama tamu default, durasi slider/transisi, kecepatan autoscroll, volume musik, dan tanggal countdown.
- Untuk kalender `.ics`, cari bagian `data-calendar` di `script.js`. Jika tanggal berubah, perbarui HTML, countdown, dan kalender bersama-sama.
- Nama tamu dari URL: `index.html?to=Budi%20dan%20Keluarga`. Nama dipasang sebagai teks, bukan HTML.

## Data dari referensi

Pemberkatan: 4 September 2026, pukul 14.00 WIB. Kerja adat: 25–26 September 2026, pukul 09.00 WIB. Setelah tanggal acara lewat, countdown tetap nol dan menampilkan status acara telah dirayakan. Tanggal, lokasi, nama, rekening, foto, dan media mengikuti lampiran awal.

RSVP masih menyimpan satu konfirmasi pada perangkat/browser yang sama, dengan opsi unduh TXT. Konfirmasi belum dikirim ke mempelai atau database. Hubungkan ke backend/layanan formulir untuk penerimaan RSVP bersama. Status penyimpanan sudah menjelaskan batas ini.

## Pemeriksaan revisi

Sintaks JavaScript, ID/anchor, ketersediaan aset, dan struktur HTML diperiksa. Alur autoplay diizinkan/diblokir, unlock audio pada gesture, mute/resume, opening, menu, antrean slider, autoscroll, dan pause motion diuji dalam simulasi DOM/media menggunakan kode yang dikirim.

Pratinjau browser tidak tersedia pada lingkungan pembuatan. Simulasi tersebut tidak memverifikasi rendering, ukuran layar, atau kebijakan autoplay perangkat nyata; pemeriksaan visual desktop/mobile masih perlu dilakukan pada browser target.

Lisensi font dan catatan sumber aset disertakan di `assets`.
