/**
 * Daftar Konfigurasi Modul Aplikasi (Pluggable Registry)
 * Modul baru di masa depan cukup ditambahkan ke array ini tanpa mengubah core code!
 */

export const modulesConfig = [
  {
    id: 'downloader',
    name: 'Media Downloader',
    shortName: 'Downloader',
    icon: '⬇️',
    description: 'Unduh video & audio YouTube, TikTok (vt.tiktok.com) & Instagram dengan format bit rate & live progress.',
    route: 'downloader',
    order: 1,
    badge: 'v1.3',
    factory: async () => {
      const { DownloaderModule } = await import(`../modules/downloader/index.js?v=${Date.now()}`);
      return new DownloaderModule();
    }
  },
  {
    id: 'productive-tools',
    name: 'Productive Tools (Oli & Servis)',
    shortName: 'Oli & Servis',
    icon: '🏍️',
    description: 'Jadwal servis kendaraan, analisis Gemini AI (wajib ganti oli min 1 bulan), & kompresi nota.',
    route: 'productive-tools',
    order: 2,
    badge: 'AI Powered',
    factory: async () => {
      const { ProductiveToolsModule } = await import('../modules/productive-tools/index.js');
      return new ProductiveToolsModule();
    }
  },
  {
    id: 'notifications',
    name: 'Pusat Notifikasi',
    shortName: 'Notifikasi',
    icon: '🔔',
    description: 'Pengaturan Browser Push Notifications & In-App Popups pengingat servis motor.',
    route: 'notifications',
    order: 3,
    badge: 'Alerts',
    factory: async () => {
      const { NotificationModule } = await import('../modules/notifications/index.js');
      return new NotificationModule();
    }
  }
];
