const assert = require('assert');

function parseSeasonEpisode(str) {
  if (!str) return { season: 1, episode: 1 };

  const sExMatch = str.match(/S(\d+)\s*[:._-]?\s*E(\d+)/i);
  if (sExMatch) {
    return { season: parseInt(sExMatch[1], 10), episode: parseInt(sExMatch[2], 10) };
  }

  const fullMatch = str.match(/(?:Season|Musim|Series|S)\s*(\d+)[^0-9]+(?:Episode|Eps|Ep|E|Babak)\.?\s*(\d+)/i);
  if (fullMatch) {
    return { season: parseInt(fullMatch[1], 10), episode: parseInt(fullMatch[2], 10) };
  }

  let detectedSeason = 1;
  const seasonOnly = str.match(/(?:Season|Musim|Series)\s*(\d+)/i) || str.match(/(\d+)(?:st|nd|rd|th)\s*Season/i);
  if (seasonOnly) {
    detectedSeason = parseInt(seasonOnly[1], 10);
  }

  const epMatch = str.match(/(?:Episode|Eps|Ep|E|#)\.?\s*(\d+)/i) || str.match(/[-–—]\s*(\d{1,4})(?:\s*\[|\s*$|\s*\(|\s*-)/);
  if (epMatch) {
    return { season: detectedSeason, episode: parseInt(epMatch[1], 10) };
  }

  return { season: detectedSeason, episode: 1 };
}

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

  const PLATFORM_NAMES = ['netflix', 'prime video', 'disney+', 'disney plus', 'apple tv+', 'max', 'hbo', 'crunchyroll', 'vidio', 'viu', 'idlix', 'bstation', 'wetv', 'iqiyi'];
  if (PLATFORM_NAMES.includes(cleaned.toLowerCase())) {
    return '';
  }

  return cleaned;
}

// 1. Prime Video subtitle format test
const pv1 = parseSeasonEpisode('Season 1, Ep. 1 Will Ten Years Together End in Marriage or a Breakup?');
assert.strictEqual(pv1.season, 1);
assert.strictEqual(pv1.episode, 1);

const pv2 = parseSeasonEpisode('Season 2, Ep. 5 Another Day');
assert.strictEqual(pv2.season, 2);
assert.strictEqual(pv2.episode, 5);

// 2. Prime Video title cleaner test
const title1 = cleanShowTitle('Prime Video: A Love Other Than Yours');
assert.strictEqual(title1, 'A Love Other Than Yours');

const title2 = cleanShowTitle('Watch A Love Other Than Yours | Prime Video');
assert.strictEqual(title2, 'A Love Other Than Yours');

// 3. IDLIX title & season/episode tests
const idlixTitle = cleanShowTitle('Nonton House of the Dragon Season 2 Episode 3 Subtitle Indonesia - IDLIX');
assert.strictEqual(idlixTitle, 'House of the Dragon');

const idlixEp = parseSeasonEpisode('Nonton House of the Dragon Season 2 Episode 3 Subtitle Indonesia - IDLIX');
assert.strictEqual(idlixEp.season, 2);
assert.strictEqual(idlixEp.episode, 3);

// 4. Platform name filtering tests (prevent "The Netflix Afterparty" bug)
const netflixTitleOnly = cleanShowTitle('Netflix');
assert.strictEqual(netflixTitleOnly, '', 'Bare "Netflix" must be rejected');
const netflixTitleWithTrailer = cleanShowTitle('Watch on Netflix');
assert.strictEqual(netflixTitleWithTrailer, '', 'Bare "Watch on Netflix" must be rejected');

// 4. AES-256-GCM Secure Sync Token Test
const SYNC_SECRET = 'wml_secure_sync_vault_2026';

async function testCrypto() {
  const webCrypto = globalThis.crypto ? globalThis.crypto : require('crypto').webcrypto;
  const enc = new TextEncoder();
  const keyMaterial = await webCrypto.subtle.digest('SHA-256', enc.encode(SYNC_SECRET));
  const encKey = await webCrypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt']);
  const decKey = await webCrypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['decrypt']);

  const payload = { u: 'user_12345', at: 'jwt_access_abc', rt: 'jwt_refresh_xyz', exp: Date.now() + 10000 };
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(payload));
  const encrypted = await webCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, data);

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  const token = `wml_sec_${btoa(binary)}`;
  assert(token.startsWith('wml_sec_'), 'Token format must start with wml_sec_');

  // Decrypt
  const rawBase64 = token.replace(/^wml_sec_/, '');
  const decBinary = atob(rawBase64);
  const bytes = new Uint8Array(decBinary.length);
  for (let i = 0; i < decBinary.length; i++) {
    bytes[i] = decBinary.charCodeAt(i);
  }
  const decIv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const decrypted = await webCrypto.subtle.decrypt({ name: 'AES-GCM', iv: decIv }, decKey, ciphertext);
  const dec = new TextDecoder();
  const parsed = JSON.parse(dec.decode(decrypted));

  assert.strictEqual(parsed.u, payload.u);
  assert.strictEqual(parsed.at, payload.at);
  assert.strictEqual(parsed.rt, payload.rt);
  console.log('AES-256-GCM Secure Sync Token self-check passed!');
}

testCrypto().then(() => {
  console.log('All streaming parser and crypto self-checks passed!');
}).catch((err) => {
  console.error('Crypto test failed:', err);
  process.exit(1);
});
