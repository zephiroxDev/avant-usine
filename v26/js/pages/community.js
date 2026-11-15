import { h } from '../core/dom.js';
import { go } from '../router.js';

export const SECTIONS = [
  ['', 'Le fil', 'Histoires et souvenirs autour des morceaux.'],
  ['pepites', 'Pépites', 'Les morceaux préférés et les plus sous-estimés, votés par la communauté.'],
  ['archives', 'Archives', 'Freestyles introuvables, pochettes ou versions perdues : on cherche ensemble.'],
  ['blind-test', 'Blind Test', 'Reconnais le morceau à partir d’un court extrait.'],
  ['membres', 'Membres', 'Les profils de la communauté.'],
  ['messages', 'Messages', 'Tes conversations privées.'],
  ['chronologie', 'Chronologie', 'Les dates de sortie des morceaux, complétées par tous.'],
  ['contribuer', 'Contribuer', 'Paroles, synchronisation, explications.'],
];

export default async function community(page, { section = '' }, query) {
  const entry = SECTIONS.find(([id]) => id === section);
  if (!entry) { go('/communaute', { replace: true }); return; }
  const body = h('section.wrap');
  page.append(
    h('header.wrap.page-head', h('h1.title', { text: section ? entry[1] : 'Communauté' }), h('p.lede', { text: entry[2] })),
    h('div.wrap', h('nav.tablist', { 'aria-label': 'Rubriques de la communauté' },
      SECTIONS.map(([id, label]) => h('a.chip', { href: '#/communaute' + (id ? '/' + id : ''), 'aria-selected': String(id === section), text: label })))),
    body);
  const mod = await import('./community/' + (section || 'feed') + '.js');
  return mod.default(body, query, page);
}
