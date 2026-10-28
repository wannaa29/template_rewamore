PAKET REVISI RSVP + SLIDER UCAPAN

1. Cadangkan folder aplikasi lama.
2. Ekstrak isi ZIP dan timpa source code aplikasi yang berjalan.
3. Instal dependensi proyek jika belum ada: pip install -r requirements.txt
4. Jalankan pemeriksaan: python manage.py check
5. Jalankan tes: python manage.py test invitations.tests.test_workflow
6. Restart service Django/Gunicorn.
7. Uji satu undangan publik, kirim RSVP dengan persetujuan publikasi, lalu muat ulang halaman untuk memastikan ucapan tersimpan.
8. Buat dua undangan berbeda dengan tema sama, kirim ucapan pada keduanya, dan pastikan setiap feed hanya berisi ucapan untuk slug undangan tersebut.

Data RSVP/ucapan disimpan di database pada model Attendance dan terkait dengan Invitation. Jangan menghapus atau mengganti database produksi saat menerapkan source code.

Catatan: preview editor memang tidak menyimpan data RSVP/ucapan ke database. Preview menggunakan data sementara agar pengujian tidak mencemari undangan publik.
