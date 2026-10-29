# ⚡ All-in-One Utility Web App

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-ready-purple?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-web-orange?style=for-the-badge)
![Gemini AI](https://img.shields.io/badge/Gemini-AI%20Integrated-red?style=for-the-badge&logo=google)

**Platform Modular All-in-One berbasis arsitektur Plug-in Extensible**  
Media Downloader · Frame Studio · Productive Tools + Gemini AI · Push Notification System

[🚀 Demo Live](#cara-menjalankan) · [📖 Dokumentasi](#fitur--modul-utama) · [🔌 Tambah Modul](#panduan-menambah-modul-baru)

</div>

---

## 📋 Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur--modul-utama)
- [Struktur Direktori](#struktur-direktori--arsitektur-proyek)
- [Cara Menjalankan](#cara-menjalankan)
- [Panduan Menambah Modul Baru](#panduan-menambah-modul-baru)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Deployment](#deployment--vercel)
- [Lisensi](#lisensi)

---

## 🌟 Tentang Proyek

**All-in-One Utility** adalah aplikasi web modern berbasis **arsitektur modular & plug-in extensible** yang dirancang agar penambahan fitur dan modul baru di masa depan dapat dilakukan dengan sangat mudah tanpa harus melepas (*uninstall*) sistem aplikasi yang sudah berjalan.

Aplikasi ini sepenuhnya berjalan di browser (client-side) dengan dukungan Progressive Web App (PWA) — artinya dapat diinstall ke homescreen smartphone maupun desktop layaknya aplikasi native, serta mendukung mode offline terbatas melalui Service Worker.

### ✨ Keunggulan Utama

| Fitur | Keterangan |
|---|---|
| 🔌 **Modular & Extensible** | Tambah modul baru tanpa ubah kode core sistem |
| 📱 **PWA Ready** | Bisa diinstall ke homescreen & bekerja offline |
| 🧠 **Gemini AI Integrated** | Analisis kendaraan dengan Google Gemini 1.5/2.0 Flash |
| 💾 **Penyimpanan Handal** | IndexedDB + LocalStorage dengan fallback otomatis |
| 🔔 **Push Notification** | Notifikasi native OS + in-app popup + suara Web Audio API |
| 🎨 **Canvas Editor HD** | Editor foto bingkai 1080×1080 dengan multi-layer |
| ⬇️ **Media Downloader** | Download YouTube, TikTok, Instagram, Direct URL |

---

## 🛠️ Fitur & Modul Utama

### 🔌 Prinsip Desain Modular & Extensible

- **Sistem Plugin**: Seluruh modul independen dan memiliki *lifecycle* `init()`, `mount(container)`, dan `unmount()`.
- **Komunikasi Longgar**: Menggunakan `EventBus` terpusat sehingga antar-modul dapat saling bertukar data tanpa saling merusak jika ada modul yang dinonaktifkan.
- **Penyimpanan Handal**: Menggunakan **IndexedDB** untuk data besar (nota terkompresi, riwayat download) dengan fallback ke LocalStorage.

---

### ⬇️ Modul 1: Media Downloader

Download media dari berbagai platform populer langsung ke perangkat lokal.

- **Pengaturan Folder Lokal**: Mendukung **File System Access API** (`window.showDirectoryPicker()`) untuk menyimpan file langsung ke folder lokal komputer pilihan pengguna, serta fallback unduhan browser standar.
- **Deteksi URL Otomatis**: Mendukung YouTube, TikTok, Instagram, dan direct URL.
- **Progress Bar Real-Time**: Menampilkan persentase unduhan (0% - 100%), ukuran terunduh, kecepatan transfer (MB/s), status proses (muxing, stream), dan tombol pembatalan.
- **Tabel Riwayat Persisten**: Tersimpan di IndexedDB lengkap dengan thumbnail, ukuran, tanggal, filter, dan aksi unduh ulang / hapus.

---

### 🖼️ Modul 2: Frame Studio (Editor Bingkai Foto)

Editor foto bingkai berbasis HTML5 Canvas resolusi HD.

- **Konsep ATM (Amati, Tiru, Modifikasi)**:
  - Upload foto bingkai referensi.
  - **ATM Mask / Window Cutout**: Otomatis membersihkan bagian dalam bingkai untuk menyisakan kerangka utama.
  - **Chroma Key Cutout**: Menghilangkan warna latar solid untuk menghasilkan kerangka transparan.

- **Editor HTML5 Canvas Interaktif**:
  - Resolusi kanvas tinggi **1080×1080 HD**.
  - Multi-layer: Layer Foto Pengguna (drag, zoom in/out, rotate 360°), Layer Bingkai, dan Layer Teks Dinamis.
  - Color Picker interaktif untuk teks, stroke, background, dan aksen bingkai.
  - Preset bingkai: Cyber Twibbon, Automotive Pro, Minimal Clean.
  - **Undo / Redo** history.

- **Ekspor ke Canva**:
  - Konversi kanvas ke file PNG resolusi tinggi.
  - Integrasi tautan Canva (`canva.com/design/create`) dengan panduan langkah ekspor.

---

### 🔧 Modul 3: Productive Tools (Jadwal Kendaraan + Gemini AI)

Manajemen kendaraan cerdas dengan analisis AI dan pengingat servis otomatis.

- **Profil Kendaraan**:
  - Nama/Jenis Kendaraan, Tahun Produksi, KM Saat Ini, Estimasi KM Harian.
  - Riwayat komponen: Piston (**Ya/Belum**), catatan piston, roller & V-belt, busi.

- **Integrasi Google Gemini AI**:
  - Endpoint Google Generative AI (Gemini 1.5 / 2.0 Flash).
  - **Smart Mechanical Intelligence Simulator** sebagai fallback offline.
  - **Aturan Mutlak**: Hasil analisis AI HARUS menyimpulkan motor wajib ganti oli **MINIMAL 1 BULAN SEKALI** (atau lebih cepat jika ≥ 1.500–2.000 KM).

- **Form Servis & Kompresi Nota**:
  - Pencatatan tanggal servis, jenis oli, lokasi bengkel, biaya.
  - Tanggal jatuh tempo default **1 bulan ke depan**.
  - **Kompresor Nota Client-Side**: Foto nota 3–8 MB → WebP/JPEG < 100 KB, teks tetap tajam!
  - Modal preview nota ukuran penuh.

---

### 🔔 Modul 4: Sistem Notifikasi

Sistem pengingat multi-level untuk jadwal servis kendaraan.

- **Browser Push Notification**: Izin native Web Notification ke OS/desktop/mobile.
- **In-App Urgent Popup**: Banner popup darurat otomatis dengan Web Audio API saat:
  - H-3 sebelum jadwal ganti oli
  - H-1 sebelum jadwal ganti oli
  - Hari H ("Waktunya Ganti Oli Hari Ini!")
  - Terlambat (Overdue alert + peringatan kerusakan piston)
- **Service Scheduler Otomatis**: Memeriksa seluruh jadwal kendaraan di latar belakang secara berkala.

---

## 📁 Struktur Direktori & Arsitektur Proyek

```
All-in-One Utility/
├── index.html                    # Titik masuk utama aplikasi (Layout, Sidebar, Viewport)
├── manifest.json                 # PWA Manifest (installable ke homescreen & desktop)
├── sw.js                         # Service Worker (caching offline & push notification)
├── server.js                     # Backend Node.js server
├── package.json                  # Konfigurasi proyek & skrip dev server
├── vercel.json                   # Konfigurasi deployment Vercel
├── .gitignore                    # Daftar file yang diabaikan Git
├── README.md                     # Dokumentasi lengkap & tutorial plugin
│
├── css/
│   ├── main.css                  # Desain sistem global, variabel warna, ambient glow, layout
│   ├── components.css            # Komponen UI: tombol, glass card, form, badge, progress, modal
│   └── responsive.css            # Optimasi mobile, mobile drawer, & bottom navigation bar
│
├── js/
│   ├── app.js                    # Bootstrapper aplikasi & inisialisasi lifecycle
│   ├── modules.config.js         # Konfigurasi registry modul plug-in
│   └── core/
│       ├── ModuleRegistry.js     # Pengelola plugin dinamis & lifecycle modul (init, mount, unmount)
│       ├── EventBus.js           # Komunikasi antar-modul tanpa kopling erat (Pub/Sub)
│       ├── Storage.js            # Wrapper IndexedDB + LocalStorage
│       └── Router.js             # SPA Hash Router responsif tanpa reload halaman
│
├── modules/
│   ├── downloader/               # MODUL 1: Media Downloader
│   │   ├── index.js              # Kelas utama DownloaderModule
│   │   ├── DownloaderService.js  # Mesin ekstraksi URL, File System Access API, stream simulator
│   │   ├── DownloaderView.js     # UI input URL, pemilihan resolusi, live progress, tabel riwayat
│   │   └── downloader.css        # Styling khusus modul downloader
│   │
│   ├── frame-studio/             # MODUL 2: Frame Studio (Editor Bingkai Foto)
│   │   ├── index.js              # Kelas utama FrameStudioModule
│   │   ├── CanvasEditor.js       # Engine HTML5 Canvas 1080×1080, multi-layer, filter ATM
│   │   ├── FrameStudioView.js    # Panel preset, color picker, ATM cutout, modal ekspor Canva
│   │   └── frame-studio.css      # Styling khusus modul frame studio
│   │
│   ├── productive-tools/         # MODUL 3: Productive Tools (Jadwal Ganti Oli + Gemini AI)
│   │   ├── index.js              # Kelas utama ProductiveToolsModule
│   │   ├── VehicleService.js     # Database kendaraan, status piston, kompresi nota WebP
│   │   ├── GeminiService.js      # Integrasi Google Gemini 1.5/2.0 Flash (Rule Wajib 1 Bulan)
│   │   ├── ProductiveToolsView.js# Form kendaraan, konsultasi AI, form servis, preview nota
│   │   └── productive-tools.css  # Styling dashboard servis kendaraan
│   │
│   └── notifications/            # MODUL 4: Sistem Notifikasi
│       ├── index.js              # Kelas utama NotificationModule & pusat kontrol
│       ├── NotificationManager.js# Web Push API, in-app modal popup, Web Audio API synthesizer
│       ├── ServiceScheduler.js   # Scheduler pengecekan jadwal servis (H-3, H-1, Hari H, Telat)
│       └── notifications.css     # Styling peringatan darurat & notification center
│
└── api/                          # Backend API endpoints
```

---

## 💻 Cara Menjalankan

### Prasyarat

- **Node.js** v16 atau lebih baru
- Browser modern (Chrome, Firefox, Edge — dengan dukungan File System Access API)

### Instalasi & Menjalankan

```bash
# 1. Clone repositori ini
git clone https://github.com/dhfoundry-studio/All-In-One-Utility-backup.git
cd All-In-One-Utility-backup

# 2. Instal dependensi (jika ada)
npm install

# 3. Jalankan server development
npm start
# atau
npm run dev
```

Buka browser di: **`http://localhost:3000`**

### Opsi Alternatif (Tanpa Node.js)

```bash
# Dengan Python
python -m http.server 8080
# Buka: http://localhost:8080

# Atau gunakan VS Code Live Server Extension
```

---

## 🚀 Panduan Menambah Modul Baru (Plug-and-Play)

Karena aplikasi menggunakan **arsitektur modular**, tambah modul baru kapan saja cukup dengan **3 langkah mudah**:

### Langkah 1: Buat Folder Modul Baru

```
modules/
└── nama-modul-baru/
    ├── index.js          # Kelas utama modul (WAJIB)
    ├── ModulService.js   # Logika/service (opsional)
    ├── ModulView.js      # Komponen UI (opsional)
    └── modul.css         # Styling (opsional)
```

### Langkah 2: Buat Kelas Modul

Implementasikan antarmuka standar `init()`, `mount()`, dan `unmount()`:

```javascript
// modules/file-converter/index.js
export class FileConverterModule {
  async init() {
    // Inisialisasi data, service, atau fetch awal
    console.log('FileConverter initialized');
  }

  async mount(container, params) {
    // Render UI ke dalam container yang diberikan Router
    container.innerHTML = `
      <div class="card glass-panel">
        <h3 class="card-title">📄 File Converter</h3>
        <p>Konversi PDF ke Word dan sebaliknya.</p>
      </div>
    `;
    // Pasang event listener di sini
  }

  async unmount() {
    // Bersihkan event listener & resource saat pindah halaman
  }
}
```

### Langkah 3: Daftarkan di `js/modules.config.js`

```javascript
// Tambahkan entri baru ke array modulesConfig:
{
  id: 'file-converter',
  name: 'File Converter',
  shortName: 'Converter',
  icon: '📄',
  description: 'Konversi dokumen PDF ke Word dan sebaliknya.',
  route: 'file-converter',
  order: 5,           // Urutan tampil di sidebar
  badge: 'Baru',      // Badge opsional (misal: 'Beta', 'Pro', 'Baru')
  factory: async () => {
    const { FileConverterModule } = await import('../modules/file-converter/index.js');
    return new FileConverterModule();
  }
}
```

> **Selesai!** Menu sidebar, navigasi mobile, rute URL `#file-converter`, dan lifecycle akan **otomatis terkonfigurasi** tanpa harus mengubah kode core aplikasi atau melepas sistem lama. 🎉

---

## 🧰 Teknologi yang Digunakan

| Teknologi | Peran |
|---|---|
| **HTML5 + CSS3 + Vanilla JS** | Core stack tanpa framework — ringan & cepat |
| **File System Access API** | Simpan file langsung ke folder lokal |
| **IndexedDB** | Penyimpanan data besar persisten di browser |
| **Canvas API** | Editor foto HD 1080×1080 multi-layer |
| **Web Audio API** | Synthesizer suara notifikasi in-app |
| **Web Notifications API** | Push notification native OS |
| **Service Worker** | Caching offline & PWA lifecycle |
| **Google Gemini AI** | Analisis kendaraan & rekomendasi servis |
| **Node.js + Express** | Backend API server |
| **Vercel** | Platform deployment serverless |

---

## ☁️ Deployment — Vercel

Proyek ini dikonfigurasi untuk deployment di **Vercel** dengan `vercel.json`.

```bash
# Deploy menggunakan Vercel CLI
npx vercel --prod
```

Atau hubungkan repositori GitHub ini ke dashboard [vercel.com](https://vercel.com) untuk **auto-deploy** setiap kali ada push ke branch `main`.

---

## 🔁 Git Remote Setup (Dual Push)

Proyek ini dikonfigurasi dengan **dual push** — setiap `git push` akan otomatis mengirim ke **dua repositori** sekaligus:

| Remote | Repository |
|---|---|
| Primary | `github.com/dehaakim-studio/all-in-one-app` |
| Backup | `github.com/dhfoundry-studio/All-In-One-Utility-backup` |

```bash
# Cukup ketik ini untuk push ke kedua repo sekaligus:
git push
```

---

## 🤝 Kontribusi

Kontribusi sangat disambut! Silakan:

1. **Fork** repositori ini
2. Buat **branch fitur** baru: `git checkout -b feature/nama-fitur`
3. **Commit** perubahan: `git commit -m 'feat: tambah fitur X'`
4. **Push** ke branch: `git push origin feature/nama-fitur`
5. Buat **Pull Request**

---

## 📄 Lisensi

Didistribusikan di bawah **MIT License**. Lihat file `LICENSE` untuk informasi lebih lanjut.

---

<div align="center">

Dibuat dengan ❤️ oleh **dehaakim-studio** & **dhfoundry-studio**

⭐ Jika proyek ini membantu, jangan lupa beri **Star**!

</div>
