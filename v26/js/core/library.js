// Favoris et playlists. Même format et mêmes clés que l'ancien site :
// invité → 'au-library-v1', membre → 'au-library-user:<id>' + synchronisation serveur avec révision.
import { store, emit } from './bus.js?v=202611161845';
import { rpc } from './api.js?v=202611161845';
import { track } from './catalog.js?v=202611161845';

let userId = null;
let favorites = new Set();
let playlists = [];
let revision = 0;
let saveTimer = 0;
let saving = null;
let conflict = null;

const keyFor = (id) => (id ? 'au-library-user:' + id : 'au-library-v1');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2));

function clean(source) {
  const fav = Array.isArray(source?.favorites) ? source.favorites.filter((k) => typeof k === 'string') : [];
  const pls = Array.isArray(source?.playlists)
    ? source.playlists
        .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.keys))
        .slice(0, 50)
        .map((p) => ({ id: p.id, name: p.name.slice(0, 80), keys: p.keys.filter((k) => typeof k === 'string').slice(0, 500) }))
    : [];
  return { favorites: fav, playlists: pls };
}

function apply(data) {
  const c = clean(data);
  favorites = new Set(c.favorites);
  playlists = c.playlists;
  emit('library');
}

export const snapshot = () => ({ favorites: [...favorites], playlists: JSON.parse(JSON.stringify(playlists)) });

function persist() {
  store.set(keyFor(userId), snapshot());
  emit('library');
  if (userId) { clearTimeout(saveTimer); saveTimer = setTimeout(push, 700); }
}

export function loadGuest() { userId = null; apply(store.get(keyFor(null), {})); }

/** Connexion d'un membre : récupère la version du compte (le cache local sert pendant le chargement). */
export async function useAccount(id) {
  userId = id;
  const cache = store.get('au-account-cache:' + id);
  if (cache?.library) { apply(cache.library); revision = Number(cache.revision) || 0; }
  else apply(store.get(keyFor(id), {}));
  try {
    const data = await rpc('au_account_library_get');
    if (userId !== id || !data) return;
    revision = Number(data.revision) || 0;
    apply(data.library || {});
    store.set(keyFor(id), snapshot());
    store.set('au-account-cache:' + id, { library: snapshot(), revision, dirty: false });
  } catch { /* hors ligne : la copie locale reste utilisable */ }
}

async function push() {
  if (!userId || saving) return;
  const id = userId;
  const payload = snapshot();
  saving = (async () => {
    try {
      const data = await rpc('au_account_library_save', { p_library: payload, p_revision: revision });
      if (userId !== id) return;
      if (data?.conflict) { conflict = data; emit('library-conflict', data); return; }
      revision = Number(data?.revision) || revision;
      store.set('au-account-cache:' + id, { library: snapshot(), revision, dirty: false });
    } catch { store.set('au-account-cache:' + id, { library: snapshot(), revision, dirty: true }); }
    finally { saving = null; }
  })();
  await saving;
}

/** Résolution d'un conflit entre appareils : garder cet appareil ou la version du compte. */
export async function resolveConflict(keepThisDevice) {
  if (!conflict) return;
  const remote = conflict;
  conflict = null;
  revision = Number(remote.revision) || revision;
  if (!keepThisDevice) apply(remote.library || {});
  persist();
}

/** Restauration d'une sauvegarde : remplace favoris et playlists d'un coup (puis synchronise si connecté). */
export function replaceAll(data) { apply(data); persist(); }

export const isFavorite = (key) => favorites.has(key);
export const favoriteKeys = () => [...favorites].filter((k) => track(k));
export function toggleFavorite(key) {
  if (favorites.has(key)) favorites.delete(key); else favorites.add(key);
  persist();
  return favorites.has(key);
}

export const allPlaylists = () => playlists;
export const playlist = (id) => playlists.find((p) => p.id === id) || null;
export function createPlaylist(name) {
  const p = { id: uid(), name: String(name).trim().slice(0, 80), keys: [] };
  playlists.push(p);
  persist();
  return p;
}
export function renamePlaylist(id, name) { const p = playlist(id); if (p) { p.name = String(name).trim().slice(0, 80); persist(); } }
export function deletePlaylist(id) {
  const i = playlists.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const [removed] = playlists.splice(i, 1);
  persist();
  return { removed, index: i };
}
export function restorePlaylist({ removed, index }) { playlists.splice(Math.min(index, playlists.length), 0, removed); persist(); }
export function addToPlaylist(id, key) { const p = playlist(id); if (!p || p.keys.includes(key)) return false; p.keys.push(key); persist(); return true; }
export function removeFromPlaylist(id, key) { const p = playlist(id); if (!p) return; p.keys = p.keys.filter((k) => k !== key); persist(); }
export function movePlaylistItem(id, from, to) {
  const p = playlist(id); if (!p || to < 0 || to >= p.keys.length) return;
  const [k] = p.keys.splice(from, 1); p.keys.splice(to, 0, k); persist();
}
