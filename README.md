# ⚡ All-in-One Utility Web App (Modular & Production-Ready)

Aplikasi web modern berbasis **arsitektur modular & plug-in extensible** yang dirancang agar penambahan fitur dan modul baru di masa depan dapat dilakukan dengan sangat mudah tanpa harus melepas (*uninstall*) sistem aplikasi yang sudah berjalan.

---

## 📁 Struktur Direktori & Arsitektur Proyek

```
All-in-One Utility/
├── index.html                   # Titik masuk utama aplikasi (Layout, Sidebar, Viewport)
├── manifest.json                # PWA Manifest (Bisa diinstall ke homescreen & desktop)
├── sw.js                        # Service Worker untuk caching offline & push notification
├── package.json                 # Konfigurasi proyek & skrip dev server
├── README.md                    # Dokumentasi lengkap & tutorial plugin
├── css/
│   ├── main.css                 # Desain sistem global, variabel warna, ambient glow, layout
│   ├── components.css           # Komponen UI: Tombol, kartu kaca, form, badge, progress bar, modal, toast
│   └── responsive.css           # Optimasi mobile, mobile drawer, & bottom navigation bar
├── js/
│   ├── app.js                   # Bootstrapper aplikasi & inisialisasi lifecycle
│   ├── modules.config.js        # Konfigurasi registry modul plug-in
│   └── core/
│       ├── ModuleRegistry.js    # Pengelola plugin dinamis & siklus hidup modul (init, mount, unmount)
│       ├── EventBus.js          # Sistem komunikasi antar-modul tanpa kopling erat (Pub/Sub)
│       ├── Storage.js           # Wrapper IndexedDB + LocalStorage (Penyimpanan nota, media, riwayat)
│       └── Router.js            # SPA Hash Router responsif tanpa reload halaman
└── modules/
    ├── downloader/              # MODUL 1: Media Downloader
    │   ├── index.js             # Kelas utama DownloaderModule
    │   ├── DownloaderService.js # Mesin ekstraksi URL, File System Access API, stream simulator
    │   ├── DownloaderView.js    # UI input URL, pemilihan resolusi, live progress, tabel riwayat
    │   └── downloader.css       # Styling khusus modul downloader
    ├── frame-studio/            # MODUL 2: Frame Studio (Editor Bingkai Foto)
    │   ├── index.js             # Kelas utama FrameStudioModule
    │   ├── CanvasEditor.js      # Engine HTML5 Canvas 1080x1080, layer teks, filter ATM, transform
    │   ├── FrameStudioView.js   # Panel preset, color picker, tool ATM cutout, modal ekspor Canva
    │   └── frame-studio.css     # Styling khusus modul frame studio
    ├── productive-tools/        # MODUL 3: Productive Tools (Jadwal Ganti Oli + Gemini AI)
    │   ├── index.js             # Kelas utama ProductiveToolsModule
    │   ├── VehicleService.js    # Database kendaraan, status piston (Ya/Belum), kompresi nota WebP
    │   ├── GeminiService.js     # Integrasi Google Gemini 1.5/2.0 Flash (Penegakan Rule Wajib 1 Bulan)
    │   ├── ProductiveToolsView.js# Form kendaraan, konsultasi AI, form servis, preview nota
    │   └── productive-tools.css # Styling khusus dashboard servis kendaraan
    └── notifications/           # MODUL 4: Sistem Notifikasi
        ├── index.js             # Kelas utama NotificationModule & pusat kontrol
        ├── NotificationManager.js# Web Push API, in-app modal popup, synthesizer suara Web Audio API
        ├── ServiceScheduler.js  # Scheduler otomatis pengecekan tenggat servis kendaraan (H-3, H-1, Hari H, Telat)
        └── notifications.css    # Styling peringatan darurat & notification center
```

---

## 🛠️ Fitur & Modul Utama

### 1. Prinsip Desain Modular & Extensible
- **Sistem Plugin**: Seluruh modul independen dan memiliki *lifecycle* `init()`, `mount(container)`, dan `unmount()`.
- **Komunikasi Longgar**: Menggunakan `EventBus` terpusat sehingga antar-modul dapat saling bertukar data tanpa saling merusak jika ada modul yang dinonaktifkan.
- **Penyimpanan Handal**: Menggunakan **IndexedDB** untuk data besar (nota terkompresi, riwayat download) dengan fallback ke LocalStorage.

### 2. Modul 1: Media Downloader
- **Pengaturan Folder Lokal**: Mendukung **File System Access API** (`window.showDirectoryPicker()`) untuk menyimpan file langsung ke folder lokal komputer pilihan pengguna, serta fallback unduhan browser standar.
- **Deteksi URL Otomatis**: Mendukung YouTube, TikTok, Instagram, dan direct URL.
- **Progress Bar Real-Time**: Menampilkan persentase unduhan (0% - 100%), ukuran terunduh, kecepatan transfer (MB/s), status proses (muxing, stream), dan tombol pembatalan.
- **Tabel Riwayat**: Tersimpan persisten di IndexedDB lengkap dengan thumbnail, ukuran, tanggal, filter, dan aksi unduh ulang / hapus.

### 3. Modul 2: Frame Studio (Editor Bingkai Foto)
- **Konsep ATM (Amati, Tiru, Modifikasi)**:
  - Fitur upload foto bingkai referensi.
  - **Pembersih Elemen Dalam (ATM Mask / Window Cutout)**: Otomatis membersihkan bagian dalam bingkai untuk menyisakan kerangka utama tempat foto pengguna diselipkan.
  - **Chroma Key Cutout**: Menghilangkan warna latar solid untuk menghasilkan kerangka transparan.
- **Editor HTML5 Canvas Interaktif**:
  - Resolusi kanvas tinggi (1080x1080 HD).
  - Multi-layer: Layer Foto Pengguna (drag, zoom in/out, rotate 360°), Layer Bingkai, dan Layer Teks Dinamis tak terbatas.
  - Color Picker interaktif untuk teks, garis tepi (stroke), latar belakang, dan aksen bingkai.
  - Preset bingkai siap pakai: Cyber Twibbon, Automotive Pro, Minimal Clean.
  - Fitur Undo / Redo history.
- **Ekspor ke Canva**:
  - Konversi kanvas menjadi file PNG resolusi tinggi.
  - Menghasilkan tautan integrasi Canva (`canva.com/design/create`) beserta dialog panduan langkah ekspor sekali klik.

### 4. Modul 3: Productive Tools (Jadwal Ganti Oli & Kendaraan + Gemini AI)
- **Form & Profil Kendaraan**:
  - Nama/Jenis Kendaraan, Tahun Produksi, Kilometer Saat Ini, dan Estimasi KM Harian.
  - **Riwayat Komponen Utama**: Status Penggantian Piston (**Ya / Belum**), catatan piston (standar/bore-up), roller & V-belt, busi.
- **Integrasi Google Gemini AI**:
  - Terintegrasi dengan endpoint Google Generative AI (Gemini 1.5 / 2.0 Flash) dengan API key yang tersimpan aman di client.
  - Tersedia **Smart Mechanical Intelligence Simulator** sebagai fallback offline jika API key belum dimasukkan.
  - **ATURAN MUTLAK WAJIB (STRICT RULE):**
    > Hasil analisis AI **HARUS menyimpulkan secara TEGAS bahwa motor wajib ganti oli MINIMAL 1 BULAN SEKALI** (atau lebih cepat jika mencapai batas 1.500 - 2.000 KM atau beban piston berat) demi mencegah penguapan oli dan kerusakan piston fatal.
- **Form Servis & Kompresi Nota Ukuran Ringkas**:
  - Pencatatan tanggal servis, jenis oli, lokasi bengkel, dan biaya.
  - Tanggal jatuh tempo otomatis dihitung default **1 bulan ke depan**.
  - **Kompresor Nota Client-Side**: Otomatis mengompresi foto nota dari kamera/file HP dari 3-8 MB menjadi file WebP/JPEG sangat ringkas (&lt; 100 KB) dengan teks tetap tajam dan terbaca!
  - Modal preview nota ukuran penuh.

### 5. Modul 4: Sistem Notifikasi
- **Browser Push Notification**: Meminta izin native Web Notification untuk mengirim push notification ke sistem operasi/desktop/mobile.
- **In-App Urgent Popup**: Banner popup darurat otomatis dengan efek animasi dan synthesizer audio (*Web Audio API*) saat:
  - H-3 sebelum jadwal ganti oli
  - H-1 sebelum jadwal ganti oli
  - Hari H ("Waktunya Ganti Oli Hari Ini!")
  - Terlambat (Overdue alert dengan penanda bahaya kerusakan piston)
- **Service Scheduler Otomatis**: Memeriksa seluruh jadwal motor di latar belakang setiap interval waktu dan saat aplikasi pertama kali dibuka.

---

## 🚀 Panduan Menambah Modul Baru (Plug-and-Play)

Karena aplikasi menggunakan **arsitektur modular**, Anda dapat menambahkan modul baru kapan saja di masa depan cukup dengan 3 langkah mudah:

### Langkah 1: Buat Folder Modul Baru
Buat folder di `modules/nama-modul-baru/`, misalnya `modules/file-converter/` dengan file `index.js`.

### Langkah 2: Buat Kelas Modul
Implementasikan antarmuka modul standar:
```javascript
// modules/file-converter/index.js
export class FileConverterModule {
  async init() {
    // Inisialisasi data atau service
  }

  async mount(container, params) {
    container.innerHTML = `
      <div class="card glass-panel">
        <h3 class="card-title">📄 Modul Baru: File Converter</h3>
        <p>Fitur konversi PDF ke Word dan sebaliknya.</p>
      </div>
    `;
  }

  async unmount() {
    // Cleanup event listener jika ada
  }
}
```

### Langkah 3: Daftarkan di `js/modules.config.js`
Tambahkan entri modul Anda ke array `modulesConfig`:
```javascript
{
  id: 'file-converter',
  name: 'File Converter',
  shortName: 'Converter',
  icon: '📄',
  description: 'Konversi dokumen PDF ke Word dan sebaliknya.',
  route: 'file-converter',
  order: 5,
  badge: 'Baru',
  factory: async () => {
    const { FileConverterModule } = await import('../modules/file-converter/index.js');
    return new FileConverterModule();
  }
}
```

**Selesai!** Menu sidebar, navigasi mobile, rute URL `#file-converter`, dan lifecycle akan otomatis terkonfigurasi tanpa harus mengubah kode core aplikasi atau melepas sistem lama.

---

## 💻 Cara Menjalankan Aplikasi

Aplikasi dapat dijalankan secara langsung dengan server statis apa pun:

### Opsi 1: Menjalankan dengan Node.js / npx
```bash
# Di direktori proyek:
npm start
# atau
npx serve -s . -l 3000
```
Buka browser Anda di: `http://localhost:3000`

### Opsi 2: Menggunakan VS Code Live Server / Python
```bash
python -m http.server 8080
```
Buka browser di: `http://localhost:8080`
