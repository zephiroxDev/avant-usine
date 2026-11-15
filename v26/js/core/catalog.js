// Catalogue : version publiée sur le serveur (au_catalog_read), avec repli sur le fichier local du site.
import { rpc } from './api.js';
import { store, emit } from './bus.js';

const CACHE = 'au26-catalog';
let volumes = [];
const byKey = new Map();

/** Les chemins du catalogue sont relatifs à la racine du site (./cover-01.webp) : la v26 vit un dossier plus bas. */
const asset = (p) => (p && p.startsWith('./') ? '../' + p.slice(2) : p || '');

/** "Soleil ( feat.Kalif Hardcore & Soso Maness )" → titre propre + invités séparés. */
function splitTitle(raw) {
  const title = String(raw || '').replace(/\s+/g, ' ').trim();
  const m = /^(.*?)\s*[([]\s*(?:feat\.?|ft\.?)\s*([^)\]]+?)\s*[)\]]\s*$/i.exec(title);
  if (!m) return { title, feat: '' };
  return { title: m[1].trim(), feat: m[2].replace(/\s*&\s*/g, ' & ').replace(/\s+/g, ' ').trim() };
}

function normalise(list) {
  volumes = [];
  byKey.clear();
  for (const raw of list || []) {
    const n = Number(raw.number);
    const vol = {
      number: n,
      label: 'Volume ' + n,
      title: 'Avant l’usine · Vol. ' + n,
      cover: asset(raw.cover || `./cover-${String(n).padStart(2, '0')}.webp`),
      motion: asset(raw.motion || ''),
      zip: raw.zip || '',
      tracks: [],
    };
    for (const t of raw.tracks || []) {
      const { title, feat } = splitTitle(t.title);
      const track = {
        key: n + ':' + t.number,
        number: Number(t.number),
        title, feat,
        fullTitle: t.title,
        artist: t.artist || 'JuL',
        src: t.src,
        filename: t.filename || '',
        genius: t.genius || null,
        lyrics: typeof t.lyrics === 'string' ? t.lyrics : '',
        volume: vol,
      };
      vol.tracks.push(track);
      byKey.set(track.key, track);
    }
    vol.tracks.sort((a, b) => a.number - b.number);
    volumes.push(vol);
  }
  volumes.sort((a, b) => a.number - b.number);
}

async function staticCatalog() {
  // Repli : le fichier historique du site déclare `const COLLECTION = [...]`.
  const text = await fetch('../collection-13v08.js', { cache: 'no-cache' }).then((r) => r.text());
  const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  return JSON.parse(json);
}

/** Affiche tout de suite (mémoire locale ou fichier du site), puis met à jour depuis le serveur en arrière-plan. */
export async function loadCatalog() {
  const cached = store.get(CACHE);
  if (cached?.length) normalise(cached);
  else { try { normalise(await staticCatalog()); } catch { /* le serveur prendra le relais */ } }
  const refresh = rpc('au_catalog_read').then((fresh) => {
    if (!Array.isArray(fresh) || !fresh.length) return;
    const changed = JSON.stringify(fresh) !== JSON.stringify(cached);
    store.set(CACHE, fresh);
    if (changed) { normalise(fresh); fillZips(); emit('catalog'); }
  }).catch(() => {});
  if (!volumes.length) await refresh;
  fillZips();
}

/** Les liens ZIP vérifiés vivent dans le fichier du site : on complète ceux que le serveur ne fournit pas. */
let zipMap = null;
async function fillZips() {
  try {
    zipMap ||= Object.fromEntries((await staticCatalog()).map((v) => [Number(v.number), v.zip || '']));
    let changed = false;
    for (const v of volumes) if (!v.zip && zipMap[v.number]) { v.zip = zipMap[v.number]; changed = true; }
    if (changed) emit('catalog');
  } catch { /* sans ZIP */ }
}

export const allVolumes = () => volumes;
export const available = () => volumes.filter((v) => v.tracks.length);
export const upcoming = () => volumes.filter((v) => !v.tracks.length);
export const volume = (n) => volumes.find((v) => v.number === Number(n)) || null;
export const track = (key) => byKey.get(String(key)) || null;
export const allTracks = () => volumes.flatMap((v) => v.tracks);
export const trackCount = () => byKey.size;

/** Comparaison sans accents ni casse. */
export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

export function search(query) {
  const q = fold(query);
  if (!q) return [];
  const words = q.split(' ');
  return allTracks()
    .map((t) => {
      const hay = fold(t.title + ' ' + t.feat + ' ' + t.volume.label + ' vol ' + t.volume.number);
      if (!words.every((w) => hay.includes(w))) return null;
      const title = fold(t.title);
      const score = title === q ? 0 : title.startsWith(q) ? 1 : title.includes(q) ? 2 : 3;
      return { t, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.t.volume.number - b.t.volume.number || a.t.number - b.t.number)
    .map((x) => x.t);
}
