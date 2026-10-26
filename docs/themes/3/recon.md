# Recon: undangan Kelvin & Chyntia

## Cakupan

Web undangan satu halaman, direkonstruksi dalam HTML/CSS/JS murni. Fokus pada tampilan publik, pengalaman membuka undangan, navigasi, foto, animasi, dan interaksi lokal. Kode sumber aplikasi asli dan endpoint privat tidak dibaca atau digunakan.

## Sumber

| Sumber | URL | Informasi |
| --- | --- | --- |
| Undangan publik | https://byattari.com/kelvin-chyntia/?to=Ricardo | Tampilan desktop, isi undangan, navigasi, profil, jadwal, galeri, formulir, dan gift |

Observasi dilakukan melalui tampilan browser. Screenshot referensi tidak dimasukkan ke paket. Tampilan mobile dirancang untuk memenuhi permintaan pengguna; ukuran viewport mobile sumber belum diverifikasi secara langsung.

## Inventaris layar dan bagian

| ID | Layar/bagian | Akses | Komponen dan keadaan |
| --- | --- | --- | --- |
| S01 | Cover | Pembukaan halaman | Foto layar penuh, nama pasangan, tanggal, nama tamu, tombol buka |
| S02 | Home | Setelah cover dibuka, `#home` | Slideshow, kutipan Kolose 3:14, menu, musik, layar penuh |
| S03 | Bride and Groom | `#couple` | Dua profil foto tinggi dengan gradasi bawah dan tautan Instagram |
| S04 | Journey of Love | Setelah profil | Empat bagian cerita di atas latar foto |
| S05 | Wedding Event | `#event` | Countdown, simpan kalender, pemberkatan, resepsi, tautan peta |
| S06 | Gallery | `#gallery` | Galeri foto, thumbnail, gambar penuh |
| S07 | RSVP & Wishes | `#wishes` | Nama, kehadiran, ucapan, tombol kirim, daftar ucapan |
| S08 | Wedding Gift | `#gift` | Pengantar, tombol E-amplop, dialog rekening |
| S09 | Souvenir Card | Menu navigasi | Kartu personal berdasarkan nama tamu |
| S10 | Penutup | Akhir halaman | Ucapan terima kasih, nama pasangan |
| S11 | Menu terbuka | Tombol burger | Panel transparan dengan Home, Bride and Groom, Wedding Event, Gallery, RSVP, Gift, Souvenir Card |

## Alur

- F01: S01 → buka undangan → S02. Nama tamu diambil dari parameter `to`.
- F02: S02 → buka menu S11 → pilih bagian S03–S08 → menu tertutup.
- F03: S06 → pilih foto → lightbox → foto berikutnya/sebelumnya → tutup.
- F04: S07 → isi nama/kehadiran/ucapan → validasi → simpan lokal → ucapan tampil.
- F05: S05 → simpan tanggal → unduh kalender; atau buka peta lokasi.
- F06: S08 → E-amplop → lihat rekening → salin nomor → tutup.
- F07: S11 → Souvenir Card S09 → lihat nama tamu → tutup.

## Bahasa visual

- Desktop: foto tetap sekitar 60% lebar kiri; isi undangan bergulir sekitar 40% di kanan.
- Foto memakai lapisan gelap; teks putih serif. Nama pada panel kiri berada di area bawah.
- Cover menempatkan judul di area atas dan undangan personal di bawah.
- Menu berbentuk pil di kanan atas; panel terbuka memakai latar transparan dengan blur.
- Profil memakai foto satu layar dan gradasi gelap untuk teks di bawah.
- Animasi rekonstruksi: transisi cover, crossfade slideshow, zoom foto pelan, reveal saat scroll, menu dan dialog.
- Adaptasi mobile: panel kiri disembunyikan, satu kolom, tombol sentuh minimal 44 px.

## Model data yang disimpulkan

| Entitas | Field | Bukti | Keyakinan |
| --- | --- | --- | --- |
| Guest | name | Parameter `to` dan nama pada cover | Tinggi |
| Couple | names, parents, photo, social | Profil pasangan terlihat | Tinggi |
| Event | title, startsAt, venue, address, mapsURL | Jadwal dan tautan peta terlihat | Tinggi |
| GalleryPhoto | thumbnail, fullURL, caption | Thumbnail dan tautan foto terlihat | Tinggi |
| RSVP | name, attendance, message | Field formulir terlihat | Tinggi |
| GiftAccount | bank, name, number | Kebutuhan dialog rekening; data aktual tidak disalin | Sedang |
| SouvenirCard | guestName | Opsi navigasi dan personalisasi | Sedang |

## Batas dan keputusan implementasi

Foto direferensikan melalui URL publik asal dan tidak dibundel. Musik diganti dengan audio sintetis orisinal. Ucapan tamu asli tidak disalin. RSVP rekonstruksi memakai localStorage dan tidak mengirim formulir ke server asli. Rekening diisi pemilik melalui konfigurasi; nilai asli tidak disalin. Kartu souvenir bukan sistem check-in atau penukaran yang terhubung backend.

Kesulitan utama: mempertahankan komposisi foto desktop/mobile, transisi yang stabil tanpa lonjakan tata letak, dan memuat gambar hanya ketika diperlukan. Ukuran implementasi: kecil untuk situs statis; backend RSVP bersama berada di luar cakupan versi ini.

Status verifikasi fitur dicatat terpisah di `features.csv`; keberadaan implementasi tidak berarti seluruh interaksi telah diuji di browser.
