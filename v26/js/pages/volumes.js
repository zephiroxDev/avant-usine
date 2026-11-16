import { h } from '../core/dom.js?v=202611161800';
import * as cat from '../core/catalog.js?v=202611161800';

export default function volumes(page) {
  const ready = cat.available();
  const soon = cat.upcoming();
  page.append(
    h('header.wrap.page-head',
      h('h1.title', { text: 'Les volumes' }),
      h('p.lede', { text: `${ready.length} volumes disponibles, ${cat.trackCount()} morceaux. D’autres arrivent.` })),
    h('section.wrap.section', { 'aria-labelledby': 'dispo' },
      h('div.section-head', h('h2#dispo', { text: 'Disponibles' })),
      h('div.grid-vol', ready.map((v) => h('a.vol', { href: '#/volume/' + v.number },
        h('img.cover', { src: v.cover, alt: '', loading: 'lazy', width: '300', height: '300' }),
        h('div', h('h3', { text: v.title }), h('p', { text: v.tracks.length + ' morceaux' })))))),
    soon.length ? h('section.wrap.section', { 'aria-labelledby': 'bientot' },
      h('div.section-head', h('h2#bientot', { text: 'À venir' })),
      h('div.grid-vol', soon.map((v) => h('div.vol.soon', { 'aria-label': v.title + ', bientôt disponible' },
        h('img.cover', { src: v.cover, alt: '', loading: 'lazy', width: '300', height: '300' }),
        h('div', h('h3', { text: v.title }), h('p', h('span.badge', { text: 'Bientôt' }))))))) : null);
}
