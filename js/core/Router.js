/**
 * Router - Hash-based Single Page Application Router
 * Menangani navigasi antar modul tanpa me-reload browser.
 */
import { globalEventBus } from './EventBus.js';

export class Router {
  constructor(defaultRoute = 'downloader') {
    this.defaultRoute = defaultRoute;
    this.currentRoute = null;
    this.routes = new Map();

    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  /**
   * Mendaftarkan rute modul
   * @param {string} route 
   * @param {Function} handler 
   */
  register(route, handler) {
    this.routes.set(route.replace(/^#/, ''), handler);
  }

  /**
   * Navigasi ke rute tertentu
   * @param {string} route 
   */
  navigate(route) {
    const cleanRoute = route.replace(/^#/, '');
    if (window.location.hash.slice(1) === cleanRoute) {
      this.handleHashChange();
    } else {
      window.location.hash = cleanRoute;
    }
  }

  /**
   * Memproses perubahan hash di URL
   */
  handleHashChange() {
    let route = window.location.hash.slice(1) || this.defaultRoute;
    
    // Cek apakah ada query string
    const [path, query] = route.split('?');
    const queryParams = new URLSearchParams(query || '');

    if (!this.routes.has(path)) {
      route = this.defaultRoute;
    } else {
      route = path;
    }

    if (this.currentRoute !== route) {
      const prevRoute = this.currentRoute;
      this.currentRoute = route;

      const handler = this.routes.get(route);
      if (handler) {
        handler(queryParams);
      }

      globalEventBus.emit('router:changed', {
        from: prevRoute,
        to: route,
        params: Object.fromEntries(queryParams.entries())
      });
    }
  }

  /**
   * Memulai router
   */
  init() {
    if (!window.location.hash) {
      window.location.hash = this.defaultRoute;
    } else {
      this.handleHashChange();
    }
  }
}
