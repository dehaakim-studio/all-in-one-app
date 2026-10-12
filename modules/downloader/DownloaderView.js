/**
 * DownloaderView - Komponen UI Modul Downloader
 */
export class DownloaderView {
  constructor(service) {
    this.service = service;
    this.currentMedia = null;
    this.selectedFormat = null;
    this.container = null;
  }

  render(container) {
    this.container = container;
    const folderName = this.service.getSavedFolderName();

    this.container.innerHTML = `
      <div class="downloader-grid">
        <!-- Banner Pemilihan Folder Penyimpanan Lokal -->
        <div class="directory-banner glass-panel">
          <div class="directory-info">
            <span class="dir-icon">📁</span>
            <div>
              <div class="dir-label">Direktori Penyimpanan Unduhan</div>
              <div class="dir-path" id="dir-path-text">${folderName}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-select-dir">
            <span>⚙️ Ganti Folder Lokal</span>
          </button>
        </div>

        <!-- Input URL Media -->
        <div class="card glass-panel downloader-input-card">
          <div class="card-header">
            <div>
              <h3 class="card-title"><span>📥</span> Unduh Video & Audio</h3>
              <p class="card-subtitle">Mendukung YouTube, TikTok (vt.tiktok.com), Instagram Reels, dan URL langsung</p>
            </div>
            <span class="badge badge-cyan">Auto-Detect</span>
          </div>

          <div class="url-input-wrapper">
            <div class="url-input-box">
              <span class="url-icon">🔗</span>
              <input type="url" id="media-url-input" class="form-control" placeholder="Tempel tautan video atau audio di sini...">
              <button class="btn btn-secondary btn-sm btn-paste" id="btn-paste-url" title="Tempel dari Clipboard">📋 Paste</button>
            </div>
            <button class="btn btn-primary" id="btn-analyze-url">
              <span class="btn-text">Analisis Media</span>
              <span class="btn-spinner" style="display:none;"><div class="spinner" style="width:16px;height:16px;border-width:2px;"></div></span>
            </button>
          </div>

          <div class="platform-pill-list">
            <span class="platform-pill" data-sample="https://www.youtube.com/watch?v=dQw4w9WgXcQ">▶️ YouTube Sample</span>
            <span class="platform-pill" data-sample="https://vt.tiktok.com/ZSbTx7rMn/">🎵 TikTok Sample</span>
            <span class="platform-pill" data-sample="https://www.instagram.com/reel/C8qA12bCd/">📸 IG Reels Sample</span>
          </div>
        </div>

        <!-- Container Preview Media Dinamis -->
        <div id="media-preview-area"></div>

        <!-- Container Progress Bar Real-time -->
        <div id="download-progress-area"></div>

        <!-- Tabel Riwayat Unduhan -->
        <div class="card glass-panel">
          <div class="card-header">
            <div>
              <h3 class="card-title"><span>🕒</span> Riwayat Unduhan</h3>
              <p class="card-subtitle">File yang berhasil diunduh dan tersimpan di penyimpanan</p>
            </div>
            <button class="btn btn-outline btn-sm btn-danger" id="btn-clear-history">🗑️ Bersihkan Riwayat</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 70px;">Media</th>
                  <th>Judul Konten</th>
                  <th>Platform</th>
                  <th>Format / Kualitas</th>
                  <th>Ukuran</th>
                  <th>Waktu</th>
                  <th>Status</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody id="history-table-body">
                <tr>
                  <td colspan="8" style="text-align:center; padding:30px; color:var(--text-dim);">
                    Memuat riwayat unduhan...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.refreshHistory();
  }

  bindEvents() {
    const btnSelectDir = this.container.querySelector('#btn-select-dir');
    const btnAnalyze = this.container.querySelector('#btn-analyze-url');
    const inputUrl = this.container.querySelector('#media-url-input');
    const btnPaste = this.container.querySelector('#btn-paste-url');
    const btnClearHistory = this.container.querySelector('#btn-clear-history');
    const pillSamples = this.container.querySelectorAll('.platform-pill');

    btnSelectDir.addEventListener('click', async () => {
      try {
        const selected = await this.service.selectLocalFolder();
        if (selected) {
          this.container.querySelector('#dir-path-text').textContent = selected;
          this.showToast('Folder Berhasil Dipilih', `Penyimpanan dialihkan ke: ${selected}`, 'success');
        }
      } catch (err) {
        this.showToast('Info Penyimpanan', err.message, 'warning');
      }
    });

    btnPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('http')) {
          inputUrl.value = text.trim();
          this.handleAnalyze();
        } else {
          inputUrl.focus();
        }
      } catch (e) {
        inputUrl.focus();
        this.showToast('Akses Clipboard', 'Izinkan akses clipboard atau tempel secara manual (Ctrl+V).', 'warning');
      }
    });

    pillSamples.forEach(pill => {
      pill.addEventListener('click', () => {
        inputUrl.value = pill.getAttribute('data-sample');
        this.handleAnalyze();
      });
    });

    // Auto-analisis saat pengguna menempel link (Ctrl+V atau klik kanan paste)
    inputUrl.addEventListener('paste', () => {
      setTimeout(() => {
        const v = inputUrl.value.trim();
        if (v && v.startsWith('http') && !btnAnalyze.disabled) {
          this.handleAnalyze();
        }
      }, 200);
    });

    btnAnalyze.addEventListener('click', () => this.handleAnalyze());

    inputUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleAnalyze();
      }
    });

    btnClearHistory.addEventListener('click', async () => {
      if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat unduhan?')) {
        await this.service.clearHistory();
        this.refreshHistory();
        this.showToast('Riwayat Dibersihkan', 'Seluruh data riwayat telah dihapus.', 'info');
      }
    });
  }

  async handleAnalyze() {
    const inputUrl = this.container.querySelector('#media-url-input');
    const url = inputUrl.value.trim();
    if (!url) {
      this.showToast('Peringatan', 'Harap masukkan URL video atau audio terlebih dahulu.', 'warning');
      inputUrl.focus();
      return;
    }

    const btn = this.container.querySelector('#btn-analyze-url');
    const btnText = btn.querySelector('.btn-text');
    const btnSpinner = btn.querySelector('.btn-spinner');

    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    btn.disabled = true;

    try {
      const media = await this.service.analyzeMediaUrl(url);
      this.currentMedia = media;
      this.selectedFormat = media.formats[0]; // Default FHD or highest
      this.renderMediaPreview(media);
    } catch (err) {
      this.showToast('Gagal Menganalisis', err.message, 'danger');
    } finally {
      btnText.style.display = 'inline-block';
      btnSpinner.style.display = 'none';
      btn.disabled = false;
    }
  }

  renderMediaPreview(media) {
    const area = this.container.querySelector('#media-preview-area');

    // Platform-specific icon and accent color for the format section
    const platformMeta = {
      YouTube:   { icon: '▶️', accentClass: 'badge-rose',    sectionLabel: 'Pilih Kualitas YouTube' },
      TikTok:    { icon: '🎵', accentClass: 'badge-purple',   sectionLabel: 'Pilih Kualitas TikTok' },
      Instagram: { icon: '📸', accentClass: 'badge-amber',    sectionLabel: 'Pilih Kualitas Instagram' },
    };
    const pm = platformMeta[media.platform] || { icon: '🌐', accentClass: 'badge-cyan', sectionLabel: 'Pilih Format & Kualitas' };

    let formatCardsHtml = '';
    media.formats.forEach((fmt, index) => {
      const isSelected = index === 0 ? 'selected' : '';
      const typeIcon   = fmt.type === 'video' ? '🎬' : '🎧';
      const typeLabel  = fmt.type === 'video' ? 'VIDEO' : 'AUDIO';
      const labelTag   = fmt.label ? `<span class="format-extra-label">${fmt.label}</span>` : '';
      formatCardsHtml += `
        <div class="format-card ${isSelected}" data-format-id="${fmt.id}">
          <div class="format-badge-label">${typeIcon} ${typeLabel}${labelTag ? ' · ' + fmt.label : ''}</div>
          <div class="format-quality-text">${fmt.quality}</div>
          <div class="format-size-text">${fmt.sizeMb} MB • ${fmt.bitRate}</div>
        </div>
      `;
    });


    area.innerHTML = `
      <div class="media-preview-card glass-panel">
        <div>
          <div class="media-thumbnail-container">
            <img src="${media.thumbnail}" alt="${media.title}" class="media-thumbnail-img" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'">
            <span class="media-duration-badge">${media.duration}</span>
          </div>

          ${media.embedUrl ? `
            <div style="margin-top:10px; display:flex; gap:6px;">
              <button class="btn btn-secondary btn-sm" id="btn-toggle-player" style="width:100%; font-size:11.5px;">
                ▶️ Putar Video Asli
              </button>
            </div>
          ` : ''}
        </div>

        <div class="media-details">
          <div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px;">
              <span class="badge badge-emerald">✓ Metadata Asli Terverifikasi</span>
              <a href="${media.url}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px; color:var(--accent-cyan); text-decoration:none;">
                🔗 Buka Link Asli ↗
              </a>
            </div>

            <div class="media-title-text">${media.title}</div>
            <div class="media-meta-row">
              <span>${media.icon} <strong>${media.platform}</strong></span>
              <span>👤 <strong>${media.author}</strong></span>
              <span>⚡ <strong>${media.formats.length} Opsi Kualitas</strong> (Tersedia MP3 128k)</span>
            </div>

            <!-- Container Player Iframe jika user ingin memutar langsung -->
            <div id="embed-player-box" style="display:none; margin-bottom:14px; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border-color);">
              ${media.embedUrl ? `<iframe id="media-embed-frame" src="" width="100%" height="220" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : ''}
            </div>

            <div style="font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span>${pm.icon}</span>
              <span>${pm.sectionLabel}</span>
              <span class="badge ${pm.accentClass}" style="font-size:10px; padding:2px 8px;">${media.formats.length} opsi</span>
            </div>
            <div class="format-options-grid" id="format-options-container">
              ${formatCardsHtml}
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
            <button class="btn btn-emerald btn-lg" id="btn-start-download">
              <span>🚀 Mulai Unduh Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind event toggle preview player
    const btnTogglePlayer = area.querySelector('#btn-toggle-player');
    const playerBox = area.querySelector('#embed-player-box');
    const playerFrame = area.querySelector('#media-embed-frame');

    if (btnTogglePlayer && playerBox && playerFrame) {
      btnTogglePlayer.addEventListener('click', () => {
        if (playerBox.style.display === 'none') {
          playerFrame.src = media.embedUrl;
          playerBox.style.display = 'block';
          btnTogglePlayer.textContent = '⏹️ Tutup Pemutar';
        } else {
          playerFrame.src = '';
          playerBox.style.display = 'none';
          btnTogglePlayer.textContent = '▶️ Putar Video Asli';
        }
      });
    }

    // Bind event klik pilihan format
    const formatCards = area.querySelectorAll('.format-card');
    formatCards.forEach(card => {
      card.addEventListener('click', () => {
        formatCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const fId = card.getAttribute('data-format-id');
        this.selectedFormat = media.formats.find(f => f.id === fId);
      });
    });

    // Bind event tombol Mulai Unduh
    area.querySelector('#btn-start-download').addEventListener('click', () => {
      this.startDownloading();
    });
  }

  async startDownloading() {
    if (!this.currentMedia || !this.selectedFormat) return;

    const progressArea = this.container.querySelector('#download-progress-area');
    progressArea.innerHTML = `
      <div class="download-progress-card glass-panel">
        <div class="progress-header">
          <div class="progress-status-text" id="prog-status">
            <div class="spinner" style="width:18px;height:18px;border-width:2px;"></div>
            <span>Memulai proses unduhan...</span>
          </div>
          <div class="progress-percent-text" id="prog-percent">0%</div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="prog-fill" style="width: 0%;"></div>
        </div>

        <div class="progress-stats-row">
          <span id="prog-bytes">0 / ${this.selectedFormat.sizeMb} MB</span>
          <span id="prog-speed">Speed: 0 MB/s</span>
          <span id="prog-eta">ETA: Menghitung...</span>
          <button class="btn btn-danger btn-sm" id="btn-cancel-dl">Batal</button>
        </div>
      </div>
    `;

    const progStatus = progressArea.querySelector('#prog-status span');
    const progPercent = progressArea.querySelector('#prog-percent');
    const progFill = progressArea.querySelector('#prog-fill');
    const progBytes = progressArea.querySelector('#prog-bytes');
    const progSpeed = progressArea.querySelector('#prog-speed');
    const progEta = progressArea.querySelector('#prog-eta');
    const btnCancel = progressArea.querySelector('#btn-cancel-dl');

    btnCancel.addEventListener('click', () => {
      this.service.cancelDownload();
    });

    try {
      const result = await this.service.startDownload(this.currentMedia, this.selectedFormat, (progress) => {
        progStatus.textContent = progress.status;
        progPercent.textContent = `${progress.percent}%`;
        progFill.style.width = `${progress.percent}%`;
        progBytes.textContent = `${progress.downloadedMb} / ${progress.totalMb} MB`;
        progSpeed.textContent = `Speed: ${progress.speed}`;
        progEta.textContent = `ETA: ${progress.eta}`;
      });

      this.showToast('Unduhan Berhasil!', `File ${result.fileName} telah berhasil disimpan.`, 'success');
      const directUrl = `/api/download?url=${encodeURIComponent(this.currentMedia.url)}&type=${encodeURIComponent(this.selectedFormat.type)}&ext=${encodeURIComponent(this.selectedFormat.ext)}&quality=${encodeURIComponent(this.selectedFormat.quality)}&title=${encodeURIComponent(result.fileName.replace(/\.[^.]+$/, ''))}`;
      progressArea.innerHTML = `
        <div class="glass-panel" style="padding:16px 20px; background:rgba(16, 185, 129, 0.1); border-color:rgba(16, 185, 129, 0.3); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:24px;">✅</span>
            <div>
              <div style="font-weight:700; color:#6ee7b7;">Selesai Diunduh: ${result.fileName} (${result.sizeMb} MB)</div>
              <div style="font-size:12px; color:var(--text-muted);">Tersimpan di: ${result.savedTo}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <a href="${directUrl}" download="${result.fileName}" class="btn btn-emerald btn-sm" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
              💾 Unduh / Simpan Ulang File
            </a>
            <button class="btn btn-outline btn-sm" onclick="this.closest('.glass-panel').remove()">Tutup</button>
          </div>
        </div>
      `;

      this.refreshHistory();

    } catch (err) {
      if (err.message.includes('dibatalkan')) {
        this.showToast('Unduhan Dibatalkan', 'Proses unduhan berhasil dihentikan.', 'info');
      } else {
        this.showToast('Gagal Mengunduh', err.message, 'danger');
      }
      progressArea.innerHTML = '';
    }
  }

  async refreshHistory() {
    const tbody = this.container.querySelector('#history-table-body');
    if (!tbody) return;

    try {
      const list = await this.service.getHistory();
      if (!list || list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; padding:36px; color:var(--text-dim);">
              <div style="font-size:32px; margin-bottom:8px;">📥</div>
              <div>Belum ada riwayat unduhan file.</div>
              <div style="font-size:12px;">Masukkan URL video/audio di atas untuk mulai mengunduh.</div>
            </td>
          </tr>
        `;
        return;
      }

      let rows = '';
      list.forEach(item => {
        const dateStr = new Date(item.timestamp).toLocaleString('id-ID', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        const badgeClass = item.format === 'MP3' ? 'badge-purple' : 'badge-cyan';

        rows += `
          <tr data-history-id="${item.id}">
            <td>
              <img src="${item.thumbnail}" class="history-thumb-mini" alt="Thumb" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'">
            </td>
            <td>
              <div class="history-item-title" title="${item.title}">${item.title}</div>
              <div class="history-item-sub">${item.fileName}</div>
            </td>
            <td><strong>${item.platform}</strong></td>
            <td><span class="badge ${badgeClass}">${item.format} • ${item.quality}</span></td>
            <td style="font-family:var(--font-mono);">${item.sizeMb} MB</td>
            <td style="font-size:12px; color:var(--text-muted);">${dateStr}</td>
            <td><span class="badge badge-emerald">✓ Tersimpan</span></td>
            <td style="text-align: right;">
              <div style="display:inline-flex; gap:6px;">
                <a href="/api/download?url=${encodeURIComponent(item.url)}&ext=${(item.format || 'mp4').toLowerCase()}&quality=${encodeURIComponent(item.quality || '')}&title=${encodeURIComponent(item.title || '')}" download="${item.fileName}" class="btn btn-secondary btn-sm" title="Unduh File Langsung" style="text-decoration:none;">💾</a>
                <button class="btn btn-secondary btn-sm action-redownload" data-id="${item.id}" title="Analisis Ulang">🔄</button>
                <button class="btn btn-outline btn-danger btn-sm action-delete" data-id="${item.id}" title="Hapus Riwayat">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = rows;

      // Event listeners for actions
      tbody.querySelectorAll('.action-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          await this.service.deleteHistoryItem(id);
          this.refreshHistory();
          this.showToast('Dihapus', 'Item riwayat berhasil dihapus.', 'info');
        });
      });

      tbody.querySelectorAll('.action-redownload').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const item = list.find(x => x.id === id);
          if (item) {
            this.container.querySelector('#media-url-input').value = item.url;
            this.handleAnalyze();
          }
        });
      });

    } catch (err) {
      console.error('[DownloaderView] Error refresh history:', err);
    }
  }

  showToast(title, msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast show';
    const icon = type === 'success' ? '✅' : type === 'danger' ? '⚠️' : type === 'warning' ? '⚡' : 'ℹ️';
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
