# Rewamore Invitation Studio

Proyek Django untuk membuat banyak undangan dari **10 tema dalam template.zip**, menyunting konten per bagian, mengunggah foto, lalu membuat tautan personal untuk setiap tamu. Tema asli dipertahankan sebagai HTML, CSS, animasi, dan aset, bukan diganti satu desain generik.

## Mulai di komputer lokal

Prasyarat: Python 3.12 atau lebih baru yang kompatibel dengan dependency, pip, dan koneksi internet untuk pemasangan awal. Tidak diperlukan Node.js untuk menjalankan aplikasi.

```bash
cd rewamore
bash scripts/setup.sh
.venv/bin/python manage.py createsuperuser
.venv/bin/python manage.py runserver
```

Buka **http://127.0.0.1:8000/** dan masuk dengan akun yang baru dibuat. Tidak ada nama pengguna atau kata sandi bawaan.

Alternatif pemasangan manual, termasuk Windows:

```bash
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
# Salin .env.example menjadi .env menggunakan file manager atau cp/copy.
python manage.py migrate
python manage.py import_themes
python manage.py createsuperuser
python manage.py runserver
```

SQLite dipakai untuk percobaan lokal. Konfigurasi VPS memakai PostgreSQL. Keduanya menyimpan undangan, nama tamu, dan respons secara permanen selama berkas database atau volume tidak dihapus.

## Alur penggunaan

1. Masuk ke **Koleksi tema**, pratinjau tema, kemudian pilih tema yang diinginkan.
2. Isi nama proyek, nama kedua mempelai, alamat undangan, serta tanggal/jam acara utama. Misalnya `Riswan`, `Iin`, dan `riswan-dan-iin`.
3. Buka **Editor bagian**. Pilih bagian di sebelah kiri, ubah teks/foto/tautan, lalu tekan **Simpan bagian**. Pratinjau menampilkan hasil yang sudah disimpan. Pada layar kecil, panel menyesuaikan lebar perangkat.
4. Foto, gambar sampul, galeri, musik, video lokal, teks doa, identitas mempelai, nama orang tua, lokasi, rekening, penutup, dan footer disunting melalui bidang yang sesuai. Bagian yang menyediakan sakelar dapat disembunyikan.
5. Atur judul/lokasi kalender dan ID video YouTube melalui bagian **Kalender, video & pengaturan interaktif**. Tema 3 dan 4 memiliki rekening dialog hadiah di bagian tersebut.
6. Buka **Tamu & tautan**, tempel nama tamu satu nama per baris. Sepuluh nama berbeda menghasilkan sepuluh tautan. Nama sama, termasuk perbedaan huruf kapital, dilewati agar tidak berulang.
7. Periksa seluruh isi dan pratinjau. Tekan **Terbitkan** agar tautan publik aktif. Draf hanya dapat dipratinjau oleh pemilik yang telah masuk.
8. Salin tautan satu per satu atau ekspor CSV. Tombol WhatsApp membuka pesan siap sunting; aplikasi tidak mengirim pesan otomatis.

Contoh daftar tamu:

```text
Adrian dan Pasangan
Iin Sinurat dan Pasangan
Bapak Budi dan Keluarga
```

Dengan `PUBLIC_BASE_URL=https://rewamore.my.id`, tautannya menjadi:

```text
https://rewamore.my.id/riswan-dan-iin/?to=Adrian%20dan%20Pasangan
https://rewamore.my.id/riswan-dan-iin/?to=Iin%20Sinurat%20dan%20Pasangan
https://rewamore.my.id/riswan-dan-iin/?to=Bapak%20Budi%20dan%20Keluarga
```

`?to=` mempersonalisasi sapaan. Parameter ini bukan token autentikasi: penerima dapat meneruskan tautan dan mengubah nama pada URL. Tanpa parameter, sapaan menjadi “Tamu Undangan”. Mengubah slug setelah tautan dibagikan membuat alamat lama tidak berlaku.

## Yang tersedia

| Kebutuhan | Implementasi |
|---|---|
| Pilihan tema | Kesepuluh tema sumber, lengkap dengan aset yang tersedia di arsip |
| Banyak klien | Satu akun dapat membuat banyak undangan; konten setiap undangan terpisah |
| Banyak operator | Admin dapat membuat akun; tiap akun hanya mengelola undangannya sendiri melalui studio |
| Editor | Formulir per bagian, pencarian bidang, unggahan media, tautan, metadata, teks tombol, footer |
| Foto | JPEG, PNG, WebP, maksimum 10 MiB per berkas; disimpan ulang sebagai WebP |
| Musik dan video | MP3/WAV/OGG maksimum 20 MiB; MP4/WebM maksimum 50 MiB |
| Pratinjau | Tampilan tema asli di iframe dan halaman terpisah, dengan sapaan contoh |
| Publikasi | Draf, terbit, dan kembalikan menjadi draf |
| Duplikasi | Salinan draf dengan konten yang sama; tamu dan RSVP tidak ikut disalin |
| Daftar tamu | Maksimum 500 nama sekali impor, 10.000 nama per undangan |
| Berbagi | Tautan personal dengan `%20`, salin, pesan WhatsApp, ekspor CSV |
| RSVP | Respons disimpan di server; daftar respons muncul pada panel pemilik |
| Ucapan publik | Hanya ditampilkan setelah pengirim menyetujui publikasi nama dan ucapannya |

Tanggal/jam utama dipakai untuk hitung mundur dan berkas kalender. **Teks tanggal, jam akad, jam resepsi, dan alamat yang tercetak dalam bagian acara tetap disunting pada bagian masing-masing**, karena satu tema dapat memuat beberapa acara. Gunakan waktu Asia/Jakarta pada pengaturan utama.

Editor mempertahankan susunan bawaan tema. Ini bukan editor drag-and-drop untuk membuat blok HTML baru atau memindahkan susunan bagian. Galeri menggunakan jumlah slot dari desain sumber; setiap slot dapat diganti. Penambahan tipe bagian atau tema baru dilakukan melalui kode dan skema.

## Contoh data opsional

```bash
python manage.py create_demo --username NAMA_AKUN_ANDA --theme 1
```

Perintah membuat contoh **draf** Riswan dan Iin beserta dua nama tamu. Contoh tidak otomatis dipublikasikan. Foto, nama orang tua, kutipan, tanggal acara tercetak, tautan sosial, dan rekening bawaan adalah isi contoh dari tema, sehingga harus diperiksa dan diganti sebelum digunakan untuk klien.

## Catatan aset sumber

- Tema 3 dan 4 memiliki potret eksternal yang tidak disertakan dalam ZIP asli. URL-nya tetap dapat disunting. Jika foto gagal dimuat, aplikasi menampilkan foto contoh lokal sebagai pengganti. Untuk hasil konsisten, unggah semua foto klien sendiri.
- Sebagian font tema 3 dan 4 masih berasal dari Google Fonts. Font dan media yang memang tersedia di arsip tetap disertakan secara lokal.
- Musik otomatis hanya dimulai setelah interaksi pengguna sesuai kebijakan browser.
- Lisensi font dan keterangan asal aset dipertahankan pada folder tema. Hak penggunaan foto/musik mengikuti pemilik aset; proyek ini tidak mengubah lisensi aset sumber.

## Struktur proyek

```text
config/                   Konfigurasi Django, URL utama, header keamanan
invitations/              Model, formulir, tampilan, validasi, pengujian
invitations/theme_engine.py  Pemetaan HTML sumber ke editor dan renderer
theme_sources/            HTML asli kesepuluh tema
static/themes/            CSS, JavaScript, font, foto, musik tema
static/studio/            Antarmuka editor dan penghubung RSVP/kalender
templates/studio/         Halaman panel pengelolaan
deploy/                   Docker, Caddy HTTPS, contoh .env, backup
docs/                     Dokumentasi teknis dan hasil pemeriksaan
var/                      Database lokal, unggahan, cache, hasil collectstatic
```

`import_themes` dapat dijalankan ulang. Perintah memperbarui daftar tema/skema, tidak menghapus undangan atau tamu. Bila mengubah struktur `theme_sources` sendiri, lakukan migrasi konten secara eksplisit karena posisi node menjadi identitas bidang editor. Salinan draf berbagi referensi berkas foto awal; unggahan pengganti pada salinan tidak mengubah undangan asal.

## Pengujian dan VPS

```bash
python manage.py test invitations
python manage.py check
python manage.py makemigrations --check --dry-run
```

Panduan lengkap VPS: [docs/DEPLOY_VPS.md](docs/DEPLOY_VPS.md). Hasil verifikasi: [docs/VERIFICATION.md](docs/VERIFICATION.md).

Implementasi memakai dokumentasi resmi [Django](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/) dan [Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy). Domain `rewamore.my.id` merupakan contoh konfigurasi dari permintaan Anda, belum dihubungkan atau dipublikasikan oleh paket ini.
