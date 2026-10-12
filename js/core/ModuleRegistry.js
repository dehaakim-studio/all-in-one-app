/**
 * ModuleRegistry - Pusat Manajemen Plugin & Modul Ekstensibel
 * Memungkinkan penambahan modul baru di masa depan secara plug-and-play.
 */
import { globalEventBus } from './EventBus.js';

export class ModuleRegistry {
  constructor(containerElement) {
    this.container = containerElement;
    this.modules = new Map(); // id -> module definition
    this.activeModuleId = null;
    this.activeInstance = null;
  }

  /**
   * Mendaftarkan modul baru ke dalam sistem
   * @param {Object} moduleDef 
   * {
   *   id: string,
   *   name: string,
   *   icon: string,
   *   description: string,
   *   route: string,
   *   factory: () => Promise<ModuleInstance> | ModuleInstance,
   *   enabled: boolean,
   *   order: number
   * }
   */
  register(moduleDef) {
    if (!moduleDef.id) {
      throw new Error('[ModuleRegistry] Module ID is required');
    }

    if (this.modules.has(moduleDef.id)) {
      console.warn(`[ModuleRegistry] Modul ${moduleDef.id} sudah terdaftar. Mengganti definisi lama.`);
    }

    this.modules.set(moduleDef.id, {
      enabled: true,
      order: 10,
      ...moduleDef
    });

    globalEventBus.emit('module:registered', moduleDef);
  }

  /**
   * Mengambil daftar semua modul yang terdaftar dan aktif
   * @returns {Array}
   */
  getRegisteredModules() {
    return Array.from(this.modules.values())
      .filter(m => m.enabled)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Mengambil metadata modul berdasarkan ID
   * @param {string} id 
   */
  getModule(id) {
    return this.modules.get(id);
  }

  /**
   * Mengaktifkan dan memuat modul ke container utama
   * @param {string} moduleId 
   * @param {Object} params - Query params dari router
   */
  async loadModule(moduleId, params = {}) {
    const modDef = this.modules.get(moduleId);
    if (!modDef) {
      this.renderNotFound(moduleId);
      return;
    }

    // Jika modul yang sama sudah aktif, berikan event refresh atau update
    if (this.activeModuleId === moduleId && this.activeInstance) {
      if (typeof this.activeInstance.onRouteUpdate === 'function') {
        this.activeInstance.onRouteUpdate(params);
      }
      return;
    }

    try {
      this.showLoading();

      // Unmount modul sebelumnya jika ada
      if (this.activeInstance && typeof this.activeInstance.unmount === 'function') {
        try {
          await this.activeInstance.unmount();
        } catch (unmountErr) {
          console.error(`[ModuleRegistry] Gagal unmount modul ${this.activeModuleId}:`, unmountErr);
        }
      }

      this.container.innerHTML = '';

      // Buat instance baru modul
      let instance;
      if (typeof modDef.factory === 'function') {
        instance = await modDef.factory();
      } else if (modDef.instance) {
        instance = modDef.instance;
      } else {
        throw new Error(`Modul ${moduleId} tidak memiliki factory atau instance valid.`);
      }

      // Panggil lifecycle init jika baru pertama kali
      if (typeof instance.init === 'function' && !instance._initialized) {
        await instance.init();
        instance._initialized = true;
      }

      // Mount tampilan ke container
      if (typeof instance.mount === 'function') {
        await instance.mount(this.container, params);
      }

      this.activeModuleId = moduleId;
      this.activeInstance = instance;

      globalEventBus.emit('module:activated', {
        id: moduleId,
        metadata: modDef,
        instance
      });

    } catch (err) {
      console.error(`[ModuleRegistry] Gagal memuat modul ${moduleId}:`, err);
      this.renderError(moduleId, err);
    }
  }

  showLoading() {
    this.container.innerHTML = `
      <div class="module-loading-state">
        <div class="spinner"></div>
        <p>Memuat modul...</p>
      </div>
    `;
  }

  renderError(moduleId, error) {
    this.container.innerHTML = `
      <div class="module-error-card card glass-panel">
        <div class="error-icon">⚠️</div>
        <h3>Gagal Memuat Modul: ${moduleId}</h3>
        <p class="text-muted">${error.message || 'Terjadi kesalahan sistem saat menginisialisasi modul.'}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Muat Ulang Halaman</button>
      </div>
    `;
  }

  renderNotFound(moduleId) {
    this.container.innerHTML = `
      <div class="module-error-card card glass-panel">
        <div class="error-icon">🔍</div>
        <h3>Modul Tidak Ditemukan</h3>
        <p class="text-muted">Modul "${moduleId}" belum diinstal atau dinonaktifkan.</p>
        <a href="#downloader" class="btn btn-primary">Kembali ke Beranda</a>
      </div>
    `;
  }
}
