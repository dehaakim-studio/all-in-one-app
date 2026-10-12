/**
 * VehicleService - Manajemen Data Kendaraan, Riwayat Komponen, & Kompresi Nota Servis
 */
import { storage } from '../../js/core/Storage.js';
import { globalEventBus } from '../../js/core/EventBus.js';

export class VehicleService {
  constructor() {
    this.initDefaultData();
  }

  async initDefaultData() {
    const list = await storage.getAll('vehicles');
    if (!list || list.length === 0) {
      // Seed default kendaraan contoh
      const defaultVehicle = {
        id: 'v_default_1',
        name: 'Honda Vario 160 ABS',
        category: 'Motor Matic',
        year: 2022,
        currentKm: 24500,
        dailyKm: 35,
        pistonReplaced: 'Belum', // Sesuai spesifikasi: Status penggantian piston (Ya/Belum)
        pistonNotes: 'Piston masih standar pabrik, belum pernah ganti / bore up',
        vbeltStatus: 'Normal (12.000 KM)',
        rollerStatus: 'Normal',
        sparkPlugStatus: 'Baik',
        createdAt: Date.now()
      };

      await storage.put('vehicles', defaultVehicle);

      // Seed catatan servis terakhir
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      const nextDue = new Date(lastMonth.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 bulan tepat

      const defaultService = {
        id: 'srv_default_1',
        vehicleId: 'v_default_1',
        serviceDate: lastMonth.toISOString().split('T')[0],
        nextDueDate: nextDue.toISOString().split('T')[0],
        oilBrand: 'AHM Oil SPX2 10W-30 Full Synthetic',
        workshop: 'Bengkel Resmi AHASS Motor',
        cost: 135000,
        notes: 'Ganti oli mesin, oli gardan, & cek CVT berkala.',
        invoiceImage: null,
        invoiceFileName: null,
        createdAt: Date.now()
      };

      await storage.put('services', defaultService);
    }
  }

  async getVehicles() {
    return await storage.getAll('vehicles');
  }

  async getVehicle(id) {
    return await storage.getById('vehicles', id);
  }

  async saveVehicle(vehicleData) {
    if (!vehicleData.id) {
      vehicleData.id = 'veh_' + Date.now();
      vehicleData.createdAt = Date.now();
    }
    const saved = await storage.put('vehicles', vehicleData);
    globalEventBus.emit('vehicle:updated', saved);
    return saved;
  }

  async deleteVehicle(id) {
    await storage.delete('vehicles', id);
    // Hapus juga riwayat servis terkait
    const allServices = await storage.getAll('services');
    for (const s of allServices) {
      if (s.vehicleId === id) {
        await storage.delete('services', s.id);
      }
    }
    globalEventBus.emit('vehicle:deleted', id);
    return true;
  }

  async getServices(vehicleId) {
    const all = await storage.getAll('services');
    const filtered = vehicleId ? all.filter(s => s.vehicleId === vehicleId) : all;
    return filtered.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));
  }

  async saveServiceRecord(serviceData) {
    if (!serviceData.id) {
      serviceData.id = 'srv_' + Date.now();
      serviceData.createdAt = Date.now();
    }
    const saved = await storage.put('services', serviceData);
    globalEventBus.emit('service:updated', saved);
    return saved;
  }

  async deleteServiceRecord(id) {
    await storage.delete('services', id);
    globalEventBus.emit('service:deleted', id);
    return true;
  }

  /**
   * Kompresi gambar nota client-side dengan HTML5 Canvas
   * Mengubah file nota resolusi tinggi (3-10 MB) menjadi file sangat ringkas (< 100 KB)
   */
  async compressInvoiceImage(file, maxDimension = 800, quality = 0.72) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('File harus berupa gambar (JPG, PNG, atau WebP).'));
      }

      const originalSizeKb = (file.size / 1024).toFixed(1);
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Proporsional resize ke maxDimension
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          // Gambar latar putih jika PNG transparan
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Coba ekspor ke image/webp terlebih dahulu, fallback ke image/jpeg
          let compressedDataUrl = canvas.toDataURL('image/webp', quality);
          if (!compressedDataUrl.startsWith('data:image/webp')) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // Hitung estimasi ukuran setelah kompresi
          const stringLength = compressedDataUrl.length - 'data:image/webp;base64,'.length;
          const compressedSizeKb = ((stringLength * 3) / 4 / 1024).toFixed(1);

          resolve({
            dataUrl: compressedDataUrl,
            originalSizeKb: `${originalSizeKb} KB`,
            compressedSizeKb: `${compressedSizeKb} KB`,
            width,
            height,
            fileName: file.name
          });
        };

        img.onerror = () => reject(new Error('Gagal memproses gambar nota.'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
      reader.readAsDataURL(file);
    });
  }
}
