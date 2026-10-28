# Revisi lanjutan: gambar panel desktop Template 5

## Akar masalah
Template 5 menempatkan foto panel desktop di elemen `<aside class="desktop-story">`, bukan di elemen `<section>`. Mesin editor sebelumnya hanya membuat grup khusus untuk `<aside class="desktop-panel">`, sehingga foto panel desktop tidak mendapat bagian editor yang jelas dan mudah ditemukan.

## Perbaikan
- Elemen `aside.desktop-story` sekarang terdaftar sebagai bagian **Panel desktop** di editor tema.
- Foto `.desktop-photo` muncul sebagai field gambar di bagian tersebut, sehingga URL atau file yang diunggah dapat disimpan untuk gambar kanan/kiri pada layout desktop.
- Rendering gambar kustom menghapus `srcset` dan `data-srcset` bawaan ketika sumber gambar berubah, supaya browser tidak memilih kembali foto demo yang lama pada layar desktop.
- Ditambahkan regression tests untuk memastikan field foto tersedia dan sumber responsif bawaan tidak menimpa gambar kustom.

## Langkah penerapan wajib
Setelah mengganti source code:
1. Jalankan `python manage.py import_themes` agar skema tema dalam database diperbarui. Perintah ini memperbarui skema, bukan menghapus isi undangan.
2. Restart server Django agar cache kompilasi template dibangun ulang.
3. Buka editor tema Template 5 dan cari bagian **Panel desktop**.
4. Ganti/unggah foto di field foto panel desktop, simpan, lalu buka ulang preview dengan hard refresh.

## Verifikasi
Jalankan `python manage.py check` dan `python manage.py test invitations.tests.test_themes` di lingkungan proyek yang sudah menginstal dependensi Django.
