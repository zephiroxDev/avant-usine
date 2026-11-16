// Moteur de lecture unique : un seul élément audio pour tout le site.
import { emit, store } from './bus.js?v=202611161830';
import { track as findTrack } from './catalog.js?v=202611161830';

const audio = new Audio();
audio.preload = 'metadata';

const RESUME = 'au26-resume';
let queue = [];        // clés de morceaux
let index = -1;
let shuffle = false;
let repeat = 'off';    // off | all | one
let order = [];        // ordre aléatoire
let lastSave = 0;

export const el = audio;
export const current = () => (index >= 0 ? findTrack(queue[index]) : null);
export const isPlaying = () => !audio.paused && !audio.ended;
export const state = () => ({ shuffle, repeat, queue: [...queue], index });

function remember() {
  const t = current();
  if (t) store.set(RESUME, { key: t.key, time: Math.floor(audio.currentTime || 0), queue, index });
}

function shuffled(n, first) {
  const a = [...Array(n).keys()].filter((i) => i !== first);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return first >= 0 ? [first, ...a] : a;
}

function load(i, { autoplay = true, at = 0 } = {}) {
  index = i;
  const t = current();
  if (!t) return;
  audio.src = t.src;
  if (at > 0) audio.addEventListener('loadedmetadata', () => { audio.currentTime = Math.min(at, (audio.duration || at + 1) - 1); }, { once: true });
  if (autoplay) audio.play().catch(() => emit('player', { type: 'blocked' }));
  mediaSession(t);
  remember();
  emit('player', { type: 'track', track: t });
}

/** Lance une liste à partir d'un morceau. */
export function playList(keys, startKey) {
  queue = keys.filter((k) => findTrack(k));
  if (!queue.length) return;
  const start = Math.max(0, queue.indexOf(startKey));
  order = shuffle ? shuffled(queue.length, start) : [];
  load(start);
}

export function playKey(key, context) {
  const t = findTrack(key);
  if (!t) return;
  playList(context?.length ? context : t.volume.tracks.map((x) => x.key), key);
}

export function toggle() {
  if (!current()) return;
  if (audio.paused) audio.play().catch(() => emit('player', { type: 'blocked' })); else audio.pause();
}

function step(dir) {
  if (!queue.length) return;
  if (shuffle) {
    const pos = order.indexOf(index) + dir;
    if (pos >= 0 && pos < order.length) return load(order[pos]);
    if (repeat === 'all') { order = shuffled(queue.length, -1); return load(order[dir > 0 ? 0 : order.length - 1]); }
    return;
  }
  const next = index + dir;
  if (next >= 0 && next < queue.length) return load(next);
  if (repeat === 'all') return load((next + queue.length) % queue.length);
}

export const next = () => step(1);
/** Précédent : revient au début si plus de 3 secondes ont été écoutées. */
export function prev() {
  if (audio.currentTime > 3 || (!shuffle && index === 0 && repeat !== 'all')) { audio.currentTime = 0; return; }
  step(-1);
}

export function seek(seconds) {
  if (Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration - 0.2, seconds));
}

export function setShuffle(on) {
  shuffle = !!on;
  order = shuffle ? shuffled(queue.length, index) : [];
  emit('player', { type: 'mode' });
}
export function cycleRepeat() {
  repeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
  audio.loop = repeat === 'one';
  emit('player', { type: 'mode' });
  return repeat;
}

/** File d'attente visible : à partir du morceau en cours. */
export function upcoming() {
  if (!queue.length) return [];
  const seq = shuffle ? order.slice(order.indexOf(index)) : queue.map((_, i) => i).slice(index);
  return seq.map((i) => ({ i, t: findTrack(queue[i]) })).filter((x) => x.t);
}
export const jump = (i) => load(i);

/** Reprise : remet le dernier morceau en place sans le lancer. */
export function restore() {
  const r = store.get(RESUME) || store.get('au-resume-v1');
  const key = r?.key;
  if (!key || !findTrack(key)) return null;
  const keys = Array.isArray(r.queue) && r.queue.includes(key) ? r.queue : findTrack(key).volume.tracks.map((t) => t.key);
  queue = keys.filter((k) => findTrack(k));
  load(queue.indexOf(key), { autoplay: false, at: Number(r.time) || 0 });
  return { track: findTrack(key), time: Number(r.time) || 0 };
}

function mediaSession(t) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title + (t.feat ? ' (feat. ' + t.feat + ')' : ''),
    artist: t.artist,
    album: t.volume.title,
    artwork: [{ src: new URL(t.volume.cover, location.href).href, sizes: '512x512', type: 'image/webp' }],
  });
}
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => audio.play());
  ms.setActionHandler('pause', () => audio.pause());
  ms.setActionHandler('previoustrack', prev);
  ms.setActionHandler('nexttrack', next);
  try { ms.setActionHandler('seekto', (d) => seek(d.seekTime)); } catch { /* non pris en charge */ }
}

audio.addEventListener('play', () => emit('player', { type: 'state' }));
audio.addEventListener('pause', () => { remember(); emit('player', { type: 'state' }); });
audio.addEventListener('ended', () => { if (repeat !== 'one') next(); });
audio.addEventListener('timeupdate', () => {
  emit('time', audio.currentTime);
  const now = Date.now();
  if (now - lastSave > 5000) { lastSave = now; remember(); }
});
audio.addEventListener('durationchange', () => emit('time', audio.currentTime));
audio.addEventListener('error', () => { if (audio.src) emit('player', { type: 'error' }); });
window.addEventListener('pagehide', remember);
