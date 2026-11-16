import { h, icon } from '../core/dom.js?v=202611162100';
import { on } from '../core/bus.js?v=202611162100';
import * as cat from '../core/catalog.js?v=202611162100';
import { trackRow, markCurrent, addToPlaylist, favButton } from '../ui/track.js?v=202611162100';
import { setQuery } from '../router.js?v=202611162100';
import * as lib from '../core/library.js?v=202611162100';

export default function search(page, _params, query) {
  // ?playlist=<id> : mode « ajouter à cette playlist » (ajout direct, sans redemander).
  const target = query.get('playlist') && lib.playlist(query.get('playlist'));
  const input = h('input.input', { type: 'search', placeholder: 'Titre, invité, volume…', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-label': 'Rechercher un morceau', value: query.get('q') || '' });
  const clear = h('button.icon-btn.clear', { type: 'button', 'aria-label': 'Effacer la recherche', hidden: !input.value, onclick: () => { input.value = ''; run(); input.focus(); } }, icon('close'));
  const count = h('p.result-count', { role: 'status', 'aria-live': 'polite' });
  const results = h('div.tracks');
  const idle = h('div', h('div.section-head', { style: { marginTop: '28px' } }, h('h2', { text: 'Parcourir' })),
    h('div.grid-vol', cat.available().map((v) => h('a.vol', { href: '#/volume/' + v.number },
      h('img.cover', { src: v.cover, alt: '', loading: 'lazy', width: '300', height: '300' }),
      h('div', h('h3', { text: v.title }), h('p', { text: v.tracks.length + ' morceaux' }))))));

  page.append(
    h('header.wrap.page-head',
      target ? h('a.note', { href: '#/playlist/' + target.id, text: '‹ Retour à « ' + target.name + ' »' }) : null,
      h('h1.title', { text: target ? 'Ajouter à « ' + target.name + ' »' : 'Recherche' }),
      h('div.search-field', icon('search'), input, clear)),
    h('section.wrap', count, results, idle));

  let timer = 0;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
  run();
  if (!input.value) setTimeout(() => input.focus({ preventScroll: true }), 50);
  return on('player', () => markCurrent(results));

  function run() {
    const q = input.value.trim();
    clear.hidden = !q;
    if (!target) setQuery(q ? { q } : {}); else setQuery({ playlist: target.id, ...(q ? { q } : {}) });
    idle.hidden = !!q;
    if (!q) { results.replaceChildren(); count.textContent = ''; return; }
    const found = cat.search(q);
    count.textContent = found.length ? found.length + ' résultat' + (found.length > 1 ? 's' : '') : '';
    if (!found.length) { results.replaceChildren(h('p.empty', { text: 'Aucun morceau ne correspond à « ' + q + ' ». Vérifie l’orthographe ou essaie un autre mot.' })); return; }
    results.replaceChildren(...found.slice(0, 120).map((t) => trackRow(t, {
      cover: true, showVolume: true, context: found.map((x) => x.key),
      tools: target
        ? [h('button.icon-btn', { type: 'button', 'aria-label': 'Ajouter à « ' + target.name + ' »', onclick: () => addToPlaylist(t, target.id) }, icon('plus'))]
        : [favButton(t), h('button.icon-btn', { type: 'button', 'aria-label': 'Ajouter à une playlist', onclick: () => addToPlaylist(t) }, icon('plus'))],
    })));
  }
}
