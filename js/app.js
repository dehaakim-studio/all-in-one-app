/**
 * App Bootstrapper - Inisialisasi Arsitektur Modular & Lifecycle
 */
import { ModuleRegistry } from './core/ModuleRegistry.js';
import { Router } from './core/Router.js';
import { globalEventBus } from './core/EventBus.js';
import { modulesConfig } from './modules.config.js';
import { globalServiceScheduler, globalNotificationManager } from '../modules/notifications/index.js';

class App {
  constructor() {
    this.container = document.getElementById('module-viewport');
    this.registry = new ModuleRegistry(this.container);
    this.router = new Router('downloader');
  }

  async init() {
    console.log('[App] Memulai All-in-One Utility...');

    // 1. Daftarkan semua modul dari konfigurasi modular
    modulesConfig.forEach(modDef => {
      this.registry.register(modDef);
    });

    // 2. Setup rute untuk setiap modul yang terdaftar
    const registeredModules = this.registry.getRegisteredModules();
    registeredModules.forEach(mod => {
      this.router.register(mod.route, (queryParams) => {
        this.registry.loadModule(mod.id, queryParams);
        this.updateActiveNav(mod.route);
        this.updateHeaderTitle(mod.name, mod.description);
      });
    });

    // 3. Render Menu Navigasi Dinamis (Sidebar & Mobile Bottom Bar)
    this.renderNavigation(registeredModules);

    // 4. Inisialisasi Event Bus & Scheduler Notifikasi Latar Belakang
    globalServiceScheduler.start();

    // 5. Setup Navigasi & Mobile Sidebar
    this.setupLayoutEvents();

    // 6. Jalankan router
    this.router.init();

    // 7. Daftarkan Service Worker jika didukung
    this.registerServiceWorker();
  }

  renderNavigation(modules) {
    const sidebarNav = document.getElementById('sidebar-nav-container');
    const mobileBottomNav = document.getElementById('mobile-bottom-nav-container');

    let sidebarHtml = '<div class="nav-section-title">Modul Utama</div>';
    let mobileHtml = '';

    modules.forEach(m => {
      sidebarHtml += `
        <a href="#${m.route}" class="nav-item" data-route="${m.route}">
          <span class="nav-icon">${m.icon}</span>
          <span class="nav-text">${m.name}</span>
          ${m.badge ? `<span class="nav-badge">${m.badge}</span>` : ''}
        </a>
      `;

      mobileHtml += `
        <a href="#${m.route}" class="mobile-nav-item" data-route="${m.route}">
          <span class="mobile-nav-icon">${m.icon}</span>
          <span>${m.shortName || m.name}</span>
        </a>
      `;
    });

    if (sidebarNav) sidebarNav.innerHTML = sidebarHtml;
    if (mobileBottomNav) mobileBottomNav.innerHTML = mobileHtml;
  }

  updateActiveNav(activeRoute) {
    // Update sidebar items
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-route') === activeRoute) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update mobile bottom nav items
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      if (el.getAttribute('data-route') === activeRoute) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Tutup mobile drawer jika sedang terbuka
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
    }
  }

  updateHeaderTitle(title, description) {
    const titleEl = document.getElementById('header-title-text');
    const descEl = document.getElementById('header-desc-text');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = description || '';
  }

  setupLayoutEvents() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (mobileToggle && sidebar && backdrop) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
      });

      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }

    // Modal Manajemen Plugin / Modul Baru
    const btnPluginManager = document.getElementById('btn-plugin-manager');
    const pluginModal = document.getElementById('plugin-manager-modal');
    const closePluginModal = document.getElementById('close-plugin-modal');

    if (btnPluginManager && pluginModal) {
      btnPluginManager.addEventListener('click', () => {
        this.renderPluginModalContent();
        pluginModal.classList.add('active');
      });

      closePluginModal?.addEventListener('click', () => {
        pluginModal.classList.remove('active');
      });
    }
  }

  renderPluginModalContent() {
    const container = document.getElementById('plugin-list-container');
    if (!container) return;

    const list = this.registry.getRegisteredModules();
    container.innerHTML = list.map(m => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:var(--radius-sm); margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:22px;">${m.icon}</span>
          <div>
            <div style="font-weight:700; font-size:13.5px; color:#fff;">${m.name}</div>
            <div style="font-size:11.5px; color:var(--text-muted);">${m.description}</div>
          </div>
        </div>
        <span class="badge badge-emerald">Aktif & Plugged-In</span>
      </div>
    `).join('');
  }

  async registerServiceWorker() {
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        const CURRENT_CACHE = 'aio-utility-v7';
        for (const key of keys) {
          if (key !== CURRENT_CACHE) {
            await caches.delete(key);
            console.log('[Cache] Cache lama berhasil dibersihkan:', key);
          }
        }
      } catch (_) {}
    }

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js');
        reg.update();
        console.log('[PWA] Service Worker terdaftar & diperbarui.');
      } catch (e) {
        console.warn('[PWA] Service worker registration failed:', e);
      }
    }
  }
}

// Inisialisasi aplikasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
