// WatchMe.log — Extension Background Service Worker

// Default configuration (connected to WatchMe.log Supabase project)
const DEFAULT_CONFIG = {
  supabaseUrl: 'https://hpglyofqqqisgtaaildo.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZ2x5b2ZxcXFpc2d0YWFpbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTc3NDgsImV4cCI6MjA4MjkzMzc0OH0.IrJfPmhkhkJOaSmx8ENy9H_uzEHJWsfA9P4kbHXiF3s',
  userId: '',
  userEmail: '',
  accessToken: '',
  refreshToken: '',
  scrobbleThreshold: 80,
  recentScrobbles: []
};

// Check if JWT token is expired or close to expiring (within 60s)
function isJwtExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? (payload.exp * 1000 < Date.now() + 60000) : false;
  } catch {
    return false;
  }
}

// Refresh Supabase auth session using refresh_token
async function refreshSupabaseToken(refreshToken) {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${DEFAULT_CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'apikey': DEFAULT_CONFIG.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!res.ok) {
      console.warn('[WatchMe.log] Refresh token failed:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      await new Promise(resolve => {
        chrome.storage.sync.set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          userId: data.user?.id || ''
        }, resolve);
      });
      console.log('[WatchMe.log] Successfully refreshed Supabase access token.');
      return data.access_token;
    }
  } catch (err) {
    console.warn('[WatchMe.log] Refresh token error:', err);
  }
  return null;
}

// Helper for Supabase REST requests
async function supabaseFetch(endpoint, method = 'GET', body = null, config) {
  let token = config.accessToken;

  // Proactively refresh expired token if refresh token is available
  if (token && isJwtExpired(token) && config.refreshToken) {
    console.log('[WatchMe.log] Access token expired, proactively refreshing...');
    const freshToken = await refreshSupabaseToken(config.refreshToken);
    if (freshToken) token = freshToken;
  }

  const doFetch = async (authToken) => {
    const headers = {
      'apikey': config.supabaseAnonKey,
      'Authorization': `Bearer ${authToken || config.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const url = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${endpoint}`;
    return await fetch(url, options);
  };

  let res = await doFetch(token);

  // If 401 JWT expired, attempt one refresh and retry
  if (res.status === 401 && config.refreshToken) {
    console.log('[WatchMe.log] 401 received, attempting token refresh...');
    const freshToken = await refreshSupabaseToken(config.refreshToken);
    if (freshToken) {
      res = await doFetch(freshToken);
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(errText); } catch {}

    if (res.status === 401 && parsed?.code === 'PGRST303') {
      throw new Error('Token login telah kedaluwarsa. Silakan buka WatchMe.log > Profile dan salin ulang Sync Key Anda.');
    }
    throw new Error(`Supabase error (${res.status}): ${errText}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  return null;
}

// Scrobble Handler
async function handleScrobble(payload) {
  const stored = await new Promise((resolve) => {
    chrome.storage.sync.get(
      ['supabaseUrl', 'supabaseAnonKey', 'userId', 'userEmail', 'accessToken', 'refreshToken'],
      (items) => resolve(items)
    );
  });

  const config = {
    ...DEFAULT_CONFIG,
    ...stored,
    supabaseUrl: DEFAULT_CONFIG.supabaseUrl,
    supabaseAnonKey: DEFAULT_CONFIG.supabaseAnonKey
  };

  if (!config.userId) {
    throw new Error('Ekstensi belum terhubung ke akun WatchMe.log. Buka popup ekstensi dan masukkan User ID Anda.');
  }

  const { showTitle, season, episode, episodeTitle } = payload;
  console.log(`[WatchMe.log Background] Processing scrobble for: "${showTitle}" S${season}E${episode}`);

  // Guard against generic streaming service brand names mistakenly passed as show titles
  const GENERIC_TITLES = ['netflix', 'prime video', 'disney+', 'disney plus', 'apple tv+', 'max', 'hbo', 'crunchyroll', 'vidio', 'viu', 'idlix', 'bstation', 'wetv', 'iqiyi'];
  if (!showTitle || GENERIC_TITLES.includes(showTitle.trim().toLowerCase())) {
    throw new Error(`Judul "${showTitle}" tidak valid atau terdeteksi nama platform.`);
  }

  // 1. Check if user already has this show in tracked_shows
  let trackedShow = null;
  const userShows = await supabaseFetch(`tracked_shows?user_id=eq.${config.userId}&select=*`, 'GET', null, config);

  if (userShows && userShows.length > 0) {
    trackedShow = userShows.find((s) =>
      s.name.toLowerCase().trim() === showTitle.toLowerCase().trim() ||
      s.name.toLowerCase().includes(showTitle.toLowerCase().trim()) ||
      showTitle.toLowerCase().includes(s.name.toLowerCase().trim())
    );
  }

  // 2. If show not found, search TVMaze and add to tracked_shows
  if (!trackedShow) {
    console.log(`[WatchMe.log] Show "${showTitle}" not found in user's library. Fetching from TVMaze...`);
    let tvmazeData = null;
    try {
      const tvmazeRes = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(showTitle)}`);
      if (tvmazeRes.ok) {
        tvmazeData = await tvmazeRes.json();
      }
    } catch (e) {
      console.warn('[WatchMe.log] TVMaze fetch failed:', e);
    }

    const showId = tvmazeData?.id || Math.floor(100000 + Math.random() * 900000);
    const newShowPayload = {
      user_id: config.userId,
      show_id: showId,
      name: tvmazeData?.name || showTitle,
      image_url: tvmazeData?.image?.medium || tvmazeData?.image?.original || null,
      premiered: tvmazeData?.premiered || null,
      ended: tvmazeData?.ended || null,
      status: tvmazeData?.status || null,
      genres: tvmazeData?.genres || [],
      rating: tvmazeData?.rating?.average || null,
      summary: tvmazeData?.summary ? tvmazeData.summary.replace(/<[^>]*>?/gm, '') : null,
      track_status: 'watching',
      source: 'tvmaze'
    };

    const inserted = await supabaseFetch('tracked_shows', 'POST', newShowPayload, config);
    trackedShow = Array.isArray(inserted) ? inserted[0] : inserted;
  } else {
    // If show was in 'watchlist', move it to 'watching'
    if (trackedShow.track_status === 'watchlist') {
      await supabaseFetch(
        `tracked_shows?id=eq.${trackedShow.id}&user_id=eq.${config.userId}`,
        'PATCH',
        { track_status: 'watching' },
        config
      );
    }
  }

  if (!trackedShow || !trackedShow.id) {
    throw new Error('Gagal mencocokkan atau menambahkan show ke WatchMe.log.');
  }

  // 3. Check if episode already recorded
  const existingEpisodes = await supabaseFetch(
    `watched_episodes?user_id=eq.${config.userId}&tracked_show_id=eq.${trackedShow.id}&season=eq.${season}&episode=eq.${episode}&select=*`,
    'GET',
    null,
    config
  );

  if (!existingEpisodes || existingEpisodes.length === 0) {
    // Insert new watched episode
    const episodePayload = {
      user_id: config.userId,
      tracked_show_id: trackedShow.id,
      season: Number(season),
      episode: Number(episode),
      episode_name: episodeTitle || null,
      watched_at: new Date().toISOString()
    };

    await supabaseFetch('watched_episodes', 'POST', episodePayload, config);
    console.log(`[WatchMe.log] Saved watched episode S${season}E${episode} for ${showTitle}`);
  } else {
    console.log(`[WatchMe.log] Episode S${season}E${episode} was already marked as watched.`);
  }

  // 4. Save to Recent Scrobbles in extension local storage
  chrome.storage.local.get(['recentScrobbles'], (res) => {
    const list = res.recentScrobbles || [];
    list.unshift({
      showTitle,
      season,
      episode,
      episodeTitle,
      platform: payload.platform || 'Streaming',
      timestamp: new Date().toISOString()
    });
    chrome.storage.local.set({ recentScrobbles: list.slice(0, 20) });
  });

  // Badge notification on icon
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 4000);

  return {
    success: true,
    show: showTitle,
    season,
    episode
  };
}

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCROBBLE_EPISODE') {
    handleScrobble(request.payload)
      .then((res) => sendResponse(res))
      .catch((err) => {
        console.error('[WatchMe.log Scrobble Error]:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // async response
  }

  if (request.type === 'TEST_CONNECTION') {
    const userId = request.config?.userId;
    if (!userId) {
      sendResponse({ success: false, error: 'User ID tidak boleh kosong' });
      return true;
    }

    const testConfig = {
      ...DEFAULT_CONFIG,
      ...request.config
    };

    supabaseFetch(`tracked_shows?user_id=eq.${userId}&limit=1&select=id`, 'GET', null, testConfig)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === 'SYNC_SESSION_FROM_WEB') {
    const { accessToken, refreshToken, userId, userEmail } = request.payload || {};
    if (userId && accessToken) {
      chrome.storage.sync.set({
        userId,
        accessToken,
        refreshToken: refreshToken || '',
        userEmail: userEmail || ''
      }, () => {
        console.log('[WatchMe.log] Auto-synced auth session from web app for user:', userId);
        sendResponse({ success: true });
      });
      return true;
    }
    sendResponse({ success: false });
    return true;
  }
});
