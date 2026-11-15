import { h } from '../core/dom.js';

export default function notfound(page) {
  page.append(h('div.wrap.page-head',
    h('h1.title', { text: 'Page introuvable' }),
    h('p.lede', { text: 'Ce lien ne mène nulle part, ou la page a changé d’adresse avec la nouvelle version du site.' }),
    h('div.row-actions', h('a.btn.btn-main', { href: '#/', text: 'Retour à l’accueil' }), h('a.btn.btn-line', { href: '#/recherche', text: 'Chercher un morceau' }))));
}
