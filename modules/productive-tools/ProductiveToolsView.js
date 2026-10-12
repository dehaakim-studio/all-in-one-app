/**
 * ProductiveToolsView - Komponen UI Modul Jadwal Ganti Oli & Gemini AI
 */
export class ProductiveToolsView {
  constructor(vehicleService, geminiService) {
    this.vehicleService = vehicleService;
    this.geminiService = geminiService;
    this.vehicles = [];
    this.selectedVehicleId = null;
    this.selectedVehicle = null;
    this.services = [];
    this.currentCompressedInvoice = null;
    this.container = null;
  }

  async render(container) {
    this.container = container;
    this.vehicles = await this.vehicleService.getVehicles();

    if (this.vehicles.length > 0 && !this.selectedVehicleId) {
      this.selectedVehicleId = this.vehicles[0].id;
    }

    this.selectedVehicle = this.vehicles.find(v => v.id === this.selectedVehicleId) || this.vehicles[0];
    this.services = this.selectedVehicle ? await this.vehicleService.getServices(this.selectedVehicle.id) : [];

    this.renderLayout();
    this.bindEvents();
    this.calculateNextDueCountdown();
  }

  renderLayout() {
    const v = this.selectedVehicle;
    if (!v) {
      this.container.innerHTML = `<div class="card glass-panel" style="text-align:center; padding:40px;">Belum ada data kendaraan. <button class="btn btn-primary" id="btn-add-vehicle-empty">+ Tambah Kendaraan</button></div>`;
      this.container.querySelector('#btn-add-vehicle-empty')?.addEventListener('click', () => this.openVehicleModal());
      return;
    }

    // Vehicle chips
    let chipsHtml = '';
    this.vehicles.forEach(veh => {
      const isAct = veh.id === v.id ? 'active' : '';
      chipsHtml += `
        <div class="vehicle-chip ${isAct}" data-vid="${veh.id}">
          <span class="v-icon">🏍️</span>
          <span>${veh.name}</span>
        </div>
      `;
    });

    const isPistonYes = (v.pistonReplaced || '').toLowerCase() === 'ya';

    this.container.innerHTML = `
      <div class="productive-grid">
        <!-- Bar Pemilihan & Manajemen Kendaraan -->
        <div class="vehicle-selector-bar glass-panel">
          <div class="vehicle-selector-left">
            <span class="vehicle-selector-label">Kendaraan Saya:</span>
            <div class="vehicle-chips-list">
              ${chipsHtml}
            </div>
          </div>
          <div class="vehicle-selector-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-vehicle">➕ Tambah Motor</button>
            <button class="btn btn-secondary btn-sm" id="btn-settings-gemini" title="Konfigurasi Gemini API Key">⚙️ API Gemini</button>
          </div>
        </div>

        <!-- 2 Kolom: Detail Kendaraan & Servis Form -->
        <div class="vehicle-dashboard-columns">
          <!-- Kolom Kiri: Profil Mesin, Riwayat Komponen, Gemini AI -->
          <div class="vehicle-column-left">
            <!-- Profil Banner -->
            <div class="card glass-panel">
              <div class="vehicle-profile-banner">
                <div class="vehicle-profile-info">
                  <div class="vehicle-name-title">${v.name}</div>
                  <div class="vehicle-sub-meta">Tahun: ${v.year} • Odometer: ${v.currentKm.toLocaleString()} KM • ~${v.dailyKm || 30} KM/hari</div>
                </div>
                <div class="vehicle-profile-actions">
                  <button class="btn btn-secondary btn-sm" id="btn-edit-vehicle">✏️ Edit</button>
                  <button class="btn btn-outline btn-danger btn-sm" id="btn-delete-vehicle">🗑️</button>
                </div>
              </div>

              <!-- Status Komponen Utama (Sesuai Spesifikasi: Status Piston Ya/Belum) -->
              <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">
                Status Komponen & Riwayat Mesin:
              </div>
              <div class="component-status-grid">
                <div class="component-card">
                  <div class="component-label">Penggantian Piston</div>
                  <div class="component-value">
                    <span class="badge ${isPistonYes ? 'badge-amber' : 'badge-emerald'}">
                      ${isPistonYes ? '⚠️ SUDAH DIGANTI' : '✓ BELUM (STANDAR)'}
                    </span>
                  </div>
                  <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">${v.pistonNotes || 'Kondisi standar'}</div>
                </div>

                <div class="component-card">
                  <div class="component-label">V-Belt & Roller</div>
                  <div class="component-value">${v.vbeltStatus || 'Normal'}</div>
                  <div style="font-size:11px; color:var(--text-dim);">${v.rollerStatus || 'Standar'}</div>
                </div>

                <div class="component-card">
                  <div class="component-label">Busi & Pengapian</div>
                  <div class="component-value">${v.sparkPlugStatus || 'Baik'}</div>
                  <div style="font-size:11px; color:var(--text-dim);">Elektroda bersih</div>
                </div>
              </div>

              <!-- Tombol Konsultasi Gemini AI -->
              <div class="ai-consult-trigger-card">
                <div class="ai-consult-text-group">
                  <div class="ai-consult-title">Konsultasi Servis AI Cerdas</div>
                  <div class="ai-consult-desc">Menganalisis kondisi mesin & menghitung jadwal oli optimal</div>
                </div>
                <button class="btn btn-cyan" id="btn-trigger-gemini">
                  <span class="btn-text">🤖 Analisis Gemini AI</span>
                  <span class="btn-spinner" style="display:none;"><div class="spinner" style="width:16px;height:16px;border-width:2px;"></div></span>
                </button>
              </div>
            </div>

            <!-- Kartu Hasil Analisis Gemini AI (Dinamis) -->
            <div id="gemini-result-container"></div>
          </div>

          <!-- Kolom Kanan: Countdown Pengingat Ganti Oli & Form Servis + Nota -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            <!-- Widget Countdown Jatuh Tempo Ganti Oli -->
            <div class="service-countdown-box glass-panel" id="oil-countdown-widget">
              <div class="countdown-main">
                <div class="countdown-icon-bubble">🛢️</div>
                <div>
                  <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.6px; color:var(--accent-cyan); font-weight:700;">
                    Jadwal Ganti Oli Berikutnya
                  </div>
                  <div class="countdown-digits" id="countdown-days-text">Menghitung...</div>
                </div>
              </div>
              <div id="countdown-status-badge">
                <span class="badge badge-emerald">Jadwal Teratur</span>
              </div>
            </div>

            <!-- Form Pencatatan Servis & Upload Nota Ringkas -->
            <div class="card glass-panel">
              <div class="card-header">
                <div>
                  <h3 class="card-title"><span>📝</span> Catat Servis & Ganti Oli</h3>
                  <p class="card-subtitle">Simpan nota terkompresi & perbarui riwayat kendaraan</p>
                </div>
              </div>

              <form id="form-service-record">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Tanggal Servis <span class="required">*</span></label>
                    <input type="date" id="srv-date" class="form-control" required value="${new Date().toISOString().split('T')[0]}">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Jatuh Tempo Berikutnya (Min. 1 Bulan) <span class="required">*</span></label>
                    <input type="date" id="srv-next-due" class="form-control" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Jenis / Merk Oli <span class="required">*</span></label>
                    <input type="text" id="srv-oil-brand" class="form-control" placeholder="Contoh: Shell Advance AX7 10W-40 / AHM SPX2" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Lokasi Bengkel / Pembelian</label>
                    <input type="text" id="srv-workshop" class="form-control" placeholder="Contoh: AHASS Resmi / Shop&Drive" value="Bengkel Resmi">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Total Biaya (Rp)</label>
                    <input type="number" id="srv-cost" class="form-control" placeholder="120000" value="120000">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Catatan Servis</label>
                    <input type="text" id="srv-notes" class="form-control" placeholder="Ganti oli mesin, bersihkan filter...">
                  </div>
                </div>

                <!-- Upload Nota Ukuran Ringkas (Canvas Compressor) -->
                <div class="form-group">
                  <label class="form-label">
                    <span>Upload Foto Nota Servis (Kompresi Ringkas Otomatis)</span>
                    <span class="badge badge-purple" style="margin-left:6px;">Auto WebP</span>
                  </label>

                  <div class="invoice-upload-container" id="invoice-dropzone">
                    <input type="file" id="input-invoice-file" accept="image/*" style="display:none;">
                    <div id="invoice-placeholder-ui">
                      <div style="font-size:26px; margin-bottom:4px;">🧾</div>
                      <div style="font-size:13px; font-weight:600; color:var(--text-main);">Pilih atau seret foto nota ke sini</div>
                      <div style="font-size:11px; color:var(--text-muted);">Foto akan otomatis dikompresi agar ukuran file sangat ringkas (&lt; 100 KB)</div>
                    </div>

                    <div id="invoice-preview-ui" style="display:none;">
                      <div class="invoice-preview-wrapper">
                        <img id="img-invoice-preview" class="invoice-preview-thumbnail" alt="Preview Nota">
                        <span class="invoice-size-badge" id="badge-compressed-size">0 KB</span>
                      </div>
                      <div style="margin-top:8px;">
                        <button type="button" class="btn btn-outline btn-danger btn-sm" id="btn-remove-invoice">✕ Hapus Foto</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-submit-row">
                  <button type="submit" class="btn btn-emerald btn-lg" id="btn-save-service">
                    <span>💾 Simpan Riwayat Servis</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Tabel Riwayat Servis -->
        <div class="card glass-panel">
          <div class="card-header">
            <div>
              <h3 class="card-title"><span>📋</span> Riwayat Servis: ${v.name}</h3>
              <p class="card-subtitle">Log riwayat servis masa lalu dan file nota fisik</p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tgl Servis</th>
                  <th>Jadwal Berikutnya</th>
                  <th>Jenis Oli</th>
                  <th>Bengkel / Lokasi</th>
                  <th>Biaya</th>
                  <th>Nota Fisik</th>
                  <th>Catatan</th>
                  <th style="text-align:right;">Aksi</th>
                </tr>
              </thead>
              <tbody id="service-history-tbody">
                ${this.renderServiceRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal Tambah / Edit Kendaraan -->
      <div class="modal-overlay" id="vehicle-modal">
        <div class="modal-content glass-panel">
          <button class="modal-close-btn" id="close-vehicle-modal">✕</button>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:16px;" id="modal-vehicle-title">Tambah Data Kendaraan</h3>

          <form id="form-vehicle-crud">
            <input type="hidden" id="crud-v-id">
            <div class="form-group">
              <label class="form-label">Nama / Jenis Kendaraan <span class="required">*</span></label>
              <input type="text" id="crud-v-name" class="form-control" placeholder="Contoh: Honda Vario 160 ABS / Yamaha NMAX 155" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tahun Produksi <span class="required">*</span></label>
                <input type="number" id="crud-v-year" class="form-control" min="1990" max="2030" value="2022" required>
              </div>
              <div class="form-group">
                <label class="form-label">Odometer (KM Saat Ini)</label>
                <input type="number" id="crud-v-km" class="form-control" value="20000">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Estimasi Jarak Tempuh Harian (KM/hari)</label>
                <input type="number" id="crud-v-daily" class="form-control" value="30">
              </div>
              <div class="form-group">
                <label class="form-label">Status Penggantian Piston <span class="required">*</span></label>
                <select id="crud-v-piston" class="form-control" required>
                  <option value="Belum">Belum (Piston Standar Pabrik)</option>
                  <option value="Ya">Ya (Pernah Ganti Piston / Bore-up)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Catatan Riwayat Piston / Komponen Mesin</label>
              <input type="text" id="crud-v-piston-notes" class="form-control" placeholder="Keterangan kondisi piston, oversize, atau liner">
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-vehicle-modal">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan Data Kendaraan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Pengaturan Gemini API Key -->
      <div class="modal-overlay" id="gemini-key-modal">
        <div class="modal-content glass-panel">
          <button class="modal-close-btn" id="close-gemini-modal">✕</button>
          <div style="text-align:center; margin-bottom:16px;">
            <div style="font-size:32px; margin-bottom:6px;">🤖</div>
            <h3 style="font-size:18px; font-weight:700;">Konfigurasi Google Gemini AI</h3>
            <p class="text-muted" style="font-size:12.5px;">Gunakan Gemini 1.5/2.0 Flash untuk analisis mekanik kendaraan berakurasi tinggi</p>
          </div>

          <div class="form-group">
            <label class="form-label">Gemini API Key</label>
            <input type="password" id="input-gemini-key" class="form-control" placeholder="AIzaSy...">
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">
              Dapatkan API Key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan);">Google AI Studio</a>.
              Jika kosong, aplikasi akan tetap berfungsi menggunakan <strong>Smart Mechanical Intelligence Simulator</strong> secara offline!
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-gemini-modal">Tutup</button>
            <button type="button" class="btn btn-cyan" id="btn-save-gemini-key">Simpan Kunci API</button>
          </div>
        </div>
      </div>

      <!-- Modal Preview Nota Fullscreen -->
      <div class="modal-overlay" id="invoice-view-modal">
        <div class="modal-content glass-panel" style="max-width:550px; text-align:center;">
          <button class="modal-close-btn" id="close-invoice-modal">✕</button>
          <h3 style="font-size:16px; font-weight:700; margin-bottom:14px;">Foto Nota Fisik Servis</h3>
          <img id="modal-invoice-full-img" style="max-width:100%; max-height:70vh; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
        </div>
      </div>
    `;

    // Set default next due date to 1 month from now
    this.setDefaultNextDueDate();
  }

  setDefaultNextDueDate() {
    const srvDateInput = this.container.querySelector('#srv-date');
    const nextDueInput = this.container.querySelector('#srv-next-due');
    if (srvDateInput && nextDueInput) {
      const d = new Date(srvDateInput.value);
      d.setMonth(d.getMonth() + 1); // Mutlak 1 bulan
      nextDueInput.value = d.toISOString().split('T')[0];
    }
  }

  renderServiceRows() {
    if (!this.services || this.services.length === 0) {
      return `
        <tr>
          <td colspan="8" style="text-align:center; padding:30px; color:var(--text-dim);">
            Belum ada catatan servis untuk motor ini. Silakan catat jadwal di form atas.
          </td>
        </tr>
      `;
    }

    return this.services.map(s => {
      const invoiceThumb = s.invoiceImage 
        ? `<img src="${s.invoiceImage}" class="history-thumb-mini action-view-invoice" data-src="${s.invoiceImage}" style="cursor:pointer;" title="Klik untuk memperbesar nota">`
        : `<span style="font-size:11px; color:var(--text-dim);">-</span>`;

      return `
        <tr>
          <td data-label="Tgl Servis"><strong>${s.serviceDate}</strong></td>
          <td data-label="Jadwal Berikutnya"><span class="badge badge-cyan">${s.nextDueDate}</span></td>
          <td data-label="Jenis Oli"><span>${s.oilBrand}</span></td>
          <td data-label="Bengkel"><span>${s.workshop || '-'}</span></td>
          <td data-label="Biaya" style="font-family:var(--font-mono);"><span>Rp ${(s.cost || 0).toLocaleString('id-ID')}</span></td>
          <td data-label="Nota Fisik">${invoiceThumb}</td>
          <td data-label="Catatan" style="font-size:12px; color:var(--text-muted);"><span>${s.notes || '-'}</span></td>
          <td data-label="Aksi" style="text-align:right;">
            <button class="btn btn-outline btn-danger btn-sm action-delete-srv" data-id="${s.id}" title="Hapus catatan">🗑️ Hapus</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  bindEvents() {
    // Ganti Kendaraan Aktif
    this.container.querySelectorAll('.vehicle-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const vid = chip.getAttribute('data-vid');
        this.selectedVehicleId = vid;
        this.selectedVehicle = this.vehicles.find(v => v.id === vid);
        this.services = await this.vehicleService.getServices(vid);
        this.renderLayout();
        this.bindEvents();
        this.calculateNextDueCountdown();
      });
    });

    // Otomatis ubah tanggal jatuh tempo saat tanggal servis berubah (Rule 1 Bulan)
    this.container.querySelector('#srv-date')?.addEventListener('change', () => {
      this.setDefaultNextDueDate();
    });

    // Tambah & Edit Kendaraan
    this.container.querySelector('#btn-add-vehicle')?.addEventListener('click', () => this.openVehicleModal());
    this.container.querySelector('#btn-edit-vehicle')?.addEventListener('click', () => this.openVehicleModal(this.selectedVehicle));
    this.container.querySelector('#btn-delete-vehicle')?.addEventListener('click', async () => {
      if (confirm(`Hapus kendaraan "${this.selectedVehicle.name}" beserta riwayatnya?`)) {
        await this.vehicleService.deleteVehicle(this.selectedVehicle.id);
        this.vehicles = await this.vehicleService.getVehicles();
        this.selectedVehicleId = this.vehicles.length ? this.vehicles[0].id : null;
        this.render(this.container);
      }
    });

    // Modal Kendaraan Actions
    const vModal = this.container.querySelector('#vehicle-modal');
    this.container.querySelector('#close-vehicle-modal')?.addEventListener('click', () => vModal.classList.remove('active'));
    this.container.querySelector('#btn-cancel-vehicle-modal')?.addEventListener('click', () => vModal.classList.remove('active'));
    this.container.querySelector('#form-vehicle-crud')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = this.container.querySelector('#crud-v-id').value;
      const vData = {
        id: id || undefined,
        name: this.container.querySelector('#crud-v-name').value.trim(),
        year: parseInt(this.container.querySelector('#crud-v-year').value, 10),
        currentKm: parseInt(this.container.querySelector('#crud-v-km').value, 10) || 0,
        dailyKm: parseInt(this.container.querySelector('#crud-v-daily').value, 10) || 30,
        pistonReplaced: this.container.querySelector('#crud-v-piston').value,
        pistonNotes: this.container.querySelector('#crud-v-piston-notes').value.trim()
      };

      await this.vehicleService.saveVehicle(vData);
      vModal.classList.remove('active');
      this.vehicles = await this.vehicleService.getVehicles();
      this.selectedVehicleId = vData.id || this.vehicles[this.vehicles.length - 1].id;
      this.render(this.container);
    });

    // API Key Modal
    const geminiModal = this.container.querySelector('#gemini-key-modal');
    this.container.querySelector('#btn-settings-gemini')?.addEventListener('click', () => {
      this.container.querySelector('#input-gemini-key').value = this.geminiService.getApiKey();
      geminiModal.classList.add('active');
    });
    this.container.querySelector('#close-gemini-modal')?.addEventListener('click', () => geminiModal.classList.remove('active'));
    this.container.querySelector('#btn-cancel-gemini-modal')?.addEventListener('click', () => geminiModal.classList.remove('active'));
    this.container.querySelector('#btn-save-gemini-key')?.addEventListener('click', () => {
      const key = this.container.querySelector('#input-gemini-key').value;
      this.geminiService.setApiKey(key);
      geminiModal.classList.remove('active');
      this.showToast('API Key Disimpan', 'Konfigurasi Gemini AI telah diperbarui.', 'success');
    });

    // Gemini AI Analysis Trigger
    const btnGemini = this.container.querySelector('#btn-trigger-gemini');
    btnGemini?.addEventListener('click', () => this.handleGeminiAnalysis());

    // Invoice Compression Dropzone
    const dropzone = this.container.querySelector('#invoice-dropzone');
    const fileInput = this.container.querySelector('#input-invoice-file');
    dropzone?.addEventListener('click', (e) => {
      if (e.target.id !== 'btn-remove-invoice') fileInput.click();
    });

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const comp = await this.vehicleService.compressInvoiceImage(file);
          this.currentCompressedInvoice = comp.dataUrl;

          this.container.querySelector('#invoice-placeholder-ui').style.display = 'none';
          this.container.querySelector('#invoice-preview-ui').style.display = 'block';
          this.container.querySelector('#img-invoice-preview').src = comp.dataUrl;
          this.container.querySelector('#badge-compressed-size').textContent = `${comp.compressedSizeKb} (Asli: ${comp.originalSizeKb})`;
        } catch (err) {
          alert('Gagal mengompresi nota: ' + err.message);
        }
      }
    });

    this.container.querySelector('#btn-remove-invoice')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.currentCompressedInvoice = null;
      this.container.querySelector('#input-invoice-file').value = '';
      this.container.querySelector('#invoice-placeholder-ui').style.display = 'block';
      this.container.querySelector('#invoice-preview-ui').style.display = 'none';
    });

    // Save Service Record
    this.container.querySelector('#form-service-record')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const serviceData = {
        vehicleId: this.selectedVehicle.id,
        serviceDate: this.container.querySelector('#srv-date').value,
        nextDueDate: this.container.querySelector('#srv-next-due').value,
        oilBrand: this.container.querySelector('#srv-oil-brand').value.trim(),
        workshop: this.container.querySelector('#srv-workshop').value.trim(),
        cost: parseInt(this.container.querySelector('#srv-cost').value, 10) || 0,
        notes: this.container.querySelector('#srv-notes').value.trim(),
        invoiceImage: this.currentCompressedInvoice
      };

      await this.vehicleService.saveServiceRecord(serviceData);
      this.showToast('Servis Dicatat', 'Riwayat servis dan nota berhasil disimpan.', 'success');
      this.services = await this.vehicleService.getServices(this.selectedVehicle.id);
      this.container.querySelector('#service-history-tbody').innerHTML = this.renderServiceRows();
      this.bindHistoryTableActions();
      this.calculateNextDueCountdown();

      // Reset invoice preview
      this.currentCompressedInvoice = null;
      this.container.querySelector('#input-invoice-file').value = '';
      this.container.querySelector('#invoice-placeholder-ui').style.display = 'block';
      this.container.querySelector('#invoice-preview-ui').style.display = 'none';
    });

    this.bindHistoryTableActions();
  }

  bindHistoryTableActions() {
    // Delete service
    this.container.querySelectorAll('.action-delete-srv').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Hapus catatan servis ini?')) {
          await this.vehicleService.deleteServiceRecord(id);
          this.services = await this.vehicleService.getServices(this.selectedVehicle.id);
          this.container.querySelector('#service-history-tbody').innerHTML = this.renderServiceRows();
          this.bindHistoryTableActions();
          this.calculateNextDueCountdown();
        }
      });
    });

    // View Invoice Modal
    const invModal = this.container.querySelector('#invoice-view-modal');
    this.container.querySelector('#close-invoice-modal')?.addEventListener('click', () => invModal.classList.remove('active'));
    this.container.querySelectorAll('.action-view-invoice').forEach(img => {
      img.addEventListener('click', (e) => {
        const src = e.currentTarget.getAttribute('data-src');
        this.container.querySelector('#modal-invoice-full-img').src = src;
        invModal.classList.add('active');
      });
    });
  }

  openVehicleModal(existing = null) {
    const modal = this.container.querySelector('#vehicle-modal');
    const title = this.container.querySelector('#modal-vehicle-title');
    const idInput = this.container.querySelector('#crud-v-id');
    const nameInput = this.container.querySelector('#crud-v-name');
    const yearInput = this.container.querySelector('#crud-v-year');
    const kmInput = this.container.querySelector('#crud-v-km');
    const dailyInput = this.container.querySelector('#crud-v-daily');
    const pistonSelect = this.container.querySelector('#crud-v-piston');
    const pistonNotesInput = this.container.querySelector('#crud-v-piston-notes');

    if (existing) {
      title.textContent = 'Edit Data Kendaraan';
      idInput.value = existing.id;
      nameInput.value = existing.name;
      yearInput.value = existing.year;
      kmInput.value = existing.currentKm || 0;
      dailyInput.value = existing.dailyKm || 30;
      pistonSelect.value = existing.pistonReplaced || 'Belum';
      pistonNotesInput.value = existing.pistonNotes || '';
    } else {
      title.textContent = 'Tambah Kendaraan Baru';
      idInput.value = '';
      nameInput.value = '';
      yearInput.value = new Date().getFullYear();
      kmInput.value = 10000;
      dailyInput.value = 30;
      pistonSelect.value = 'Belum';
      pistonNotesInput.value = '';
    }

    modal.classList.add('active');
  }

  async handleGeminiAnalysis() {
    const btn = this.container.querySelector('#btn-trigger-gemini');
    const btnText = btn.querySelector('.btn-text');
    const btnSpinner = btn.querySelector('.btn-spinner');

    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    btn.disabled = true;

    try {
      const lastService = this.services.length ? this.services[0] : null;
      const result = await this.geminiService.analyzeVehicle(this.selectedVehicle, lastService);
      this.renderGeminiResult(result);
    } catch (err) {
      this.showToast('Gagal Analisis', err.message, 'danger');
    } finally {
      btnText.style.display = 'inline-block';
      btnSpinner.style.display = 'none';
      btn.disabled = false;
    }
  }

  renderGeminiResult(result) {
    const container = this.container.querySelector('#gemini-result-container');
    
    // Format markdown sederhana ke HTML cards
    const rawHtml = this.parseSimpleMarkdown(result.markdown);

    container.innerHTML = `
      <div class="card glass-panel ai-diagnosis-card" style="animation: fadeIn 0.3s ease;">
        <div class="card-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">🤖</span>
            <div>
              <div class="card-title">Hasil Penjabaran Servis Gemini AI</div>
              <div class="card-subtitle">Engine: ${result.source} • Penegakan Aturan Mekanis Otomotif</div>
            </div>
          </div>
          <span class="badge badge-purple">AI Verified</span>
        </div>

        <!-- Banner Aturan Wajib (Rule Wajib AI: Ganti Oli Min 1 Bulan Sekali) -->
        <div class="mandatory-rule-banner">
          <div class="rule-icon">🚨</div>
          <div>
            <div class="mandatory-rule-title">ATURAN WAJIB MEKANIK RESMI (RULE WAJIB)</div>
            <div class="mandatory-rule-text">
              Motor wajib ganti oli <strong>MINIMAL 1 BULAN SEKALI</strong> (atau lebih cepat jika mencapai batas 1.500 - 2.000 KM atau beban piston berat). Penggantian di atas 1 bulan memicu penguapan oli dan risiko piston baret.
            </div>
          </div>
        </div>

        <div style="font-size:13.5px; line-height:1.65; color:#f1f5f9; margin-bottom:18px;">
          ${rawHtml}
        </div>

        <div style="display:flex; justify-content:flex-end;">
          <button class="btn btn-emerald btn-sm" id="btn-apply-ai-schedule">
            📅 Terapkan Jadwal 1 Bulan ke Form Servis
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-apply-ai-schedule')?.addEventListener('click', () => {
      this.setDefaultNextDueDate();
      const oilInput = this.container.querySelector('#srv-oil-brand');
      if (oilInput && !oilInput.value) {
        oilInput.value = (this.selectedVehicle?.year >= 2021) 
          ? 'AHM Oil SPX2 10W-30 Full Synthetic' 
          : 'Shell Advance AX7 10W-40 Scooter';
      }
      this.showToast('Jadwal Diterapkan', 'Tanggal jatuh tempo 1 bulan berikutnya telah diatur otomatis.', 'info');
      this.container.querySelector('#form-service-record')?.scrollIntoView({ behavior: 'smooth' });
      oilInput?.focus();
    });
  }

  calculateNextDueCountdown() {
    const widget = this.container.querySelector('#oil-countdown-widget');
    const digits = this.container.querySelector('#countdown-days-text');
    const badge = this.container.querySelector('#countdown-status-badge');
    if (!widget || !digits || !badge) return;

    if (!this.services || this.services.length === 0) {
      digits.textContent = 'Belum Ada Jadwal';
      badge.innerHTML = `<span class="badge badge-amber">Perlu Servis Awal</span>`;
      return;
    }

    const latest = this.services[0];
    const dueDate = new Date(latest.nextDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      digits.textContent = `Terlambat ${Math.abs(diffDays)} Hari!`;
      digits.style.color = 'var(--accent-rose)';
      badge.innerHTML = `<span class="badge badge-rose">⚠️ Segera Ganti Oli!</span>`;
    } else if (diffDays === 0) {
      digits.textContent = `Hari Ini!`;
      digits.style.color = 'var(--accent-amber)';
      badge.innerHTML = `<span class="badge badge-amber">⚡ Waktunya Ganti Oli</span>`;
    } else if (diffDays <= 3) {
      digits.textContent = `${diffDays} Hari Lagi`;
      digits.style.color = 'var(--accent-amber)';
      badge.innerHTML = `<span class="badge badge-amber">Mendekati Tenggat (H-${diffDays})</span>`;
    } else {
      digits.textContent = `${diffDays} Hari Lagi`;
      digits.style.color = '#fff';
      badge.innerHTML = `<span class="badge badge-emerald">Kondisi Aman (${latest.nextDueDate})</span>`;
    }
  }

  parseSimpleMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/### (.*?)\n/g, '<h4 style="color:#67e8f9; margin-top:14px; margin-bottom:6px; font-weight:700;">$1</h4>')
      .replace(/#### (.*?)\n/g, '<h5 style="color:#a5b4fc; margin-top:12px; margin-bottom:4px; font-weight:700;">$1</h5>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*?)$/gm, '<li style="margin-left:20px;">$1</li>')
      .replace(/\n\n/g, '<br>');
    return html;
  }

  showToast(title, msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast show';
    const icon = type === 'success' ? '✅' : type === 'danger' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${msg}</div>
      </div>
    `;

    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}
