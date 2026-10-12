/**
 * EventBus - Sistem Publish/Subscribe Terdesentralisasi
 * Memungkinkan komunikasi antar-modul tanpa kopling erat (loose coupling).
 */
export class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Berlangganan event tertentu
   * @param {string} event 
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Melepas langganan event
   * @param {string} event 
   * @param {Function} callback 
   */
  off(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
      if (this.events.get(event).size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Memicu (trigger) event ke semua pendengar
   * @param {string} event 
   * @param {any} data 
   */
  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus Error] pada event "${event}":`, error);
        }
      });
    }
  }

  /**
   * Berlangganan hanya untuk satu kali pemanggilan
   * @param {string} event 
   * @param {Function} callback 
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }
}

export const globalEventBus = new EventBus();
