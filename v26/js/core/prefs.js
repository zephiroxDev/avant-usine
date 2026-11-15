// Préférences locales (thème, animations) + minuteur de sommeil.
import { store, emit } from './bus.js?v=202611152246';
import * as player from './player.js?v=202611152246';

const KEY = 'au26-prefs';
const defaults = { theme: 'dark', motion: 'on' };
let prefs = { ...defaults, ...(store.get(KEY) || {}) };
// L'ancien site gardait le thème sous 'au-theme' : on le reprend au premier passage.
if (!store.get(KEY)) { try { const old = localStorage.getItem('au-theme'); if (old === 'light' || old === '"light"') prefs.theme = 'light'; } catch { /* rien */ } }

export const get = (k) => prefs[k];
export function set(k, v) { prefs[k] = v; store.set(KEY, prefs); apply(); emit('prefs', { key: k, value: v }); }

export function apply() {
  const root = document.documentElement;
  root.dataset.theme = prefs.theme === 'light' ? 'light' : 'dark';
  root.dataset.motion = prefs.motion === 'off' ? 'off' : 'on';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', prefs.theme === 'light' ? '#f6f1e8' : '#0f0d0c');
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
