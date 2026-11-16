// Musiques importées (« Sur cet appareil ») : fichiers audio personnels gardés sur l'appareil.
// Même base que l'ancien site et les applis (IndexedDB « au-personal-library-18 », version 1,
// tables tracks / albums / playlists, fichiers découpés et vérifiés par SHA-256) :
// les musiques déjà importées dans les applis restent disponibles après le passage à la v26.
// Rien n'est envoyé au serveur.
import { emit } from './bus.js?v=202611161830';
import { registerExtra } from './catalog.js?v=202611161830';

const DB_NAME = 'au-personal-library-18';
const STORES = ['tracks', 'albums', 'playlists'];
const CHUNK = 1024 * 1024;
export const AUDIO_TYPES = '.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,.webm,audio/*';
export const COVER_TYPES = '.jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.m4v,.mov,.webm,image/*,video/*';
const VIDEO_EXT = /\.(mp4|m4v|mov|webm)$/i;

/* ---------- Fichiers « possédés » : découpés en blocs de 1 Mo avec empreinte (format de l'ancien site) ---------- */
const sha = async (bytes) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) => n.toString(16).padStart(2, '0')).join('');
const encoded = new WeakMap();
async function encode(value) {
  if (value instanceof Blob) {
    if (encoded.has(value)) return encoded.get(value);
    const job = (async () => {
      const chunks = [], digests = [];
      for (let offset = 0; offset < value.size; offset += CHUNK) {
        const bytes = await value.slice(offset, offset + CHUNK).arrayBuffer();
        if (bytes.byteLength !== Math.min(CHUNK, value.size - offset)) throw Error('Copie du fichier incomplète.');
        chunks.push(bytes); digests.push(await sha(bytes));
      }
      return { auOwnedBinary: 1, mime: value.type, size: value.size, chunks, digests };
    })();
    encoded.set(value, job);
    try { return await job; } catch (e) { encoded.delete(value); throw e; }
  }
  if (Array.isArray(value)) return Promise.all(value.map(encode));
  if (value && typeof value === 'object') {
    if (value.auOwnedBinary === 1) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await encode(v);
    return out;
  }
  return value;
}
async function decode(value) {
  if (value?.auOwnedBinary === 1) {
    if (!Number.isSafeInteger(value.size) || !Array.isArray(value.chunks) || value.chunks.length !== Math.ceil(value.size / CHUNK)) throw Error('Fichier enregistré incomplet.');
    const blob = new Blob(value.chunks, { type: value.mime || '' });
    encoded.set(blob, Promise.resolve(value));
    return blob;
  }
  if (Array.isArray(value)) return Promise.all(value.map(decode));
  if (value && typeof value === 'object' && !(value instanceof Blob)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await decode(v);
    return out;
  }
  return value;
}

/* ---------- Base ---------- */
let dbPromise = null;
function db() {
  dbPromise ||= new Promise((ok, ko) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); };
    r.onerror = () => ko(r.error || Error('Stockage indisponible sur cet appareil.'));
    r.onsuccess = () => ok(r.result);
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}
async function tx(stores, mode, fn) {
  const base = await db();
  return new Promise((ok, ko) => {
    let t;
    try { t = base.transaction(stores, mode, { durability: mode === 'readwrite' ? 'strict' : 'default' }); } catch { t = base.transaction(stores, mode); }
    let result;
    try { result = fn(t); } catch (e) { t.abort(); ko(e); return; }
    t.oncomplete = () => ok(result);
    t.onerror = t.onabort = () => ko(t.error || Error('L’enregistrement sur l’appareil a échoué.'));
  });
}
async function readAll(name) {
  let req;
  await tx([name], 'readonly', (t) => { req = t.objectStore(name).getAll(); });
  return Promise.all((req.result || []).map(async (v) => {
    try { return await decode(v); } catch {
      const r = { ...v, unavailable: false };
      for (const k of ['blob', 'cover', 'motion']) if (v[k]) { try { r[k] = await decode(v[k]); } catch { r[k] = k === 'blob' ? new Blob([]) : null; if (k === 'blob') r.unavailable = true; } }
      return r;
    }
  }));
}
/** Écritures en file : une seule à la fois, fichiers encodés avant la transaction. */
let queue = Promise.resolve();
function write(ops) {
  const job = queue.then(async () => {
    for (const op of ops) if (op.value !== undefined && op.method === 'put') op.value = await encode(op.value);
    await tx(STORES, 'readwrite', (t) => { for (const op of ops) t.objectStore(op.store)[op.method](op.method === 'delete' ? op.id : op.value); });
    await reload();
  });
  queue = job.catch(() => {});
  return job;
}

/* ---------- État en mémoire + objets « morceau » compatibles avec le lecteur ---------- */
let state = { tracks: [], albums: [], playlists: [] };
let loaded = null;
const urls = new Map(); // blob → URL
const urlOf = (blob) => { if (!blob || !blob.size) return ''; if (!urls.has(blob)) urls.set(blob, URL.createObjectURL(blob)); return urls.get(blob); };
const isVideo = (asset) => !!asset && ((asset.type || '').startsWith('video/') || VIDEO_EXT.test(asset.name || ''));
const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#1f1a17"/><path d="M52 36v38.5a11 11 0 1 0 6 9.8V48l22-6v26.5a11 11 0 1 0 6 9.8V30z" fill="#7e746a"/></svg>');

export function albumOf(id) { return state.albums.find((a) => a.ids?.includes(id)) || null; }
/** Pochette fixe (image) et animée (vidéo) : celles du morceau, sinon celles de son album. */
export function coversOf(record) {
  const a = albumOf(record.id);
  const still = [record.cover, a?.cover].find((x) => x && !isVideo(x)) || null;
  const motion = [record.motion, a?.motion, record.cover, a?.cover].find((x) => x && isVideo(x)) || null;
  return { still: still ? urlOf(still) : PLACEHOLDER, motion: motion ? urlOf(motion) : '' };
}

const objects = new Map();
function toTrack(r) {
  const album = albumOf(r.id);
  const siblings = album ? album.ids : state.tracks.map((t) => t.id);
  const { still, motion } = coversOf(r);
  const label = album?.name || r.album || 'Sur cet appareil';
  const t = {
    key: 'local:' + r.id, id: r.id, local: true,
    number: (siblings.indexOf(r.id) + 1) || 1,
    title: r.title || r.name || 'Sans titre', feat: '', artist: r.artist || '',
    fullTitle: r.title || r.name || '',
    get src() { return urlOf(r.blob); },
    lyricsData: r.lyrics || null, plain: r.plain || '',
    duration: r.duration || 0, unavailable: !!r.unavailable,
    volume: {
      number: null, local: true, label, title: label, cover: still, motion,
      get tracks() { return siblings.map((id) => objects.get('local:' + id)).filter(Boolean); },
    },
  };
  return t;
}
function rebuild() {
  objects.clear();
  for (const r of state.tracks) objects.set('local:' + r.id, toTrack(r));
}
registerExtra((key) => (key.startsWith('local:') ? objects.get(key) || null : null));

async function reload() {
  const [tracks, albums, playlists] = await Promise.all(STORES.map(readAll));
  state = { tracks: tracks.sort((a, b) => (a.order ?? a.created ?? 0) - (b.order ?? b.created ?? 0)), albums, playlists };
  rebuild();
  emit('local');
}
/** Charge la bibliothèque (une seule fois, puis à chaque modification). */
export function ready() { loaded ||= reload().catch((e) => { loaded = null; throw e; }); return loaded; }
export const tracks = () => state.tracks.map((r) => objects.get('local:' + r.id)).filter(Boolean);
export const albums = () => state.albums.filter((a) => a.ids?.length);
export const record = (id) => state.tracks.find((t) => t.id === id) || null;

/* ---------- Infos intégrées aux fichiers (ID3 v2.3/2.4, FLAC, WAV) ---------- */
const dec = new TextDecoder();
const num = (b, p, n) => { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + b[p + i]; return v; };
const unsync = (b, p) => ((b[p] & 127) << 21) | ((b[p + 1] & 127) << 14) | ((b[p + 2] & 127) << 7) | (b[p + 3] & 127);
function tagText(b) {
  if (!b.length) return '';
  if (b[0] === 3) return dec.decode(b.slice(1)).replace(/\0+$/, '');
  if (b[0] === 1 || b[0] === 2) {
    let data = b.slice(1); const little = b[0] === 1 && data[0] === 255;
    if (data[0] === 255 || data[0] === 254) data = data.slice(2);
    return new TextDecoder(little ? 'utf-16le' : 'utf-16be').decode(data).replace(/\0+$/, '');
  }
  return new TextDecoder('iso-8859-1').decode(b.slice(1)).replace(/\0+$/, '');
}
export function readTags(b) {
  const out = {};
  const ids = { TIT2: 'title', TPE1: 'artist', TALB: 'album', TCON: 'genre', TDRC: 'year', TYER: 'year', TRCK: 'track' };
  try {
    if (dec.decode(b.slice(0, 3)) === 'ID3' && [3, 4].includes(b[3])) {
      const end = Math.min(b.length, 10 + unsync(b, 6));
      let p = 10;
      if (b[5] & 64) p += b[3] === 4 ? unsync(b, p) : 4 + num(b, p, 4);
      while (p + 10 <= end) {
        const id = dec.decode(b.slice(p, p + 4)), size = b[3] === 4 ? unsync(b, p + 4) : num(b, p + 4, 4);
        if (!/^[A-Z0-9]{4}$/.test(id) || !size || p + 10 + size > end) break;
        const data = b.slice(p + 10, p + 10 + size);
        if (ids[id] && !(b[p + 9] & 15)) out[ids[id]] = tagText(data);
        if (id === 'APIC' && data[0] === 3) {
          const zero = data.indexOf(0, 1), desc = data.indexOf(0, zero + 2);
          if (zero > 0 && desc > zero) out.cover = new Blob([data.slice(desc + 1)], { type: dec.decode(data.slice(1, zero)) });
        }
        p += 10 + size;
      }
    }
    if (dec.decode(b.slice(0, 4)) === 'fLaC') {
      let p = 4;
      while (p + 4 <= b.length) {
        const type = b[p] & 127, last = b[p] & 128, size = num(b, p + 1, 3), end = p + 4 + size;
        if (end > b.length) break;
        if (type === 4) {
          const d = new DataView(b.buffer, b.byteOffset + p + 4, size); let n = 0;
          const get = () => { const len = d.getUint32(n, true); n += 4; const s = dec.decode(b.slice(p + 4 + n, p + 4 + n + len)); n += len; return s; };
          try { get(); const count = d.getUint32(n, true); n += 4; for (let i = 0; i < count; i++) { const s = get(), k = s.indexOf('='), key = s.slice(0, k).toLowerCase(); if (['title', 'artist', 'album', 'genre', 'date', 'tracknumber'].includes(key)) out[({ date: 'year', tracknumber: 'track' })[key] || key] = s.slice(k + 1); } } catch { /* commentaires illisibles */ }
        }
        if (type === 6) {
          try { let n = p + 8; const l = num(b, n, 4); n += 4; const mime = dec.decode(b.slice(n, n + l)); n += l; const dl = num(b, n, 4); n += 4 + dl + 16; const il = num(b, n, 4); n += 4; if (n + il <= end) out.cover = new Blob([b.slice(n, n + il)], { type: mime }); } catch { /* image illisible */ }
        }
        p = end; if (last) break;
      }
    }
    if (dec.decode(b.slice(0, 4)) === 'RIFF' && dec.decode(b.slice(8, 12)) === 'WAVE') {
      let p = 12; const fields = { INAM: 'title', IART: 'artist', IPRD: 'album', IGNR: 'genre', ICRD: 'year', ITRK: 'track' };
      while (p + 8 <= b.length) {
        const size = new DataView(b.buffer, b.byteOffset + p + 4, 4).getUint32(0, true);
        if (p + 8 + size > b.length) break;
        if (dec.decode(b.slice(p, p + 4)) === 'LIST' && dec.decode(b.slice(p + 8, p + 12)) === 'INFO') {
          let q = p + 12;
          while (q + 8 <= p + 8 + size) { const id = dec.decode(b.slice(q, q + 4)), n = new DataView(b.buffer, b.byteOffset + q + 4, 4).getUint32(0, true); if (q + 8 + n > p + 8 + size) break; if (fields[id]) out[fields[id]] = dec.decode(b.slice(q + 8, q + 8 + n)).replace(/\0+$/, ''); q += 8 + n + (n % 2); }
        }
        p += 8 + size + (size % 2);
      }
    }
  } catch { /* fichier sans infos lisibles : on garde le nom du fichier */ }
  return out;
}

function audioDuration(blob) {
  return new Promise((ok, ko) => {
    const a = new Audio(); const u = URL.createObjectURL(blob);
    const done = (good) => { clearTimeout(timer); a.removeAttribute('src'); a.load(); URL.revokeObjectURL(u); good && Number.isFinite(a.duration) && a.duration > 0 ? ok(a.duration) : ko(Error('« ' + (blob.name || 'Ce fichier') + ' » n’est pas lisible sur cet appareil.')); };
    const timer = setTimeout(() => done(false), 15000);
    a.preload = 'metadata';
    a.onloadedmetadata = () => { const d = a.duration; clearTimeout(timer); URL.revokeObjectURL(u); Number.isFinite(d) && d > 0 ? ok(d) : ko(Error('« ' + (blob.name || 'Ce fichier') + ' » n’est pas lisible sur cet appareil.')); };
    a.onerror = () => done(false);
    a.src = u;
  });
}
const initialNumber = (s) => { const m = String(s || '').match(/^\s*[([]?(\d+)/); return m ? Number(m[1]) : null; };
function stripNumber(title) {
  const text = String(title || '');
  if (!/^\s*[([]?\d/.test(text)) return text;
  const r = text.replace(/^[\s\d\-–—._()[\]]+(?=\p{L})/u, '');
  return r !== text && /^\p{L}/u.test(r) ? r : text;
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

/** Demande au navigateur de ne pas effacer ces fichiers quand l'appareil manque de place. */
export async function persist() {
  try { if (navigator.storage?.persisted && await navigator.storage.persisted()) return true; return !!(await navigator.storage?.persist?.()); } catch { return false; }
}

/** Importe des fichiers audio. Les morceaux d'un même album (d'après leurs infos) sont regroupés. */
export async function importFiles(files, onprogress = () => {}) {
  await ready();
  const list = [...files].filter((f) => f.size > 0 && (/^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|flac|ogg|opus|webm)$/i.test(f.name)));
  if (!list.length) throw Error('Aucun fichier audio dans ta sélection.');
  persist();
  const made = [], failed = [];
  let order = Math.max(0, ...state.tracks.map((t) => t.order ?? 0));
  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    onprogress({ position: i + 1, total: list.length, name: file.name });
    try {
      const length = await audioDuration(file);
      const tags = readTags(new Uint8Array(await file.slice(0, 16 * 1024 * 1024).arrayBuffer()));
      made.push({
        id: uid(), importTrack: tags.track || '', name: file.name, blob: file,
        title: tags.title || file.name.replace(/\.[^.]+$/, ''), artist: tags.artist || '', album: tags.album || '',
        genre: tags.genre || '', year: tags.year || '', duration: length,
        cover: tags.cover && tags.cover.size ? tags.cover : null, motion: null,
        favorite: false, lyrics: null, plain: '', created: Date.now(), order: 0,
      });
    } catch (e) { failed.push({ name: file.name, reason: e.message }); }
  }
  // Ordre : numéro de piste ou numéro en début de nom, sinon ordre de sélection.
  const ranked = made.map((t, index) => ({ t, index, n: initialNumber(t.importTrack) ?? initialNumber(t.name) ?? initialNumber(t.title) }))
    .sort((a, b) => (a.n === null && b.n === null ? a.index - b.index : a.n === null ? 1 : b.n === null ? -1 : a.n - b.n || a.index - b.index))
    .map(({ t }) => ({ ...t, title: stripNumber(t.title), order: ++order }));
  const ops = ranked.map((t) => ({ store: 'tracks', method: 'put', value: t }));
  // Albums : un par nom d'album lu dans les fichiers ; un album existant du même nom est complété.
  const byName = new Map();
  for (const t of ranked) if (t.album.trim()) { const k = t.album.trim(); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(t.id); }
  for (const [name, ids] of byName) {
    const existing = state.albums.find((a) => (a.name || '').trim() === name);
    ops.push({ store: 'albums', method: 'put', value: existing ? { ...existing, ids: [...existing.ids, ...ids] } : { id: uid(), name, ids, cover: null, motion: null } });
  }
  if (ops.length) await write(ops);
  return { added: ranked.length, failed };
}

/** Modifie un morceau (titre, artiste, paroles, pochettes…). */
export function updateTrack(id, patch) {
  const r = record(id);
  if (!r) return Promise.reject(Error('Morceau introuvable.'));
  return write([{ store: 'tracks', method: 'put', value: { ...r, ...patch } }]);
}
/** Pochette d'un morceau : image fixe ou vidéo courte (pochette animée). null pour la retirer. */
export function setCover(id, file) {
  const r = record(id);
  if (!r) return Promise.reject(Error('Morceau introuvable.'));
  if (!file) return updateTrack(id, { cover: null, motion: null });
  return isVideo(file) ? updateTrack(id, { motion: file }) : updateTrack(id, { cover: file });
}
export function setAlbumCover(albumId, file) {
  const a = state.albums.find((x) => x.id === albumId);
  if (!a) return Promise.reject(Error('Album introuvable.'));
  const patch = !file ? { cover: null, motion: null } : isVideo(file) ? { motion: file } : { cover: file };
  return write([{ store: 'albums', method: 'put', value: { ...a, ...patch } }]);
}
/** Supprime des morceaux (et les retire de leurs albums et playlists). */
export function removeTracks(ids) {
  const gone = new Set(ids);
  const ops = ids.map((id) => ({ store: 'tracks', method: 'delete', id }));
  for (const g of state.albums) if (g.ids?.some((x) => gone.has(x))) {
    const rest = g.ids.filter((x) => !gone.has(x));
    ops.push(rest.length ? { store: 'albums', method: 'put', value: { ...g, ids: rest } } : { store: 'albums', method: 'delete', id: g.id });
  }
  for (const p of state.playlists) if (p.ids?.some((x) => gone.has(x))) ops.push({ store: 'playlists', method: 'put', value: { ...p, ids: p.ids.filter((x) => !gone.has(x)) } });
  return write(ops);
}
