// Mesures d'écoute et de jeu (membres connectés uniquement), envoyées par lots à au_stats_record_17v01.
import { rpc } from './api.js?v=202611161800';
import { account } from './account.js?v=202611161800';
import { on } from './bus.js?v=202611161800';
import * as player from './player.js?v=202611161800';

const queue = [];
let timer = 0;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
const sessionId = uuid();

export function record(kind, details = {}) {
  if (!account()) return;
  queue.push({ id: uuid(), kind, at: new Date().toISOString(), details: { ...details, sessionId, platform: 'web' } });
  clearTimeout(timer);
  timer = setTimeout(flush, queue.length >= 20 ? 0 : 15000);
}

export async function flush() {
  if (!queue.length || !account()) return;
  const batch = queue.splice(0, 100);
  try { await rpc('au_stats_record_17v01', { p: batch }); } catch { /* mesure perdue : sans conséquence pour l'écoute */ }
}

// Temps d'écoute : cumulé par morceau, envoyé à chaque changement de morceau ou pause.
let listening = null;
function closeListening() {
  if (!listening) return;
  const seconds = Math.round(listening.seconds);
  if (seconds >= 5) record('listening', { trackKey: listening.key, volume: listening.volume, seconds, playbackId: listening.id });
  listening = null;
}
let last = 0;
on('time', () => {
  const t = player.current();
  if (!t || t.local || player.el.paused) { last = 0; return; } // les musiques importées restent privées : rien n'est envoyé
  const now = performance.now();
  if (!listening || listening.key !== t.key) { closeListening(); listening = { key: t.key, volume: t.volume.number, seconds: 0, id: uuid() }; record('track_start', { trackKey: t.key, volume: t.volume.number, playbackId: listening.id }); }
  if (last) listening.seconds += Math.min(2, (now - last) / 1000);
  last = now;
});
on('player', ({ detail }) => { if (detail.type === 'state' && player.el.paused) { closeListening(); flush(); } });
window.addEventListener('pagehide', () => { closeListening(); flush(); });
