import { h, icon } from '../core/dom.js?v=202611231900';
import { on } from '../core/bus.js?v=202611231900';
import * as cat from '../core/catalog.js?v=202611231900';
import * as player from '../core/player.js?v=202611231900';
import { trackRow, markCurrent } from '../ui/track.js?v=202611231900';
import { go } from '../router.js?v=202611231900';

export default function volume(page, { n }) {
  const v = cat.volume(n);
  if (!v || !v.tracks.length) { go('/volumes', { replace: true }); return; }
  const keys = v.tracks.map((t) => t.key);
  const motion = v.motion ? h('video.cover', { src: v.motion, poster: v.cover, muted: true, loop: true, playsinline: true, autoplay: !matchMedia('(prefers-reduced-motion: reduce)').matches, 'aria-hidden': 'true', width: '300', height: '300' }) : h('img.cover', { src: v.cover, alt: '', width: '300', height: '300' });
  if (motion.tagName === 'VIDEO') { motion.muted = true; motion.addEventListener('error', () => motion.replaceWith(h('img.cover', { src: v.cover, alt: '', width: '300', height: '300' }))); }

  const list = h('div.tracks', v.tracks.map((t) => trackRow(t, { context: keys })));
  const zipSlot = h('span', { style: { display: 'contents' } });
  page.append(
    h('header.wrap.vol-head', motion,
      h('div.vol-meta',
        h('p.eyebrow', { text: 'Volume ' + v.number }),
        h('h1.title', { text: v.title }),
        h('p.facts', h('span', { text: 'JuL' }), h('span', { text: v.tracks.length + ' morceaux' })),
        h('div.row-actions',
          h('button.btn.btn-main', { type: 'button', onclick: () => { player.setShuffle(false); player.playList(keys, keys[0]); window.AU26.openPlayer(); } }, icon('play'), h('span', { text: 'Écouter le volume' })),
          h('button.btn.btn-line', { type: 'button', onclick: () => { player.setShuffle(true); player.playList(keys, keys[Math.floor(Math.random() * keys.length)]); window.AU26.openPlayer(); } }, icon('shuffle'), h('span', { text: 'Aléatoire' })),
          zipSlot))),
    h('section.wrap', { 'aria-label': 'Morceaux' }, list));
  paintZip();
  const offs = [on('player', () => markCurrent(list)), on('catalog', paintZip)];
  return () => offs.forEach((f) => f());

  function paintZip() {
    const zip = cat.volume(n)?.zip;
    zipSlot.replaceChildren(zip ? h('a.btn.btn-line', { href: zip, rel: 'noopener' }, icon('download'), h('span', { text: 'Télécharger le volume' })) : '');
  }
}
