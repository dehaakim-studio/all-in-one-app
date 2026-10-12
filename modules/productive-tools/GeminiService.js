/**
 * GeminiService - Integrasi Google Generative AI (Gemini 1.5/2.0 Flash)
 * Menganalisis kondisi mesin, riwayat piston, dan menegakkan ATURAN WAJIB:
 * "Motor wajib ganti oli minimal 1 bulan sekali (atau lebih cepat sesuai kondisi)".
 */
import { storage } from '../../js/core/Storage.js';

export class GeminiService {
  constructor() {
    this.apiKey = storage.getSetting('gemini_api_key', '');
    this.modelName = 'gemini-1.5-flash';
  }

  getApiKey() {
    return this.apiKey;
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim();
    storage.setSetting('gemini_api_key', this.apiKey);
  }

  /**
   * Mengirim data kendaraan ke API Gemini untuk analisis mekanis menyeluruh
   */
  async analyzeVehicle(vehicle, lastService = null) {
    const prompt = this.buildPrompt(vehicle, lastService);

    // Jika pengguna telah memasukkan API Key Gemini
    if (this.apiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1500
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
        }

        const data = await response.json();
        const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textOutput) {
          throw new Error('Tidak ada respons dari Gemini API.');
        }

        return {
          source: 'Gemini AI Live',
          markdown: textOutput,
          mandatoryRuleFollowed: true,
          analyzedAt: new Date().toISOString()
        };

      } catch (err) {
        console.warn('[GeminiService] API Live gagal, beralih ke Smart Mechanic Simulator:', err);
        return this.generateSimulatedDiagnosis(vehicle, lastService, `(Peringatan API: ${err.message}. Menggunakan Mode Analisis Standar Ahli Mekanik)`);
      }
    } else {
      // Fallback cerdas tanpa perlu API key langsung
      return this.generateSimulatedDiagnosis(vehicle, lastService);
    }
  }

  /**
   * Menyusun prompt terstruktur dengan ATURAN WAJIB yang tegas
   */
  buildPrompt(vehicle, lastService) {
    return `
Anda adalah seorang Ahli Mekanik Sepeda Motor Senior & Automotive Systems Engineer.
Tugas Anda adalah menganalisis data kendaraan motor dan memberikan penjabaran servis komprehensif.

=== DATA KENDARAAN ===
- Nama / Model: ${vehicle.name}
- Kategori: ${vehicle.category || 'Motor Roda Dua'}
- Tahun Produksi: ${vehicle.year}
- Jarak Tempuh (Odometer): ${vehicle.currentKm.toLocaleString()} KM
- Estimasi Pemakaian: ${vehicle.dailyKm || 30} KM per hari
- Riwayat Penggantian Piston: ${vehicle.pistonReplaced} (${vehicle.pistonNotes || 'Standar Pabrik'})
- Riwayat Roller & V-Belt: ${vehicle.vbeltStatus || 'Normal'}
- Servis Terakhir: ${lastService ? `${lastService.serviceDate} (${lastService.oilBrand})` : 'Belum tercatat'}

=== ATURAN WAJIB MUTLAK (STRICT COMPLIANCE REQUIRED) ===
1. Dalam poin rekomendasi penggantian oli mesin, Anda HARUS MENYIMPULKAN SECARA TEGAS DAN TANPA KOMPROMI bahwa motor ini WAJIB GANTI OLI MINIMAL 1 BULAN SEKALI (atau lebih cepat jika mencapai 1.500 - 2.000 KM atau karena kondisi suhu mesin & beban piston).
2. Anda WAJIB memberikan peringatan tegas mengenai bahaya oli aus (oil sludge, penguapan oli, gesekan ring piston berlebih, dan risiko piston macet / overhaul) jika penggantian melebihi 1 bulan.

=== STRUKTUR FORMAT LAPORAN YANG DIHARAPKAN ===
1. **Diagnosis Kesehatan Mesin & Piston**: Evaluasi status piston (${vehicle.pistonReplaced}) dan kilometer saat ini.
2. **KESIMPULAN JADWAL OLI (WAJIB MINIMAL 1 BULAN SEKALI)**: Penegasan aturan waktu ganti oli 1 bulan sekali secara tebal dan berbobot.
3. **Rekomendasi Viskositas & Spesifikasi Oli**: Rekomendasi SAE (misal 10W-30 atau 10W-40 JASO MB/MA2) sesuai tahun motor (${vehicle.year}).
4. **Pemeriksaan Komponen Pendukung**: Cek berkala CVT/Rantai, Busi, dan Filter Udara.
5. **Estimasi Biaya Servis**: Perkiraan biaya oli & servis berkala di bengkel.
    `.trim();
  }

  /**
   * Generator analisis mekanis cerdas yang 100% mematuhi aturan wajib 1 bulan
   */
  generateSimulatedDiagnosis(vehicle, lastService, notePrefix = '') {
    const isPistonReplaced = (vehicle.pistonReplaced || '').toLowerCase().includes('ya');
    const isHighMileage = (vehicle.currentKm || 0) > 30000;
    const dailyKm = vehicle.dailyKm || 30;
    const monthlyEstimateKm = dailyKm * 30;

    const recommendedSae = (vehicle.year && vehicle.year >= 2021) 
      ? '10W-30 JASO MB Full Synthetic (Viskositas encer modern hemat bahan bakar)'
      : '10W-40 JASO MB Semi/Full Synthetic (Proteksi suhu tinggi lebih stabil)';

    const markdown = `
${notePrefix ? `> ⚠️ **Catatan Sistem:** ${notePrefix}\n\n` : ''}
### 📊 Diagnosis Mekanis Mesin: ${vehicle.name} (${vehicle.year})

#### 1. Analisis Ruang Bakar & Piston
- **Status Komponen Piston:** **${isPistonReplaced ? 'SUDAH PERNAH DIGANTI' : 'BELUM PERNAH DIGANTI (STANDAR PABRIK)'}**
- **Odometer Terkini:** ${vehicle.currentKm.toLocaleString()} KM | **Estimasi Pemakaian:** ~${monthlyEstimateKm.toLocaleString()} KM/bulan (${dailyKm} KM/hari).
- **Catatan Mekanik:** ${isPistonReplaced 
    ? 'Karena piston sudah pernah diganti, mesin membutuhkan oli berkualitas tinggi dengan aditif anti-wear untuk mencegah gesekan celah liner silinder baru.'
    : (isHighMileage 
        ? 'Piston masih original dengan jarak tempuh tinggi (>30.000 KM). Ring piston mulai mengalami penyusutan elastisitas mikro; wajib menjaga volume oli selalu penuh.' 
        : 'Kondisi piston original tergolong sehat. Jaga sirkulasi pelumasan agar terhindar dari baret silinder.')}

---

#### 🚨 2. KESIMPULAN JADWAL GANTI OLI (ATURAN MUTLAK WAJIB)
> ⚠️ **PERINGATAN RESMI MEKANIK:**
> Berdasarkan analisis beban kerja mesin, iklim tropis perkotaan dengan kondisi *stop-and-go*, serta kesehatan piston, **MOTOR INI WAJIB GANTI OLI MINIMAL 1 BULAN SEKALI (atau paling lambat 1.500 - 2.000 KM, mana yang tercapai lebih dulu)!**
> 
> **Mengapa TIDAK BOLEH lebih dari 1 bulan?**
> 1. Oli mesin motor matic/manual beroperasi pada putaran RPM tinggi (6.000 - 9.000 RPM) dan volume oli hanya berkisar 0.8 L.
> 2. Membiarkan oli lebih dari 1 bulan memicu **penguapan oli (oli susut)**, hilangnya daya lumas, dan pengendapan lumpur (*oil sludge*).
> 3. Keterlambatan ganti oli berisiko fatal menyebabkan **piston baret, klep bocor, dan turun mesin (overhaul)** berbiaya jutaan rupiah.

---

#### 3. Rekomendasi Spesifikasi Oli
- **Viskositas Ideal:** ${recommendedSae}
- **Standar Sertifikasi:** JASO MB (Khusus Matic) / JASO MA2 (Kopling Basah), API SN/SP.
- **Rekomendasi Merk:** AHM SPX2, Shell Advance AX7 Scooter, Motul Scooter Expert LE, Castrol Power1.

#### 4. Estimasi Biaya Servis Berkala
- **Oli Mesin Berkualitas:** Rp 55.000 - Rp 95.000
- **Oli Transmisi / Gardan:** Rp 15.000 - Rp 25.000 (Ganti setiap 2-3 bulan)
- **Jasa Servis & Pembersihan Injeksi/CVT:** Rp 45.000 - Rp 70.000
- **Total Estimasi:** **Rp 115.000 - Rp 190.000 per bulan**
    `.trim();

    return {
      source: 'Expert Mechanic Intelligence (Strict Compliance Mode)',
      markdown,
      mandatoryRuleFollowed: true,
      analyzedAt: new Date().toISOString()
    };
  }
}
