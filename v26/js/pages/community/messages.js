import { h, icon } from '../../core/dom.js?v=202611161800';
import { act } from '../../core/api.js?v=202611161800';
import { account } from '../../core/account.js?v=202611161800';
import { on } from '../../core/bus.js?v=202611161800';
import { toast, confirm } from '../../ui/overlay.js?v=202611161800';
import { avatarOf, openProfile } from './membres.js?v=202611161800';
import { go, setQuery } from '../../router.js?v=202611161800';

const when = (iso) => { try { const d = new Date(iso); const today = new Date().toDateString() === d.toDateString(); return today ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch { return ''; } };

export default function messages(body, query) {
  let poll = 0;
  paint();
  const off = on('account', paint);
  return () => { off(); clearInterval(poll); };

  function paint() {
    clearInterval(poll);
    if (!account()) { body.replaceChildren(h('p.empty', h('a', { href: '#/compte', style: { color: 'var(--accent)', fontWeight: '600' }, text: 'Connecte-toi' }), ' pour lire et envoyer des messages privés.')); return; }
    const peer = query.get('avec');
    if (peer) return thread(peer);
    inbox();
  }

  async function inbox() {
    body.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    try {
      const rows = (await act('au_social', 'inbox')) || [];
      body.replaceChildren(
        h('div.row-actions', { style: { marginBottom: '18px' } }, h('a.btn.btn-main', { href: '#/communaute/membres' }, icon('plus'), h('span', { text: 'Nouvelle conversation' })), h('button.btn.btn-line', { type: 'button', text: 'Comptes bloqués', onclick: blocked })),
        rows.length ? h('div', { style: { display: 'grid', gap: '8px', maxWidth: '720px' } }, rows.map((r) => h('a.choice', { href: '#/communaute/messages?avec=' + r.peer, style: { justifyContent: 'flex-start', gap: '14px', minHeight: '72px' } },
          avatarOf(r.profile),
          h('span', { style: { display: 'grid', minWidth: '0', flex: '1', textAlign: 'left' } },
            h('span', { style: { display: 'flex', justifyContent: 'space-between', gap: '12px' } }, h('span', { text: r.profile?.nickname || 'Membre' }), h('small', { text: when(r.created_at) })),
            h('small', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: r.unread ? '700' : '400', color: r.unread ? 'var(--ink)' : '' }, text: r.body })),
          r.unread ? h('span.badge.badge-accent', { text: String(r.unread) }) : null)))
          : h('p.empty', { text: 'Aucune conversation. Ouvre le profil d’un membre pour lui écrire.' }));
    } catch (e) { body.replaceChildren(h('p.empty', { text: e.message })); }
  }

  async function thread(peer) {
    body.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    let data;
    try { data = await act('au_social', 'thread', { peer }); } catch (e) { body.replaceChildren(h('p.empty', { text: e.message })); return; }
    const me = account().id;
    const list = h('div', { style: { display: 'grid', gap: '10px', padding: '8px 0 16px' }, role: 'log', 'aria-live': 'polite' });
    const paintItems = (items) => {
      list.replaceChildren(...items.map((m) => h('div', { style: { justifySelf: m.sender === me ? 'end' : 'start', maxWidth: 'min(80%,520px)', padding: '10px 14px', borderRadius: '16px', background: m.sender === me ? 'var(--accent)' : 'var(--surface)', color: m.sender === me ? 'var(--accent-ink)' : 'var(--ink)' } },
        h('p', { style: { whiteSpace: 'pre-line' }, text: m.body }), h('p', { style: { fontSize: '12px', opacity: '.75', marginTop: '4px', textAlign: 'right' }, text: when(m.created_at) }))));
      if (!items.length) list.replaceChildren(h('p.note', { text: 'Commence la conversation.' }));
      const last = items.at(-1);
      if (last && last.sender !== me) act('au_social', 'read', { peer, id: last.id }).catch(() => {});
    };
    paintItems(data.items || []);
    const input = h('textarea.input', { maxlength: '2000', rows: '2', style: { minHeight: '56px' }, placeholder: 'Écris ton message', 'aria-label': 'Message' });
    const send = h('button.btn.btn-main', { type: 'submit', text: 'Envoyer' });
    const form = h('form', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }, onsubmit: async (e) => {
      e.preventDefault(); const text = input.value.trim(); if (!text) return;
      send.disabled = true;
      try { await act('au_social', 'send', { peer, body: text }); input.value = ''; refresh(); } catch (err) { toast(err.message); }
      send.disabled = false; input.focus();
    } }, input, send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    const p = data.profile || {};
    body.replaceChildren(h('div', { style: { maxWidth: '720px', display: 'grid', gap: '12px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
        h('a.btn.btn-soft.btn-sm', { href: '#/communaute/messages', text: '‹ Conversations' }),
        h('button', { type: 'button', style: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }, onclick: () => openProfile(peer) }, avatarOf(p, 36), h('span', { text: p.nickname || 'Membre' })),
        h('button.btn.btn-soft.btn-sm', { type: 'button', style: { marginLeft: 'auto' }, text: data.blocked ? 'Débloquer' : 'Bloquer', onclick: () => toggleBlock(peer, !data.blocked) })),
      list,
      data.can_send ? form : h('p.note', { text: data.blocked ? 'Tu as bloqué ce membre.' : 'Ce membre ne reçoit pas de messages pour le moment.' })));
    list.lastElementChild?.scrollIntoView({ block: 'end' });
    clearInterval(poll);
    poll = setInterval(refresh, 15000);
    async function refresh() { try { const d = await act('au_social', 'thread', { peer }); paintItems(d.items || []); list.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch { /* réessaie au prochain tour */ } }
  }

  async function toggleBlock(peer, blockIt) {
    if (blockIt && !(await confirm('Bloquer ce membre ?', 'Vous ne pourrez plus vous écrire. Tu pourras le débloquer à tout moment.', { ok: 'Bloquer', danger: true }))) return;
    try { await act('au_social', 'block', { peer, blocked: blockIt }); toast(blockIt ? 'Membre bloqué.' : 'Membre débloqué.'); thread(peer); } catch (e) { toast(e.message); }
  }

  async function blocked() {
    try {
      const rows = (await act('au_social', 'blocked')) || [];
      const { sheet } = await import('../../ui/overlay.js?v=202611161800');
      sheet('Comptes bloqués', (b, s) => {
        if (!rows.length) b.append(h('p.empty', { text: 'Tu n’as bloqué personne.' }));
        for (const p of rows) b.append(h('div.choice', h('span', { text: p.nickname || 'Membre' }), h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Débloquer', onclick: async () => { try { await act('au_social', 'block', { peer: p.id, blocked: false }); toast('Membre débloqué.'); s.close(); } catch (e) { toast(e.message); } } })));
      });
    } catch (e) { toast(e.message); }
  }
  void go; void setQuery;
}
