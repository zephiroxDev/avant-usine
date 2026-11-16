import { h, icon } from '../../core/dom.js?v=202611162100';
import { rpc } from '../../core/api.js?v=202611162100';
import { visitorToken } from '../../core/visitor.js?v=202611162100';
import * as cat from '../../core/catalog.js?v=202611162100';
import { toast } from '../../ui/overlay.js?v=202611162100';
import * as player from '../../core/player.js?v=202611162100';

export default function pepites(body) {
  let data = [];
  let mode = 'favorite';
  const tabs = h('div.row-actions', { role: 'tablist', style: { marginBottom: '8px' } });
  const list = h('div.tracks');
  body.append(h('p.note', { style: { marginBottom: '16px' }, text: 'Vote pour tes morceaux préférés et ceux qui méritent plus d’attention. Tu peux changer d’avis à tout moment.' }), tabs, list);
  paintTabs();
  load();

  function paintTabs() {
    tabs.replaceChildren(...[['favorite', 'Les préférés'], ['underrated', 'Les sous-estimés']].map(([id, label]) =>
      h('button.chip', { type: 'button', role: 'tab', 'aria-selected': String(mode === id), text: label, onclick: () => { mode = id; paintTabs(); paint(); } })));
  }

  async function load() {
    list.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    try { data = (await rpc('au_discovery_rankings', { p_token: visitorToken() })) || []; paint(); }
    catch (e) { list.replaceChildren(h('p.empty', { text: e.message })); }
  }

  function paint() {
    const count = mode === 'favorite' ? 'favorites' : 'underrated';
    const mine = mode === 'favorite' ? 'my_favorite' : 'my_underrated';
    const rows = data.map((r) => ({ r, t: cat.track(r.track_key) })).filter((x) => x.t)
      .sort((a, b) => (b.r[count] - a.r[count]) || (a.t.volume.number - b.t.volume.number) || (a.t.number - b.t.number));
    const keys = rows.map((x) => x.t.key);
    list.replaceChildren(...rows.map(({ r, t }, i) => {
      const vote = h('button.btn.btn-sm' + (r[mine] ? '.btn-main' : '.btn-line'), { type: 'button', 'aria-pressed': String(!!r[mine]), 'aria-label': (r[mine] ? 'Retirer mon vote pour ' : 'Voter pour ') + t.title, onclick: () => toggle(r, t) },
        icon(r[mine] ? 'heartFill' : 'heart'), h('span', { text: String(r[count]) }));
      return h('div.trk.with-cover', { dataset: { key: t.key } },
        h('img.trk-cover', { src: t.volume.cover, alt: '', loading: 'lazy', width: '44', height: '44' }),
        h('button.trk-main', { type: 'button', onclick: () => player.playKey(t.key, keys) }, h('span.trk-title', { text: (i + 1) + '. ' + t.title }), h('span.trk-sub', { text: t.volume.label })),
        vote);
    }));
  }

  async function toggle(r, t) {
    const category = mode;
    const active = !(category === 'favorite' ? r.my_favorite : r.my_underrated);
    try {
      const res = await rpc('au_discovery_vote', { p_token: visitorToken(), p_track_key: t.key, p_category: category, p_active: active });
      Object.assign(r, res);
      paint();
      toast(active ? 'Vote enregistré.' : 'Vote retiré.');
    } catch (e) { toast(e.message); }
  }
}
