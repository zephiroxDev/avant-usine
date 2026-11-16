import { h, icon, clock } from '../core/dom.js?v=202611161830';
import { on } from '../core/bus.js?v=202611161830';
import * as cat from '../core/catalog.js?v=202611161830';
import * as player from '../core/player.js?v=202611161830';
import { go } from '../router.js?v=202611161830';

export default function home(page) {
  const vols = cat.available();
  const first = vols[0]?.tracks[0];

  const hero = h('section.wrap.hero',
    h('div.hero-copy',
      h('p.eyebrow', { text: 'Les premiers sons de JuL' }),
      h('h1.title-lg', 'Avant les albums, ', h('em', { text: 'déjà tout un univers.' })),
      h('p.lede', { text: `${cat.trackCount()} morceaux d’avant l’usine, réunis en ${vols.length} volumes, avec les paroles qui défilent au rythme du chant.` }),
      h('div.row-actions',
        h('button.btn.btn-main', { type: 'button', onclick: () => { const c = player.current(); if (c) { player.toggle(); window.AU26.openPlayer(); } else if (first) { player.playKey(first.key); window.AU26.openPlayer(); } } }, icon('play'), h('span', { text: 'Lancer l’écoute' })),
        h('button.btn.btn-line', { type: 'button', onclick: () => { const all = cat.allTracks(); const t = all[Math.floor(Math.random() * all.length)]; if (t) { player.playKey(t.key); window.AU26.openPlayer(); } } }, icon('shuffle'), h('span', { text: 'Un morceau au hasard' })))));

  const resumeSlot = h('div');
  const paintResume = () => {
    const t = player.current();
    if (!t) { resumeSlot.replaceChildren(); return; }
    const time = player.el.currentTime;
    resumeSlot.replaceChildren(h('section.wrap', { style: { paddingBottom: '8px' } },
      h('div.resume',
        h('img', { src: t.volume.cover, alt: '', width: '64', height: '64' }),
        h('div.trk-main', h('span.note', { text: player.isPlaying() ? 'En cours' : 'Reprendre là où tu t’es arrêté' }), h('span.trk-title', { text: t.title }), h('span.trk-sub', { text: t.volume.label + (time > 1 ? ' · ' + clock(time) : '') })),
        h('button.icon-btn', { type: 'button', style: { background: 'var(--accent)', color: 'var(--accent-ink)' }, 'aria-label': player.isPlaying() ? 'Pause' : 'Reprendre', onclick: player.toggle }, icon(player.isPlaying() ? 'pause' : 'play')))));
  };
  paintResume();
  const off = on('player', paintResume);

  const volumes = h('section.wrap.section',
    h('div.section-head', h('h2', { text: 'Les volumes' }), h('a.more', { href: '#/volumes', text: 'Tout voir' })),
    h('div.grid-vol', vols.map((v) => h('a.vol', { href: '#/volume/' + v.number },
      h('img.cover', { src: v.cover, alt: '', loading: 'lazy', width: '300', height: '300' }),
      h('div', h('h3', { text: v.title }), h('p', { text: v.tracks.length + ' morceaux' }))))));

  const tiles = h('section.wrap.section',
    h('div.tiles',
      tile('Blind Test', 'Reconnais le morceau en quelques secondes d’écoute.', '/communaute/blind-test'),
      tile('Paroles expliquées', 'Les passages commentés par la communauté, morceau par morceau.', '/recherche'),
      tile('Nouveautés du site', 'Tout ce qui a changé, version après version.', '/a-propos/nouveautes')));

  page.append(hero, resumeSlot, volumes, tiles);
  return off;

  function tile(title, text, to) {
    return h('button.tile', { type: 'button', onclick: () => go(to) }, h('h3', { text: title }), h('p', { text }));
  }
}
