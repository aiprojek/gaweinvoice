# GaweInvoice

**GaweInvoice** adalah aplikasi manajemen faktur berbasis Progressive Web App (PWA) yang bebas, modern, dan berfokus pada privasi. Aplikasi ini dirancang untuk bekerja sepenuhnya secara offline, dengan semua data disimpan secara aman di browser Anda menggunakan IndexedDB. Tidak ada data yang pernah dikirim ke server eksternal, memberikan Anda kendali penuh atas informasi bisnis Anda.

## ✨ Fitur Utama

- **Manajemen Dokumen Lengkap**: Buat, kelola, dan lacak Faktur (*Invoices*) dan Penawaran (*Quotes*).
- **Faktur Berulang Otomatis**: Atur jadwal penagihan otomatis untuk klien reguler dan hemat waktu Anda.
- **Manajemen Klien & Produk**: Simpan daftar klien dan produk/layanan untuk pengisian data yang lebih cepat.
- **Dasbor & Laporan Analitis**: Dapatkan wawasan cepat tentang kondisi keuangan bisnis Anda melalui dasbor visual dan laporan terperinci.
- **Kustomisasi Templat**: Sesuaikan tampilan dokumen Anda dengan mengubah warna aksen, visibilitas kolom, dan menambahkan footer kustom.
- **Ekspor Fleksibel**: Ekspor dokumen Anda ke format PDF profesional atau gambar PNG yang mudah dibagikan.
- **Kontrol Data Penuh**:
  - **Backup & Restore**: Cadangkan seluruh data aplikasi Anda ke dalam satu file JSON.
  - **Impor/Ekspor CSV**: Migrasikan daftar klien dan produk Anda dengan mudah menggunakan format CSV.
- **Kemampuan Offline (PWA)**: Instal aplikasi di desktop atau perangkat seluler Anda dan gunakan semua fiturnya tanpa koneksi internet.
- **Dukungan Multi-bahasa**: Antarmuka tersedia dalam Bahasa Inggris dan Bahasa Indonesia.

## 🚀 Panduan Memulai

1.  **Konfigurasi Profil Anda**: Buka **Pengaturan → Profil Perusahaan** untuk memasukkan detail bisnis dan logo Anda. Ini adalah langkah paling penting.
2.  **Tambah Klien & Produk**: Isi daftar pelanggan dan layanan Anda di menu **Klien** dan **Produk**. Gunakan fitur impor CSV di pengaturan untuk mempercepat proses ini.
3.  **Buat Dokumen Pertama Anda**: Mulai dengan membuat **Penawaran** atau langsung ke **Faktur**. Anda dapat memilih dari daftar klien/produk yang sudah ada atau memasukkan item baru secara manual.
4.  **Lacak Pembayaran**: Setelah faktur terkirim, gunakan tombol **Catat Pembayaran** di halaman detail faktur untuk melacak pembayaran penuh atau sebagian.
5.  **Analisis Bisnis Anda**: Pantau pendapatan, laba, dan faktur yang belum dibayar melalui **Dasbor** dan **Laporan**.
6.  **Cadangkan Data Anda!**: Data Anda sangat berharga. Kunjungi **Pengaturan → Manajemen Data** secara berkala untuk membuat file cadangan.

## 💻 Tumpukan Teknologi (Technology Stack)

- **Frontend**: React, TypeScript
- **Styling**: Tailwind CSS
- **Database Lokal**: Dexie.js (Wrapper untuk IndexedDB)
- **Ekspor Dokumen**: jsPDF, html-to-image
- **Internasionalisasi (i18n)**: React Context API

## 🤖 Filosofi Pengembangan: Kolaborasi Manusia & AI

Aplikasi ini adalah hasil dari kemitraan yang erat antara developer manusia dan AI. Setiap bagian dari aplikasi ini dibangun melalui proses iteratif yang menggabungkan arahan strategis manusia dengan kemampuan eksekusi teknis AI.

### Peran Manusia (Inisiator & Pengarah Proyek)

Developer manusia bertindak sebagai arsitek dan manajer produk. Tanggung jawab utamanya meliputi:

- **Visi & Konsep Awal**: Memberikan ide dasar aplikasi dan menentukan tujuan utama proyek.
- **Permintaan Fitur**: Mendefinisikan fitur-fitur baru yang perlu dibangun, seperti "tambahkan faktur berulang" atau "buat halaman laporan".
- **Arahan UI/UX**: Memberikan instruksi spesifik mengenai tata letak, alur pengguna, dan estetika visual aplikasi.
- **Tinjauan & Umpan Balik**: Mengevaluasi hasil kerja AI, mengidentifikasi area untuk perbaikan, dan memberikan umpan balik untuk iterasi selanjutnya.
- **Pengambilan Keputusan Strategis**: Menentukan prioritas pengembangan dan arah jangka panjang proyek.

### Peran AI (Senior Frontend Engineer & Pelaksana)

AI, dalam perannya sebagai Senior Frontend Engineer, bertanggung jawab untuk menerjemahkan visi dan arahan manusia menjadi kode yang fungsional, bersih, dan berkualitas tinggi. Tanggung jawab utamanya meliputi:

- **Implementasi Fitur**: Menulis kode React (komponen, hook, konteks) untuk membangun fitur yang diminta dari awal hingga akhir.
- **Logika Aplikasi**: Merancang dan mengimplementasikan logika bisnis, seperti perhitungan total, manajemen status, dan otomatisasi faktur berulang.
- **Manajemen Data**: Menulis kode untuk berinteraksi dengan database IndexedDB melalui Dexie.js, termasuk membuat, membaca, memperbarui, dan menghapus data.
- **Desain & Styling**: Mengimplementasikan desain UI menggunakan Tailwind CSS, memastikan aplikasi responsif dan memiliki tampilan yang profesional.
- **Kualitas Kode**: Memastikan kode yang dihasilkan mudah dibaca, dipelihara, dan mengikuti praktik terbaik dalam pengembangan frontend.
- **Refactoring & Debugging**: Memperbaiki bug yang ditemukan dan merestrukturisasi kode untuk meningkatkan performa dan skalabilitas.

Proses ini menciptakan siklus pengembangan yang sangat cepat: **Ide Manusia → Implementasi AI → Tinjauan Manusia → Iterasi**. Kolaborasi ini menunjukkan bagaimana keahlian AI dapat berfungsi sebagai "sepasang tangan" yang sangat terampil untuk mempercepat realisasi visi kreatif seorang developer.

## 📄 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0**. Anda bebas menggunakan, memodifikasi, dan mendistribusikan kode ini sesuai dengan ketentuan lisensi.

## ❤️ Dukungan & Komunitas

Jika Anda merasa aplikasi ini bermanfaat, pertimbangkan untuk mendukung pengembang melalui:

- **[Traktir Kopi](https://lynk.id/aiprojek/s/bvBJvdA)**
- **[Lihat di GitHub](https://github.com/aiprojek/gaweinvoice)**
- **[Gabung Diskusi di Telegram](https://t.me/aiprojek_community/32)**
