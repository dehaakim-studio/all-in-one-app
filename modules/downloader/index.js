/**
 * DownloaderModule - Entry Point Modul Downloader
 */
import { DownloaderService } from './DownloaderService.js?v=5.0';
import { DownloaderView } from './DownloaderView.js?v=5.0';

export class DownloaderModule {
  constructor() {
    this.service = new DownloaderService();
    this.view = new DownloaderView(this.service);
    this._initialized = false;
  }

  async init() {
    // Inisialisasi awal modul jika dibutuhkan
    this._initialized = true;
  }

  async mount(container, params = {}) {
    this.view.render(container);
  }

  async unmount() {
    // Batalkan download berjalan jika berpindah tab
    if (this.service) {
      this.service.cancelDownload();
    }
  }
}
