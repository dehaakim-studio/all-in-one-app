/**
 * ServiceScheduler - Otomasi Pengecekan Tenggat Waktu Ganti Oli & Servis
 * Memeriksa jadwal kendaraan dan memicu notifikasi otomatis saat mendekati tenggat.
 */
import { storage } from '../../js/core/Storage.js';
import { globalEventBus } from '../../js/core/EventBus.js';

export class ServiceScheduler {
  constructor(notificationManager) {
    this.notificationManager = notificationManager;
    this.timer = null;
    this.checkIntervalMs = 10 * 60 * 1000; // Cek setiap 10 menit
  }

  start() {
    this.checkSchedules();
    this.timer = setInterval(() => this.checkSchedules(), this.checkIntervalMs);

    // Dengar juga saat ada pembaruan data servis
    globalEventBus.on('service:updated', () => this.checkSchedules());
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Memeriksa seluruh kendaraan dan jadwal servis aktif
   */
  async checkSchedules() {
    try {
      const vehicles = await storage.getAll('vehicles');
      const allServices = await storage.getAll('services');

      if (!vehicles || vehicles.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastAlertMap = storage.getSetting('scheduler_last_alerts', {});

      for (const vehicle of vehicles) {
        // Cari catatan servis terbaru untuk kendaraan ini
        const vServices = allServices
          .filter(s => s.vehicleId === vehicle.id)
          .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

        if (vServices.length === 0) continue;

        const latestService = vServices[0];
        if (!latestService.nextDueDate) continue;

        const dueDate = new Date(latestService.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const alertKey = `${vehicle.id}_${latestService.nextDueDate}_d${diffDays}`;
        const todayStr = today.toISOString().split('T')[0];

        // Jangan bunyikan berkali-kali untuk notifikasi yang sama di hari yang sama
        if (lastAlertMap[alertKey] === todayStr) {
          continue;
        }

        if (diffDays < 0) {
          // TERLAMBAT / OVERDUE
          const overdueDays = Math.abs(diffDays);
          this.notificationManager.showNotification(
            `🚨 TERLAMBAT GANTI OLI: ${vehicle.name}`,
            `Jadwal ganti oli motor Anda telah terlewat ${overdueDays} hari! Segera ganti oli sekarang untuk mencegah piston baret dan turun mesin.`,
            { urgent: true, tag: `overdue_${vehicle.id}` }
          );
          lastAlertMap[alertKey] = todayStr;

        } else if (diffDays === 0) {
          // HARI H
          this.notificationManager.showNotification(
            `⚡ WAKTUNYA GANTI OLI HARI INI: ${vehicle.name}`,
            `Hari ini adalah batas waktu 1 bulan ganti oli untuk ${vehicle.name}. Kunjungi bengkel resmi atau langganan Anda hari ini.`,
            { urgent: true, tag: `today_${vehicle.id}` }
          );
          lastAlertMap[alertKey] = todayStr;

        } else if (diffDays === 1) {
          // H-1
          this.notificationManager.showNotification(
            `🔔 PENGINGAT H-1: Ganti Oli Besok (${vehicle.name})`,
            `Besok adalah batas tenggat waktu servis 1 bulan Anda. Siapkan oli baru ${latestService.oilBrand || ''}.`,
            { urgent: false, tag: `h1_${vehicle.id}` }
          );
          lastAlertMap[alertKey] = todayStr;

        } else if (diffDays <= 3 && diffDays > 1) {
          // H-3
          this.notificationManager.showNotification(
            `📅 Pengingat H-3 Jadwal Servis: ${vehicle.name}`,
            `Tersisa ${diffDays} hari menuju waktu penggantian oli motor Anda.`,
            { urgent: false, tag: `h3_${vehicle.id}` }
          );
          lastAlertMap[alertKey] = todayStr;
        }
      }

      storage.setSetting('scheduler_last_alerts', lastAlertMap);

    } catch (err) {
      console.warn('[ServiceScheduler] Error saat memeriksa jadwal:', err);
    }
  }
}
