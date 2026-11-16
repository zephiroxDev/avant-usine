// Pages « À propos » : guide, nouveautés, applications, soutenir, confidentialité.
import { h, icon } from '../core/dom.js?v=202611161830';
import { go } from '../router.js?v=202611161830';
import { toast, sheet } from '../ui/overlay.js?v=202611161830';

const PAGES = {
  guide: ['Guide', guide],
  nouveautes: ['Nouveautés', nouveautes],
  applications: ['Applications', applications],
  soutenir: ['Soutenir Avant l’usine', soutenir],
  confidentialite: ['Confidentialité', confidentialite],
};

export default function about(page, { section }) {
  const entry = PAGES[section];
  if (!entry) { go('/introuvable', { replace: true }); return; }
  const body = h('div.wrap', { style: { display: 'grid', gap: '24px', maxWidth: '820px' } });
  page.append(h('header.wrap.page-head', h('h1.title', { text: entry[0] })), body);
  return entry[1](body);
}

/* ---------- Guide ----------
   La phrase cachée : un mot par carte, dans une phrase volontairement un peu décalée.
   Ne jamais modifier les mots-indices ni leur ordre (voir AGENTS.md : conserver la zone initiale de l'indice). */
const SECRET = 'Appuie 7 fois sur le bouton Mon compte et tu deviendras peut être modérateur.'.split(' ');
const GUIDE = [
  ['Écouter', 'Dans Volumes, ouvre un volume et touche un morceau. Le lecteur reste en bas de l’écran pendant que tu navigues.', ['Choisis un morceau. ', 'Appuie', ' ensuite sur Lecture pour commencer.']],
  ['Commandes', 'Dans le lecteur : lecture/pause, précédent/suivant, position, aléatoire et répétition. Sur ordinateur, Espace met en pause et Maj + flèches change de morceau ; les touches multimédia fonctionnent aussi.', ['Pour une écoute de ', '7', ' minutes comme pour une longue session, les commandes restent disponibles.']],
  ['Ma musique', 'Le cœur ajoute un favori, le + ajoute à une playlist. Sans compte, tes choix restent sur cet appareil ; avec un compte, ils te suivent partout.', ['Tu peux retrouver tes morceaux favoris autant de ', 'fois', ' que tu le souhaites.']],
  ['Immersion', 'Dans les applications, le mode Immersion affiche la pochette d’un côté et les paroles de l’autre.', ['L’immersion reste accessible ', 'sur', ' la page, sans imposer le plein écran.']],
  ['Paroles', 'Dans le lecteur, l’onglet Paroles affiche le texte. S’il est synchronisé, chaque phrase s’éclaire au rythme du chant ; sinon, le défilement est estimé et le lecteur le signale.', ['Ouvre ', 'le', ' texte pendant l’écoute pour retrouver le passage chanté.']],
  ['Lire à ton rythme', 'Fais défiler les paroles pour les lire librement, puis touche une phrase synchronisée pour y sauter.', ['Le ', 'bouton', ' de suivi permet de reprendre le défilement après une pause manuelle.']],
  ['Compte', 'Ton avatar, en haut à droite, ouvre ton compte : connexion, profil, réglages et sauvegarde.', ['Les options de connexion sont regroupées dans « ', 'Mon', ' compte ».']],
  ['Profil', 'Personnalise ton pseudo, ton avatar, ta bannière et ta présentation. Les autres membres peuvent consulter ton profil et t’écrire.', ['Les réglages de ton ', 'compte', ' accompagnent la présentation de ton profil.']],
  ['Messages', 'Les messages privés sont réservés aux membres connectés. Tu peux bloquer un membre ou refuser les messages.', ['Choisis tes préférences de réception ', 'et', ' respecte celles des autres membres.']],
  ['Contribuer', 'Dans Communauté › Contribuer : écris ou corrige des paroles, explique un passage, envoie un fichier ou synchronise un morceau.', ['Avant d’envoyer une proposition, ', 'tu', ' peux relire les paroles et vérifier le résultat.']],
  ['Synchroniser', 'Lance le morceau, maintiens la barre au début de chaque phrase et fais-la glisser au rythme des mots. Ralentis la musique si besoin.', ['En reprenant les passages difficiles, tu ', 'deviendras', ' plus à l’aise avec les outils de synchronisation.']],
  ['Corrections', 'Une synchronisation publique peut être corrigée ; la nouvelle version est vérifiée avant de remplacer l’ancienne.', ['Une correction ', 'peut', ' améliorer une publication après vérification.']],
  ['Communauté', 'Raconte une histoire, vote pour tes pépites, aide à retrouver des archives, date les morceaux dans la Chronologie.', ['Les échanges doivent ', 'être', ' respectueux et rester liés aux morceaux.']],
  ['Équipe', 'Les modérateurs vérifient les contributions avant leur publication. Chaque action importante est tracée.', ['Une proposition peut être vérifiée par un ', 'modérateur.', '']],
];
const REST = [
  ['Sur cet appareil', 'Dans Ma musique › Sur cet appareil, prépare un volume complet à emporter : chaque morceau avec son titre, sa pochette et ses paroles synchronisées. Garde l’onglet ouvert jusqu’au téléchargement.'],
  ['Mon année', 'Ton temps d’écoute, tes morceaux préférés, tes résumés et tes trophées, mois par mois ou sur l’année.'],
  ['Blind Test', 'Trois niveaux : 10 secondes, 5 secondes ou une seule note. « Je ne sais pas » compte comme une erreur ; un extrait illisible peut être passé sans compter.'],
  ['Sauvegarde', 'Dans Mon compte › Sauvegarde, télécharge un fichier avec tes favoris et tes playlists pour les retrouver sur un autre appareil.'],
  ['Animations', 'Animations activées ou réduites : ça se règle dans Mon compte › Réglages.'],
];

function guide(body) {
  const rest = h('div', { hidden: true, style: { display: 'grid', gap: '14px' } }, REST.map(([t, p]) => h('article.tile', h('h3', { text: t }), h('p', { text: p }))));
  const more = h('button.btn.btn-line', { type: 'button', 'aria-expanded': 'false', text: 'Lire le reste', onclick: () => { rest.hidden = !rest.hidden; more.textContent = rest.hidden ? 'Lire le reste' : 'Masquer la suite'; more.setAttribute('aria-expanded', String(!rest.hidden)); } });
  body.append(
    h('p.lede', { text: 'Tout ce que le site propose, et comment en profiter.' }),
    h('div', { style: { display: 'grid', gap: '14px' } }, GUIDE.map(([title, text, [before, clue, after]], i) => {
      if (clue !== SECRET[i]) throw new Error('Indice incomplet');
      return h('article.tile', h('h3', { text: title }), h('p', text + ' ' + before, h('span.au-guide-clue', { text: clue }), after));
    })),
    h('div.row-actions', more), rest);
}

/* ---------- Nouveautés ---------- */
const PLATFORMS = [['web-pc', 'Site sur ordinateur'], ['web-mobile', 'Site sur téléphone'], ['ios', 'iPhone et iPad'], ['desktop-pc', 'Windows'], ['android', 'Android (en pause)'], ['ps4', 'PS4 (en pause)']];
async function nouveautes(body) {
  body.append(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
  if (!window.AU_PLATFORM_HISTORIES) await new Promise((ok) => { const s = document.createElement('script'); s.src = '../histories-17v01.js'; s.onload = ok; s.onerror = ok; document.head.append(s); });
  const data = window.AU_PLATFORM_HISTORIES || {};
  let current = 'web-pc';
  const tabs = h('div.tablist', { role: 'tablist', 'aria-label': 'Plateforme' });
  const list = h('div', { style: { display: 'grid', gap: '14px' } });
  body.replaceChildren(h('p.lede', { text: 'Chaque plateforme a son propre historique de versions.' }), tabs, list);
  paint();
  function paint() {
    tabs.replaceChildren(...PLATFORMS.map(([id, label]) => h('button.chip', { type: 'button', role: 'tab', 'aria-selected': String(id === current), text: label, onclick: () => { current = id; paint(); } })));
    const rows = data[current] || [];
    list.replaceChildren(...(rows.length ? rows.slice(0, 40).map(([version, date, summary, points]) => h('article.tile',
      h('p.note', { text: date }), h('h3', { text: version + (summary ? ' · ' + summary.replace(/\.$/, '') : '') }),
      Array.isArray(points) && points.length ? h('ul', { style: { display: 'grid', gap: '6px', paddingLeft: '20px', listStyle: 'disc' } }, points.map((p) => h('li', { text: p }))) : null))
      : [h('p.empty', { text: 'Aucun historique pour cette plateforme.' })]));
  }
}

/* ---------- Applications ---------- */
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
async function applications(body) {
  const win = h('div.tile', h('h3', { text: 'Windows' }), h('p.note', { text: 'Recherche de la dernière version…' }));
  const ios = h('div.tile', h('h3', { text: 'iPhone et iPad' }), h('p.note', { text: 'Recherche de la dernière version…' }));
  const tests = h('div');
  body.append(
    h('p.lede', { text: 'Avant l’usine existe aussi en application, avec l’import de tes propres fichiers et le mode Immersion.' }),
    h('div.tiles', win, ios), tests,
    h('div.tile', h('h3', { text: 'Android et PS4' }), h('p', { text: 'Ces deux versions sont en pause pour le moment. Tes données et ton compte sont conservés.' })));
  let releases = [];
  try { releases = await fetch('https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=40').then((r) => (r.ok ? r.json() : [])); } catch { /* hors ligne */ }
  const live = releases.filter((r) => !r.draft);
  const w = live.filter((r) => /^v\d/.test(r.tag_name)).sort((a, b) => cmp(b.tag_name.slice(1), a.tag_name.slice(1)))[0];
  const i = live.filter((r) => /^ios-v\d/.test(r.tag_name)).sort((a, b) => cmp(b.tag_name.slice(5), a.tag_name.slice(5)))[0];
  const asset = (r, re) => r?.assets?.find((a) => re.test(a.name) && a.state === 'uploaded');
  const mb = (n) => Math.round(n / 1e6) + ' Mo';
  win.replaceChildren(h('h3', { text: 'Windows' }), w ? h('p.note', { text: 'Version ' + w.tag_name.slice(1) }) : h('p.note', { text: 'Version indisponible pour le moment.' }),
    h('div.row-actions',
      asset(w, /Installation.*\.exe$/) ? h('a.btn.btn-main.btn-sm', { href: asset(w, /Installation.*\.exe$/).browser_download_url }, icon('download'), h('span', { text: 'Installer (' + mb(asset(w, /Installation.*\.exe$/).size) + ')' })) : null,
      asset(w, /Portable.*\.exe$/) ? h('a.btn.btn-line.btn-sm', { href: asset(w, /Portable.*\.exe$/).browser_download_url, text: 'Version portable' }) : null));
  const ipa = asset(i, /\.ipa$/);
  ios.replaceChildren(h('h3', { text: 'iPhone et iPad' }), i ? h('p.note', { text: 'Version ' + i.tag_name.slice(5) }) : h('p.note', { text: 'Version indisponible pour le moment.' }),
    h('p', { text: 'Le fichier n’est pas signé par Apple : installe-le avec SideStore ou AltStore, puis renouvelle-le tous les 7 jours depuis ces applications.' }),
    ipa ? h('div.row-actions', h('a.btn.btn-main.btn-sm', { href: ipa.browser_download_url }, icon('download'), h('span', { text: 'Télécharger l’IPA (' + mb(ipa.size) + ')' }))) : null);

  // Versions de test : affichées seulement si plus récentes que la version publique de la même plateforme.
  try {
    const r = await fetch('https://djjfzymrkncwhrocpxjo.supabase.co/functions/v1/beta-builds', { method: 'POST', headers: { apikey: 'sb_publishable_hR4vWksXYg3TUofHVQMtLQ_q5JIHXdX', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'public_list' }) }).then((x) => x.json());
    const publicIos = i ? i.tag_name.slice(5) : '0';
    const fresh = (r?.builds || []).filter((b) => b.platform === 'ios' && cmp(b.version, publicIos) > 0);
    if (fresh.length) tests.replaceChildren(h('div.tile', h('h3', { text: 'Versions de test' }), h('p', { text: 'Des versions en avant-première, protégées par un code donné par le créateur.' }),
      ...fresh.map((b) => h('div.choice', h('span', { style: { display: 'grid' } }, h('span', { text: 'iPhone et iPad ' + b.version }), h('small', { text: 'Build ' + b.build_number + ' · ' + mb(b.bytes) })), h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Code requis', onclick: () => unlock(b) })))));
  } catch { /* service indisponible : rien à afficher */ }
}

function unlock(b) {
  sheet('Version de test ' + b.version, (body, s) => {
    const code = h('input.input', { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', pattern: '[0-9]{6}', placeholder: '6 chiffres', spellcheck: 'false' });
    const msg = h('p.note', { role: 'status' });
    body.append(h('form', { style: { display: 'grid', gap: '12px' }, onsubmit: async (e) => {
      e.preventDefault();
      try {
        const res = await fetch('https://djjfzymrkncwhrocpxjo.supabase.co/functions/v1/beta-builds', { method: 'POST', headers: { apikey: 'sb_publishable_hR4vWksXYg3TUofHVQMtLQ_q5JIHXdX', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unlock', id: b.id, code: code.value.trim() }) });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.url) throw new Error(typeof data?.error === 'string' && !/_/.test(data.error) ? data.error : 'Code incorrect ou service indisponible.');
        s.close(); location.href = data.url; toast('Téléchargement lancé.');
      } catch (err) { msg.textContent = err.message; msg.style.color = 'var(--danger)'; }
    } }, h('label.field', h('span', { text: 'Code à 6 chiffres' }), code), h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Débloquer' })), msg));
  });
}

/* ---------- Soutenir ---------- */
function soutenir(body) {
  body.append(
    h('p.lede', { text: 'Avant l’usine est un projet de fan, gratuit et sans publicité. Si tu veux aider à le faire vivre, tu peux participer aux frais sur Ko-fi.' }),
    h('div.row-actions', h('a.btn.btn-main', { href: 'https://ko-fi.com/zephirox', target: '_blank', rel: 'noopener noreferrer' }, h('span', { text: 'Soutenir sur Ko-fi' }), h('span', { 'aria-hidden': 'true', text: '↗' }))),
    h('p.note', { text: 'Tu peux aussi aider sans dépenser un centime : synchronise des paroles, explique des passages ou partage le site.' }));
}

/* ---------- Confidentialité ---------- */
function confidentialite(body) {
  const block = (title, ...ps) => h('section', { style: { display: 'grid', gap: '10px' } }, h('h2', { style: { fontSize: '24px' }, text: title }), ...ps.map((p) => h('p', { text: p })));
  body.append(
    block('L’essentiel', 'Tu peux écouter librement sans compte. Si tu en crées un, ton adresse e-mail reste privée : elle sert seulement à te connecter et, si tu l’acceptes, à recevoir des nouvelles.'),
    block('Ce que le site garde', 'Avec un compte : ton profil, tes favoris et playlists, tes contributions, tes messages et tes statistiques d’écoute. Sans compte : uniquement des réglages et ta bibliothèque, dans ton navigateur.', 'Pour la communauté anonyme (votes, histoires, explications), un identifiant aléatoire est gardé dans ton navigateur ; il ne contient aucune donnée personnelle.'),
    block('Les nouvelles facultatives', 'Les e-mails et notifications ne sont envoyés qu’avec ton accord, sujet par sujet, en respectant tes heures calmes. Chaque e-mail contient un lien de désinscription. Tout se règle dans Mon compte › Réglages › Notifications.'),
    block('Tes droits', 'Tu peux télécharger une sauvegarde de ta bibliothèque, modifier ton profil ou supprimer définitivement ton compte depuis Mon compte › Données et compte.'),
    block('Hébergement', 'Le site est publié sur GitHub Pages. Les comptes et les données de la communauté sont gérés par Supabase, dans l’Union européenne. Les fichiers audio sont servis par Archive.org.'));
}
