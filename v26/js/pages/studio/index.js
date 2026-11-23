// Studio : outils du créateur et de la modération. Les droits sont vérifiés par le serveur à chaque appel ;
// l'interface ne fait que masquer ce qui n'est pas utile. Un outil n'est chargé qu'à son ouverture.
import { h } from '../../core/dom.js?v=202611231930';
import { account, can } from '../../core/account.js?v=202611231930';
import { on } from '../../core/bus.js?v=202611231930';
import { act } from '../../core/api.js?v=202611231930';

export const TOOLS = [
  // [id, groupe, titre, description, réservé au créateur ?]
  ['synchros', 'À traiter', 'Synchronisations proposées', 'Vérifier, publier ou renvoyer les synchronisations et fichiers reçus.', false],
  ['paroles', 'À traiter', 'Paroles proposées', 'Textes envoyés par les membres.', false],
  ['corrections', 'À traiter', 'Corrections de paroles', 'Corrections des paroles publiques.', false],
  ['signalements', 'À traiter', 'Signalements', 'Commentaires, messages et contenus signalés.', false],
  ['candidatures', 'À traiter', 'Candidatures', 'Membres qui veulent devenir modérateurs.', true],
  ['catalogue', 'Catalogue', 'Volumes et paroles', 'Titres, paroles, liens Genius, brouillons et publication.', true],
  ['audio', 'Catalogue', 'Contrôle audio', 'Doublons et liens Archive.org à vérifier.', true],
  ['avant-premieres', 'Catalogue', 'Avant-premières', 'Codes d’accès anticipé et ouverture au public.', true],
  ['membres', 'Communauté', 'Membres et sanctions', 'Rechercher un membre, suspendre, nommer modérateur.', false],
  ['contenus', 'Communauté', 'Contenus publiés', 'Masquer une explication ou une publication.', false],
  ['journal', 'Communauté', 'Journal de la Chronologie', 'Toutes les modifications de dates.', true],
  ['campagnes', 'Communication', 'Campagnes', 'Nouvelles envoyées par e-mail ou notification.', true],
  ['promo', 'Communication', 'Promotion', 'Affiches et vidéos de chaque version.', true],
  ['tests', 'Communication', 'Versions de test', 'Code d’accès des versions en avant-première.', true],
  ['fermetures', 'Site', 'Fermetures et maintenance', 'Fermer temporairement une fonction avec un message.', true],
  ['visites', 'Site', 'Fréquentation', 'Compteur de visites du site.', true],
];

export default async function studio(page) {
  const head = h('header.wrap.page-head', h('a.note', { href: '#/compte', text: '‹ Mon compte' }), h('h1.title', { text: 'Studio' }));
  const body = h('div.wrap', { style: { display: 'grid', gap: '28px' } });
  page.append(head, body);
  let current = '';
  const paint = () => {
    const me = account();
    if (!me) { body.replaceChildren(h('p.empty', h('a', { href: '#/compte', style: { color: 'var(--accent)', fontWeight: '600' }, text: 'Connecte-toi' }), ' avec un compte créateur ou modérateur.')); return; }
    if (!can('creator') && !can('moderator')) { body.replaceChildren(h('p.empty', { text: 'Le Studio est réservé au créateur et aux modérateurs.' })); return; }
    if (!current) dashboard(); else open(current);
  };
  paint();
  const off = on('account', paint);
  return off;

  function visible() { return TOOLS.filter((t) => can('creator') || !t[4]); }

  async function dashboard() {
    const groups = [...new Set(visible().map((t) => t[1]))];
    const counts = h('div.tiles');
    body.replaceChildren(
      h('section', { style: { display: 'grid', gap: '14px' } }, h('h2', { style: { fontSize: '26px' }, text: 'En attente de ta décision' }), counts),
      ...groups.filter((g) => g !== 'À traiter').map((g) => h('section', { style: { display: 'grid', gap: '14px' } },
        h('h2', { style: { fontSize: '26px' }, text: g }),
        h('div.tiles', visible().filter((t) => t[1] === g).map(([id, , title, text]) => h('button.tile', { type: 'button', onclick: () => open(id) }, h('h3', { text: title }), h('p', { text }))))))
    );
    // Compteurs « à traiter » : chaque source est lue indépendamment, une panne n'empêche pas les autres.
    const pending = visible().filter((t) => t[1] === 'À traiter');
    counts.replaceChildren(...pending.map(([id, , title]) => {
      const n = h('p', { style: { fontFamily: 'var(--display)', fontWeight: '600', fontSize: '34px', lineHeight: '1.1' }, text: '…' });
      count(id).then((c) => { n.textContent = c == null ? '—' : String(c); }).catch(() => { n.textContent = '—'; });
      return h('button.tile', { type: 'button', onclick: () => open(id) }, n, h('p', { text: title }));
    }));
  }

  async function count(id) {
    if (id === 'synchros') { const q = await act('au_sync_moderation', 'queue'); return (q?.sync?.length || 0) + (q?.files?.filter((f) => f.status === 'pending' || f.status === 'received').length || 0); }
    if (id === 'paroles') return ((await act('au_lyrics_v12', 'queue')) || []).filter((r) => r.status === 'pending').length;
    if (id === 'corrections') return ((await act('au_release22', 'proposals')) || []).filter((r) => r.status === 'pending' || !r.status).length;
    if (id === 'signalements') return ((await act('au_moderation_v12', 'reports')) || []).filter((r) => !r.resolved_at && r.status !== 'resolved').length;
    if (id === 'candidatures') return ((await act('au_moderation_v12', 'applications')) || []).filter((r) => r.status === 'pending' || !r.status).length;
    return null;
  }

  async function open(id) {
    current = id;
    const tool = TOOLS.find((t) => t[0] === id);
    const panel = h('div', { style: { display: 'grid', gap: '16px' } }, h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    body.replaceChildren(h('div', { style: { display: 'grid', gap: '18px' } },
      h('button.btn.btn-soft.btn-sm', { type: 'button', style: { justifySelf: 'start' }, text: '‹ Tableau de bord', onclick: () => { current = ''; dashboard(); window.scrollTo(0, 0); } }),
      h('h2', { style: { fontSize: '30px' }, text: tool[2] }), h('p.note', { text: tool[3] }), panel));
    window.scrollTo(0, 0);
    try { const m = await import('./tools.js?v=202611231930'); await m[toolName(id)](panel); }
    catch (e) { panel.replaceChildren(h('p.empty', { text: e.message || 'Outil indisponible.' })); }
  }
}

const toolName = (id) => id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
