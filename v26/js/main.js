// Démarrage d'Avant l'usine 26.
import { h } from './core/dom.js?v=202611162020';
import { loadCatalog } from './core/catalog.js?v=202611162020';
import { initAccount } from './core/account.js?v=202611162020';
import * as player from './core/player.js?v=202611162020';
import './core/stats.js?v=202611162020';
import './core/prefs.js?v=202611162020';
import { route, start, restrictTo } from './router.js?v=202611162020';
import { buildShell } from './ui/shell.js?v=202611162020';
import { localOnly } from './core/platform.js?v=202611162020';
import * as local from './core/local.js?v=202611162020';

// Applis iPhone/iPad et Android : uniquement les musiques importées, leur Blind Test, l'Atelier (dans la page) et les réglages.
if (localOnly) restrictTo(['/ma-musique/sur-cet-appareil', '/communaute/blind-test', '/compte/reglages', '/a-propos/confidentialite'], '/ma-musique/sur-cet-appareil');

route('/', () => import('./pages/home.js?v=202611162020'), 'accueil');
route('/volumes', () => import('./pages/volumes.js?v=202611162020'), 'volumes');
route('/volume/:n', () => import('./pages/volume.js?v=202611162020'), 'volumes');
route('/morceau/:key', () => import('./pages/track.js?v=202611162020'), 'volumes');
route('/recherche', () => import('./pages/search.js?v=202611162020'), 'recherche');
route('/ma-musique', () => import('./pages/music.js?v=202611162020'), 'musique');
route('/ma-musique/:section', () => import('./pages/music.js?v=202611162020'), 'musique');
route('/playlist/:id', () => import('./pages/playlist.js?v=202611162020'), 'musique');
route('/communaute', () => import('./pages/community.js?v=202611162020'), 'communaute');
route('/communaute/:section', () => import('./pages/community.js?v=202611162020'), 'communaute');
route('/compte', () => import('./pages/account.js?v=202611162020'), 'compte');
route('/compte/:section', () => import('./pages/account.js?v=202611162020'), 'compte');
route('/a-propos/:section', () => import('./pages/about.js?v=202611162020'), 'apropos');
route('/introuvable', () => import('./pages/notfound.js?v=202611162020'), 'notfound');

async function boot() {
  const app = document.getElementById('app');
  app.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
  await loadCatalog().catch(() => {});
  // Musiques importées : chargées avant la reprise si le dernier morceau écouté en fait partie.
  const resume = (() => { try { return JSON.parse(localStorage.getItem('au26-resume') || 'null'); } catch { return null; } })();
  if (localOnly || String(resume?.key || '').startsWith('local:')) await local.ready().catch(() => {});
  else local.ready().catch(() => {});
  const shell = buildShell(app);
  window.AU26 = { openPlayer: shell.openPlayer };
  player.restore();
  // Lien de partage (?share=<id>, même format que l'ancien site) : ouvre la page du morceau.
  const shareId = new URLSearchParams(location.search).get('share');
  if (shareId) {
    history.replaceState(null, '', location.pathname + (location.hash || '#/'));
    import('./core/api.js?v=202611162020').then(({ act }) => act('au_track_share_17v06', 'resolve', { id: shareId })).then((s) => {
      if (!s?.track_key) return;
      location.hash = '#/morceau/' + s.track_key;
      if (s.author?.nickname) import('./ui/overlay.js?v=202611162020').then(({ toast }) => toast('Morceau partagé par ' + s.author.nickname + '.'));
    }).catch(() => import('./ui/overlay.js?v=202611162020').then(({ toast }) => toast('Ce lien de partage n’est plus valide.')));
  }
  start(shell.outlet);
  app.removeAttribute('aria-busy');
  initAccount();

  // Fermeture générale décidée dans le Studio : bandeau avec le message du créateur.
  import('./core/api.js?v=202611162020').then(({ act }) => act('au_maintenance_19', 'read')).then((r) => {
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
