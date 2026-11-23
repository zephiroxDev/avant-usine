// Pied de page commun : pages d'information, réseaux officiels et compteur de visites.
import { h } from '../core/dom.js?v=202611231900';
import { rpc } from '../core/api.js?v=202611231900';

const OFFICIAL = [
  ['Instagram', 'https://www.instagram.com/juldetp/'], ['TikTok', 'https://www.tiktok.com/@juldetp'], ['Snapchat', 'https://www.snapchat.com/add/jul135city'],
  ['Facebook', 'https://www.facebook.com/julOfficial/'], ['X', 'https://x.com/jul'], ['YouTube', 'https://www.youtube.com/@julsaintjean'],
  ['Spotify', 'https://open.spotify.com/artist/3IW7ScrzXmPvZhB27hmfgy'], ['Deezer', 'https://www.deezer.com/artist/1191615'], ['Apple Music', 'https://music.apple.com/fr/artist/jul/989951893'],
  ['Amazon Music', 'https://music.amazon.com/artists/B000QKFMP2'], ['Toutes les plateformes', 'https://jul.lnk.to/profil-streaming'], ['Boutique officielle', 'https://www.doretdeplatineshop.com/fr-fr/'],
];

function visitorId() {
  try {
    let id = localStorage.getItem('au221-visit-browser');
    if (id && id.startsWith('"')) id = JSON.parse(id);
    if (!/^[0-9a-f-]{36}$/i.test(id || '')) { id = crypto.randomUUID(); localStorage.setItem('au221-visit-browser', id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

export function buildFooter() {
  const visits = h('span.note');
  const col = (title, links) => h('div', { style: { display: 'grid', gap: '10px', alignContent: 'start' } },
    h('h2', { style: { fontFamily: 'var(--body)', fontSize: '13px', fontWeight: '700', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }, text: title }),
    h('ul', { style: { display: 'grid', gap: '8px' } }, links.map(([label, href, ext]) => h('li', h('a', { href, ...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {}), style: { fontSize: '15px' }, text: label + (ext ? ' ↗' : '') })))));
  const el = h('footer.site-foot', h('div.wrap',
    h('div.foot-grid',
      h('div', { style: { display: 'grid', gap: '10px', alignContent: 'start' } }, h('a.brand', { href: '#/' }, 'Avant l’', h('b', 'usine')), h('p.note', { text: 'Les premiers sons de JuL, réunis par des fans. Projet non officiel.' })),
      col('Le site', [['Guide', '#/a-propos/guide'], ['Nouveautés', '#/a-propos/nouveautes'], ['Applications', '#/a-propos/applications'], ['Soutenir', '#/a-propos/soutenir'], ['Confidentialité', '#/a-propos/confidentialite']]),
      col('JuL', OFFICIAL.slice(0, 6).map(([l, u]) => [l, u, true])),
      col('Écouter ailleurs', OFFICIAL.slice(6).map(([l, u]) => [l, u, true]))),
    h('div.foot-end', visits)));
  // Compteur : une visite par navigateur et par session.
  (async () => {
    try {
      let touched = false; try { touched = sessionStorage.getItem('au26-visit') === '1'; sessionStorage.setItem('au26-visit', '1'); } catch { /* rien */ }
      const n = await rpc('au_visit_count_22_1', { p_browser: visitorId(), p_touch: !touched });
      const count = typeof n === 'number' ? n : Number(n?.total ?? n?.count ?? n?.visits);
      if (Number.isFinite(count) && count > 0) visits.textContent = count.toLocaleString('fr-FR') + ' visites';
    } catch { /* compteur facultatif */ }
  })();
  return el;
}
