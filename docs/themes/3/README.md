# Kelvin & Chyntia

Undangan pernikahan menggunakan HTML, CSS, dan JavaScript murni. Tidak memerlukan framework, instalasi paket, atau proses build.

## Menjalankan

Buka `dist/index.html` langsung di browser. Untuk pengujian yang lebih konsisten, jalankan dari folder proyek:

```bash
python3 -m http.server 8080 --directory dist
```

Lalu buka `http://localhost:8080/?to=Ricardo`. Ganti nama tamu melalui parameter URL, misalnya `?to=Nama%20Tamu`.

## Susunan berkas

```text
dist/
  index.html          Isi dan struktur halaman
  styles.css          Tata letak, responsivitas, dan animasi
  config.js           Pengaturan tanggal, musik, dan rekening
  script.js           Interaksi halaman
  assets/ambient.wav  Musik piano sintetis orisinal
replica/
  recon.md            Catatan referensi dan cakupan
  features.csv        Pemetaan fitur
```

## Pengaturan

Ubah `window.WEDDING_CONFIG` di `dist/config.js`:

| Properti | Kegunaan |
| --- | --- |
| `guest` | Nama tamu default ketika URL tidak memuat `to` |
| `date` | Waktu mulai dalam format ISO beserta zona waktu |
| `endDate` | Waktu selesai untuk kalender, bila diisi |
| `event.title` | Judul acara dalam berkas kalender |
| `event.venue` | Nama lokasi acara |
| `event.address` | Alamat lokasi acara |
| `music` | Path atau URL audio; kosongkan untuk tanpa musik |
| `volume` | Volume audio dari `0` sampai `1`; awal `0.28` |
| `giftAccounts` | Daftar rekening yang ditampilkan di dialog gift |

Contoh rekening yang perlu diganti dengan data milik Anda:

```js
giftAccounts: [
  { bank: 'Nama bank', name: 'Nama pemilik', number: 'Nomor rekening' }
]
```

Nama mempelai, teks undangan, profil, cerita, lokasi yang terlihat, serta tautan peta diubah di `index.html`. Setelah mengganti jadwal, sesuaikan juga teks tanggal di HTML agar sama dengan `config.js`. Tanggal referensi adalah **9 Mei 2026**; hitung mundur berhenti di nol apabila tanggal sudah lewat.

## Fitur

- Cover personal dengan animasi membuka undangan.
- Panel foto tetap di desktop dan tata letak satu kolom di mobile.
- Menu burger transparan, navigasi bagian halaman, serta penutupan melalui tombol Escape.
- Slideshow foto, animasi muncul ketika digulir, dan lazy loading gambar.
- Galeri dengan lightbox, tombol sebelumnya/berikutnya, serta navigasi keyboard.
- Hitung mundur, unduhan kalender `.ics`, dan tautan Google Maps.
- Musik dengan tombol putar/jeda serta kontrol layar penuh jika didukung browser.
- Formulir RSVP dan ucapan dengan penyimpanan lokal.
- Dialog gift dengan salin rekening dan kartu souvenir personal.
- Fokus keyboard yang terlihat dan penyesuaian bagi pengunjung yang memilih pengurangan animasi.

## Foto dan musik

Foto dalam HTML memakai URL publik dari halaman referensi **By Attari**; berkas fotonya tidak disalin ke paket ini. Foto dan font Google memerlukan koneksi internet. Untuk penggunaan mandiri atau offline, simpan aset yang Anda berhak gunakan ke `dist/assets/`, lalu ganti URL `src`, `data-src`, dan `data-gallery` di HTML. Font memiliki fallback serif lokal.

`ambient.wav` adalah komposisi sintetis orisinal sepanjang 24 detik, bukan musik dari template referensi. Anda dapat menggantinya dengan audio sendiri melalui `music` di `config.js`. Browser baru memulai musik setelah tamu membuka undangan.

## Batas fungsi versi statis

RSVP dan ucapan disimpan melalui `localStorage` pada browser yang digunakan. Data tidak terkirim kepada mempelai dan tidak tersinkron antarperangkat. Untuk undangan produksi dengan daftar tamu bersama, sambungkan handler formulir ke backend pilihan Anda.

Daftar rekening dibiarkan kosong sampai dikonfigurasi. Kartu souvenir adalah tampilan personal; tidak memvalidasi penukaran atau menyediakan sistem check-in. Kontrol layar penuh dan clipboard mengikuti dukungan serta izin browser.

Kode HTML, CSS, dan JavaScript ditulis ulang secara mandiri berdasarkan tampilan publik referensi: `https://byattari.com/kelvin-chyntia/?to=Ricardo`.

## Verifikasi

Pemeriksaan sintaks JavaScript, ID HTML, anchor navigasi, keberadaan aset lokal, 20 item galeri, struktur CSS, serta metadata audio telah lulus. Breakpoint responsif tersedia untuk desktop, tablet, dan mobile, termasuk layar di bawah 360 px.

Pengujian visual dan interaksi dalam browser belum dapat dijalankan karena layanan preview lingkungan kerja tidak tersedia. Periksa kembali pada perangkat tujuan sebelum digunakan untuk undangan publik.
