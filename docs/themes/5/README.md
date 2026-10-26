# Endah & Evan — HTML, CSS, JavaScript murni

Tidak memerlukan Vite, React, npm, instalasi dependency, atau proses build.

## Cara membuka

1. Ekstrak semua isi ZIP.
2. Buka `index.html` di browser.
3. Tekan **Buka undangan** untuk masuk dan memutar musik.

Untuk hosting, unggah `index.html` beserta folder lainnya ke folder publik hosting Anda. Pertahankan susunan file. Jangan hanya mengunggah HTML-nya.

## Struktur

- `index.html` — seluruh isi undangan.
- `css/style.css` — tata letak mobile/desktop, animasi, transisi, dan tampilan formulir.
- `js/bootstrap.js` — loader dan fallback.
- `js/app.js` — sampul, musik, lazy load, galeri, kalender, rekening, dan personalisasi.
- `js/guestbook.js` — formulir doa dan pagination 5 kiriman per halaman.
- `js/config.js` — opsi koneksi buku tamu bersama.
- `img/` — ilustrasi WebP responsif dan tekstur.
- `audio/` — musik latar asli referensi.
- `fonts/` — font lokal dan lisensi.
- `asset-sources.json` — sumber aset.

Semua file gambar, musik, CSS, JS, dan font utama tersedia lokal. Google Maps memerlukan internet. Tidak ada import module, CDN runtime, atau framework.

## Doa dan pagination

Secara bawaan, doa disimpan di **localStorage browser yang digunakan**. Daftar menampilkan lima kiriman per halaman, terbaru di atas. Data tetap tersedia setelah halaman dimuat ulang selama penyimpanan browser tidak dibersihkan atau diblokir.

Ini adalah mode lokal: doa **belum terkirim kepada mempelai dan tidak tersinkron ke pengunjung lain**. Keterangan tersebut ditampilkan dekat formulir dan pada pesan sukses. Tidak ada doa contoh yang disamarkan sebagai kiriman asli. Penyimpanan lokal dibatasi 200 doa; ketika penuh, data lama tidak dihapus diam-diam. Saat penyimpanan ditolak browser, pesan gagal tampil dan isi formulir dipertahankan.

### Opsional: buku tamu bersama

HTML/CSS/JS statis dapat menampilkan dan mengirim data ke layanan API, tetapi tidak dapat menyediakan database bersama dengan sendirinya. Jika Anda sudah mempunyai backend, edit `js/config.js`:

```js
window.INVITATION_CONFIG = {
  guestbookApi: '/api/wishes'
};
```

Buka melalui hosting HTTP/HTTPS, bukan `file:`. Sebaiknya API berada pada domain yang sama. URL HTTPS lintas domain juga dapat dipakai apabila server mengizinkan CORS dari domain undangan. Jangan memasukkan password database, token rahasia, atau kunci privat ke konfigurasi ini.

Kontrak API:

- `GET /api/wishes?page=1` mengembalikan `{ items, page, pageSize: 5, total, totalPages }`.
- Setiap item: `{ id, name, message, attendance, createdAt }`, dengan `createdAt` berupa tanggal ISO.
- `POST /api/wishes` menerima JSON `{ requestId, name, message, attendance, count, website: '' }`.
- Kehadiran: `Hadir`, `Belum dapat memastikan`, atau `Berhalangan hadir`. Tamu 1–5, atau 0 saat berhalangan.
- Respons sukses: `{ success: true, item, duplicate: false }` dengan status 201, atau respons idempoten status 200.
- Error: `{ error: 'Pesan kegagalan' }` beserta status HTTP yang sesuai. Pembatasan kiriman dapat menggunakan 429 dan header `Retry-After`.

Jika API gagal, kode tidak berpindah diam-diam ke penyimpanan lokal. Paket ini hanya berisi frontend; backend tidak disertakan.

## Personalisasi dan edit

Tambahkan nama tamu dengan `?to=Iin%20%26%20Riswan`, atau gunakan tombol **Personalisasi undangan**. Saat masih dibuka dari file lokal, tautan yang disalin juga merupakan alamat lokal. Unggah ke hosting untuk memperoleh tautan yang bisa dibagikan.

Edit teks, keluarga, jadwal, rekening, dan lokasi pada `index.html`. Jika mengubah tanggal, sesuaikan juga `calendarEvents` dan target countdown pada `js/app.js`. Jadwal asli adalah akad 16 Oktober 2026, 08.00 WIB, dan resepsi 17 Oktober 2026, 11.00 WIB, di Dumai.

## Aset dan validasi

Ilustrasi, musik “Satu Shaf Dibelakangku”, dan detail undangan mengikuti referensi pengguna:
https://hallomoment.my.id/endah-dan-evan/?to=Iin+%2526+riswan

Hak atas ilustrasi dan musik tetap milik pemiliknya. Font disertakan dengan lisensi OFL. Optimasi gambar hanya mengubah ukuran dan format.

Interaksi dan penyimpanan diuji melalui simulasi DOM; referensi aset diperiksa. Uji visual pada browser/perangkat fisik belum dilakukan. Browser dapat memiliki kebijakan localStorage berbeda untuk file lokal; gunakan hosting statis bila penyimpanan file diblokir.
