import { h, icon } from '../../core/dom.js?v=202611161845';
import { act } from '../../core/api.js?v=202611161845';
import * as cat from '../../core/catalog.js?v=202611161845';
import { account } from '../../core/account.js?v=202611161845';
import { sheet, toast } from '../../ui/overlay.js?v=202611161845';

export function songDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (day) return new Date(+y, +m - 1, +day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (m) return new Date(+y, +m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return y;
}

export default function chronologie(body, query) {
  let dates = new Map();
  const input = h('input.input', { type: 'search', placeholder: 'Chercher un morceau', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Chercher un morceau dans la chronologie' });
  const list = h('div');
  body.append(h('div.search-field', { style: { maxWidth: '480px', marginBottom: '8px' } }, icon('search'), input), list);
  input.addEventListener('input', paint);
  load();

  async function load() {
    list.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    try {
      const rows = (await act('au_repertoire', 'list')) || [];
      dates = new Map(rows.map((r) => [r.track, r]));
      paint();
      const k = query.get('morceau');
      if (k && cat.track(k)) edit(cat.track(k));
    } catch (e) { list.replaceChildren(h('p.empty', { text: e.message })); }
  }

  function paint() {
    const q = cat.fold(input.value);
    const tracks = cat.allTracks().filter((t) => !q || cat.fold(t.title + ' ' + t.feat).includes(q));
    const groups = new Map();
    for (const t of tracks) {
      const d = dates.get(t.key)?.date || '';
      const y = d ? d.slice(0, 4) : 'À dater';
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y).push(t);
    }
    const years = [...groups.keys()].sort((a, b) => (a === 'À dater') - (b === 'À dater') || a.localeCompare(b));
    list.replaceChildren(...years.map((y) => h('section', { style: { marginTop: '24px' } },
      h('h2', { style: { fontSize: '26px', marginBottom: '8px' }, text: y }),
      h('div.tracks', groups.get(y).sort((a, b) => (dates.get(a.key)?.date || '').localeCompare(dates.get(b.key)?.date || '') || a.volume.number - b.volume.number || a.number - b.number).map((t) => {
        const r = dates.get(t.key);
        return h('button.trk.with-cover', { type: 'button', style: { width: '100%' }, onclick: () => edit(t) },
          h('img.trk-cover', { src: t.volume.cover, alt: '', loading: 'lazy', width: '44', height: '44' }),
          h('span.trk-main', h('span.trk-title', { text: t.title }), h('span.trk-sub', { text: r?.date ? songDate(r.date) + (r.nickname ? ' · ajoutée par ' + r.nickname : '') : t.volume.label + ' · date inconnue' })),
          h('span.icon-btn', { 'aria-hidden': 'true' }, icon('edit')));
      })))));
    if (!years.length) list.replaceChildren(h('p.empty', { text: 'Aucun morceau ne correspond.' }));
  }

  function edit(t) {
    const r = dates.get(t.key);
    sheet('Date de « ' + t.title + ' »', async (b, s) => {
      const value = h('input.input', { type: 'text', inputmode: 'numeric', placeholder: 'AAAA, AAAA-MM ou AAAA-MM-JJ', value: r?.date || '', spellcheck: 'false', autocomplete: 'off' });
      const msg = h('p.note', { role: 'status' });
      b.append(h('p', { text: r?.date ? 'Date actuelle : ' + songDate(r.date) + '.' : 'Aucune date pour ce morceau.' }));
      if (account()) {
        b.append(h('form', { style: { display: 'grid', gap: '12px' }, onsubmit: async (e) => {
          e.preventDefault();
          try { await act('au_repertoire', 'set', { track: t.key, date: value.value.trim() }); toast('Date enregistrée.'); s.close(); load(); }
          catch (err) { msg.textContent = err.message; msg.style.color = 'var(--danger)'; }
        } }, h('label.field', h('span', { text: 'Date (année seule, année et mois, ou date complète)' }), value), h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Enregistrer' })), msg));
      } else b.append(h('p.note', h('a', { href: '#/compte', style: { color: 'var(--accent)', fontWeight: '600' }, text: 'Connecte-toi' }), ' pour corriger une date.'));
      const hist = h('div', { style: { display: 'grid', gap: '6px' } });
      b.append(h('h3', { style: { fontSize: '18px', marginTop: '8px' }, text: 'Historique' }), hist);
      try {
        const rows = (await act('au_repertoire', 'history', { track: t.key })) || [];
        hist.replaceChildren(...(rows.length ? rows.map((x) => h('p.note', { text: (x.nickname || 'Membre') + ' : ' + (x.old_date ? songDate(x.old_date) : 'aucune') + ' → ' + (x.new_date ? songDate(x.new_date) : 'aucune') + ' · ' + new Date(x.created_at).toLocaleDateString('fr-FR') })) : [h('p.note', { text: 'Aucune modification.' })]));
      } catch { hist.replaceChildren(h('p.note', { text: 'Historique indisponible.' })); }
    });
  }
}
