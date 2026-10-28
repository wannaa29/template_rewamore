# Catatan Revisi 3

## Perbaikan tambahan berdasarkan screenshot
- RSVP pada mode preview kini dapat diuji secara lokal. Ucapan yang menyetujui publikasi muncul sementara di kartu ucapan, tetapi tidak dikirim/disimpan ke server sampai undangan publik digunakan.
- Setelah RSVP berhasil pada undangan publik, daftar ucapan dimuat ulang dan sumber data tetap endpoint server yang hanya menampilkan ucapan dengan persetujuan publikasi.
- Template 5 pada desktop menggunakan layout dua kolom: judul dan daftar ucapan mengisi area kiri, formulir RSVP berada di kanan. Daftar ucapan tidak lagi menumpuk panjang di bawah formulir.
- Pada mobile, judul pasangan di sampul dapat membungkus ke beberapa baris dan tidak lagi dipaksa satu baris sehingga terpotong. Daftar ucapan berubah menjadi satu kolom pada layar sempit.
- Bagian buku doa lama disembunyikan pada Template 5 agar tidak menduplikasi daftar ucapan baru.

## Validasi
- Perlu menjalankan `python manage.py check` dan tes proyek pada environment dengan dependensi yang terpasang.
- Ucapan pada preview adalah simulasi lokal; untuk penyimpanan permanen, pengujian dilakukan melalui undangan berstatus terbit.
