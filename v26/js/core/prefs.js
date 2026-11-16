// Préférences locales (animations) + minuteur de sommeil.
import { store, emit } from './bus.js?v=202611161845';
import * as player from './player.js?v=202611161845';

const KEY = 'au26-prefs';
const defaults = { motion: 'on' }; // Mode clair supprimé (demande d'Iloan, 16 nov. 2026) : le site est toujours sombre.
let prefs = { ...defaults, ...(store.get(KEY) || {}) };

export const get = (k) => prefs[k];
export function set(k, v) { prefs[k] = v; store.set(KEY, prefs); apply(); emit('prefs', { key: k, value: v }); }

export function apply() {
  const root = document.documentElement;
  root.dataset.theme = 'dark';
  root.dataset.motion = prefs.motion === 'off' ? 'off' : 'on';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', '#0f0d0c');
}

// Minuteur : arrêt après N minutes, ou à la fin du morceau en cours.
let sleepAt = 0;
let sleepTimer = 0;
let endOfTrack = false;
export function sleepState() { return endOfTrack ? { mode: 'track' } : sleepAt ? { mode: 'time', at: sleepAt } : null; }
export function setSleep(minutes) {
  clearTimeout(sleepTimer); sleepAt = 0; endOfTrack = false;
  if (minutes === 'track') endOfTrack = true;
  else if (minutes > 0) { sleepAt = Date.now() + minutes * 60000; sleepTimer = setTimeout(() => { player.el.pause(); sleepAt = 0; emit('sleep'); }, minutes * 60000); }
  emit('sleep');
}
player.el.addEventListener('ended', () => { if (endOfTrack) { endOfTrack = false; setTimeout(() => player.el.pause(), 0); emit('sleep'); } });

apply();
