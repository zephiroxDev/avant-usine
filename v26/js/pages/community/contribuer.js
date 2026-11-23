import { h, icon } from '../../core/dom.js?v=202611231900';
import { act, rpc } from '../../core/api.js?v=202611231900';
import * as cat from '../../core/catalog.js?v=202611231900';
import { account } from '../../core/account.js?v=202611231900';
import { visitorToken } from '../../core/visitor.js?v=202611231900';
import { sheet, toast } from '../../ui/overlay.js?v=202611231900';
import { getLyrics } from '../../core/lyrics.js?v=202611231900';

const STATUS = { pending: 'En attente de validation', approved: 'Publiée', rejected: 'À reprendre' };

function trackPicker(selected) {
  return h('select.input', { 'aria-label': 'Morceau' }, cat.available().map((v) => h('optgroup', { label: v.label },
    v.tracks.map((t) => h('option', { value: t.key, selected: t.key === selected, text: t.number + '. ' + t.title })))));
}

export default function contribuer(body, query) {
  const preset = cat.track(query.get('morceau'))?.key || '';
  if (!account()) {
    body.append(h('p.empty', h('a', { href: '#/compte', style: { color: 'var(--accent)', fontWeight: '600' }, text: 'Connecte-toi' }), ' pour proposer des paroles, une synchronisation ou une explication. Chaque proposition est vérifiée avant publication.'));
    return;
  }
  const mine = h('div', { style: { display: 'grid', gap: '8px' } });
  body.append(
    h('div.tiles',
      tile('Synchroniser des paroles', 'Fais défiler les paroles au rythme du chant, phrase par phrase.', () => import('./studio.js?v=202611231900').then((m) => m.openStudio(preset || cat.allTracks()[0].key))),
      tile('Écrire ou corriger des paroles', 'Propose le texte d’un morceau qui n’en a pas encore, ou une correction.', () => lyricsForm(preset)),
      tile('Expliquer un passage', 'Une référence, un mot d’argot, une anecdote : éclaire un passage pour les autres.', () => noteForm(preset)),
      tile('Envoyer un fichier', 'Tu as déjà une synchronisation au format JSON ou LRC ? Envoie-la.', () => fileForm(preset))),
    h('h2', { style: { fontSize: '24px', margin: '36px 0 12px' }, text: 'Mes contributions' }), mine);
  loadMine();

  function tile(title, text, run) { return h('button.tile', { type: 'button', onclick: run }, h('h3', { text: title }), h('p', { text })); }

  async function loadMine() {
    mine.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    const rows = [];
    try { for (const r of (await act('au_sync', 'mine')) || []) rows.push({ kind: 'Synchronisation', ...r }); } catch { /* indisponible */ }
    try { for (const r of (await act('au_lyrics_v12', 'mine')) || []) rows.push({ kind: 'Paroles', ...r }); } catch { /* indisponible */ }
    try { for (const r of (await act('au_sync_files_api', 'mine')) || []) rows.push({ kind: 'Fichier', ...r }); } catch { /* indisponible */ }
    rows.sort((a, b) => String(b.created_at || b.updated_at || '').localeCompare(String(a.created_at || a.updated_at || '')));
    mine.replaceChildren(...(rows.length ? rows.map((r) => {
      const t = cat.track(r.track_key || r.track);
      return h('div.choice', { style: { cursor: 'default' } }, h('span', { style: { display: 'grid' } }, h('span', { text: (t?.title || r.track_key || 'Morceau') }), h('small', { text: r.kind + (r.note ? ' · ' + r.note : '') })), h('span.badge' + (r.status === 'approved' ? '.badge-accent' : ''), { text: STATUS[r.status] || r.status || '' }));
    }) : [h('p.empty', { text: 'Aucune contribution envoyée pour l’instant.' })]));
  }

  function lyricsForm(key) {
    sheet('Écrire ou corriger des paroles', async (b, s) => {
      const pick = trackPicker(key);
      const text = h('textarea.input', { maxlength: '40000', style: { minHeight: '260px' }, spellcheck: 'true', placeholder: 'Une ligne chantée par ligne. Pas d’indications comme [Refrain].' });
      const msg = h('p.note', { role: 'status' });
      const fill = async () => { const d = await getLyrics(pick.value).catch(() => null); text.value = d?.lines?.join('\n') || ''; };
      pick.addEventListener('change', fill); fill();
      b.append(h('form', { style: { display: 'grid', gap: '14px' }, onsubmit: async (e) => {
        e.preventDefault();
        try { await act('au_lyrics_v12', 'submit', { track: pick.value, body: text.value.trim() }); toast('Merci : ta proposition sera vérifiée.'); s.close(); loadMine(); }
        catch (err) { msg.textContent = err.message; msg.style.color = 'var(--danger)'; }
      } }, h('label.field', h('span', { text: 'Morceau' }), pick), h('label.field', h('span', { text: 'Paroles' }), text),
        h('p.note', { text: 'Écris ce qui est chanté, tel que c’est dit (argot, verlan, répétitions en entier).' }),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Envoyer pour vérification' })), msg));
    });
  }

  function noteForm(key) {
    sheet('Expliquer un passage', async (b, s) => {
      const pick = trackPicker(key);
      const quote = h('select.input', { 'aria-label': 'Ligne à expliquer' });
      const text = h('textarea.input', { maxlength: '2000', spellcheck: 'true' });
      const pseudo = h('input.input', { maxlength: '24', value: account()?.name || '', spellcheck: 'false' });
      const msg = h('p.note', { role: 'status' });
      let words = [];
      const fill = async () => {
        const d = await getLyrics(pick.value).catch(() => null);
        const lines = d?.lines || [];
        words = [];
        quote.replaceChildren(...lines.map((l, i) => { const start = words.length; words.push(...l.split(/\s+/).filter(Boolean)); return h('option', { value: start + ':' + (words.length - 1) + ':' + i, text: l }); }));
        if (!lines.length) quote.append(h('option', { value: '', text: 'Paroles indisponibles pour ce morceau' }));
      };
      pick.addEventListener('change', fill); fill();
      b.append(h('form', { style: { display: 'grid', gap: '14px' }, onsubmit: async (e) => {
        e.preventDefault();
        const [start, end] = quote.value.split(':').map(Number);
        try {
          await rpc('au_add_annotation', { p_token: visitorToken(), p_song_key: pick.value, p_start_word: start, p_end_word: end, p_quote: quote.selectedOptions[0]?.textContent || '', p_author_name: pseudo.value.trim(), p_body: text.value.trim() });
          toast('Explication publiée.'); s.close();
        } catch (err) { msg.textContent = err.message; msg.style.color = 'var(--danger)'; }
      } }, h('label.field', h('span', { text: 'Morceau' }), pick), h('label.field', h('span', { text: 'Passage' }), quote),
        h('label.field', h('span', { text: 'Ton explication' }), text), h('label.field', h('span', { text: 'Pseudo' }), pseudo),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Publier l’explication' })), msg));
    });
  }

  function fileForm(key) {
    sheet('Envoyer un fichier de synchronisation', (b, s) => {
      const pick = trackPicker(key);
      const file = h('input.input', { type: 'file', accept: '.json,.lrc,application/json,text/plain', style: { paddingTop: '12px' } });
      const msg = h('p.note', { role: 'status' });
      b.append(h('form', { style: { display: 'grid', gap: '14px' }, onsubmit: async (e) => {
        e.preventDefault();
        const f = file.files[0];
        if (!f) { msg.textContent = 'Choisis un fichier JSON ou LRC.'; return; }
        try {
          const bytes = new Uint8Array(await f.arrayBuffer());
          const size = 196608, count = Math.ceil(bytes.length / size);
          const mode = /\.lrc$/i.test(f.name) ? 'lrc' : 'highlight';
          const started = await act('au_sync_files_api', 'start', { track: pick.value, file_name: f.name, byte_size: bytes.length, chunk_count: count, requested_mode: mode });
          for (let part = 0; part < count; part++) {
            const chunk = bytes.subarray(part * size, Math.min(bytes.length, (part + 1) * size));
            let bin = ''; for (let o = 0; o < chunk.length; o += 8192) bin += String.fromCharCode(...chunk.subarray(o, o + 8192));
            await act('au_sync_files_api', 'chunk', { id: started.id, part, payload: btoa(bin) });
            msg.textContent = 'Envoi… ' + Math.round(((part + 1) / count) * 100) + ' %';
          }
          const text = new TextDecoder().decode(bytes);
          let analysis = {};
          try { analysis = mode === 'lrc' ? { format: 'lrc', timestamp_count: (text.match(/\[\d+:\d+(?:[.:]\d+)?\]/g) || []).length } : { format: 'json', readable: true, declared_track: JSON.parse(text)?.track ?? null }; } catch { analysis = { format: mode === 'lrc' ? 'lrc' : 'json', readable: false }; }
          await act('au_sync_files_api', 'finish', { id: started.id, analysis });
          toast('Fichier reçu : il sera vérifié.'); s.close(); loadMine();
        } catch (err) { msg.textContent = err.message; msg.style.color = 'var(--danger)'; }
      } }, h('label.field', h('span', { text: 'Morceau' }), pick), h('label.field', h('span', { text: 'Fichier (.json ou .lrc)' }), file),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Envoyer' })), msg));
    });
  }
  void icon;
}
