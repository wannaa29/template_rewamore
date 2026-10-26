# Menjalankan Rewamore pada VPS

Paket menyediakan Docker Compose dengan PostgreSQL, Django/Gunicorn, dan Caddy untuk HTTPS. Deployment ke VPS belum dijalankan dari lingkungan pengerjaan ini. Gunakan VPS Linux dengan Docker Engine dan Compose plugin, domain milik Anda, serta port 80 dan 443 tersedia.

## 1. Domain dan berkas

Atur DNS A `rewamore.my.id` ke IPv4 VPS. Jika menggunakan AAAA, pastikan IPv6 benar-benar menuju VPS. Unggah dan ekstrak folder `rewamore` ke VPS, misalnya `/opt/rewamore`.

```bash
cd /opt/rewamore
cp deploy/production.env.example .env
chmod 600 .env
```

Edit `.env`. Ganti `DOMAIN`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, dan `PUBLIC_BASE_URL` jika domain Anda berbeda. Nilai `PUBLIC_BASE_URL` tidak boleh memuat path, misalnya `/undangan`.

Buat nilai acak untuk `SECRET_KEY` dan `POSTGRES_PASSWORD`. Contoh berikut menampilkan dua nilai acak agar dapat disalin ke `.env`:

```bash
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(48)); print('POSTGRES_PASSWORD=' + secrets.token_hex(32))"
```

Gunakan kata sandi PostgreSQL heksadesimal hasil generator agar aman dimasukkan ke connection URL. Jangan memakai nilai contoh. `.env` tidak masuk ke arsip source, Git, atau image Docker.

## 2. Jalankan layanan

```bash
docker compose up -d --build
docker compose logs --tail=100 web
docker compose logs --tail=100 caddy
docker compose exec web python manage.py createsuperuser
docker compose exec web python manage.py check --deploy
```

Entrypoint menjalankan migrasi, impor sepuluh tema, dan `collectstatic` sebelum Gunicorn. Caddy menerbitkan sertifikat HTTPS saat DNS dan akses port sudah benar. Buka `https://rewamore.my.id/`, kemudian login. Jangan menjalankan `runserver` untuk layanan publik.

Volume media, database, cache, dan sertifikat bertahan saat container dibuat ulang. Port PostgreSQL dan Gunicorn tidak dipublikasikan langsung ke internet. `TRUST_PROXY=True` hanya benar pada topologi ini karena Caddy menimpa header alamat IP dan protokol. Jangan mengekspos port aplikasi langsung dengan pengaturan tersebut.

## 3. Pemeriksaan sebelum membagikan undangan

1. Buat undangan uji, unggah foto, simpan, dan lihat hasilnya.
2. Isi tanggal utama dan semua teks tanggal/jam/lokasi tiap acara.
3. Ganti rekening, media, nama keluarga, teks footer, dan tautan contoh.
4. Terbitkan, lalu buka tautan dari ponsel yang tidak login.
5. Tambahkan dua nama tamu dan periksa nama yang muncul pada sampul.
6. Kirim RSVP uji dan pastikan respons tampil pada panel.
7. Periksa audio, kalender, video jika digunakan, dan tautan peta pada perangkat tujuan.

## 4. Backup dan pemulihan

```bash
bash deploy/backup.sh /opt/rewamore-backups
```

Script menghasilkan dump PostgreSQL dan arsip media. Simpan salinannya di lokasi terpisah serta simpan `.env` secara aman. File backup memuat data tamu dan ucapan. Untuk backup konsisten, lakukan saat tidak ada penyuntingan/unggahan atau hentikan sementara web sebelum backup.

Contoh pemulihan ke instalasi bersih dengan database dan media kosong:

```bash
docker compose stop web
cat database-TANGGAL.dump | docker compose exec -T db pg_restore -U rewamore -d rewamore --clean --if-exists --no-owner
cat media-TANGGAL.tar.gz | docker compose run --rm --no-deps -T --entrypoint tar web -xzf - -C /app/var
docker compose up -d web
```

Perintah pemulihan database mengganti data database tujuan. Pastikan target pemulihan benar dan buat backup terlebih dahulu. Jangan menjalankan `docker compose down -v` kecuali sengaja menghapus seluruh volume persisten.

## 5. Pembaruan kode

Cadangkan database/media, ganti kode, kemudian jalankan `docker compose up -d --build`. Jangan mengganti `.env` produksi dengan contoh. Uji perubahan tema di salinan lingkungan sebelum memperbarui undangan aktif.

## Batas implementasi

- Unggahan media tersedia melalui URL publik acak agar dapat dibuka penerima undangan. Draf halaman dilindungi login, tetapi berkas media bukan penyimpanan dokumen rahasia.
- Tautan tamu memuat sapaan, bukan bukti identitas. RSVP tidak mengautentikasi orang yang mengetik nama dan beberapa respons dari nama sama mungkin muncul.
- Pembatasan percobaan login/RSVP memakai cache berkas bersama untuk satu host. Untuk skala beberapa server, gunakan cache bersama dan pembatasan pada reverse proxy yang sesuai.
- Penghapusan undangan menghapus catatan terkait. Berkas media tidak dibersihkan otomatis agar referensi pada salinan undangan tidak rusak. Pemeliharaan berkas tidak terpakai perlu dilakukan berdasarkan backup dan pemeriksaan referensi.
- Foto eksternal dan layanan peta/YouTube memerlukan internet. Aset yang diunggah sendiri lebih konsisten untuk undangan klien.
