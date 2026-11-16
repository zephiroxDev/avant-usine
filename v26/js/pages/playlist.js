import { h, icon } from '../core/dom.js?v=202611162020';
import { on } from '../core/bus.js?v=202611162020';
import * as cat from '../core/catalog.js?v=202611162020';
import * as lib from '../core/library.js?v=202611162020';
import * as player from '../core/player.js?v=202611162020';
import { trackRow, markCurrent } from '../ui/track.js?v=202611162020';
import { sheet, toast } from '../ui/overlay.js?v=202611162020';
import { go } from '../router.js?v=202611162020';

export default function playlistPage(page, { id }) {
  const head = h('header.wrap.page-head');
  const list = h('section.wrap');
  page.append(head, list);
  paint();
  const offs = [on('library', paint), on('player', () => markCurrent(list))];
  return () => offs.forEach((f) => f());

  function paint() {
    const p = lib.playlist(id);
    if (!p) { go('/ma-musique/playlists', { replace: true }); return; }
    const keys = p.keys.filter((k) => cat.track(k));
    head.replaceChildren(
      h('a.note', { href: '#/ma-musique/playlists', text: '‹ Mes playlists' }),
      h('h1.title', { text: p.name }),
      h('p.facts', h('span', { text: keys.length + ' morceau' + (keys.length > 1 ? 'x' : '') })),
      h('div.row-actions',
        h('button.btn.btn-main', { type: 'button', disabled: !keys.length, onclick: () => { player.setShuffle(false); player.playList(keys, keys[0]); window.AU26.openPlayer(); } }, icon('play'), h('span', { text: 'Écouter' })),
        h('a.btn.btn-line', { href: '#/recherche?playlist=' + p.id }, icon('plus'), h('span', { text: 'Ajouter des morceaux' })),
        h('button.btn.btn-line', { type: 'button', onclick: rename }, icon('edit'), h('span', { text: 'Renommer' })),
        h('button.btn.btn-danger', { type: 'button', onclick: remove }, icon('trash'), h('span', { text: 'Supprimer' }))));
    if (!keys.length) { list.replaceChildren(h('p.empty', { text: 'Cette playlist est vide. Ajoute des morceaux pour commencer.' })); return; }
    list.replaceChildren(h('div.tracks', keys.map((k, i) => trackRow(cat.track(k), {
      cover: true, showVolume: true, context: keys,
      tools: [
        keys.length > 1 ? h('button.icon-btn', { type: 'button', 'aria-label': 'Monter', disabled: i === 0, style: { opacity: i === 0 ? '.3' : '' }, onclick: () => lib.movePlaylistItem(p.id, i, i - 1) }, icon('up')) : null,
        keys.length > 1 ? h('button.icon-btn', { type: 'button', 'aria-label': 'Descendre', disabled: i === keys.length - 1, style: { opacity: i === keys.length - 1 ? '.3' : '' }, onclick: () => lib.movePlaylistItem(p.id, i, i + 1) }, icon('down')) : null,
        h('button.icon-btn', { type: 'button', 'aria-label': 'Retirer de la playlist', onclick: () => { lib.removeFromPlaylist(p.id, k); toast('Morceau retiré.', { label: 'Annuler', run: () => { lib.addToPlaylist(p.id, k); lib.movePlaylistItem(p.id, lib.playlist(p.id).keys.length - 1, i); } }); } }, icon('close')),
      ].filter(Boolean),
    }))));
  }

  function rename() {
    const p = lib.playlist(id);
    sheet('Renommer la playlist', (b, s) => {
      const input = h('input.input', { type: 'text', maxlength: '80', value: p.name, autocomplete: 'off', spellcheck: 'false' });
      b.append(h('form.field', { onsubmit: (e) => { e.preventDefault(); const name = input.value.trim(); if (!name) { input.focus(); return; } lib.renamePlaylist(id, name); s.close(); toast('Playlist renommée.'); } },
        h('label.field', h('span', { text: 'Nom' }), input),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Enregistrer' }))));
    });
  }

  function remove() {
    const removed = lib.deletePlaylist(id);
    if (!removed) return;
    go('/ma-musique/playlists', { replace: true });
    toast(`Playlist « ${removed.removed.name} » supprimée.`, { label: 'Annuler', run: () => { lib.restorePlaylist(removed); go('/playlist/' + id); } });
  }
}
