# A3-U01: hasil pengujian aktual

Tanggal verifikasi: 8 November 2026, Asia/Jakarta. Pengujian dijalankan pada workspace Windows `C:/tes/tes-a3`, Node.js 24.16.0, npm 12.0.2, TypeScript 5.9.3, Vitest 4.1.12, Playwright 1.65.0, dan Microsoft Edge headless.

## Hasil perintah

| Perintah | Hasil aktual |
| --- | --- |
| `npm install` | Instalasi awal berhasil; dependensi ekspor XLSX ditambahkan kemudian |
| `npm test` | Setelah pembaruan modal validasi: 1 berkas, 37 tes lulus, 0 gagal |
| `npm run test:e2e` | Setelah pembaruan modal validasi: 6 tes browser lulus, 0 gagal |
| `npm run build` | Pemeriksaan TypeScript dan build Vite berhasil |

Build menampilkan dua peringatan anotasi komentar dari dependensi Zod; bundler menghapus anotasinya dan menghasilkan build dengan exit code 0. Instalasi npm memblokir skrip postinstall esbuild secara default pada host ini, tetapi binary tersedia dan seluruh build serta tes berhasil tanpa perubahan kebijakan instalasi.

Ekspor XLSX menggunakan ExcelJS yang dimuat terpisah saat ekspor; build memberi peringatan ukuran chunk pustaka sekitar 937 kB sebelum gzip. Audit setelah penambahan ExcelJS melaporkan dua temuan moderate terkait dependensi `uuid` dan induknya ExcelJS. `npm audit fix` biasa belum menyelesaikannya; downgrade paksa tidak diterapkan. Laporan ini tidak menyatakan aplikasi telah diaudit untuk produksi.

Pada putaran pertama tes browser, satu assertion gagal karena locator teks `J1 · Rina` cocok dengan opsi pemilih peran dan rincian penilaian sekaligus. Locator diperbaiki agar hanya mencari dalam konten utama. Putaran terakhir di atas lulus seluruhnya.

## Matriks verifikasi

| Kasus | Hasil yang diamati | Bukti |
| --- | --- | --- |
| Data contoh awal | S01 = 74,0; S02 = 72,5; S03 = 81,5 | Unit, browser, screenshot Admin |
| Nilai enam penilaian | 73; 75; 72; 73; 83; 80 | Unit |
| Skor 6, -1, abc | Ditolak; modal berisi pesan rentang 0–5; setelah ditutup isian tetap ada | Unit dan browser |
| Skor nol dan lima | Diterima; nol tidak dianggap kosong | Unit dan browser |
| Pecahan dengan koma/titik | Diterima; 4,5 tersimpan dan dihitung | Unit dan browser |
| Satu skor J2 kosong | Nilai juri dan perusahaan tidak tersedia; status Belum lengkap | Unit dan browser |
| Bobot 50/30/20 | S01 J1 = 74; S01 final = 75; S02 = 72; S03 = 83 | Unit; S01 juga browser |
| Bobot berjumlah 99% | Ditolak melalui modal; Escape menutup modal untuk koreksi | Unit dan browser |
| Bobot kosong, negatif, lebih dari 100 | Ditolak | Unit |
| Perubahan nama | Nama peserta dan juri baru muncul pada rekap dan rincian | Browser |
| Reload | Nilai perubahan dan catatan tetap tampil | Browser |
| Error pada API penyimpanan | Pesan gagal; draf 5 tetap di form; skor tersimpan tetap 4. Error disuntikkan hanya oleh tes, tanpa sakelar aplikasi | Browser dan unit |
| Coba lagi | Setelah API penyimpanan dipulihkan oleh tes, skor dan rekap diperbarui | Browser dan unit |
| Akses storage ditolak | Load memperingatkan pengguna; save menghasilkan error | Unit menggunakan port storage yang melempar error |
| Data storage rusak | Diperingatkan tanpa menimpa data lama saat load | Unit |
| XLSX | Dua sheet, tiga rekap dan enam rincian; nilai numerik sama dengan dashboard; unduhan dibaca kembali | Unit dan browser |
| XLSX belum lengkap | Nilai final kosong, bukan nol; skor nol tetap numerik | Unit |
| Catatan berisi formula/kutip/baris baru | Tetap teks asli, tanpa formula aktif | Unit |
| Peran J1/J2 | Perubahan J1 tidak mengubah skor J2; pengaturan Admin tidak tampil pada Juri | Browser |
| Draf belum disimpan | Membatalkan dialog pindah mempertahankan peran dan draf | Browser |
| Reset | Batal mempertahankan data; konfirmasi mengosongkan semua penilaian | Browser |
| Seluler 390 piksel | Tidak ada overflow horizontal halaman Admin maupun Juri | Browser |
| Desktop dan seluler | Screenshot diperiksa secara visual | `docs/evidence/` |

## Artefak dan pengulangan

- Laporan HTML lokal: `playwright-report/index.html`, dibuat oleh Playwright dan diabaikan Git.
- Source tes unit: `src/domain.test.ts`.
- Source tes browser: `tests/app.spec.ts`.
- Bukti gambar: `docs/evidence/A3-S01-admin.png`, `A3-S01-juri.png`, dan `A3-S01-mobile.png`.

Jalankan ulang ketiga perintah verifikasi setelah mengubah kode. Durasi dapat berbeda di perangkat lain. Tes browser memakai konteks baru untuk tiap kasus sehingga tidak mengubah penilaian di profil browser pribadi.

## Batas verifikasi

Tes browser dijalankan pada Edge, belum pada Safari atau Firefox. Tes otomatis mengganti sementara API Storage.setItem agar melempar QuotaExceededError, lalu memulihkannya untuk memeriksa Coba lagi. Unit test memakai storage port yang melempar error. Tidak ada sakelar kegagalan pada aplikasi; kuota browser tidak sengaja dipenuhi. Validasi input dan error penyimpanan diuji sebagai kondisi berbeda. Belum ada audit keamanan produksi, pengujian banyak pengguna, atau sinkronisasi antartab. Pemisahan peran adalah pembatasan antarmuka demo, bukan otorisasi server.
