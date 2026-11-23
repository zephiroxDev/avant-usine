// Ligne de morceau réutilisée partout + actions communes (favori, playlist).
import { h, icon } from '../core/dom.js?v=202611231900';
import * as player from '../core/player.js?v=202611231900';
import * as lib from '../core/library.js?v=202611231900';
import { sheet, toast } from './overlay.js?v=202611231900';
import { go } from '../router.js?v=202611231900';

export function favButton(t, cls = '.icon-btn') {
  const b = h('button' + cls, { type: 'button' });
  const paint = () => {
    const on = lib.isFavorite(t.key);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Ajouter aux favoris');
    b.replaceChildren(icon(on ? 'heartFill' : 'heart'));
  };
  b.addEventListener('click', (e) => { e.stopPropagation(); const on = lib.toggleFavorite(t.key); paint(); toast(on ? 'Ajouté aux favoris.' : 'Retiré des favoris.'); });
  paint();
  return b;
}

/** Choix de playlist ; `preferred` = playlist d'où l'on vient (ajout direct sans redemander). */
export function addToPlaylist(t, preferred) {
  if (preferred && lib.playlist(preferred)) {
    const ok = lib.addToPlaylist(preferred, t.key);
    toast(ok ? `Ajouté à « ${lib.playlist(preferred).name} ».` : `Déjà dans « ${lib.playlist(preferred).name} ».`);
    return;
  }
  sheet('Ajouter à une playlist', (body, s) => {
    body.append(h('p.note', { text: t.title }));
    for (const p of lib.allPlaylists()) {
      const has = p.keys.includes(t.key);
      body.append(h('button.choice', { type: 'button', disabled: has, onclick: () => { lib.addToPlaylist(p.id, t.key); s.close(); toast(`Ajouté à « ${p.name} ».`); } },
        h('span', { text: p.name }), h('small', { text: has ? 'Déjà dedans' : p.keys.length + ' morceau' + (p.keys.length > 1 ? 'x' : '') })));
    }
    const input = h('input.input', { type: 'text', maxlength: '80', placeholder: 'Nom de la playlist', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Nom de la nouvelle playlist' });
    const form = h('form.field', { onsubmit: (e) => { e.preventDefault(); const name = input.value.trim(); if (!name) { input.focus(); return; } const p = lib.createPlaylist(name); s.close(); if (!p) { toast('Tu as déjà ' + lib.MAX_PLAYLISTS + ' playlists : supprimes-en une pour en créer une nouvelle.'); return; } lib.addToPlaylist(p.id, t.key); toast(`Playlist « ${p.name} » créée.`); } },
      h('span', { text: 'Nouvelle playlist' }), input, h('button.btn.btn-main', { type: 'submit', text: 'Créer et ajouter' }));
    body.append(form);
  });
}

/**
 * Ligne de morceau.
 * opts : { context: [clés], cover: bool, number: 'track'|'none', tools: [éléments], sub: texte }
 */
export function trackRow(t, opts = {}) {
  const isCurrent = () => player.current()?.key === t.key;
  const subText = opts.sub ?? [t.feat ? 'feat. ' + t.feat : '', opts.showVolume ? t.volume.label + ', piste ' + t.number : ''].filter(Boolean).join(' · ');
  const main = h('button.trk-main', { type: 'button', 'aria-label': 'Écouter ' + t.title, onclick: () => player.playKey(t.key, opts.context) },
    h('span.trk-title', { text: t.title }),
    subText ? h('span.trk-sub', { text: subText }) : null);
  const lead = opts.cover
    ? h('img.trk-cover', { src: t.volume.cover, alt: '', loading: 'lazy', width: '44', height: '44' })
    : h('span.trk-n', { text: String(t.number) });
  const more = h('button.icon-btn', { type: 'button', 'aria-label': 'Voir la page du morceau', onclick: () => go('/morceau/' + t.key) }, icon('more'));
  const tools = h('span.trk-tools', opts.tools || [favButton(t), more]);
  const row = h('div.trk' + (opts.cover ? '.with-cover' : ''), { dataset: { key: t.key } }, lead, main, tools);
  row.classList.toggle('is-current', isCurrent());
  return row;
}

/** Met à jour l'état « en cours » de toutes les lignes affichées. */
export function markCurrent(root = document) {
  const key = player.current()?.key;
  for (const r of root.querySelectorAll('.trk')) r.classList.toggle('is-current', r.dataset.key === key);
}
