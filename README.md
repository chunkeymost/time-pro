# Time Pro — Lini Waktu Proyek

Project management timeline / Gantt chart interaktif dalam satu file HTML mandiri tanpa framework atau build step.

## Target Purpose

Aplikasi web ringan untuk memvisualisasikan, melacak, dan mengelola jadwal tugas proyek secara visual dalam bentuk timeline interaktif — cocok untuk individu atau tim kecil yang ingin _planning_ proyek cepat tanpa setup ribet.

## Fitur Utama

- **Gantt Chart Interaktif** — Tampilan timeline tugas dengan drag & drop untuk menggeser jadwal dan resize durasi
- **Dua Mode Tampilan** — Minggu (40px/hari) dan Bulan (14px/hari)
- **Manajemen Tugas CRUD** — Tambah, ubah, dan hapus tugas lewat modal form
- **Sidebar Daftar Tugas** — Selalu sinkron dengan timeline
- **Kategori & Warna** — 5 kategori tugas (Desain, Pengembangan, Pengujian, Peluncuran, Lainnya) dengan kode warna berbeda
- **Progress Bar** — Visualisasi persentase progres per tugas
- **Garis "Hari Ini"** — Penanda tanggal sekarang secara otomatis
- **Legend** — Label kategori dan keterangan visual

## Solusi

- **Tanpa dependensi** — Satu file `.html` bisa langsung dibuka di browser
- **Data in-memory** — Semua perubahan tersimpan selama sesi, cukup reload untuk data awal
- **Drag & resize** — Penyesuaian jadwal secara visual tanpa input manual tanggal
- **Ringan & cepat** — Zero build step, zero framework, cocok untuk artifact sharing
