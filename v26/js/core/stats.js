// Mesures d'écoute et de jeu (membres connectés uniquement), envoyées par lots à au_stats_record_17v01.
import { rpc } from './api.js?v=202611231900';
import { account } from './account.js?v=202611231900';
import { on } from './bus.js?v=202611231900';
import * as player from './player.js?v=202611231900';
import { app } from './platform.js?v=202611231900';

const queue = [];
let timer = 0;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
// Même plateforme que l'ancien site (Mon année les regroupe ainsi) : appli Windows, site sur téléphone, site sur PC.
const platform = app === 'desktop' || location.protocol === 'avantusine:' ? 'desktop-pc' : matchMedia('(pointer:coarse)').matches ? 'web-mobile' : 'web-pc';
// Session d'écoute : nouvelle après 30 min sans activité (comme l'ancien site).
let sessionId = null;
let lastActivity = 0;
function touchSession() {
  if (!account()) return;
  if (!sessionId || Date.now() - lastActivity > 30 * 60000) { sessionId = uuid(); lastActivity = Date.now(); record('session', {}); }
  lastActivity = Date.now();
}

export function record(kind, details = {}) {
  if (!account()) return;
  queue.push({ id: uuid(), kind, at: new Date().toISOString(), details: { ...details, sessionId, platform } });
  clearTimeout(timer);
  timer = setTimeout(flush, queue.length >= 20 ? 0 : 15000);
}

export async function flush() {
  if (!queue.length || !account()) return;
  const batch = queue.splice(0, 100);
  try { await rpc('au_stats_record_17v01', { p: batch }); } catch { /* mesure perdue : sans conséquence pour l'écoute */ }
}

// Temps d'écoute, au format exigé par le serveur (au_stats_record_17v01) : morceaux de 20 s au plus,
// avec position de début et de fin. L'ancien envoi (un seul total par morceau, souvent > 35 s et sans
// positions) était refusé, et avec lui tout le lot : aucune écoute n'était comptée depuis la v26.
const SEGMENT = 20;
let playback = null;   // { key, volume, id } du morceau en cours
let seg = null;        // début du segment : { pos, wall, rate }
let lastSample = null; // dernier point vu pendant la lecture : { pos, wall }
const audio = player.el;

function emitSegment(to) {
  if (!seg || !playback || !to) { seg = null; return; }
  const wall = (to.wall - seg.wall) / 1000, advance = to.pos - seg.pos, rate = seg.rate || 1;
  const from = seg;
  seg = null;
  // Mêmes garde-fous que l'horloge de l'ancien site : pas de saut, pas de mise en mémoire tampon comptée.
  if (wall <= 0 || wall > 35 || advance <= 0 || advance > wall * rate + 0.5) return;
  const seconds = Math.round(Math.min(wall, advance / rate) * 100) / 100;
  if (seconds <= 0) return;
  touchSession();
  record('listening', {
    trackKey: playback.key, volume: playback.volume, playbackId: playback.id, seconds,
    startPosition: Math.round(from.pos * 100) / 100, endPosition: Math.round(to.pos * 100) / 100,
    duration: Number.isFinite(audio.duration) ? audio.duration : undefined,
  });
}
function endPlayback(completed) {
  emitSegment(lastSample);
  if (playback) record('track_end', { trackKey: playback.key, volume: playback.volume, playbackId: playback.id, completed: !!completed });
  playback = null; lastSample = null;
}
on('time', () => {
  const t = player.current();
  if (!t || t.local || audio.paused || audio.seeking) { emitSegment(lastSample); lastSample = null; return; } // les musiques importées restent privées : rien n'est envoyé
  if (!playback || playback.key !== t.key) {
    if (playback) endPlayback(false);
    playback = { key: t.key, volume: t.volume.number, id: uuid() };
    record('track_start', { trackKey: t.key, volume: t.volume.number, playbackId: playback.id });
  }
  const now = { pos: audio.currentTime, wall: Date.now() };
  if (!seg) seg = { ...now, rate: audio.playbackRate };
  else if ((now.wall - seg.wall) / 1000 >= SEGMENT) { emitSegment(now); seg = { ...now, rate: audio.playbackRate }; }
  lastSample = now;
});
audio.addEventListener('seeking', () => { emitSegment(lastSample); lastSample = null; });
audio.addEventListener('ratechange', () => { emitSegment(lastSample); lastSample = null; });
audio.addEventListener('ended', () => { endPlayback(true); flush(); });
on('player', ({ detail }) => {
  if (detail.type === 'state' && audio.paused) { emitSegment(lastSample); lastSample = null; flush(); }
});
function closeListening() { endPlayback(audio.ended); }
window.addEventListener('pagehide', () => { closeListening(); flush(); });

// Connexion (une fois par chargement et par compte), pages visitées et temps d'utilisation :
// mesures de l'ancien site que la v26 n'envoyait plus (cases vides dans « Mon année »).
let loggedFor = null;
on('account', () => {
  const me = account();
  if (!me) { loggedFor = null; return; }
  if (loggedFor === me.id) return;
  loggedFor = me.id;
  touchSession();
  record('login', {});
});
on('route', ({ detail }) => { if (detail?.tab && detail.tab !== 'notfound') { record('section', { section: detail.tab }); touchSession(); } });
let lastUsage = Date.now();
document.addEventListener('visibilitychange', () => { lastUsage = Date.now(); });
setInterval(() => {
  const now = Date.now(), seconds = Math.round((now - lastUsage) / 100) / 10;
  lastUsage = now;
  if (account() && !document.hidden && seconds > 0 && seconds <= 35) record('usage', { seconds });
}, 20000);
