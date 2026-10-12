/**
 * NotificationManager - Mengelola Browser Push Notification & In-App Popups
 */
import { storage } from '../../js/core/Storage.js';
import { globalEventBus } from '../../js/core/EventBus.js';

export class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.checkPermission();
  }

  checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    } else {
      this.permission = 'unsupported';
    }
    return this.permission;
  }

  /**
   * Meminta izin push notification dari browser
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('Browser Anda tidak mendukung Web Notification API.');
    }

    const result = await Notification.requestPermission();
    this.permission = result;
    storage.setSetting('push_notification_permission', result);
    globalEventBus.emit('notification:permission_changed', result);
    return result;
  }

  /**
   * Menampilkan notifikasi push browser dan in-app popup secara simultan
   */
  showNotification(title, message, options = {}) {
    const isUrgent = options.urgent || false;

    // 1. Bunyikan nada dering notifikasi sintetis (Web Audio API)
    this.playNotificationSound(isUrgent ? 'urgent' : 'chime');

    // 2. Tampilkan Browser Push Notification jika diizinkan
    if (this.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=128&auto=format&fit=crop&q=80',
          badge: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=128&auto=format&fit=crop&q=80',
          tag: options.tag || 'oil-service-alert',
          renotify: true
        });
      } catch (err) {
        console.warn('[NotificationManager] Native notification gagal:', err);
      }
    }

    // 3. Tampilkan In-App Popup Otomatis
    this.showInAppPopup(title, message, options);

    // Simpan ke log riwayat notifikasi
    this.logNotification({
      id: 'notif_' + Date.now(),
      title,
      message,
      timestamp: Date.now(),
      urgent: isUrgent
    });
  }

  /**
   * Menampilkan In-App Popup dinamis di layar aplikasi
   */
  showInAppPopup(title, message, options = {}) {
    // Hapus popup lama jika masih ada
    const oldPopup = document.querySelector('.urgent-service-popup');
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement('div');
    popup.className = `urgent-service-popup ${options.urgent ? 'overdue' : ''}`;
    popup.innerHTML = `
      <div class="urgent-popup-header">
        <div class="urgent-popup-title">
          <span>${options.urgent ? '🚨' : '🔔'}</span>
          <span>${title}</span>
        </div>
        <button class="modal-close-btn" style="position:static; width:26px; height:26px; font-size:12px;" id="btn-close-popup">✕</button>
      </div>
      <div class="urgent-popup-body">
        ${message}
      </div>
      <div class="urgent-popup-actions">
        <a href="#productive-tools" class="btn btn-primary btn-sm" id="btn-popup-goto-service">Lihat Jadwal Servis</a>
        <button class="btn btn-secondary btn-sm" id="btn-dismiss-popup">Tutup</button>
      </div>
    `;

    document.body.appendChild(popup);

    const close = () => {
      popup.style.animation = 'slideInDown 0.3s reverse forwards';
      setTimeout(() => popup.remove(), 300);
    };

    popup.querySelector('#btn-close-popup').onclick = close;
    popup.querySelector('#btn-dismiss-popup').onclick = close;
    popup.querySelector('#btn-popup-goto-service').onclick = close;

    // Auto dismiss setelah 15 detik jika bukan urgent
    if (!options.urgent) {
      setTimeout(() => {
        if (document.body.contains(popup)) close();
      }, 15000);
    }
  }

  /**
   * Menghasilkan audio notifikasi synthesizer dengan Web Audio API
   */
  playNotificationSound(type = 'chime') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'urgent') {
        // Nada peringatan dua nada cepat
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(587, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else {
        // Nada chime lembut ramah
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  logNotification(record) {
    const logs = storage.getSetting('notification_logs', []);
    logs.unshift(record);
    if (logs.length > 50) logs.pop();
    storage.setSetting('notification_logs', logs);
    globalEventBus.emit('notification:new', record);
  }

  getLogs() {
    return storage.getSetting('notification_logs', []);
  }

  clearLogs() {
    storage.setSetting('notification_logs', []);
  }
}
