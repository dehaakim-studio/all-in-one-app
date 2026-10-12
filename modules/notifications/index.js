/**
 * NotificationModule - Entry Point Modul Pusat Notifikasi
 */
import { NotificationManager } from './NotificationManager.js';
import { ServiceScheduler } from './ServiceScheduler.js';
import { storage } from '../../js/core/Storage.js';

export const globalNotificationManager = new NotificationManager();
export const globalServiceScheduler = new ServiceScheduler(globalNotificationManager);

export class NotificationModule {
  constructor() {
    this.manager = globalNotificationManager;
    this.scheduler = globalServiceScheduler;
    this.container = null;
    this._initialized = false;
  }

  async init() {
    this._initialized = true;
  }

  async mount(container, params = {}) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  render() {
    const perm = this.manager.checkPermission();
    const isGranted = perm === 'granted';
    const logs = this.manager.getLogs();

    this.container.innerHTML = `
      <div class="notifications-grid">
        <!-- Status Izin Push Notification Banner -->
        <div class="permission-banner-card glass-panel ${isGranted ? 'granted' : 'default'}">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="font-size:32px;">${isGranted ? '✅' : '🔔'}</div>
            <div>
              <div style="font-size:16px; font-weight:700;">
                ${isGranted ? 'Browser Push Notifications Aktif' : 'Izin Notifikasi Browser Belum Aktif'}
              </div>
              <div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">
                ${isGranted 
                  ? 'Aplikasi akan mengirimkan pengingat push otomatis ke desktop/ponsel Anda saat mendekati tenggat ganti oli.' 
                  : 'Aktifkan izin notifikasi agar browser dapat menampilkan peringatan saat mendekati batas 1 bulan ganti oli.'}
              </div>
            </div>
          </div>

          <div style="display:flex; gap:10px;">
            ${!isGranted ? `<button class="btn btn-primary" id="btn-request-perm">Aktifkan Push Notifikasi</button>` : ''}
            <button class="btn btn-secondary btn-sm" id="btn-test-notif">⚡ Uji Coba Notifikasi</button>
            <button class="btn btn-cyan btn-sm" id="btn-run-check">🔍 Periksa Jadwal Sekarang</button>
          </div>
        </div>

        <!-- Preferensi Notifikasi & Peringatan -->
        <div class="card glass-panel">
          <div class="card-header">
            <div>
              <h3 class="card-title"><span>⚙️</span> Pengaturan Peringatan Servis Otomatis</h3>
              <p class="card-subtitle">Sesuaikan kapan sistem harus memperingatkan jadwal ganti oli</p>
            </div>
          </div>

          <div class="notify-settings-grid">
            <div class="notify-setting-item">
              <div>
                <div style="font-weight:600; font-size:13.5px;">Peringatan H-3 (Tiga Hari Sebelum)</div>
                <div style="font-size:11.5px; color:var(--text-muted);">Pemberitahuan awal untuk mempersiapkan oli & waktu bengkel</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="pref-h3" checked>
                <span class="slider-switch"></span>
              </label>
            </div>

            <div class="notify-setting-item">
              <div>
                <div style="font-weight:600; font-size:13.5px;">Peringatan H-1 (Satu Hari Sebelum)</div>
                <div style="font-size:11.5px; color:var(--text-muted);">Pengingat mendesak sebelum batas waktu 1 bulan</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="pref-h1" checked>
                <span class="slider-switch"></span>
              </label>
            </div>

            <div class="notify-setting-item">
              <div>
                <div style="font-weight:600; font-size:13.5px;">Hari H (Tenggat Waktu Servis)</div>
                <div style="font-size:11.5px; color:var(--text-muted);">Notifikasi utama ganti oli tepat waktu</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="pref-h0" checked>
                <span class="slider-switch"></span>
              </label>
            </div>

            <div class="notify-setting-item">
              <div>
                <div style="font-weight:600; font-size:13.5px; color:var(--accent-rose);">Peringatan Keterlambatan (Overdue)</div>
                <div style="font-size:11.5px; color:var(--text-muted);">Peringatan darurat bahaya kerusakan piston jika telat</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="pref-overdue" checked>
                <span class="slider-switch"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Log Riwayat Notifikasi Terkirim -->
        <div class="card glass-panel">
          <div class="card-header">
            <div>
              <h3 class="card-title"><span>📜</span> Riwayat Notifikasi Terkirim</h3>
              <p class="card-subtitle">Daftar pemberitahuan yang pernah dipicu oleh sistem</p>
            </div>
            <button class="btn btn-outline btn-danger btn-sm" id="btn-clear-logs">🗑️ Hapus Log</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Status</th>
                  <th>Judul Notifikasi</th>
                  <th>Pesan</th>
                  <th>Waktu Terkirim</th>
                </tr>
              </thead>
              <tbody id="logs-tbody">
                ${this.renderLogRows(logs)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderLogRows(logs) {
    if (!logs || logs.length === 0) {
      return `
        <tr>
          <td colspan="4" style="text-align:center; padding:30px; color:var(--text-dim);">
            Belum ada notifikasi terkirim. Klik tombol "Uji Coba Notifikasi" di atas untuk mengetes.
          </td>
        </tr>
      `;
    }

    return logs.map(l => {
      const timeStr = new Date(l.timestamp).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      return `
        <tr>
          <td>
            <span style="font-size:18px;">${l.urgent ? '🚨' : '🔔'}</span>
          </td>
          <td><strong>${l.title}</strong></td>
          <td style="font-size:13px; color:var(--text-muted);">${l.message}</td>
          <td style="font-size:12px; font-family:var(--font-mono); color:var(--text-dim);">${timeStr}</td>
        </tr>
      `;
    }).join('');
  }

  bindEvents() {
    const btnReq = this.container.querySelector('#btn-request-perm');
    btnReq?.addEventListener('click', async () => {
      try {
        const res = await this.manager.requestPermission();
        this.render();
        this.bindEvents();
        if (res === 'granted') {
          this.manager.showNotification('Push Notification Aktif!', 'Anda akan menerima pengingat servis otomatis.');
        }
      } catch (err) {
        alert(err.message);
      }
    });

    // Test notification
    this.container.querySelector('#btn-test-notif')?.addEventListener('click', () => {
      this.manager.showNotification(
        '🔔 PENGUJIAN NOTIFIKASI SUKSES!',
        'Sistem notifikasi All-in-One Utility berfungsi normal. Anda akan diingatkan tepat waktu ganti oli motor!',
        { urgent: false }
      );
      this.render();
      this.bindEvents();
    });

    // Run schedule check now
    this.container.querySelector('#btn-run-check')?.addEventListener('click', async () => {
      await this.scheduler.checkSchedules();
      this.render();
      this.bindEvents();
    });

    // Clear logs
    this.container.querySelector('#btn-clear-logs')?.addEventListener('click', () => {
      this.manager.clearLogs();
      this.render();
      this.bindEvents();
    });
  }

  async unmount() {
    // Unmount hook
  }
}
