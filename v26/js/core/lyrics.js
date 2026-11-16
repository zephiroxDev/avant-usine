// Paroles : texte (au_sync source) et synchronisation publiée (au_sync published).
import { act } from './api.js?v=202611162100';
import { track as catalogTrack } from './catalog.js?v=202611162100';
import { on } from './bus.js?v=202611162100';

// Une connexion ou déconnexion change les paroles accessibles : on vide le cache.
on('account', () => cache.clear());

const cache = new Map(); // clé → Promise<{ lines, synced, times, ends, curves, provenance }>

/** Lignes non chantées : en-tête Genius, [Refrain], [Couplet 1 : JuL]… */
const NOT_SUNG = /^\s*[\[(]\s*(paroles de|refrain|couplet|intro|outro|pont|pr[ée]-?refrain|bridge|hook|chorus|verse|instrumental|interlude|break)\b[^\])]*[\])]\s*$/i;
const BRACKET_ONLY = /^\s*\[[^\]]*\]\s*$/;
export const isSung = (line) => !!line.trim() && !NOT_SUNG.test(line) && !BRACKET_ONLY.test(line);

/** Musiques importées : paroles gardées sur l'appareil (même format que les synchronisations publiées). */
function localLyrics(t) {
  const data = t.lyricsData;
  if (data && Array.isArray(data.lines) && data.lines.length && Array.isArray(data.times) && data.times.length === data.lines.length) {
    const keep = data.lines.map((l, i) => ({ text: String(l), i })).filter((x) => isSung(x.text));
    const highlight = data.sync_mode === 'highlight' && Array.isArray(data.curves);
    return {
      synced: true,
      lines: keep.map((x) => x.text),
      times: keep.map((x) => Number(data.times[x.i]) || 0),
      ends: keep.map((x) => Number(data.line_ends?.[x.i]) || null),
      curves: keep.map((x) => (highlight ? data.curves[x.i] || null : null)),
      duration: Number(data.duration) || null,
    };
  }
  const text = t.plain || (data?.lines || []).join('\n');
  return { synced: false, lines: String(text || '').replace(/\r/g, '').split('\n').filter(isSung), provenance: 'appareil' };
}

/** Oublie les paroles gardées en mémoire (après une modification dans l'Atelier). */
export const forgetLyrics = (key) => cache.delete(key);

async function fetchLyrics(key) {
  if (key.startsWith('local:')) { const t = catalogTrack(key); return t ? localLyrics(t) : { synced: false, lines: [] }; }
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

/** Sépare les chœurs entre parenthèses (affichés sous la ligne, en plus petit).
 *  Renvoie des morceaux repérés par leur position en lettres dans la ligne complète,
 *  pour que le surlignage lettre par lettre reste juste. */
export function splitBacks(line) {
  const chars = Array.from(line);
  const ranges = [];
  let depth = 0, start = -1;
  chars.forEach((ch, i) => {
    if (ch === '(') { if (depth++ === 0) start = i; }
    else if (ch === ')' && depth && --depth === 0) ranges.push([start, i]);
  });
  const main = [], backs = [];
  let cursor = 0;
  for (const [s, e] of ranges) {
    if (s > cursor) main.push([cursor, s]);
    backs.push([s + 1, e]);
    cursor = e + 1;
  }
  if (cursor < chars.length) main.push([cursor, chars.length]);
  // Nettoyage après retrait des chœurs : espaces doublées, espace restée devant « , » ou « . ».
  // Le repère \u0001 marque la frontière rempli / restant pendant le nettoyage.
  const tidy = (s) => s.replace(/\s+/g, ' ').replace(/ (?=\u0001?[,.…])/g, '').replace(/^ +| +$/g, '');
  const cut = (parts, sep, n) => {
    let s = '', first = true, marked = false;
    for (const [a, b] of parts) {
      const piece = chars.slice(a, b);
      if (!piece.join('').trim()) continue;
      if (!first && sep) { s += sep; } first = false;
      const k = Math.max(0, Math.min(b - a, n - a));
      if (!marked && k < piece.length) { s += piece.slice(0, k).join('') + '\u0001' + piece.slice(k).join(''); marked = true; }
      else s += piece.join('');
    }
    if (!marked) s += '\u0001';
    const [on, off = ''] = tidy(s).split('\u0001');
    return [on, off];
  };
  const whole = (parts, sep) => cut(parts, sep, Infinity)[0];
  return {
    chars, main, backs,
    mainText: ranges.length ? whole(main, '') : line,
    backText: whole(backs, ' · '),
    /** Texte rempli / restant pour n lettres chantées (n compté dans la ligne complète). */
    paint(n) {
      return { main: ranges.length ? cut(main, '', n) : [chars.slice(0, n).join(''), chars.slice(n).join('')], back: cut(backs, ' · ', n) };
    },
  };
}

/** Lettres à afficher, avec leur position dans la ligne complète (pour le surlignage progressif).
 *  main = texte principal, back = chœurs (séparés par « · »). Mêmes règles de nettoyage que splitBacks. */
export function lineLetters(line) {
  const { chars, main, backs } = splitBacks(line);
  const hasBacks = backs.length > 0;
  const collect = (parts, sep) => {
    const out = [];
    for (const [a, b] of parts) {
      const piece = chars.slice(a, b);
      if (!piece.join('').trim()) continue;
      if (out.length && sep) for (const ch of sep) out.push({ ch, i: a });
      for (let k = a; k < b; k++) out.push({ ch: chars[k], i: k });
    }
    // Espaces doublées, espace devant « , . … », espaces au début et à la fin.
    const clean = [];
    for (let k = 0; k < out.length; k++) {
      const c = out[k];
      if (/\s/.test(c.ch)) {
        if (!clean.length || /\s/.test(clean[clean.length - 1].ch)) continue;
        const next = out.slice(k + 1).find((x) => !/\s/.test(x.ch));
        if (!next || /[,.…]/.test(next.ch)) continue;
        clean.push({ ch: ' ', i: c.i });
      } else clean.push(c);
    }
    return clean;
  };
  return { length: chars.length, main: hasBacks ? collect(main, '') : chars.map((ch, i) => ({ ch, i })), back: collect(backs, ' · ') };
}

export function getLyrics(key) {
  if (!cache.has(key)) {
    const p = fetchLyrics(key);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return cache.get(key);
}

/** Position dans la ligne (0 → 1) d'après la courbe [[lettre, temps], …].
 *  La position est un NOMBRE DE LETTRES (0 → longueur de la ligne), comme dans l'Atelier. */
function curveProgress(curve, t, start, end, length) {
  if (Array.isArray(curve) && curve.length > 1) {
    const total = length || curve[curve.length - 1][0] || 1;
    if (t <= curve[0][1]) return 0;
    for (let i = 1; i < curve.length; i++) {
      const [p1, t1] = curve[i];
      const [p0, t0] = curve[i - 1];
      if (t <= t1) return Math.min(1, (p0 + (p1 - p0) * ((t - t0) / Math.max(0.001, t1 - t0))) / total);
    }
    return 1;
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
    const c = data.curves[i];
    const curveEnd = Array.isArray(c) && c.length ? c[c.length - 1][1] : 0;
    const end = Math.max(data.ends[i] || 0, curveEnd) || data.times[i + 1] || (data.times[i] + 4);
    if (t > end + 0.25 && (data.times[i + 1] ?? Infinity) > t + 0.6) return { index: i, progress: 1, done: true };
    return { index: i, progress: curveProgress(data.curves[i], t, data.times[i], end, Array.from(data.lines[i]).length) };
  }
  // Défilement estimé : répartition régulière sur la durée du morceau.
  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (!total) return { index: -1, progress: 0 };
  const per = total / data.lines.length;
  const i = Math.min(data.lines.length - 1, Math.floor(t / per));
  return { index: i, progress: (t - i * per) / per, estimated: true };
}
