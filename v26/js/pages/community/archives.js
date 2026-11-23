import { h, icon } from '../../core/dom.js?v=202611231900';
import { listPosts, postCard, composer, deletePost } from './posts.js?v=202611231900';

export default function archives(body) {
  const list = h('div', { style: { display: 'grid', gap: '14px' } });
  body.append(
    h('div.row-actions', { style: { marginBottom: '20px' } },
      h('button.btn.btn-main', { type: 'button', onclick: () => composer({ kind: 'wanted', title: 'Lancer une recherche', withSource: true, after: load }) }, icon('search'), h('span', { text: 'Lancer une recherche' })),
      h('button.btn.btn-line', { type: 'button', onclick: () => composer({ kind: 'report', title: 'Signaler un problème', withTrack: true, after: load }) }, h('span', { text: 'Signaler un problème' }))),
    list);
  load();

  async function load() {
    list.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    try {
      const r = await listPosts('archive');
      const items = r?.items || [];
      const wanted = items.filter((p) => p.kind === 'wanted');
      const answers = items.filter((p) => p.kind === 'contribution');
      list.replaceChildren();
      if (!wanted.length) { list.append(h('p.empty', { text: 'Aucune recherche en cours. Il te manque un freestyle, une pochette ou une version ? Lance une recherche.' })); return; }
      for (const w of wanted) {
        const replies = answers.filter((a) => a.parent_id === w.id);
        list.append(h('div', { style: { display: 'grid', gap: '10px' } },
          postCard(w, { onReply: (p) => composer({ kind: 'contribution', title: 'Proposer une piste', parent: p.id, withTrack: false, withSource: true, after: load }), onDelete: (x) => deletePost(x, load) }),
          replies.length ? h('div', { style: { display: 'grid', gap: '10px', marginLeft: 'clamp(12px,4vw,40px)' } }, replies.map((a) => postCard(a, { onDelete: (x) => deletePost(x, load) }))) : null));
      }
    } catch (e) { list.replaceChildren(h('p.empty', { text: e.message })); }
  }
}
