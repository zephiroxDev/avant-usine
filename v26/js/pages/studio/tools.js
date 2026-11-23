// Outils du Studio. Chaque fonction reçoit le conteneur de l'outil et le remplit.
import { h } from '../../core/dom.js?v=202611232000';
import { act, rpc, client } from '../../core/api.js?v=202611232000';
import * as cat from '../../core/catalog.js?v=202611232000';
import { sheet, toast, confirm } from '../../ui/overlay.js?v=202611232000';

const when = (iso) => { try { return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const title = (key) => cat.track(key)?.title || key || 'Morceau';
const who = (r) => r.profile?.nickname || r.nickname || r.author_name || r.author?.nickname || (typeof r.author === 'string' ? r.author : '') || r.user_nickname || 'Membre';
const empty = (text) => h('p.empty', { text });
const row = (main, sub, ...actions) => h('div.choice', { style: { alignItems: 'flex-start', padding: '14px 16px', minHeight: '0', flexWrap: 'wrap', cursor: 'default' } },
  h('span', { style: { display: 'grid', gap: '4px', minWidth: '0', flex: '1 1 260px' } }, h('span', { text: main }), sub ? h('small', { style: { whiteSpace: 'pre-line' }, text: sub }) : null),
  actions.length ? h('span.row-actions', { style: { flex: 'none' } }, actions) : null);
// Bouton à contour : visible sur le fond des cartes (le fond « soft » s'y confondait).
const btn = (text, run, kind = '.btn-line') => h('button.btn.btn-sm' + kind, { type: 'button', text, onclick: async (e) => { const b = e.currentTarget; b.disabled = true; try { await run(); } catch (err) { toast(err.message); } finally { b.disabled = false; } } });
function ask(titleText, label, { ok = 'Valider', value = '', multiline = true, required = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    sheet(titleText, (b, s) => {
      const input = multiline ? h('textarea.input', { maxlength: '1000' }) : h('input.input', { maxlength: '200', value });
      if (multiline) input.value = value;
      b.append(h('form', { style: { display: 'grid', gap: '12px' }, onsubmit: (e) => { e.preventDefault(); if (required && !input.value.trim()) { input.focus(); return; } done = true; resolve(input.value.trim()); s.close(); } },
        h('label.field', h('span', { text: label }), input), h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: ok }))));
    }, { onClose: () => { if (!done) resolve(null); } });
  });
}

/* ---------- À traiter ---------- */
export async function synchros(box) {
  const q = await act('au_sync_moderation', 'queue');
  const sync = q?.sync || [];
  const files = (q?.files || []).filter((f) => !['accepted', 'rejected', 'archived'].includes(f.status));
  box.replaceChildren(
    h('h3', { text: 'Synchronisations' }),
    ...(sync.length ? sync.map((r) => row(title(r.track_key) + (r.correction_of ? ' · correction' : ''), who(r) + ' · ' + when(r.created_at) + (r.note ? '\n' + r.note : ''),
      btn('Vérifier', () => review(r)), btn('Retirer de ma liste', async () => { await act('au_sync_moderation', 'archive', { kind: 'sync', id: r.id }); synchros(box); })))
      : [empty('Aucune synchronisation en attente.')]),
    h('h3', { style: { marginTop: '12px' }, text: 'Fichiers reçus' }),
    ...(files.length ? files.map((f) => row(title(f.track_key) + ' · ' + (f.file_name || 'fichier'), who(f) + ' · ' + when(f.created_at) + ' · ' + (f.status || ''),
      btn('Refuser', async () => { const note = await ask('Refuser ce fichier', 'Explique ce qu’il faut reprendre', { ok: 'Refuser' }); if (note == null) return; await act('au_sync_files_api', 'decide', { id: f.id, revision: f.revision, status: 'rejected', note }); synchros(box); }),
      btn('Retirer de ma liste', async () => { await act('au_sync_moderation', 'archive', { kind: 'file', id: f.id }); synchros(box); })))
      : [empty('Aucun fichier en attente.')]),
    h('p.note', { text: 'La publication d’un fichier demande sa prévisualisation complète : elle reste disponible dans l’ancien Studio tant que la v26 n’est pas publiée.' }));

  async function review(r) {
    const detail = await act('au_sync', 'review', { id: r.id });
    sheet('Vérifier · ' + title(r.track_key), (b, s) => {
      const lines = detail.lines || [];
      const times = detail.times || [];
      b.append(
        h('p.note', { text: who(r) + ' · ' + lines.length + ' phrases · ' + (detail.sync_mode || 'highlight') }),
        h('ol', { style: { display: 'grid', gap: '4px', paddingLeft: '22px', listStyle: 'decimal', maxHeight: '46vh', overflowY: 'auto' } },
          lines.map((l, i) => h('li', h('span.note', { text: (Number(times[i]) || 0).toFixed(2).replace('.', ',') + ' s · ' }), String(l)))),
        h('div.row-actions',
          btn('Publier', async () => { const note = await ask('Publier la synchronisation', 'Note pour le contributeur (facultatif)', { ok: 'Publier' }); if (note == null) return; await act('au_sync', 'approve', { id: detail.id, revision: detail.revision, sync_mode: detail.sync_mode || 'highlight', curves: detail.curves, times: detail.times, note }); s.close(); toast('Synchronisation publiée.'); synchros(box); }, '.btn-main'),
          btn('Renvoyer au contributeur', async () => { const note = await ask('Renvoyer', 'Explique ce qu’il faut reprendre', { ok: 'Renvoyer', required: true }); if (note == null) return; await act('au_sync', 'reject', { id: detail.id, revision: detail.revision, note }); s.close(); toast('Proposition renvoyée.'); synchros(box); })));
    });
  }
}

export async function paroles(box) {
  const rows = ((await act('au_lyrics_v12', 'queue')) || []).filter((r) => r.status === 'pending' || !r.status);
  box.replaceChildren(...(rows.length ? rows.map((r) => row(title(r.track_key || r.track), who(r) + ' · ' + when(r.created_at),
    btn('Lire', () => sheet('Paroles · ' + title(r.track_key || r.track), (b) => b.append(h('pre', { style: { whiteSpace: 'pre-wrap', font: 'inherit', margin: '0' }, text: r.body || '' })))),
    btn('Approuver', async () => { const note = await ask('Approuver ces paroles', 'Note (facultatif)', { ok: 'Approuver' }); if (note == null) return; await act('au_lyrics_v12', 'approve', { id: r.id, revision: r.revision, note, status: 'approved' }); toast('Paroles approuvées.'); paroles(box); }, '.btn-main'),
    btn('Refuser', async () => { const note = await ask('Refuser ces paroles', 'Raison', { ok: 'Refuser', required: true }); if (note == null) return; await act('au_lyrics_v12', 'approve', { id: r.id, revision: r.revision, note, status: 'rejected' }); toast('Proposition refusée.'); paroles(box); })))
    : [empty('Aucune proposition de paroles en attente.')]));
}

export async function corrections(box) {
  const rows = ((await act('au_release22', 'proposals')) || []).filter((r) => r.status === 'pending' || !r.status);
  box.replaceChildren(...(rows.length ? rows.map((r) => row(title(r.track), (r.note || 'Sans note') + ' · ' + when(r.created_at),
    btn('Comparer', () => sheet('Correction · ' + title(r.track), (b) => b.append(
      h('h3', { text: 'Actuel' }), h('pre', { style: { whiteSpace: 'pre-wrap', font: 'inherit', margin: '0', color: 'var(--muted)' }, text: r.original || '' }),
      h('h3', { text: 'Proposé' }), h('pre', { style: { whiteSpace: 'pre-wrap', font: 'inherit', margin: '0' }, text: r.replacement || '' })))),
    btn('Accepter', async () => { await act('au_release22', 'decide', { id: r.id, status: 'accepted' }); toast('Correction acceptée.'); corrections(box); }, '.btn-main'),
    btn('Refuser', async () => { await act('au_release22', 'decide', { id: r.id, status: 'rejected' }); toast('Correction refusée.'); corrections(box); })))
    : [empty('Aucune correction en attente.')]));
}

export async function signalements(box) {
  const rows = (await act('au_moderation_v12', 'reports')) || [];
  const open = rows.filter((r) => !r.resolved_at && r.status !== 'resolved');
  box.replaceChildren(...(open.length ? open.map((r) => row((r.kind || 'Signalement') + ' · ' + (r.reason || ''), (r.body || r.content || r.details || '') + '\n' + when(r.created_at),
    btn('Contenu masqué', async () => { await act('au_moderation_v12', 'report_resolve', { report_id: r.id, id: r.id, status: 'hidden' }); toast('Contenu masqué.'); signalements(box); }, '.btn-main'),
    btn('Rien à faire', async () => { await act('au_moderation_v12', 'report_resolve', { report_id: r.id, id: r.id, status: 'dismissed' }); toast('Signalement classé.'); signalements(box); })))
    : [empty('Aucun signalement en attente.')]));
}

export async function candidatures(box) {
  const rows = (await act('au_moderation_v12', 'applications')) || [];
  box.replaceChildren(...(rows.length ? rows.map((r) => row(who(r) + ' · ' + (r.status || 'en attente'), (r.body || '') + '\n' + when(r.created_at),
    btn('Accepter', async () => { await act('au_moderation_v12', 'application_status', { id: r.id, status: 'accepted' }); toast('Candidature acceptée.'); candidatures(box); }, '.btn-main'),
    btn('Refuser', async () => { await act('au_moderation_v12', 'application_status', { id: r.id, status: 'rejected' }); toast('Candidature refusée.'); candidatures(box); }),
    btn('Supprimer', async () => { if (!(await confirm('Supprimer cette candidature ?', 'Elle disparaîtra définitivement.', { ok: 'Supprimer', danger: true }))) return; await act('au_moderation_v12', 'application_delete', { id: r.id }); candidatures(box); })))
    : [empty('Aucune candidature.')]));
}

/* ---------- Catalogue ---------- */
export async function catalogue(box) {
  const vols = (await rpc('au_catalog_admin')) || [];
  box.replaceChildren(...vols.map((v) => {
    const doc = v.draft || v.published || {};
    const hasDraft = !!v.draft && JSON.stringify(v.draft) !== JSON.stringify(v.published);
    return row('Volume ' + v.number + (hasDraft ? ' · brouillon non publié' : ''), (doc.tracks?.length || 0) + ' morceaux · révision ' + v.revision,
      btn('Modifier', () => editVolume(v)));
  }));

  function editVolume(v) {
    const doc = JSON.parse(JSON.stringify(v.draft || v.published || { number: v.number, tracks: [] }));
    sheet('Volume ' + v.number, (b, s) => {
      const list = h('div', { style: { display: 'grid', gap: '8px' } });
      const paint = () => list.replaceChildren(...(doc.tracks || []).map((t) => row(t.number + '. ' + t.title, (t.lyrics ? 'Paroles enregistrées' : 'Sans paroles') + (t.genius?.url ? ' · Genius relié' : ''), btn('Modifier', () => editTrack(t, paint)))));
      paint();
      const save = (publish) => btn(publish ? 'Publier' : 'Enregistrer le brouillon', async () => {
        if (publish && !(await confirm('Publier le volume ' + v.number + ' ?', 'Les modifications seront visibles par tout le monde.', { ok: 'Publier' }))) return;
        const r = await rpc('au_catalog_save', { p_number: v.number, p_document: doc, p_revision: v.revision, p_publish: publish });
        v.revision = r?.revision ?? v.revision + 1;
        toast(publish ? 'Volume publié.' : 'Brouillon enregistré.');
        if (publish) s.close();
      }, publish ? '.btn-main' : '.btn-line');
      b.append(list, h('div.row-actions', save(false), save(true)));
    });
  }

  function editTrack(t, after) {
    sheet(t.title, (b, s) => {
      const name = h('input.input', { value: t.title || '', maxlength: '200' });
      const lyrics = h('textarea.input', { style: { minHeight: '240px' }, spellcheck: 'true' }); lyrics.value = t.lyrics || '';
      const genius = h('input.input', { type: 'url', value: t.genius?.url || '', placeholder: 'https://genius.com/…-lyrics', spellcheck: 'false' });
      b.append(h('form', { style: { display: 'grid', gap: '12px' }, onsubmit: (e) => { e.preventDefault(); t.title = name.value.trim(); t.lyrics = lyrics.value; t.genius = genius.value.trim() ? { ...(t.genius || {}), url: genius.value.trim() } : null; s.close(); after(); toast('Modifié dans le brouillon : pense à enregistrer.'); } },
        h('label.field', h('span', { text: 'Titre' }), name),
        h('label.field', h('span', { text: 'Paroles' }), lyrics),
        h('label.field', h('span', { text: 'Fiche Genius' }), genius),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Appliquer' }),
          btn('Récupérer depuis Genius', async () => { const r = await rpc('au_catalog_genius', { p_url: genius.value.trim() }); if (r?.lyrics) { lyrics.value = r.lyrics; toast('Paroles récupérées : vérifie-les.'); } else toast('Aucune parole trouvée sur cette fiche.'); }))));
    });
  }
}

export async function audio(box) {
  // Le serveur renvoie une empreinte sonore par morceau : deux empreintes identiques = le même fichier audio.
  const rows = (await act('au_audio_audit', 'list')) || [];
  const groups = new Map();
  for (const r of rows) { if (!r.signature) continue; const k = JSON.stringify(r.signature); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const dupes = [...groups.values()].filter((g) => g.length > 1);
  const known = new Set(rows.map((r) => r.track_key));
  const missing = cat.allTracks().filter((t) => !known.has(t.key));
  box.replaceChildren(
    h('p.note', { text: rows.length + ' morceaux analysés sur ' + cat.trackCount() + '.' }),
    h('h3', { text: 'Doublons' }),
    ...(dupes.length ? dupes.map((g) => row(g.map((r) => title(r.track_key)).join(' = '), g.map((r) => decodeURIComponent((r.src || '').split('/').pop() || '')).join('\n'))) : [empty('Aucun doublon : chaque morceau a un audio différent.')]),
    h('h3', { style: { marginTop: '12px' }, text: 'Pas encore analysés' }),
    ...(missing.length ? missing.map((t) => row(t.title, t.volume.label + ', piste ' + t.number)) : [empty('Tous les morceaux ont été analysés.')]));
}

export async function avantPremieres(box) {
  const codes = (await act('au_activation', 'admin')) || [];
  box.replaceChildren(
    h('div.row-actions', btn('Créer un code', async () => {
      // Création en trois questions ; le code n'est montré qu'une fois.
      const feature = await ask('Nouveau code', 'Fonctionnalité concernée (identifiant)', { ok: 'Suivant', multiline: false, required: true }); if (feature == null) return;
      const days = await ask('Durée', 'Nombre de jours de validité', { ok: 'Suivant', multiline: false, value: '7', required: true }); if (days == null) return;
      const uses = await ask('Utilisations', 'Nombre maximum d’utilisations', { ok: 'Créer', multiline: false, value: '10', required: true }); if (uses == null) return;
      const r = await act('au_activation', 'create', { feature, days: Number(days), uses: Number(uses) });
      await sheet('Code créé', (b) => b.append(h('p', { text: 'Note ce code, il ne sera plus affiché :' }), h('p', { style: { fontFamily: 'monospace', fontSize: '24px' }, text: r?.code || JSON.stringify(r) })));
      avantPremieres(box);
    }, '.btn-main')),
    ...(codes.length ? codes.map((c) => row(c.feature + (c.disabled ? ' · désactivé' : ''), 'Utilisé ' + (c.uses || 0) + ' / ' + (c.max_uses || '∞') + ' · expire le ' + when(c.expires_at),
      c.disabled ? null : btn('Désactiver', async () => { await act('au_activation', 'disable', { id: c.id }); avantPremieres(box); }),
      btn('Ouvrir à tous', async () => { if (!(await confirm('Ouvrir « ' + c.feature + ' » à tout le monde ?', 'La fonctionnalité deviendra publique.', { ok: 'Ouvrir' }))) return; await act('au_activation', 'public', { feature: c.feature, enabled: true }); toast('Fonctionnalité ouverte.'); })))
      : [empty('Aucun code d’avant-première.')]));
}

/* ---------- Communauté ---------- */
export async function membres(box) {
  const input = h('input.input', { type: 'search', placeholder: 'Pseudo ou adresse', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Chercher un membre' });
  const list = h('div', { style: { display: 'grid', gap: '8px' } });
  box.replaceChildren(input, list);
  let timer = 0;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  load();
  async function load() {
    const rows = (await act('au_moderation_v12', 'members', { query: input.value.trim(), offset: 0 })) || [];
    list.replaceChildren(...(rows.length ? rows.map((m) => row((m.nickname || m.profile?.nickname || 'Membre') + (m.moderator ? ' · modérateur' : '') + (m.banned_until && new Date(m.banned_until) > new Date() ? ' · suspendu' : ''), (m.created_at ? 'Inscrit le ' + when(m.created_at) : ''),
      btn('Suspendre', async () => { const minutes = await ask('Suspendre', 'Durée en minutes (ex. 1440 = 1 jour)', { ok: 'Suivant', multiline: false, value: '1440', required: true }); if (minutes == null) return; const reason = await ask('Raison', 'Explique la raison (visible par le membre)', { ok: 'Suspendre', required: true }); if (reason == null) return; await act('au_moderation_v12', 'sanction', { id: m.id, minutes: Number(minutes), reason, note: reason }); toast('Membre suspendu.'); load(); }),
      m.banned_until ? btn('Lever la suspension', async () => { await act('au_moderation_v12', 'restore', { id: m.id }); toast('Suspension levée.'); load(); }) : null,
      btn(m.moderator ? 'Retirer modérateur' : 'Nommer modérateur', async () => { await act('au_moderation_v12', 'moderator_set', { id: m.id, enabled: !m.moderator }); toast('Rôle mis à jour.'); load(); })))
      : [empty('Aucun membre trouvé.')]));
  }
}

export async function contenus(box) {
  let kind = 'annotations';
  const tabs = h('div.row-actions');
  const list = h('div', { style: { display: 'grid', gap: '8px' } });
  box.replaceChildren(tabs, list);
  paint();
  async function paint() {
    tabs.replaceChildren(...[['annotations', 'Explications'], ['posts', 'Publications']].map(([id, label]) => h('button.chip', { type: 'button', 'aria-pressed': String(id === kind), text: label, onclick: () => { kind = id; paint(); } })));
    const rows = (await rpc('au_admin_list', { p_kind: kind, p_offset: 0 })) || [];
    const items = Array.isArray(rows) ? rows : rows.items || [];
    list.replaceChildren(...(items.length ? items.map((r) => row((r.title || r.quote || title(r.song_key || r.track_key)) + (r.hidden_at ? ' · masqué' : ''), (r.body || '') + '\n' + (r.author_name || '') + ' · ' + when(r.created_at),
      btn(r.hidden_at ? 'Réafficher' : 'Masquer', async () => { await rpc('au_admin_moderate', { p_kind: kind, p_id: r.id, p_hidden: !r.hidden_at }); paint(); })))
      : [empty('Rien à afficher.')]));
  }
}

export async function journal(box) {
  const rows = (await act('au_repertoire', 'journal')) || [];
  box.replaceChildren(...(rows.length ? rows.map((r) => row(title(r.track_key), (r.nickname || 'Membre') + ' : ' + (r.old_date || 'aucune') + ' → ' + (r.new_date || 'aucune') + ' · ' + when(r.created_at))) : [empty('Aucune modification.')]));
}

/* ---------- Communication ---------- */
const STATE = { draft: 'brouillon', scheduled: 'programmée', paused: 'en pause', finished: 'terminée' };
const TOPIC = { patches: 'Nouveautés', community: 'Communauté', lyrics: 'Paroles', return: 'Retour', download: 'Applications' };
export async function campagnes(box) {
  const rows = (await act('au_release22', 'campaigns')) || [];
  box.replaceChildren(
    h('div.row-actions', btn('Nouvelle campagne', () => edit({}), '.btn-main')),
    ...(rows.length ? rows.map((c) => row((c.title || 'Sans titre').trim() + ' · ' + (STATE[c.state] || c.state || ''), (TOPIC[c.topic] || c.topic || '') + (c.due_at ? ' · prévue le ' + when(c.due_at) : '') + (c.claimed ? ' · ' + c.claimed + ' envoi' + (c.claimed > 1 ? 's' : '') : ''),
      btn('Dupliquer', () => edit(c)),
      c.state === 'scheduled' ? btn('Suspendre', async () => { await act('au_release22', 'campaign_state', { id: c.id, state: 'paused' }); campagnes(box); })
        : c.state === 'finished' ? null
        : btn('Programmer', async () => { if (!(await confirm('Programmer « ' + (c.title || 'cette campagne') + ' » ?', 'Elle partira à la date prévue, uniquement aux membres qui ont accepté ce sujet.', { ok: 'Programmer' }))) return; await act('au_release22', 'campaign_state', { id: c.id, state: 'scheduled' }); campagnes(box); }, '.btn-main')))
      : [empty('Aucune campagne.')]));

  function edit(c) {
    // Le serveur crée toujours une nouvelle campagne (brouillon) : « Dupliquer » repart d'une existante.
    sheet(c.id ? 'Nouvelle campagne à partir de celle-ci' : 'Nouvelle campagne', (b, s) => {
      const t = h('input.input', { value: c.title || '', maxlength: '100' });
      const body = h('textarea.input', { maxlength: '1000' }); body.value = c.body || '';
      const topic = h('select.input', [['patches', 'Nouveautés'], ['community', 'Communauté'], ['lyrics', 'Paroles'], ['return', 'Retour'], ['download', 'Applications']].map(([v, l]) => h('option', { value: v, selected: c.topic === v, text: l })));
      const due = h('input.input', { type: 'datetime-local', value: c.due_at ? new Date(c.due_at).toISOString().slice(0, 16) : '' });
      b.append(h('form', { style: { display: 'grid', gap: '12px' }, onsubmit: async (e) => {
        e.preventDefault();
        try { await act('au_release22', 'campaign_save', { title: t.value.trim(), body: body.value.trim(), topic: topic.value, due_at: due.value ? new Date(due.value).toISOString() : null }); s.close(); toast('Brouillon de campagne enregistré.'); campagnes(box); }
        catch (err) { toast(err.message); }
      } }, h('label.field', h('span', { text: 'Titre' }), t), h('label.field', h('span', { text: 'Message' }), body), h('label.field', h('span', { text: 'Sujet' }), topic), h('label.field', h('span', { text: 'Date d’envoi' }), due),
        h('p.note', { text: 'Rien n’est envoyé tant que la campagne n’est pas programmée. Elle ne part qu’aux membres qui ont accepté ce sujet.' }),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Enregistrer' }))));
    });
  }
}

export async function promo(box) {
  const manifest = await fetch('../promo-manifest.json', { cache: 'no-cache' }).then((r) => r.json()).catch(() => null);
  let status = [];
  try { const c = await client(); const { data } = await c.from('au_promo_status').select('*'); status = data || []; } catch { /* statut indisponible */ }
  const items = Array.isArray(manifest) ? manifest : manifest?.images || manifest?.items || [];
  box.replaceChildren(...(items.length ? items.map((it) => {
    const img = it.image || it.png || it.src || '';
    const st = status.find((s) => s.image === img);
    const PLATFORM = { 'web-pc': 'Site PC', 'web-mobile': 'Site mobile', 'desktop-pc': 'Windows', ios: 'iPhone et iPad', android: 'Android', ps4: 'PS4' };
    const platforms = Array.isArray(it.platforms) ? it.platforms.map((p) => PLATFORM[p] || p).join(', ') : '';
    return row((it.patch ? 'Version ' + it.patch : img) + (st?.published ? ' · publiée' : ''), [it.title, platforms].filter(Boolean).join(' · '),
      img ? h('a.btn.btn-line.btn-sm', { href: '../' + img.replace(/^\.\//, ''), target: '_blank', rel: 'noopener', text: 'Voir l’affiche' }) : null,
      (it.video || it.mp4) ? h('a.btn.btn-line.btn-sm', { href: '../' + String(it.video || it.mp4).replace(/^\.\//, ''), target: '_blank', rel: 'noopener', text: 'Voir la vidéo' }) : null,
      btn(st?.published ? 'Marquer non publiée' : 'Marquer publiée', async () => { await rpc('au_promo_mark_18v08', { p_image: img, p_action: 'published', p_published: !st?.published }); promo(box); }));
  }) : [empty('Aucune affiche dans le catalogue promo.')]));
}

export async function tests(box) {
  const c = await client();
  const { data: s } = await c.auth.getSession();
  const token = s?.session?.access_token;
  const call = (body) => fetch('https://djjfzymrkncwhrocpxjo.supabase.co/functions/v1/beta-builds', { method: 'POST', headers: { apikey: 'sb_publishable_hR4vWksXYg3TUofHVQMtLQ_q5JIHXdX', 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) }).then(async (r) => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(typeof d?.error === 'string' && !/_/.test(d.error) ? d.error : 'Service indisponible.'); return d; });
  let st = null;
  try { st = await call({ action: 'code_status' }); } catch (e) { box.replaceChildren(empty(e.message)); return; }
  box.replaceChildren(
    h('p', { text: st?.configured || st?.has_code ? 'Un code d’accès est défini.' : 'Aucun code d’accès n’est défini : les versions de test ne peuvent pas être téléchargées.' }),
    h('div.row-actions', btn('Définir un nouveau code', async () => {
      const code = await ask('Nouveau code', 'Code à 6 chiffres', { ok: 'Enregistrer', multiline: false, required: true });
      if (code == null) return;
      if (!/^\d{6}$/.test(code)) { toast('Le code doit contenir exactement 6 chiffres.'); return; }
      await call({ action: 'set_code', code }); toast('Code enregistré.'); tests(box);
    }, '.btn-main')));
}

/* ---------- Site ---------- */
const FEATURES = [['all', 'Tout le site'], ['ecoute', 'Écoute'], ['paroles', 'Paroles'], ['annotations', 'Explications'], ['sync_studio', 'Synchronisation'], ['sync_files', 'Envoi de fichiers'], ['moderation', 'Modération'], ['communaute', 'Communauté'], ['comments', 'Commentaires'], ['messages', 'Messages'], ['profiles', 'Profils'], ['decouvrir', 'Histoires et archives'], ['rankings', 'Pépites'], ['blindtest', 'Blind Test'], ['repertoire', 'Chronologie'], ['statistiques', 'Statistiques'], ['summaries', 'Résumés'], ['trophies', 'Trophées'], ['sharing', 'Partage'], ['bibliotheque', 'Bibliothèque'], ['backup_export', 'Sauvegarde (export)'], ['backup_import', 'Sauvegarde (import)'], ['telechargements', 'Téléchargements'], ['accounts', 'Comptes']];
export async function fermetures(box) {
  const r = await act('au_maintenance_19', 'read');
  const s = r?.settings || {};
  box.replaceChildren(...FEATURES.map(([key, label]) => {
    const cur = s[key];
    return row(label + (cur?.closed ? ' · fermé' : ''), cur?.closed ? cur.message : 'Ouvert',
      cur?.closed
        ? btn('Rouvrir', async () => { await act('au_maintenance_19', 'set', { key, closed: false, message: cur.message || 'Réouvert.' }); toast(label + ' rouvert.'); fermetures(box); }, '.btn-main')
        : btn('Fermer', async () => { const message = await ask('Fermer « ' + label + ' »', 'Message affiché aux visiteurs (1 à 1000 caractères)', { ok: 'Fermer', required: true }); if (message == null) return; await act('au_maintenance_19', 'set', { key, closed: true, message }); toast(label + ' fermé.'); fermetures(box); }, '.btn-danger'));
  }));
}

export async function visites(box) {
  let id = ''; try { id = localStorage.getItem('au221-visit-browser') || crypto.randomUUID(); } catch { id = crypto.randomUUID(); }
  const r = await rpc('au_visit_count_22_1', { p_browser: id.replace(/"/g, ''), p_touch: false });
  box.replaceChildren(h('p', { style: { fontFamily: 'var(--display)', fontWeight: '600', fontSize: '44px' }, text: Number(r?.total || 0).toLocaleString('fr-FR') }), h('p.note', { text: 'Navigateurs différents venus sur le site (une visite par navigateur).' }));
}
