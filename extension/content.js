// WatchMe.log — Universal Multi-Platform Streaming Content Script Scrobbler
(() => {
  console.log('[WatchMe.log Scrobbler] Universal content script initialized.');

  let currentVideoId = null;
  let hasScrobbledCurrent = false;
  let scrobbleThreshold = 80; // default 80%
  let toastTimeout = null;
  let cachedMetadata = null;

  // Load threshold from storage
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['scrobbleThreshold'], (res) => {
      if (res && res.scrobbleThreshold) {
        scrobbleThreshold = Number(res.scrobbleThreshold);
      }
    });
  }

  // Seamless Auto-Sync session credentials when browsing WatchMe.log web app
  const currentHost = window.location.hostname.toLowerCase();
  if (currentHost.includes('watchme-log') || currentHost === 'localhost' || currentHost === '127.0.0.1') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const at = parsed.access_token || parsed.currentSession?.access_token;
            const rt = parsed.refresh_token || parsed.currentSession?.refresh_token;
            const u = parsed.user?.id || parsed.currentSession?.user?.id;
            const email = parsed.user?.email || parsed.currentSession?.user?.email || '';
            if (at && u) {
              chrome.runtime.sendMessage({
                type: 'SYNC_SESSION_FROM_WEB',
                payload: { accessToken: at, refreshToken: rt, userId: u, userEmail: email }
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[WatchMe.log] Web session auto-sync skipped:', e);
    }
  }

  // Identify current streaming platform
  function detectPlatform() {
    const host = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    // Netflix: only track while actively on the playback page (/watch/*) to prevent homepage/browse trailer autoplay scrobbling
    if (host.includes('netflix.com')) {
      return pathname.startsWith('/watch') ? 'Netflix' : null;
    }
    if (host.includes('disneyplus.com') || host.includes('hotstar.com')) return 'Disney+';
    if (host.includes('primevideo.com') || (host.includes('amazon.') && pathname.includes('/gp/video'))) return 'Prime Video';
    if (host.includes('max.com') || host.includes('hbomax.com')) return 'HBO (Max)';
    if (host.includes('apple.com')) return 'Apple TV+';
    if (host.includes('idlix')) return 'IDLIX';
    if (host.includes('crunchyroll.com')) return 'Crunchyroll';
    if (host.includes('bilibili.tv') || host.includes('bilibili.com')) return 'Bstation';
    if (host.includes('vidio.com')) return 'Vidio';
    if (host.includes('viu.com')) return 'Viu';
    if (host.includes('wetv.vip')) return 'WeTV';
    if (host.includes('iq.com')) return 'iQIYI';
    return null;
  }

  // Toast UI Generator (Emil Kowalski & Sonner Motion Principles)
  function showToast(platformName, title, message, subtext = '', isSuccess = true) {
    let toast = document.getElementById('watchme-scrobbler-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'watchme-scrobbler-toast';
      toast.className = 'watchme-scrobbler-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    const safeTitle = escapeHtml(title);
    const safePlatform = escapeHtml(platformName);
    const safeMsg = escapeHtml(message);
    const safeSub = subtext ? escapeHtml(subtext) : '';

    const iconSvg = isSuccess
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="4" /><path d="m10 8 6 4-6 4V8z" fill="currentColor" stroke="none" /></svg>`;

    toast.innerHTML = `
      <div class="watchme-scrobbler-icon" aria-hidden="true">${iconSvg}</div>
      <div class="watchme-scrobbler-content">
        <div class="watchme-scrobbler-header">
          <span class="watchme-scrobbler-title">WatchMe.log</span>
          <span class="watchme-scrobbler-separator">•</span>
          <span class="watchme-scrobbler-platform">${safePlatform}</span>
          ${isSuccess ? '<span class="watchme-scrobbler-badge">SYNCED</span>' : ''}
        </div>
        <div class="watchme-scrobbler-msg" title="${safeTitle}">${safeTitle}</div>
        <div class="watchme-scrobbler-sub">${safeSub ? `${safeMsg} • ${safeSub}` : safeMsg}</div>
      </div>
      <button type="button" class="watchme-scrobbler-close" aria-label="Tutup notifikasi" title="Tutup">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="watchme-scrobbler-progress" aria-hidden="true"></div>
    `;

    // Close button event
    const closeBtn = toast.querySelector('.watchme-scrobbler-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissToast(toast);
      });
    }

    // Sonner principle: Pause toast auto-dismiss timer on mouse hover
    toast.onmouseenter = () => {
      if (toastTimeout) clearTimeout(toastTimeout);
    };

    toast.onmouseleave = () => {
      startDismissTimer(toast, 2500);
    };

    // Force layout reflow for animation
    void toast.offsetWidth;
    toast.classList.add('show');

    startDismissTimer(toast, 5000);
  }

  function startDismissTimer(toast, duration) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      dismissToast(toast);
    }, duration);
  }

  function dismissToast(toast) {
    if (!toast) return;
    toast.classList.remove('show');
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Robust Season & Episode Parser
  function parseSeasonEpisode(str) {
    if (!str) return { season: 1, episode: 1 };

    // Format S03E03, S3E3, S03:E03, S3.E3, S03_E03
    const sExMatch = str.match(/S(\d+)\s*[:._-]?\s*E(\d+)/i);
    if (sExMatch) {
      return { season: parseInt(sExMatch[1], 10), episode: parseInt(sExMatch[2], 10) };
    }

    // Format: Season 3 Episode 3 / Season 1, Ep. 1 / Musim 3 Episode 3 / Series 2 Ep 4 / Season 2 - Ep 4
    const fullMatch = str.match(/(?:Season|Musim|Series|S)\s*(\d+)[^0-9]+(?:Episode|Eps|Ep|E|Babak)\.?\s*(\d+)/i);
    if (fullMatch) {
      return { season: parseInt(fullMatch[1], 10), episode: parseInt(fullMatch[2], 10) };
    }

    // Season only check (e.g. "Season 2" or "2nd Season")
    let detectedSeason = 1;
    const seasonOnly = str.match(/(?:Season|Musim|Series)\s*(\d+)/i) || str.match(/(\d+)(?:st|nd|rd|th)\s*Season/i);
    if (seasonOnly) {
      detectedSeason = parseInt(seasonOnly[1], 10);
    }

    // Format: Episode 03 / Ep 3 / Eps 12 / Ep. 4 / #04 / - 04
    const epMatch = str.match(/(?:Episode|Eps|Ep|E|#)\.?\s*(\d+)/i) || str.match(/[-–—]\s*(\d{1,4})(?:\s*\[|\s*$|\s*\(|\s*-)/);
    if (epMatch) {
      return { season: detectedSeason, episode: parseInt(epMatch[1], 10) };
    }

    return { season: detectedSeason, episode: 1 };
  }

  // Clean Show Title from website tags & quality marks
  function cleanShowTitle(title) {
    if (!title) return '';
    const cleaned = title
      .replace(/^(?:Watch|Nonton)?\s*(?:on\s+)?(?:Prime Video|Netflix|Disney\+|Crunchyroll|Vidio|Viu|WeTV|iQIYI|Apple TV\+|Max|HBO|IDLIX)\s*[:|–—-•]\s*/i, '')
      .replace(/^(?:Nonton|Watch)\s+/i, '')
      .replace(/\s*[-–—|•:]\s*(?:Watch on|Nonton di|Stream on|Disney\+|Netflix|Prime Video|Crunchyroll|Vidio|Viu|iQIYI|WeTV|Apple TV\+|Max|HBO|IDLIX|Subtitle Indonesia|Sub Indo).*$/i, '')
      .replace(/\s*(?:Subtitle Indonesia|Sub Indo|IDLIX)\s*/gi, '')
      .replace(/\|.*$/g, '')
      .replace(/\[(?:Eng|Indo|Sub|Dub|1080p|720p|HD|4K|Official|TAMAT|END|Full)\]/gi, '')
      .replace(/\((?:Eng|Indo|Sub|Dub|1080p|720p|HD|4K|Official|TAMAT|END|Full|\d{4})\)/gi, '')
      .replace(/(?:Season|Musim)\s*\d+.*$/i, '')
      .replace(/S\d+\s*E\d+.*$/i, '')
      .replace(/Episode\s*\d+.*$/i, '')
      .replace(/Eps\s*\d+.*$/i, '')
      .replace(/\s*[-–—:]\s*$/, '')
      .trim();

    // Guard against bare streaming platform names (e.g. document.title = "Netflix")
    const PLATFORM_NAMES = ['netflix', 'prime video', 'disney+', 'disney plus', 'apple tv+', 'max', 'hbo', 'crunchyroll', 'vidio', 'viu', 'idlix', 'bstation', 'wetv', 'iqiyi'];
    if (PLATFORM_NAMES.includes(cleaned.toLowerCase())) {
      return '';
    }

    return cleaned;
  }

  // Extract Metadata for each platform
  function extractMetadata(platform) {
    let showTitle = '';
    let season = 1;
    let episode = 1;
    let episodeTitle = '';

    const docTitle = document.title || '';
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';

    if (platform === 'Netflix') {
      const titleContainer = document.querySelector('[data-uia="video-title"]') || 
                             document.querySelector('.video-title') || 
                             document.querySelector('.ellipsize-text');
      if (titleContainer) {
        const spans = Array.from(titleContainer.querySelectorAll('span, h4'));
        if (spans.length >= 1) showTitle = spans[0]?.innerText?.trim() || '';
        if (spans.length >= 2) {
          const epText = spans[1]?.innerText?.trim() || '';
          const parsed = parseSeasonEpisode(epText);
          season = parsed.season;
          episode = parsed.episode;
        }
        if (spans.length >= 3) episodeTitle = spans[2]?.innerText?.trim() || '';
      }
    } 
    else if (platform === 'Disney+') {
      const titleEl = document.querySelector('[data-testid="player-title"]') || 
                      document.querySelector('.title-field') || 
                      document.querySelector('.player-metadata-title');
      const subtitleEl = document.querySelector('[data-testid="player-subtitle"]') || 
                         document.querySelector('.subtitle-field');
      if (titleEl) showTitle = titleEl.innerText?.trim() || '';
      if (subtitleEl) {
        const parsed = parseSeasonEpisode(subtitleEl.innerText || '');
        season = parsed.season;
        episode = parsed.episode;
        episodeTitle = subtitleEl.innerText?.trim() || '';
      }
    }
    else if (platform === 'Prime Video') {
      const titleEl = document.querySelector('.atvwebplayersdk-title-text') ||
                      document.querySelector('[data-automation-id="title"]') ||
                      document.querySelector('h1[data-automation-id="title"]') ||
                      document.querySelector('.dv-playback-title') ||
                      document.querySelector('[data-testid="player-title"]');
      const subtitleEl = document.querySelector('.atvwebplayersdk-subtitle-text') ||
                         document.querySelector('[data-automation-id="subtitle"]') ||
                         document.querySelector('.dv-playback-subtitle') ||
                         document.querySelector('[data-testid="player-subtitle"]');
      if (titleEl) showTitle = titleEl.innerText?.trim() || '';
      if (subtitleEl) {
        const parsed = parseSeasonEpisode(subtitleEl.innerText || '');
        season = parsed.season;
        episode = parsed.episode;
        episodeTitle = subtitleEl.innerText?.trim() || '';
      }
    }
    else if (platform === 'Crunchyroll') {
      const titleEl = document.querySelector('h1.title') || 
                      document.querySelector('[data-t="show-title-link"]') ||
                      document.querySelector('.current-media-title');
      const epEl = document.querySelector('.erc-current-media-info h2') ||
                   document.querySelector('h2.episode-title') ||
                   document.querySelector('.erc-current-media-info');
      if (titleEl) showTitle = titleEl.innerText?.trim() || '';
      if (epEl) {
        const parsed = parseSeasonEpisode(epEl.innerText || '');
        season = parsed.season;
        episode = parsed.episode;
        episodeTitle = epEl.innerText?.trim() || '';
      }
    }
    else if (platform === 'Bstation') {
      const titleEl = document.querySelector('.bstar-meta__title') || 
                      document.querySelector('.video-info__title') ||
                      document.querySelector('.og-title');
      const epEl = document.querySelector('.ep-item.active') || 
                   document.querySelector('.ep-list__item--active') ||
                   document.querySelector('.bstar-meta__sub');
      if (titleEl) showTitle = titleEl.innerText?.trim() || '';
      if (epEl) {
        const parsed = parseSeasonEpisode(epEl.innerText || '');
        season = parsed.season;
        episode = parsed.episode;
      }
    }
    else if (platform === 'Vidio') {
      const titleEl = document.querySelector('.video-title') || 
                      document.querySelector('.play-details-title') ||
                      document.querySelector('.video-meta__title');
      if (titleEl) showTitle = titleEl.innerText?.trim() || '';
    }
    else if (platform === 'Viu') {
      const titleEl = document.querySelector('.video-info-title') || 
                      document.querySelector('.series-title');
      const epEl = document.querySelector('.ep-title');
      if (titleEl) showTitle = titleEl.innerText?.trim() || '';
      if (epEl) {
        const parsed = parseSeasonEpisode(epEl.innerText || '');
        season = parsed.season;
        episode = parsed.episode;
      }
    }
    else if (platform === 'IDLIX') {
      const titleEl = document.querySelector('.sheader .data h1') ||
                      document.querySelector('.data h1') ||
                      document.querySelector('h1.entry-title') ||
                      document.querySelector('h1');
      if (titleEl) showTitle = titleEl.innerText?.trim() || '';

      const numerando = document.querySelector('.numerando')?.innerText?.trim();
      if (numerando) {
        const numMatch = numerando.match(/(\d+)\s*[-–—]\s*(\d+)/);
        if (numMatch) {
          season = parseInt(numMatch[1], 10);
          episode = parseInt(numMatch[2], 10);
        }
      }
      const epTitleEl = document.querySelector('.episodiotitle a') || document.querySelector('.episodiotitle');
      if (epTitleEl) episodeTitle = epTitleEl.innerText?.trim() || '';
    }

    // Heuristic Fallback using Document Title / OpenGraph Title
    if (!showTitle) {
      const candidateTitle = cleanShowTitle(ogTitle || docTitle);
      const parts = candidateTitle.split(/[-–—|:]/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        showTitle = parts[0];
      }
      const parsed = parseSeasonEpisode(ogTitle || docTitle);
      season = parsed.season;
      episode = parsed.episode;
      if (parts.length >= 2 && !episodeTitle) {
        episodeTitle = parts.slice(1).join(' - ');
      }
    }

    const cleaned = cleanShowTitle(showTitle);

    if (cleaned && cleaned.length >= 2) {
      cachedMetadata = {
        showTitle: cleaned,
        season: season || 1,
        episode: episode || 1,
        episodeTitle: episodeTitle || ''
      };
      return cachedMetadata;
    }

    // Use cached metadata if player controls or title currently hidden in DOM
    if (cachedMetadata) {
      return cachedMetadata;
    }

    return {
      showTitle: cleaned,
      season: season || 1,
      episode: episode || 1,
      episodeTitle: episodeTitle || ''
    };
  }

  // Generate Unique Video identifier based on URL / page state
  function getVideoId(meta) {
    const url = window.location.href;
    const epSuffix = (meta && meta.showTitle) ? `_s${meta.season}e${meta.episode}` : '';

    // Netflix watch ID
    const netflixMatch = url.match(/\/watch\/(\d+)/);
    if (netflixMatch) return `netflix_${netflixMatch[1]}${epSuffix}`;

    // Path or full pathname as ID
    const cleanPath = window.location.pathname.replace(/\/+$/, '');
    if (cleanPath.length > 1) {
      return `${window.location.hostname}_${cleanPath}${epSuffix}`;
    }

    return `${window.location.hostname}_${document.title}${epSuffix}`;
  }

  // Main playback monitoring loop
  function checkPlayback() {
    const platform = detectPlatform();
    if (!platform) return; // Only track supported streaming platforms

    const videos = Array.from(document.querySelectorAll('video'));
    if (!videos.length) return;

    // Prioritize playing video with valid duration > 150s
    const video = videos.find(v => !v.paused && v.duration > 0) ||
                  videos.find(v => v.currentTime > 0 && v.duration > 0) ||
                  videos.find(v => v.duration > 150) ||
                  videos[0];

    if (!video || !video.duration || isNaN(video.duration) || video.duration <= 0) {
      return;
    }

    // Skip short previews/ads under 150 seconds
    if (video.duration < 150) {
      return;
    }

    const meta = extractMetadata(platform);
    const videoId = getVideoId(meta);
    if (!videoId) return;

    if (currentVideoId !== videoId) {
      currentVideoId = videoId;
      hasScrobbledCurrent = false;
      console.log(`[WatchMe.log] Detected video stream on ${platform}: ${videoId}`);
    }

    // If video restarted or rewound near the beginning, allow re-scrobbling
    if (video.currentTime < 10 && hasScrobbledCurrent && video.duration > 300) {
      hasScrobbledCurrent = false;
    }

    const progress = (video.currentTime / video.duration) * 100;

    // When progress passes threshold and has not been scrobbled yet
    if (progress >= scrobbleThreshold && !hasScrobbledCurrent) {
      if (!meta.showTitle || meta.showTitle.length < 2) {
        return;
      }

      hasScrobbledCurrent = true;
      console.log(`[WatchMe.log] Auto-Scrobbling (${platform}): "${meta.showTitle}" S${meta.season}E${meta.episode} (${Math.round(progress)}%)`);

      chrome.runtime.sendMessage({
        type: 'SCROBBLE_EPISODE',
        payload: {
          showTitle: meta.showTitle,
          season: meta.season,
          episode: meta.episode,
          episodeTitle: meta.episodeTitle,
          watchId: currentVideoId,
          progress: Math.round(progress),
          platform: platform
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[WatchMe.log] Scrobble error:', chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success) {
          const epFormatted = `Season ${meta.season}, Ep. ${meta.episode}`;
          const rawSub = (meta.episodeTitle || '').trim();
          // Filter out redundant subtitles like "Episode 10" or "Ep. 10" that duplicate epFormatted
          const isGenericEp = !rawSub || new RegExp(`^(?:Season\\s*\\d+\\s*)?(?:Episode|Eps|Ep)\\s*${meta.episode}$`, 'i').test(rawSub);
          const cleanSubtitle = isGenericEp ? '' : rawSub;

          showToast(
            platform,
            meta.showTitle,
            epFormatted,
            cleanSubtitle,
            true
          );
        } else if (response && response.error) {
          console.warn('[WatchMe.log] Scrobble response error:', response.error);
          showToast(
            platform,
            'Sinkronisasi Tertunda',
            response.error,
            'Periksa Sync Key di popup ekstensi',
            false
          );
        }
      });
    }
  }

  // Check every 3 seconds while on streaming player
  setInterval(checkPlayback, 3000);
})();
