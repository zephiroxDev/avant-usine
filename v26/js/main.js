// Démarrage d'Avant l'usine 26.
import { h } from './core/dom.js';
import { loadCatalog } from './core/catalog.js';
import { initAccount } from './core/account.js';
import * as player from './core/player.js';
import './core/stats.js';
import './core/prefs.js';
import { route, start } from './router.js';
import { buildShell } from './ui/shell.js';

route('/', () => import('./pages/home.js'), 'accueil');
route('/volumes', () => import('./pages/volumes.js'), 'volumes');
route('/volume/:n', () => import('./pages/volume.js'), 'volumes');
route('/morceau/:key', () => import('./pages/track.js'), 'volumes');
route('/recherche', () => import('./pages/search.js'), 'recherche');
route('/ma-musique', () => import('./pages/music.js'), 'musique');
route('/ma-musique/:section', () => import('./pages/music.js'), 'musique');
route('/playlist/:id', () => import('./pages/playlist.js'), 'musique');
route('/communaute', () => import('./pages/community.js'), 'communaute');
route('/communaute/:section', () => import('./pages/community.js'), 'communaute');
route('/compte', () => import('./pages/account.js'), 'compte');
route('/compte/:section', () => import('./pages/account.js'), 'compte');
route('/a-propos/:section', () => import('./pages/about.js'), 'apropos');
route('/introuvable', () => import('./pages/notfound.js'), 'notfound');

async function boot() {
  const app = document.getElementById('app');
  app.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
  await loadCatalog().catch(() => {});
  const shell = buildShell(app);
  window.AU26 = { openPlayer: shell.openPlayer };
  player.restore();
  // Lien de partage (?share=<id>, même format que l'ancien site) : ouvre la page du morceau.
  const shareId = new URLSearchParams(location.search).get('share');
  if (shareId) {
    history.replaceState(null, '', location.pathname + (location.hash || '#/'));
    import('./core/api.js').then(({ act }) => act('au_track_share_17v06', 'resolve', { id: shareId })).then((s) => {
      if (!s?.track_key) return;
      location.hash = '#/morceau/' + s.track_key;
      if (s.author?.nickname) import('./ui/overlay.js').then(({ toast }) => toast('Morceau partagé par ' + s.author.nickname + '.'));
    }).catch(() => import('./ui/overlay.js').then(({ toast }) => toast('Ce lien de partage n’est plus valide.')));
  }
  start(shell.outlet);
  app.removeAttribute('aria-busy');
  initAccount();

  // Fermeture générale décidée dans le Studio : bandeau avec le message du créateur.
  import('./core/api.js').then(({ act }) => act('au_maintenance_19', 'read')).then((r) => {
    const all = r?.settings?.all;
    if (all?.closed) app.prepend(h('div', { role: 'status', style: { background: 'var(--accent)', color: 'var(--accent-ink)', padding: '12px var(--gutter)', fontWeight: '600', textAlign: 'center' }, text: all.message }));
  }).catch(() => {});

  // Raccourcis clavier (hors champs de saisie).
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); player.toggle(); }
    else if (e.key === 'ArrowRight' && e.shiftKey) player.next();
    else if (e.key === 'ArrowLeft' && e.shiftKey) player.prev();
    else if (e.key === '/') { e.preventDefault(); location.hash = '#/recherche'; }
  });
}

boot();
