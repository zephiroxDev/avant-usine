import { h, icon } from '../core/dom.js?v=202611161800';
import { rpc, act } from '../core/api.js?v=202611161800';
import * as cat from '../core/catalog.js?v=202611161800';
import * as player from '../core/player.js?v=202611161800';
import { getLyrics, splitBacks } from '../core/lyrics.js?v=202611161800';
import { account } from '../core/account.js?v=202611161800';
import { on } from '../core/bus.js?v=202611161800';
import { favButton, addToPlaylist } from '../ui/track.js?v=202611161800';
import { toast } from '../ui/overlay.js?v=202611161800';
import { go } from '../router.js?v=202611161800';

import { visitorToken } from '../core/visitor.js?v=202611161800';
const dateFr = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
function songDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (day) return new Date(+y, +m - 1, +day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (m) return new Date(+y, +m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return y;
}

export default function trackPage(page, { key }, query) {
  const t = cat.track(key);
  if (!t) { go('/volumes', { replace: true }); return; }
  const context = t.volume.tracks.map((x) => x.key);
  const offs = [];
  let notesPromise = null; // déclaré avant l'ouverture du premier onglet (sinon « before initialization »)

  const shareBtn = h('button.btn.btn-line', { type: 'button', onclick: share }, icon('share'), h('span', { text: 'Partager' }));
  const head = h('header.wrap.song-head',
    h('img.cover', { src: t.volume.cover, alt: '', width: '160', height: '160' }),
    h('div', { style: { display: 'grid', gap: '12px', justifyItems: 'start', minWidth: '0' } },
      h('a.eyebrow', { href: '#/volume/' + t.volume.number, text: t.volume.label + ' · piste ' + t.number }),
      h('h1', { text: t.title }),
      h('p.note', { text: t.feat ? 'JuL feat. ' + t.feat : 'JuL' })));
  const actions = h('div.wrap.row-actions', { style: { paddingBottom: '20px' } },
    h('button.btn.btn-main', { type: 'button', onclick: () => { player.playKey(t.key, context); window.AU26.openPlayer('lyrics'); } }, icon('play'), h('span', { text: 'Écouter' })),
    favButton(t, '.btn.btn-line'),
    h('button.btn.btn-line', { type: 'button', onclick: () => addToPlaylist(t) }, icon('plus'), h('span', { text: 'Playlist' })),
    shareBtn);
  // Le bouton favori en version large affiche un libellé.
  const fav = actions.children[1];
  const labelFav = () => { fav.append(h('span', { text: fav.getAttribute('aria-pressed') === 'true' ? 'Favori' : 'Ajouter aux favoris' })); };
  labelFav();
  fav.addEventListener('click', () => { fav.querySelector('span')?.remove(); labelFav(); });

  const panels = {
    paroles: { label: 'Paroles', build: buildLyrics },
    explications: { label: 'Explications', build: buildNotes },
    commentaires: { label: 'Commentaires', build: buildComments },
    infos: { label: 'Infos', build: buildInfos },
  };
  let currentTab = query.get('onglet') in panels ? query.get('onglet') : 'paroles';
  const tabBtns = Object.entries(panels).map(([id, p]) => h('button.chip', { type: 'button', role: 'tab', dataset: { id }, text: p.label, onclick: () => select(id) }));
  const panel = h('section.wrap', { role: 'tabpanel' });
  page.append(head, actions, h('div.wrap', h('div.tablist', { role: 'tablist', 'aria-label': 'Autour du morceau' }, tabBtns)), panel);
  select(currentTab);
  if (query.get('partager')) share();
  return () => offs.forEach((f) => f());

  function select(id) {
    currentTab = id;
    for (const b of tabBtns) b.setAttribute('aria-selected', String(b.dataset.id === id));
    panel.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    Promise.resolve(panels[id].build()).then((node) => { if (currentTab === id) panel.replaceChildren(node); })
      .catch((e) => { if (currentTab === id) panel.replaceChildren(h('p.empty', { text: e.message || 'Contenu indisponible pour le moment.' })); });
  }

  async function buildLyrics() {
    const data = await getLyrics(t.key);
    if (!data?.lines?.length) return h('div', data?.membersOnly ? h('p.empty', 'Les paroles de ce morceau sont réservées aux membres. ', h('a', { href: '#/compte', style: { color: 'var(--accent)', fontWeight: '600' }, text: 'Se connecter' })) : h('p.empty', { text: 'Les paroles de ce morceau ne sont pas encore disponibles.' }), contribute());
    const notes = await loadNotes().catch(() => []);
    const wrap = h('div.lyrics-read');
    for (const line of data.lines) {
      const p = h('p');
      const hit = notes.find((n) => n.quote && line.includes(n.quote.trim()));
      if (hit) {
        const i = line.indexOf(hit.quote.trim());
        p.append(line.slice(0, i), h('button', { type: 'button', style: { color: 'var(--accent)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '4px' }, text: hit.quote.trim(), onclick: () => select('explications') }), line.slice(i + hit.quote.trim().length));
      } else {
        // Chœurs entre parenthèses : sous la ligne, en plus petit.
        const parts = splitBacks(line);
        if (parts.mainText) p.append(parts.mainText);
        if (parts.backText) p.append(h('span.back', { text: parts.backText }));
      }
      wrap.append(p);
    }
    return h('div', wrap, h('p.note', { style: { marginTop: '16px' }, text: data.synced ? 'Paroles synchronisées : elles défilent au rythme du chant dans le lecteur.' : 'Pas encore synchronisé : le lecteur fait défiler ce texte au rythme estimé.' }), contribute());
  }

  function loadNotes() {
    notesPromise ||= rpc('au_list_annotations', { p_song_key: t.key, p_token: visitorToken(), p_offset: 0, p_sort: 'top' }).then((r) => r?.items || []);
    return notesPromise;
  }

  async function buildNotes() {
    const items = await loadNotes();
    if (!items.length) return h('div', h('p.empty', { text: 'Aucune explication pour ce morceau. Sélectionne un passage des paroles pour en proposer une.' }), contribute());
    return h('div', { style: { display: 'grid', gap: '14px' } }, items.map((n) => h('article.tile',
      h('p', { style: { fontFamily: 'var(--display)', fontWeight: '600', fontSize: '19px', color: 'var(--ink)' }, text: '« ' + n.quote.trim() + ' »' }),
      h('p', { style: { color: 'var(--ink)' }, text: n.body }),
      h('p.note', { text: (n.author_name || 'Anonyme') + ' · ' + dateFr(n.created_at) + ' · ' + (n.likes || 0) + ' utile' + ((n.likes || 0) > 1 ? 's' : '') }))));
  }

  async function buildComments() {
    const list = await act('au_social', 'comments', { track: t.key });
    const box = h('div', { style: { display: 'grid', gap: '18px', maxWidth: '44em' } });
    const me = account();
    if (me) {
      const input = h('textarea.input', { maxlength: '1000', placeholder: 'Ajoute un repère comme 1:45 pour parler d’un moment précis.', 'aria-label': 'Ton commentaire' });
      const send = h('button.btn.btn-main', { type: 'submit', text: 'Publier' });
      box.append(h('form.field', { onsubmit: async (e) => {
        e.preventDefault(); const body = input.value.trim(); if (!body) { input.focus(); return; }
        send.disabled = true;
        try { await act('au_social', 'comment_add', { track: t.key, body }); toast('Commentaire publié.'); select('commentaires'); }
        catch (err) { toast(err.message); send.disabled = false; }
      } }, h('span', { text: 'Ton commentaire' }), input, h('div.row-actions', send)));
    } else {
      box.append(h('p.note', h('a', { href: '#/compte', style: { color: 'var(--accent)', fontWeight: '600' }, text: 'Connecte-toi' }), ' pour laisser un commentaire.'));
    }
    if (!list?.length) box.append(h('p.empty', { text: 'Aucun commentaire pour le moment.' }));
    for (const c of list || []) {
      box.append(h('article', { style: { display: 'grid', gap: '4px', paddingBottom: '16px', borderBottom: '1px solid var(--line)' } },
        h('p', { style: { fontWeight: '600' } }, c.profile?.nickname || 'Membre', h('span.note', { style: { fontWeight: '400' }, text: ' · ' + dateFr(c.created_at) })),
        h('p', { text: c.body })));
    }
    return box;
  }

  async function buildInfos() {
    let date = '';
    try { const all = await act('au_repertoire', 'list'); date = (all || []).find((d) => d.track === t.key)?.date || ''; } catch { /* indisponible */ }
    return h('div', { style: { display: 'grid', gap: '20px' } },
      h('dl.dl',
        h('dt', { text: 'Titre' }), h('dd', { text: t.title }),
        h('dt', { text: 'Artiste' }), h('dd', { text: t.feat ? 'JuL feat. ' + t.feat : 'JuL' }),
        h('dt', { text: 'Volume' }), h('dd', h('a', { href: '#/volume/' + t.volume.number, text: t.volume.title + ', piste ' + t.number })),
        h('dt', { text: 'Date' }), h('dd', { text: date ? songDate(date) : 'Inconnue pour le moment' })),
      h('div.row-actions', h('a.btn.btn-line.btn-sm', { href: '#/communaute/chronologie?morceau=' + encodeURIComponent(t.key), text: date ? 'Corriger la date' : 'Proposer une date' })));
  }

  function contribute() {
    return h('div.row-actions', { style: { marginTop: '20px' } },
      h('a.btn.btn-line.btn-sm', { href: '#/communaute/contribuer?morceau=' + encodeURIComponent(t.key), text: 'Contribuer aux paroles' }));
  }

  async function share() {
    // Lien court au format de l'ancien site (?share=…), qui garde l'auteur du partage ; repli sur l'adresse directe.
    let url = location.origin + location.pathname.replace(/v26\/(index\.html)?$/, '') + '?share=';
    try { const s = await act('au_track_share_17v06', 'create', { track: t.key }); url += s.id; }
    catch { url = location.href.split('#')[0] + '#/morceau/' + t.key; }
    const data = { title: t.title + ' · Avant l’usine', text: t.title + ' (' + t.volume.label + ')', url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url);
      toast('Lien copié.');
    } catch (e) { if (e?.name !== 'AbortError') toast('Copie impossible : ' + url); }
  }
}
