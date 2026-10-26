# Ringkasan pemeriksaan

Diperiksa pada Chromium 153.0.8010.0, browser headless nyata.

## Hasil

- 14 pemeriksaan interaksi lulus: personalisasi aman, membuka undangan dan fokus, foto hero, kontrol berikut/sebelum/jeda, validasi inline, penyimpanan ucapan dan reload, kehadiran berhalangan, batal/hapus catatan, galeri/lightbox/zoom/Escape/pemulihan fokus, penambahan foto, kalender dua hari, tautan personal, reduced motion, serta tidak ada error JavaScript yang tidak tertangani.
- Lebar viewport 320, 375, 768, 1024 dan 1440 px: tidak ada overflow horizontal dokumen.
- Screenshot desktop dan mobile diperiksa untuk sampul, hero, profil mempelai, acara, galeri, hadiah, dan formulir. Detail pemotongan foto acara dan simbol tombol diperbaiki setelah pemeriksaan.
- Tautan keyboard “Langsung ke undangan” membuka sampul dan mengarahkan fokus dengan benar.
- Pemeriksaan sintaks `node --check js/app.js` lulus.
- Tidak ditemukan ID HTML duplikat, aset lokal hilang, atau hook elemen JS yang hilang.
- Tanggal, nama keluarga, rekening dan tautan eksternal dicocokkan dengan arsip asal.

## Batas pemeriksaan

Pemeriksaan mobile memakai ukuran viewport browser, bukan perangkat iPhone/Android fisik. Safari dan Firefox belum diuji langsung. Pemutaran YouTube dan tujuan Maps/Instagram bergantung pada jaringan serta layanan terkait. Formulir adalah penyimpanan lokal, bukan backend RSVP bersama. Tidak ada transaksi bank yang dijalankan selama pengujian.
