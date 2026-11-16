import { h, icon } from '../../core/dom.js?v=202611162020';
import { act } from '../../core/api.js?v=202611162020';
import { account } from '../../core/account.js?v=202611162020';
import { sheet } from '../../ui/overlay.js?v=202611162020';
import { go } from '../../router.js?v=202611162020';

export function avatarOf(p, size = 44) {
  const s = { width: size + 'px', height: size + 'px', flex: 'none' };
  return p?.avatar ? h('img.avatar', { src: p.avatar, alt: '', style: s }) : h('span.avatar', { style: s, text: (p?.nickname || '?').slice(0, 1).toUpperCase() });
}

export function openProfile(id) {
  sheet('Profil', async (body) => {
    body.append(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    try {
      const p = await act('au_social', 'profile', { id });
      const roles = [p.creator && 'Créateur', p.moderator && 'Modérateur'].filter(Boolean);
      body.replaceChildren(
        h('div', { style: { display: 'flex', gap: '16px', alignItems: 'center' } }, avatarOf(p, 72),
          h('div', { style: { display: 'grid', gap: '4px' } }, h('h3', { style: { fontSize: '24px' }, text: p.nickname || 'Membre' }),
            roles.length ? h('p', roles.map((r) => h('span.badge.badge-accent', { style: { marginRight: '6px' }, text: r }))) : null,
            p.state === 'online' ? h('p.note', { style: { color: 'var(--ok)' }, text: 'En ligne' }) : null)),
        p.bio ? h('p', { style: { whiteSpace: 'pre-line' }, text: p.bio }) : h('p.note', { text: 'Pas encore de présentation.' }),
        account() && account().id !== p.id ? h('div.row-actions', h('button.btn.btn-main', { type: 'button', text: 'Envoyer un message', onclick: () => go('/communaute/messages?avec=' + p.id) })) : null);
    } catch (e) { body.replaceChildren(h('p.empty', { text: e.message })); }
  });
}

export default function membres(body) {
  const input = h('input.input', { type: 'search', placeholder: 'Chercher un pseudo', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Chercher un membre' });
  const list = h('div', { style: { display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,260px),1fr))' } });
  body.append(h('div.search-field', { style: { maxWidth: '480px', marginBottom: '20px' } }, icon('search'), input), list);
  let timer = 0;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
  load();

  async function load() {
    try {
      const members = await act('au_social', 'members', { query: input.value.trim() });
      list.replaceChildren(...(members || []).map((p) => h('button.choice', { type: 'button', style: { justifyContent: 'flex-start', gap: '12px', minHeight: '64px' }, onclick: () => openProfile(p.id) },
        avatarOf(p), h('span', { style: { display: 'grid', textAlign: 'left', minWidth: '0' } }, h('span', { text: p.nickname || 'Membre' }), h('small', { text: [p.creator && 'Créateur', p.moderator && 'Modérateur', p.state === 'online' && 'En ligne'].filter(Boolean).join(' · ') || 'Membre' })))));
      if (!members?.length) list.replaceChildren(h('p.empty', { text: 'Aucun membre trouvé.' }));
    } catch (e) { list.replaceChildren(h('p.empty', { text: account() ? e.message : 'Connecte-toi pour voir les membres de la communauté.' })); }
  }
}
