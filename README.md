# MSI Awards: demo penilaian A3

Aplikasi lokal untuk simulasi take-home test MSI Group. Tiga peserta, dua juri, tiga kriteria, dengan skor dan perhitungan yang bisa diperiksa. Antarmuka berbahasa Indonesia dan responsif untuk desktop serta ponsel.

## Menjalankan

Prasyarat: Node.js 22.12 atau lebih baru dan npm. Internet diperlukan untuk instalasi pertama. Aplikasi tidak memakai font, layanan, atau aset eksternal saat digunakan.

```sh
npm install
npm run dev
```

Buka alamat lokal yang dicetak Vite, biasanya http://127.0.0.1:5173. Gunakan alamat dan port yang sama setiap kali demo karena penyimpanan browser terikat pada origin. Jangan membuka `index.html` langsung dari File Explorer.

Untuk versi produksi lokal:

```sh
npm run build
npm run preview
```

Preview biasanya memakai port 4173, sehingga datanya terpisah dari server pengembangan.

## Memulai demo

1. Pilih tampilan Admin.
2. Buka **Peralatan demo & pengujian**, klik **Muat data contoh**, lalu konfirmasi. Ini mengganti nama, bobot, skor, dan catatan dengan data awal dari panduan.
3. Periksa nilai S01 = 74,0; S02 = 72,5; S03 = 81,5.
4. Pilih J1 atau J2 pada **Tampilan peran** untuk mengisi skor dan catatan.
5. Simpan penilaian, lalu kembali ke Admin untuk memeriksa rekap dan mengunduh XLSX.

Panduan presentasi lima menit ada di [A3-D01](docs/A3-D01-demo.md). Hasil uji aktual ada di [A3-U01](docs/A3-U01-hasil-uji.md). Bukti antarmuka ada di [A3-S01](docs/A3-S01-tampilan.md).

## Rumus dan aturan data

Bobot awal: strategi 40%, implementasi 35%, hasil 25%.

```text
Nilai juri = strategi / 5 * 40 + implementasi / 5 * 35 + hasil / 5 * 25
Nilai perusahaan = (nilai J1 + nilai J2) / 2
```

Bobot disimpan sebagai angka persentase, misalnya 40, bukan 0,4. Hasil berskala 0–100. Untuk S01 J1, `4/5*40 + 3/5*35 + 4/5*25 = 32 + 21 + 20 = 73`. Dengan J2 = 75, nilai perusahaan = 74.

- Skor menerima angka 0–5, termasuk pecahan dengan titik atau koma. Notasi eksponen dan heksadesimal tidak diterima.
- Menyimpan input tidak valid menampilkan modal **Data gagal disimpan** beserta alasannya. Pilih **Perbaiki input** atau tekan Escape, koreksi isian, lalu simpan kembali. Tidak ada sakelar simulasi kegagalan.
- Isian kosong disimpan sebagai `null`, sedangkan `0` adalah skor sah. Satu skor kosong membuat penilaian juri belum lengkap. Nilai perusahaan hanya tersedia jika kedua juri lengkap.
- Skor mentah disimpan. Nilai dihitung saat dibutuhkan, tanpa pembulatan antara. Tampilan dan ekspor memakai satu desimal dengan format Indonesia.
- Bobot 0–100% harus berjumlah 100%. Toleransi penjumlahan pecahan mesin adalah `1e-8` poin persentase.
- Nama peserta dan juri wajib diisi, maksimal 80 karakter. Catatan opsional, maksimal 2.000 karakter. Kode peserta dan juri tetap.
- Mengosongkan penilaian menghapus skor dan catatan, tetapi mempertahankan nama dan bobot.

## Penyimpanan dan ekspor

Data disimpan di `localStorage` dengan kunci `msi-awards-v1`. Data masuk dari penyimpanan divalidasi menggunakan Zod. Data rusak tidak ditimpa otomatis; aplikasi memberi peringatan dan menampilkan keadaan kosong untuk pemulihan.

Formulir menyimpan draf terpisah dari data tersimpan. Perubahan baru masuk ke rekap setelah penulisan berhasil. Jika gagal, aplikasi mempertahankan draf, menampilkan error, dan menyediakan **Coba lagi**. Mengedit lagi membatalkan kandidat percobaan sebelumnya; gunakan tombol simpan formulir untuk menyimpan draf terbaru. Berpindah peran, peserta, atau halaman saat ada perubahan meminta konfirmasi pembuangan draf. Memuat ulang saat ada draf memicu peringatan browser; jika pengguna tetap melanjutkan, draf hilang.

Tombol **Ekspor XLSX** mengunduh `MSI-Awards-rekap.xlsx` dengan dua sheet: **Rekap** berisi nilai kedua juri dan nilai akhir tiga peserta; **Rincian** berisi enam penilaian beserta identitas, skor, catatan, bobot, dan status. Header dibekukan, filter tersedia, dan lebar kolom diatur. Angka tetap berupa angka Excel dengan format nilai satu desimal; pemisah desimal mengikuti pengaturan Excel. Nilai yang belum lengkap kosong, sedangkan nol tetap angka nol. Catatan disimpan sebagai teks asli, termasuk bila diawali tanda sama dengan, tanpa formula aktif atau apostrof tambahan.

File merupakan salinan hasil pada saat ekspor, bukan kalkulator Excel. Ubah skor atau bobot di aplikasi lalu ekspor ulang untuk laporan terbaru. Pustaka ExcelJS dimuat saat ekspor pertama. Jika unduhan gagal, pesan tampil dan tombol dapat dicoba kembali tanpa mengubah penilaian.

## Pengujian

```sh
npm test
npm run build
npm run test:e2e
```

Tes browser menggunakan Microsoft Edge yang terpasang di Windows, dalam mode headless. Playwright menyalakan server lokal bila belum berjalan. Untuk perangkat tanpa Edge, ubah `channel: 'msedge'` menjadi `channel: 'chromium'` pada `playwright.config.ts`, lalu jalankan `npx playwright install chromium`.

`npm run test:e2e` membuat laporan HTML di `playwright-report/index.html` serta memperbarui screenshot bukti di `docs/evidence/`. Kegagalan menyimpan trace dan screenshot di `test-results/`. Jalankan `npx playwright show-report` untuk melihat laporan interaktif.

## Struktur implementasi

- `src/domain.ts`: schema, model data, contoh, parsing skor/bobot, rumus, dan rekap.
- `src/storage.ts`: pembacaan dan penulisan data dengan penanganan gagal.
- `src/export.ts`: XLSX dari data dan fungsi perhitungan yang juga dipakai dashboard.
- `src/App.tsx` dan `src/styles.css`: tampilan Admin/Juri, formulir, rincian, dan alat demo.
- `src/domain.test.ts` dan `tests/app.spec.ts`: unit test dan tes alur browser.

## Fitur berjalan dan batasan

Sudah berjalan: penggantian peran demo, pembatasan form sesuai juri, pengelolaan nama, bobot dinamis, modal validasi input, penilaian parsial, rincian kontribusi, penyimpanan lokal, ekspor, penanganan error penyimpanan, reset terkonfirmasi, serta tampilan seluler.

Belum diimplementasikan: login produksi, otorisasi server, database bersama, sinkronisasi antartab/perangkat, audit trail, backup, serta penetapan pemenang. Tidak ada endpoint API server. Pemilih peran hanyalah simulasi; siapa pun yang memakai browser dapat memilih peran lain atau mengubah data browser. Gunakan satu tab saat demo. Jika beberapa tab menulis bersamaan, penulisan terakhir dapat menggantikan data tab lainnya. Membersihkan data browser menghapus penilaian.

Teknologi: React, TypeScript, Vite, Zod, ExcelJS, Vitest, dan Playwright. Versi yang terpasang dikunci dalam `package-lock.json`.
