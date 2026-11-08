# A3-D01: skenario demo lima menit

## Persiapan

Jalankan `npm run dev`, buka URL lokal, dan siapkan folder unduhan XLSX. Gunakan satu tab. Pilih Admin, muat data contoh, lalu tutup panel peralatan demo. Ketiga peserta dan seluruh nama dalam data contoh fiktif.

## Alur presentasi

| Waktu | Tindakan | Penjelasan yang disampaikan |
| --- | --- | --- |
| 00:00–00:35 | Perlihatkan pemilih peran dan rekap | "Aplikasi ini mendemonstrasikan penilaian tiga peserta oleh dua juri. Pemilih peran ini simulasi, bukan login produksi. Data berada di browser ini." |
| 00:35–01:05 | Lihat S01 pada bagian Di balik angkanya | "Bobot 40, 35, dan 25 menghasilkan nilai J1 sebesar 73 dan J2 sebesar 75. Rata-ratanya 74. Semua hasil dihitung dari skor mentah." |
| 01:05–01:45 | Pilih J1. Masukkan strategi 6, klik Simpan. Ganti ke 4,5; tambah catatan lalu simpan | "Skor di luar 0–5 ditolak. Skor pecahan diterima. Nilai J1 sekarang 77. Perubahan baru masuk ke rekap setelah berhasil disimpan." |
| 01:45–02:20 | Pilih J2, kosongkan Hasil, simpan. Kembali ke Admin | "Isian kosong bukan nol. Nilai perusahaan S01 belum tersedia karena J2 belum lengkap." |
| 02:20–03:00 | Muat ulang data contoh. Buka Pengaturan; isi bobot 50/30/19 dan coba simpan. Koreksi ke 50/30/20, simpan, kembali ke rekap | "Total bobot harus 100%. Setelah valid, nilai dihitung ulang. S01 J1 menjadi 74 dan nilai perusahaannya 75." |
| 03:00–03:45 | Pilih J1. Ubah Strategi ke -1 lalu simpan. Tutup modal dengan Perbaiki input, ubah ke 5, lalu simpan | "Input yang melanggar aturan ditolak lewat modal. Isian tetap tersedia untuk diperbaiki. Setelah input valid, perubahan dapat disimpan." |
| 03:45–04:25 | Kembali ke Admin. Ekspor XLSX dan buka sheet Rekap serta Rincian | "Laporan memakai data dan perhitungan yang sama dengan dashboard. Dengan perubahan terakhir, S01 J1 bernilai 84 dan nilai perusahaan S01 adalah 80. File ini salinan hasil saat diunduh." |
| 04:25–05:00 | Muat ulang browser, perlihatkan rekap, dan buka hasil tes | "Data tersimpan bertahan setelah reload. Unit test dan tes browser memeriksa angka, validasi, status, ekspor, serta gagal simpan. Batasannya adalah penyimpanan lokal dan tanpa autentikasi produksi." |

Setelah demonstrasi, muat data contoh lagi bila ingin mengembalikan angka acuan 74,0; 72,5; 81,5.

## Jawaban singkat untuk pertanyaan penguji

- **Mengapa memakai rumus biasa?** Perhitungan bersifat deterministik dan dapat diuji terhadap contoh resmi. AI membantu pengembangan, bukan menentukan nilai.
- **Mengapa tidak merata-ratakan satu juri saja?** Panduan mensyaratkan rata-rata dua juri; satu penilaian tidak boleh dianggap hasil final.
- **Bagaimana mencegah dashboard dan XLSX berbeda?** Keduanya menerima state tersimpan dan fungsi perhitungan yang sama.
- **Bagaimana jika simpan gagal?** Hasil penulisan menentukan apakah state tersimpan diperbarui. Kegagalan mempertahankan draf dan menyediakan percobaan ulang.
- **Apakah input invalid sama dengan penyimpanan gagal?** Tidak. Validasi menolak input sebelum penulisan. Kegagalan penyimpanan terjadi saat browser tidak dapat menulis data yang valid. Demo langsung menunjukkan validasi; penanganan error penyimpanan dibuktikan melalui tes otomatis tanpa sakelar dalam aplikasi.
- **Apa yang diperlukan untuk produksi?** Akun pengguna, otorisasi pada server, database bersama, audit perubahan, dan pengujian operasional tambahan. Fitur tersebut belum dibuat pada demo ini.

## Bukti

Tes browser bernama `A3-D01 input sampai ekspor, persistensi, dan rincian` menjalankan input pecahan, catatan, simpan, reload, ekspor, dan pemeriksaan isi unduhan. Ini bukti otomatis alur, bukan rekaman video presentasi lima menit. Gunakan tabel di atas untuk demonstrasi langsung atau rekaman mandiri.
