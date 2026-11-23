import { h, icon } from '../core/dom.js?v=202611231930';
import { on } from '../core/bus.js?v=202611231930';
import * as cat from '../core/catalog.js?v=202611231930';
import * as lib from '../core/library.js?v=202611231930';
import * as player from '../core/player.js?v=202611231930';
import { account } from '../core/account.js?v=202611231930';
import { trackRow, markCurrent } from '../ui/track.js?v=202611231930';
import { sheet, toast } from '../ui/overlay.js?v=202611231930';
import { go } from '../router.js?v=202611231930';
import { localOnly } from '../core/platform.js?v=202611231930';

const SECTIONS = [
  ['favoris', 'Favoris'],
  ['playlists', 'Playlists'],
  ['mon-annee', 'Mon année'],
  ['sur-cet-appareil', 'Sur cet appareil'],
];

export default function music(page, { section = 'favoris' }) {
  if (!SECTIONS.some(([id]) => id === section)) { go('/ma-musique', { replace: true }); return; }
  const me = account();
  const body = h('section.wrap');
  page.append(
    h('header.wrap.page-head',
      h('h1.title', { text: localOnly ? 'Mes musiques' : 'Ma musique' }),
      h('p.lede', { text: localOnly ? 'Tes musiques importées restent sur ce téléphone.' : me ? 'Tes favoris et tes playlists te suivent sur tous tes appareils.' : 'Tes favoris et tes playlists sont gardés sur cet appareil. Connecte-toi pour les retrouver partout.' })),
    h('div.wrap.music-tabs', h('div.tablist', { role: 'tablist', 'aria-label': 'Ma musique' },
      SECTIONS.map(([id, label]) => h('a.chip', { href: '#/ma-musique' + (id === 'favoris' ? '' : '/' + id), role: 'tab', 'aria-selected': String(id === section), text: label })))),
    body);

  const paint = () => {
    if (section === 'favoris') return paintFavorites();
    if (section === 'playlists') return paintPlaylists();
    if (section === 'mon-annee') return import('./my-year.js?v=202611231930').then((m) => m.default(body));
    if (section === 'sur-cet-appareil') {
      // Musiques importées, puis (hors applis téléphone) « Emporter un volume ».
      const mine = h('div');
      const take = h('div', { style: { marginTop: '40px', paddingTop: '28px', borderTop: '1px solid var(--line)' } });
      body.replaceChildren(mine, localOnly ? '' : take);
      import('./imported.js?v=202611231930').then((m) => { const off = m.default(mine); offs.push(off); });
      if (!localOnly) import('./device.js?v=202611231930').then((m) => { const off = m.default(take); offs.push(off); });
      return;
    }
  };
  const offs = [];
  paint();
  offs.push(on('library', () => { if (section === 'favoris' || section === 'playlists') paint(); }), on('player', () => markCurrent(body)));
  return () => offs.forEach((f) => f?.());

  function paintFavorites() {
    const keys = lib.favoriteKeys();
    if (!keys.length) {
      body.replaceChildren(h('p.empty', { text: 'Aucun favori pour l’instant. Touche le cœur à côté d’un morceau pour le retrouver ici.' }));
      return;
    }
    body.replaceChildren(
      h('div.row-actions', { style: { marginBottom: '16px' } },
        h('button.btn.btn-main', { type: 'button', onclick: () => { player.setShuffle(false); player.playList(keys, keys[0]); window.AU26.openPlayer(); } }, icon('play'), h('span', { text: 'Tout écouter' })),
        h('button.btn.btn-line', { type: 'button', onclick: () => { player.setShuffle(true); player.playList(keys, keys[Math.floor(Math.random() * keys.length)]); window.AU26.openPlayer(); } }, icon('shuffle'), h('span', { text: 'Aléatoire' }))),
      h('p.result-count', { text: keys.length + ' morceau' + (keys.length > 1 ? 'x' : '') }),
      h('div.tracks', keys.map((k) => trackRow(cat.track(k), { cover: true, showVolume: true, context: keys }))));
  }

  function paintPlaylists() {
    const list = lib.allPlaylists();
    const create = h('button.btn.btn-main', { type: 'button', onclick: newPlaylist }, icon('plus'), h('span', { text: 'Nouvelle playlist' }));
    body.replaceChildren(
      h('div.row-actions', { style: { marginBottom: '16px' } }, create),
      list.length
        ? h('div.tracks', list.map((p) => {
            const first = cat.track(p.keys[0]);
            return h('a.trk.with-cover', { href: '#/playlist/' + p.id },
              first ? h('img.trk-cover', { src: first.volume.cover, alt: '', width: '44', height: '44' }) : h('span.trk-cover', { style: { background: 'var(--surface)', display: 'grid', placeItems: 'center' } }, icon('library')),
              h('span.trk-main', h('span.trk-title', { text: p.name }), h('span.trk-sub', { text: p.keys.length + ' morceau' + (p.keys.length > 1 ? 'x' : '') })),
              h('span.icon-btn', { 'aria-hidden': 'true' }, icon('next')));
          }))
        : h('p.empty', { text: 'Aucune playlist. Crée la première, puis ajoute des morceaux avec le bouton +.' }));
  }

  function newPlaylist() {
    sheet('Nouvelle playlist', (b, s) => {
      const input = h('input.input', { type: 'text', maxlength: '80', placeholder: 'Ex. : Mes sons de l’été', autocomplete: 'off', spellcheck: 'false' });
      b.append(h('form.field', { onsubmit: (e) => { e.preventDefault(); const name = input.value.trim(); if (!name) { input.focus(); return; } const p = lib.createPlaylist(name); s.close(); if (!p) { toast('Tu as déjà ' + lib.MAX_PLAYLISTS + ' playlists : supprimes-en une pour en créer une nouvelle.'); return; } toast('Playlist créée.'); go('/playlist/' + p.id); } },
        h('label.field', h('span', { text: 'Nom' }), input),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Créer' }))));
    });
  }
}
