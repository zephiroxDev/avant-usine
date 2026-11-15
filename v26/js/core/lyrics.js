// Paroles : texte (au_sync source) et synchronisation publiée (au_sync published).
import { act } from './api.js?v=202611152246';
import { track as catalogTrack } from './catalog.js?v=202611152246';
import { on } from './bus.js?v=202611152246';

// Une connexion ou déconnexion change les paroles accessibles : on vide le cache.
on('account', () => cache.clear());

const cache = new Map(); // clé → Promise<{ lines, synced, times, ends, curves, provenance }>

/** Lignes non chantées : en-tête Genius, [Refrain], [Couplet 1 : JuL]… */
const NOT_SUNG = /^\s*[\[(]\s*(paroles de|refrain|couplet|intro|outro|pont|pr[ée]-?refrain|bridge|hook|chorus|verse|instrumental|interlude|break)\b[^\])]*[\])]\s*$/i;
const BRACKET_ONLY = /^\s*\[[^\]]*\]\s*$/;
export const isSung = (line) => !!line.trim() && !NOT_SUNG.test(line) && !BRACKET_ONLY.test(line);

async function fetchLyrics(key) {
  let published = null;
  try { published = await act('au_sync', 'published', { track: key }); } catch { /* pas de synchronisation */ }
  if (published?.sync_mode === 'highlight' && Array.isArray(published.lines) && published.lines.length) {
    const keep = published.lines.map((l, i) => ({ text: String(l), i })).filter((x) => isSung(x.text));
    return {
      synced: true,
      lines: keep.map((x) => x.text),
      times: keep.map((x) => Number(published.times?.[x.i]) || 0),
      ends: keep.map((x) => Number(published.line_ends?.[x.i]) || null),
      curves: keep.map((x) => published.curves?.[x.i] || null),
      duration: Number(published.duration) || null,
    };
  }
  // Texte sans synchronisation, par ordre de priorité :
  // 1. paroles corrigées (au_release22 'lyrics'), 2. paroles du catalogue, 3. source de l'Atelier (membres confirmés seulement).
  const split = (text) => String(text || '').replace(/\r/g, '').split('\n').filter(isSung);
  try {
    const corrected = await act('au_release22', 'lyrics', { track: key });
    if (corrected?.body?.trim()) return { synced: false, lines: split(corrected.body), provenance: 'paroles corrigées' };
  } catch { /* indisponible */ }
  const t = catalogTrack(key);
  if (t?.lyrics?.trim()) return { synced: false, lines: split(t.lyrics), provenance: 'catalogue' };
  try {
    const source = await act('au_sync', 'source', { track: key });
    const raw = Array.isArray(source?.lines) ? source.lines.map((l) => (typeof l === 'string' ? l : l?.text || '')) : [];
    return { synced: false, lines: raw.filter(isSung), provenance: source?.provenance || '' };
  } catch (e) {
    // Texte réservé aux comptes confirmés : on le dit clairement plutôt que « indisponible ».
    if (/compte/i.test(e.message || '')) return { synced: false, lines: [], membersOnly: true };
    return { synced: false, lines: [] };
  }
}

export function getLyrics(key) {
  if (!cache.has(key)) {
    const p = fetchLyrics(key);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return cache.get(key);
}

/** Position dans la ligne (0 → 1) d'après la courbe [[pourcentage, temps], …]. */
function curveProgress(curve, t, start, end) {
  if (Array.isArray(curve) && curve.length > 1) {
    if (t <= curve[0][1]) return 0;
    for (let i = 1; i < curve.length; i++) {
      const [p1, t1] = curve[i];
      const [p0, t0] = curve[i - 1];
      if (t <= t1) return (p0 + (p1 - p0) * ((t - t0) / Math.max(0.001, t1 - t0))) / 100;
    }
    return Math.min(1, curve[curve.length - 1][0] / 100);
  }
  if (end && end > start) return Math.max(0, Math.min(1, (t - start) / (end - start)));
  return 1;
}

/** Ligne active + avancement, pour un temps donné. */
export function locate(data, t, duration) {
  if (!data?.lines?.length) return { index: -1, progress: 0 };
  if (data.synced) {
    let i = -1;
    for (let k = 0; k < data.times.length; k++) { if (data.times[k] <= t) i = k; else break; }
    if (i < 0) return { index: -1, progress: 0 };
    const end = data.ends[i] ?? data.times[i + 1] ?? (data.times[i] + 4);
    if (t > end + 0.25 && (data.times[i + 1] ?? Infinity) > t + 0.6) return { index: i, progress: 1, done: true };
    return { index: i, progress: curveProgress(data.curves[i], t, data.times[i], end) };
  }
  // Défilement estimé : répartition régulière sur la durée du morceau.
  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (!total) return { index: -1, progress: 0 };
  const per = total / data.lines.length;
  const i = Math.min(data.lines.length - 1, Math.floor(t / per));
  return { index: i, progress: (t - i * per) / per, estimated: true };
}
