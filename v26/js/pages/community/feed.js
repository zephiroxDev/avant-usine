import { h, icon } from '../../core/dom.js?v=202611231930';
import { listPosts, postCard, composer, deletePost } from './posts.js?v=202611231930';

export default function feed(body) {
  const list = h('div', { style: { display: 'grid', gap: '14px' } });
  const more = h('button.btn.btn-line', { type: 'button', text: 'Afficher plus', hidden: true, onclick: () => load(true) });
  let offset = 0;
  body.append(
    h('div.row-actions', { style: { marginBottom: '20px' } },
      h('button.btn.btn-main', { type: 'button', onclick: () => composer({ kind: 'story', title: 'Raconter une histoire', after: () => load(false) }) }, icon('plus'), h('span', { text: 'Raconter une histoire' }))),
    list, h('div.row-actions', { style: { marginTop: '20px' } }, more));
  load(false);

  async function load(append) {
    if (!append) { offset = 0; list.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' }))); }
    try {
      const r = await listPosts('story', offset);
      const items = r?.items || [];
      if (!append) list.replaceChildren();
      if (!items.length && !offset) list.append(h('p.empty', { text: 'Aucune histoire pour l’instant. Un souvenir, une anecdote, une référence ? Lance-toi.' }));
      for (const p of items) list.append(postCard(p, { onDelete: (x) => deletePost(x, () => load(false)) }));
      offset += items.length;
      more.hidden = offset >= (r?.total || 0);
    } catch (e) { list.replaceChildren(h('p.empty', { text: e.message })); }
  }
}
