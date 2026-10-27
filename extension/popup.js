// WatchMe.log Extension Popup Script
// Crafted with Emil Kowalski Design Engineering & Accessibility Standards

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const userIdInput = document.getElementById('userId');
  const btnToggleToken = document.getElementById('btn-toggle-token');
  const iconEyeShow = document.getElementById('icon-eye-show');
  const iconEyeHide = document.getElementById('icon-eye-hide');
  const btnPasteToken = document.getElementById('btn-paste-token');

  const thresholdInput = document.getElementById('scrobbleThreshold');
  const thresholdVal = document.getElementById('threshold-val');

  const configForm = document.getElementById('config-form');
  const saveBtn = document.getElementById('save-btn');
  const saveBtnText = document.getElementById('save-btn-text');
  const saveSpinner = document.getElementById('save-spinner');
  const alertBox = document.getElementById('alert-box');

  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');

  const tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
  const tabContents = Array.from(document.querySelectorAll('.tab-content'));

  const historyList = document.getElementById('history-list');
  const historyCount = document.getElementById('history-count');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  let alertTimeout = null;

  const SYNC_SECRET = 'wml_secure_sync_vault_2026';

  async function decryptSecureSyncToken(token) {
    if (!token || !token.startsWith('wml_sec_')) return null;
    const rawBase64 = token.replace(/^wml_sec_/, '');
    const binary = atob(rawBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    if (bytes.length < 13) return null;
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(SYNC_SECRET));
    const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  }

  // ==========================================================================
  // WAI-ARIA Accessible Tab Navigation
  // ==========================================================================
  function activateTab(targetBtn) {
    const tabName = targetBtn.dataset.tab;

    tabBtns.forEach((btn) => {
      const isActive = btn === targetBtn;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    tabContents.forEach((content) => {
      const isTarget = content.id === `tab-${tabName}`;
      content.classList.toggle('active', isTarget);
    });

    if (tabName === 'history') {
      renderHistory();
    }
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn));

    // Keyboard Arrow navigation (WAI-ARIA tabs pattern)
    btn.addEventListener('keydown', (e) => {
      const currentIndex = tabBtns.indexOf(btn);
      let nextIndex = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % tabBtns.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + tabBtns.length) % tabBtns.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = tabBtns.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextBtn = tabBtns[nextIndex];
        nextBtn.focus();
        activateTab(nextBtn);
      }
    });
  });

  // ==========================================================================
  // Token Input: Toggle Visibility & Paste from Clipboard
  // ==========================================================================
  btnToggleToken.addEventListener('click', () => {
    const isPassword = userIdInput.type === 'password';
    userIdInput.type = isPassword ? 'text' : 'password';
    iconEyeShow.classList.toggle('hidden', isPassword);
    iconEyeHide.classList.toggle('hidden', !isPassword);
    userIdInput.focus();
  });

  btnPasteToken.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        userIdInput.value = text.trim();
        showAlert('Token berhasil ditempel dari clipboard.', 'success');
        userIdInput.focus();
      } else {
        showAlert('Clipboard kosong. Salin Sync Key dari halaman Profile terlebih dahulu.', 'error');
      }
    } catch {
      userIdInput.focus();
      showAlert('Gunakan shortcut Ctrl+V / Cmd+V untuk menempel token.', 'error');
    }
  });

  // ==========================================================================
  // Threshold Slider Dynamic Background & Pill
  // ==========================================================================
  function updateSliderBackground(val) {
    const percentage = ((val - thresholdInput.min) / (thresholdInput.max - thresholdInput.min)) * 100;
    thresholdInput.style.background = `linear-gradient(to right, #6366F1 0%, #6366F1 ${percentage}%, rgba(255,255,255,0.08) ${percentage}%, rgba(255,255,255,0.08) 100%)`;
  }

  thresholdInput.addEventListener('input', (e) => {
    const val = e.target.value;
    thresholdVal.textContent = `${val}%`;
    thresholdInput.setAttribute('aria-valuenow', val);
    updateSliderBackground(val);
  });

  // ==========================================================================
  // Initial Data Load
  // ==========================================================================
  chrome.storage.sync.get(
    ['userId', 'accessToken', 'scrobbleThreshold', 'userEmail'],
    (items) => {
      if (items.userId) {
        // Safe placeholder to avoid exposing raw JWT tokens on screen
        userIdInput.placeholder = items.userEmail ? `Terhubung (${items.userEmail})` : 'Akun sudah terhubung';
      }

      if (items.scrobbleThreshold) {
        thresholdInput.value = items.scrobbleThreshold;
        thresholdVal.textContent = `${items.scrobbleThreshold}%`;
        thresholdInput.setAttribute('aria-valuenow', items.scrobbleThreshold);
        updateSliderBackground(items.scrobbleThreshold);
      } else {
        updateSliderBackground(80);
      }

      // Check initial connection status without notification toast
      if (items.userId || items.accessToken) {
        testConnection({
          userId: items.userId,
          accessToken: items.accessToken
        }, false);
      }
    }
  );

  // ==========================================================================
  // Form Submit & Connection Testing
  // ==========================================================================
  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAlert('', ''); // hide previous alert

    const rawInput = userIdInput.value.trim();
    const threshold = Number(thresholdInput.value);

    if (!rawInput) {
      showAlert('Masukkan Sync Token Anda terlebih dahulu.', 'error');
      userIdInput.focus();
      return;
    }

    let userId = rawInput;
    let accessToken = '';
    let refreshToken = '';
    let userEmail = '';

    // Check if input is an encrypted wml_sec_ token (AES-256-GCM)
    if (rawInput.startsWith('wml_sec_')) {
      try {
        const decrypted = await decryptSecureSyncToken(rawInput);
        if (decrypted) {
          if (decrypted.exp && decrypted.exp < Date.now()) {
            showAlert('Sync Token telah kedaluwarsa. Salin token baru dari Profile.', 'error');
            return;
          }
          if (decrypted.u) userId = decrypted.u;
          if (decrypted.at) accessToken = decrypted.at;
          if (decrypted.rt) refreshToken = decrypted.rt;
        } else {
          showAlert('Sync Token tidak valid atau rusak.', 'error');
          return;
        }
      } catch (err) {
        console.error('Decryption failed:', err);
        showAlert('Gagal membaca Sync Token terenkripsi.', 'error');
        return;
      }
    }
    // Backward compatibility: legacy base64 wml_ token
    else if (rawInput.startsWith('wml_')) {
      try {
        const b64 = rawInput.replace(/^wml_/, '');
        let parsed = null;
        try {
          parsed = JSON.parse(atob(b64));
        } catch {
          const jsonPayload = decodeURIComponent(
            atob(b64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          parsed = JSON.parse(jsonPayload);
        }
        if (parsed) {
          if (parsed.u) userId = parsed.u;
          if (parsed.at) accessToken = parsed.at;
          if (parsed.rt) refreshToken = parsed.rt;
        }
      } catch (err) {
        console.warn('wml token parse error:', err);
      }
    }
    // Check if input is a raw JSON string
    else if (rawInput.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawInput);
        if (parsed.u || parsed.user_id) userId = parsed.u || parsed.user_id;
        if (parsed.at || parsed.access_token) accessToken = parsed.at || parsed.access_token;
        if (parsed.rt || parsed.refresh_token) refreshToken = parsed.rt || parsed.refresh_token;
      } catch (err) {
        console.warn('json token parse error:', err);
      }
    }
    // Check if input is a JWT token (access_token from Supabase)
    else if (rawInput.includes('.')) {
      try {
        const parts = rawInput.split('.');
        if (parts.length >= 2) {
          const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(payloadBase64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);
          if (decoded.sub) {
            userId = decoded.sub;
            accessToken = rawInput;
            userEmail = decoded.email || '';
          }
        }
      } catch (err) {
        console.warn('JWT parse fallback:', err);
      }
    }

    const saveObj = {
      userId,
      accessToken,
      refreshToken,
      userEmail,
      scrobbleThreshold: threshold,
      supabaseUrl: 'https://hpglyofqqqisgtaaildo.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZ2x5b2ZxcXFpc2d0YWFpbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTc3NDgsImV4cCI6MjA4MjkzMzc0OH0.IrJfPmhkhkJOaSmx8ENy9H_uzEHJWsfA9P4kbHXiF3s'
    };

    // Set loading state on button
    setButtonLoading(true);

    chrome.storage.sync.set(saveObj, () => {
      testConnection(saveObj, true);
    });
  });

  function setButtonLoading(isLoading) {
    if (isLoading) {
      saveBtn.disabled = true;
      saveSpinner.classList.remove('hidden');
      saveBtnText.textContent = 'Menghubungkan...';
    } else {
      saveBtn.disabled = false;
      saveSpinner.classList.add('hidden');
      saveBtnText.textContent = 'Simpan & Hubungkan';
    }
  }

  function testConnection(config, showToast = true) {
    chrome.runtime.sendMessage(
      { type: 'TEST_CONNECTION', config },
      (res) => {
        setButtonLoading(false);

        if (chrome.runtime.lastError || !res || !res.success) {
          const errMsg = res?.error || chrome.runtime.lastError?.message || 'Gagal terhubung.';
          updateStatus(false, 'Offline');
          if (showToast) {
            showAlert(`Koneksi gagal: ${errMsg}`, 'error');
          }
        } else {
          updateStatus(true, 'Terhubung');
          if (showToast) {
            showAlert('Berhasil terhubung ke akun WatchMe.log!', 'success');
          }
        }
      }
    );
  }

  function updateStatus(isConnected, text) {
    if (isConnected) {
      statusPill.className = 'status-pill connected';
      statusText.textContent = text;
    } else {
      statusPill.className = 'status-pill disconnected';
      statusText.textContent = text;
    }
  }

  // ==========================================================================
  // Feedback Alerts
  // ==========================================================================
  function showAlert(msg, type) {
    if (alertTimeout) {
      clearTimeout(alertTimeout);
      alertTimeout = null;
    }

    if (!msg) {
      alertBox.className = 'alert-box hidden';
      alertBox.innerHTML = '';
      return;
    }

    const iconSvg = type === 'success'
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;

    alertBox.className = `alert-box ${type}`;
    alertBox.innerHTML = `<span>${iconSvg}</span><span>${escapeHtml(msg)}</span>`;

    // Auto-dismiss success alert after 4.5s
    if (type === 'success') {
      alertTimeout = setTimeout(() => {
        showAlert('', '');
      }, 4500);
    }
  }

  // ==========================================================================
  // History Rendering & Clear Action
  // ==========================================================================
  function renderHistory() {
    chrome.storage.local.get(['recentScrobbles'], (res) => {
      const list = res.recentScrobbles || [];
      historyCount.textContent = `${list.length} riwayat`;

      if (list.length === 0) {
        clearHistoryBtn.classList.add('hidden');
        historyList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15.5 17 5 3.5-5 3.5v-7Z"/>
                <path d="M2 6h20"/>
                <path d="M2 12h10"/>
                <path d="M2 18h8"/>
              </svg>
            </div>
            <p class="empty-title">Belum ada riwayat tontonan</p>
            <p class="empty-desc">Tonton episode di Netflix, Disney+, YouTube, dsb. Tontonan akan dicatat otomatis di sini.</p>
          </div>
        `;
        return;
      }

      clearHistoryBtn.classList.remove('hidden');

      historyList.innerHTML = list.map((item, idx) => {
        const dateStr = item.timestamp
          ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        const platformStr = item.platform || 'Streaming';

        return `
          <div class="history-item" style="--index: ${idx}">
            <div class="history-title-row">
              <span class="history-title" title="${escapeHtml(item.showTitle)}">${escapeHtml(item.showTitle)}</span>
              <span class="history-platform-badge">${escapeHtml(platformStr)}</span>
            </div>
            <div class="history-meta-row">
              <span class="history-ep">Season ${item.season} • Episode ${item.episode}</span>
              <span class="history-time">${dateStr}</span>
            </div>
          </div>
        `;
      }).join('');
    });
  }

  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['recentScrobbles'], () => {
      renderHistory();
      showAlert('Riwayat berhasil dibersihkan.', 'success');
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
