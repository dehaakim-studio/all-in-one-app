/**
 * ProductiveToolsModule - Entry Point Modul Productive Tools
 */
import { VehicleService } from './VehicleService.js';
import { GeminiService } from './GeminiService.js';
import { ProductiveToolsView } from './ProductiveToolsView.js';

export class ProductiveToolsModule {
  constructor() {
    this.vehicleService = new VehicleService();
    this.geminiService = new GeminiService();
    this.view = new ProductiveToolsView(this.vehicleService, this.geminiService);
    this._initialized = false;
  }

  async init() {
    this._initialized = true;
  }

  async mount(container, params = {}) {
    await this.view.render(container);
  }

  async unmount() {
    // Unmount hook
  }
}
