// Aiguillage par adresse (#/volumes, #/morceau/1:1…). Une seule page vivante à la fois :
// la précédente est retirée du document et ses écouteurs sont libérés.
import { h } from './core/dom.js?v=202611161800';
import { emit } from './core/bus.js?v=202611161800';

const routes = [];      // { re, keys, load, tab }
let host = null;
let cleanup = null;
let generation = 0;

export function route(pattern, load, tab) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ re, keys, load, tab });
}

export function path() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  return { path: p.startsWith('/') ? p : '/' + p, query: new URLSearchParams(q) };
}

export function go(to, { replace = false } = {}) {
  const url = '#' + to;
  if (location.hash === url) return render();
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  render();
}

/** Met à jour la requête (?q=…) sans reconstruire la page. */
export function setQuery(params) {
  const { path: p } = path();
  const q = new URLSearchParams(params).toString();
  history.replaceState(null, '', '#' + p + (q ? '?' + q : ''));
}

// Pages autorisées (applis iPhone/Android : musiques importées uniquement). null = tout est autorisé.
let allowed = null;
export function restrictTo(list, home) { allowed = { list, home }; }

async function render() {
  const { path: p, query } = path();
  if (allowed && !allowed.list.some((a) => (a instanceof RegExp ? a.test(p) : a === p))) { history.replaceState(null, '', '#' + allowed.home); return render(); }
  let match = null; let params = {};
  for (const r of routes) {
    const m = r.re.exec(p);
    if (m) { match = r; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); break; }
  }
  if (!match) { match = routes.find((r) => r.tab === 'notfound'); params = {}; }
  const gen = ++generation;
  try { cleanup?.(); } catch { /* rien */ }
  cleanup = null;
  const page = h('main.page#page', { tabindex: '-1' });
  host.replaceChildren(page);
  emit('route', { path: p, tab: match.tab });
  try {
    const mod = await match.load();
    if (gen !== generation) return;
    const result = await mod.default(page, params, query);
    if (gen !== generation) { result?.(); return; }
    cleanup = typeof result === 'function' ? result : null;
  } catch (err) {
    console.error(err);
    if (gen === generation) page.replaceChildren(h('div.wrap.page-head', h('h1.title', { text: 'Oups.' }), h('p.lede', { text: 'Cette page n’a pas pu s’afficher. Recharge le site ou réessaie dans un instant.' })));
  }
  if (gen === generation) {
    window.scrollTo(0, 0);
    page.focus({ preventScroll: true });
    const h1 = page.querySelector('h1');
    const name = page.dataset.title || h1?.textContent.replace(/\.$/, '') || '';
    document.title = p === '/' || !name ? 'Avant l’usine' : /avant l’usine/i.test(name) ? name : name + ' · Avant l’usine';
  }
}

export function start(el) {
  host = el;
  // popstate couvre Précédent/Suivant et les changements d'adresse ; hashchange seul ferait doublon.
  window.addEventListener('popstate', render);
  render();
}
