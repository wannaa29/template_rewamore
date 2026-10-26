# Nocturne Pearl — Ringkasan pemeriksaan

Diperiksa ulang pada 20 Oktober 2026 menggunakan Chromium 153.0.8010.0, browser headless nyata.

## Hasil

- 14 pemeriksaan interaksi lulus: personalisasi aman, membuka undangan dan fokus, foto hero, kontrol berikut/sebelum/jeda, validasi inline, penyimpanan ucapan dan reload, kehadiran berhalangan, batal/hapus catatan, galeri/lightbox/zoom/Escape/pemulihan fokus, penambahan foto, kalender dua hari, tautan personal, reduced motion, serta tidak ada error JavaScript yang tidak tertangani.
- Lebar viewport 320, 375, 768, 1024 dan 1440 px: tidak ada overflow horizontal dokumen.
- Screenshot desktop dan mobile diperiksa untuk komposisi Nocturne, termasuk sampul oval, hero berbingkai lengkung, profil mempelai, galeri, hadiah, dan formulir. Sampul dan formulir pada lebar 320 px juga diperiksa secara visual.
- Tautan keyboard “Langsung ke undangan” membuka sampul dan mengarahkan fokus dengan benar.
- Pemeriksaan sintaks `node --check js/app.js` lulus.
- Tidak ditemukan ID HTML duplikat, aset lokal hilang, atau hook elemen JS yang hilang.
- Seluruh ID, tautan eksternal, nama keluarga, rekening, tempat, tanggal dan jam dari edisi sebelumnya dipertahankan. JavaScript interaksi identik dengan edisi Garnet yang telah diperiksa.
- Autoplay slideshow diperiksa saat foto berada di viewport; saat foto berada di luar layar, jeda otomatis tetap bekerja.

## Batas pemeriksaan

Pemeriksaan mobile memakai ukuran viewport browser, bukan perangkat iPhone/Android fisik. Safari dan Firefox belum diuji langsung. Pemutaran YouTube dan tujuan Maps/Instagram bergantung pada jaringan serta layanan terkait. Formulir adalah penyimpanan lokal, bukan backend RSVP bersama. Tidak ada transaksi bank yang dijalankan selama pengujian.
