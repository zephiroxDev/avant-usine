// Sous-pages de « Mon compte » : profil, réglages, sauvegarde, confidentialité, studio.
import { h, icon } from '../core/dom.js?v=202611161845';
import { act, rpc } from '../core/api.js?v=202611161845';
import { account } from '../core/account.js?v=202611161845';
import { on, emit } from '../core/bus.js?v=202611161845';
import * as prefs from '../core/prefs.js?v=202611161845';
import * as lib from '../core/library.js?v=202611161845';
import * as cat from '../core/catalog.js?v=202611161845';
import { toast, confirm } from '../ui/overlay.js?v=202611161845';
import { go } from '../router.js?v=202611161845';

const TITLES = { profil: 'Profil', reglages: 'Réglages', sauvegarde: 'Sauvegarde', confidentialite: 'Données et compte', studio: 'Studio' };

export default async function settings(page, section) {
  if (!TITLES[section]) { go('/compte', { replace: true }); return; }
  if (section === 'studio') { const m = await import('./studio/index.js?v=202611161845'); return m.default(page); }
  const body = h('div.wrap', { style: { display: 'grid', gap: '28px', maxWidth: '760px' } });
  page.append(h('header.wrap.page-head', h('a.note', { href: '#/compte', text: '‹ Mon compte' }), h('h1.title', { text: TITLES[section] })), body);
  const needsAccount = section === 'profil' || section === 'confidentialite';
  const paint = () => {
    body.replaceChildren();
    if (needsAccount && !account()) { body.append(h('p.empty', h('a', { href: '#/compte', style: { color: 'var(--accent)', fontWeight: '600' }, text: 'Connecte-toi' }), ' pour accéder à cette page.')); return; }
    ({ profil, reglages, sauvegarde, confidentialite })[section](body);
  };
  paint();
  return on('account', paint);
}

function group(title, ...kids) {
  return h('section', { style: { display: 'grid', gap: '14px' } }, h('h2', { style: { fontSize: '24px' }, text: title }), ...kids);
}
function seg(options, value, onPick, label) {
  const wrap = h('div.row-actions', { role: 'radiogroup', 'aria-label': label });
  const paint = (v) => wrap.replaceChildren(...options.map(([val, text]) => h('button.chip', { type: 'button', role: 'radio', 'aria-checked': String(val === v), 'aria-pressed': String(val === v), text, onclick: () => { onPick(val); paint(val); } })));
  paint(value);
  return wrap;
}
function toggle(text, checked, onChange) {
  const input = h('input', { type: 'checkbox', checked, onchange: () => onChange(input.checked), style: { width: '20px', height: '20px', accentColor: 'var(--accent)', flex: 'none' } });
  return h('label', { style: { display: 'flex', gap: '12px', alignItems: 'center', minHeight: '44px' } }, input, h('span', { text }));
}

/* ---------- Profil ---------- */
async function profil(body) {
  body.append(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
  let me;
  try { me = await act('au_social', 'me'); } catch (e) { body.replaceChildren(h('p.empty', { text: e.message })); return; }
  let avatar = me.avatar || '';
  let banner = me.banner || '';
  const nick = h('input.input', { maxlength: '24', value: me.nickname || '', autocomplete: 'nickname', spellcheck: 'false' });
  const bio = h('textarea.input', { maxlength: '1000', spellcheck: 'true' }); bio.value = me.bio || '';
  const accent = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(me.accent || '') ? me.accent : '#e5483b', style: { width: '56px', height: '44px', border: '0', background: 'none', padding: '0' }, 'aria-label': 'Couleur de ton profil' });
  let style = ['studio', 'vinyle', 'aurora'].includes(me.style) ? me.style : 'vinyle';
  let allow = me.allow_messages !== false;
  const preview = h('div', { style: { display: 'flex', gap: '16px', alignItems: 'center' } });
  const paintPreview = () => preview.replaceChildren(
    avatar ? h('img.avatar', { src: avatar, alt: '', style: { width: '72px', height: '72px' } }) : h('span.avatar', { style: { width: '72px', height: '72px', fontSize: '28px' }, text: (nick.value || '?').slice(0, 1).toUpperCase() }),
    h('div.row-actions',
      h('label.btn.btn-line.btn-sm', { style: { cursor: 'pointer' } }, 'Changer l’avatar', h('input.sr', { type: 'file', accept: 'image/*', onchange: (e) => pick(e.target.files[0], 256, 120000).then((d) => { if (d) { avatar = d; paintPreview(); } }) })),
      avatar ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Retirer', onclick: () => { avatar = ''; paintPreview(); } }) : null));
  paintPreview();
  const bannerBox = h('div');
  const paintBanner = () => bannerBox.replaceChildren(
    banner ? h('img', { src: banner, alt: '', style: { width: '100%', aspectRatio: '3/1', objectFit: 'cover', borderRadius: 'var(--r)' } }) : null,
    h('div.row-actions', { style: { marginTop: banner ? '10px' : '0' } },
      h('label.btn.btn-line.btn-sm', { style: { cursor: 'pointer' } }, banner ? 'Changer la bannière' : 'Ajouter une bannière', h('input.sr', { type: 'file', accept: 'image/*', onchange: (e) => pick(e.target.files[0], 1200, 400000).then((d) => { if (d) { banner = d; paintBanner(); } }) })),
      banner ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Retirer', onclick: () => { banner = ''; paintBanner(); } }) : null));
  paintBanner();
  const save = h('button.btn.btn-main', { type: 'submit', text: 'Enregistrer mon profil' });
  body.replaceChildren(h('form', { style: { display: 'grid', gap: '22px' }, onsubmit: async (e) => {
    e.preventDefault(); save.disabled = true;
    try {
      await act('au_social', 'profile_save', { nickname: nick.value.trim(), bio: bio.value, accent: accent.value, style, theme: 'dark', avatar, banner, allow_messages: allow });
      toast('Profil enregistré.'); emit('account');
    } catch (err) { toast(err.message); }
    save.disabled = false;
  } },
    preview,
    h('label.field', h('span', { text: 'Pseudo (2 à 24 caractères)' }), nick),
    h('label.field', h('span', { text: 'Présentation' }), bio),
    h('div.field', h('span', { text: 'Bannière' }), bannerBox),
    h('div.field', h('span', { text: 'Ambiance du profil' }), seg([['vinyle', 'Vinyle'], ['studio', 'Studio'], ['aurora', 'Aurore']], style, (v) => { style = v; }, 'Ambiance du profil')),
    h('div.field', h('span', { text: 'Couleur' }), accent),
    toggle('Accepter les messages privés', allow, (v) => { allow = v; }),
    h('div.row-actions', save)));
}

/** Image choisie → WebP compressé (format exigé par le serveur), sous la taille maximale. */
async function pick(file, max, limit) {
  if (!file) return '';
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.86, 0.75, 0.62, 0.5, 0.38]) {
      const d = c.toDataURL('image/webp', q);
      if (d.startsWith('data:image/webp') && d.length <= limit) return d;
    }
    toast('Image trop lourde, même compressée. Choisis-en une plus simple.');
  } catch { toast('Cette image ne peut pas être lue.'); }
  return '';
}

/* ---------- Réglages ---------- */
function reglages(body) {
  const sleepNote = h('p.note', { role: 'status' });
  const paintSleep = () => {
    const s = prefs.sleepState();
    sleepNote.textContent = !s ? 'Aucun arrêt programmé.' : s.mode === 'track' ? 'Arrêt à la fin du morceau en cours.' : 'Arrêt prévu à ' + new Date(s.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '.';
  };
  paintSleep();
  const off = on('sleep', paintSleep);
  const notif = h('div', { style: { display: 'grid', gap: '12px' } });
  body.append(
    group('Écoute',
      h('div.field', h('span', { text: 'Minuteur de sommeil' }),
        h('div.row-actions', [[15, '15 min'], [30, '30 min'], [60, '1 h'], ['track', 'Fin du morceau'], [0, 'Désactiver']].map(([v, t]) => h('button.chip', { type: 'button', text: t, onclick: () => { prefs.setSleep(v); toast(v ? 'Minuteur activé.' : 'Minuteur désactivé.'); } }))),
        sleepNote)),
    group('Affichage',
      h('div.field', h('span', { text: 'Animations' }), seg([['on', 'Activées'], ['off', 'Réduites']], prefs.get('motion'), (v) => prefs.set('motion', v), 'Animations'))),
    group('Notifications', notif));
  paintNotifications(notif);
  return off;
}

const TOPICS = [['patches', 'Nouveautés du site'], ['community', 'Communauté'], ['lyrics', 'Paroles et synchronisations'], ['return', 'Invitations à revenir'], ['download', 'Applications disponibles']];
async function paintNotifications(box) {
  if (!account()) { box.append(h('p.note', { text: 'Connecte-toi pour choisir les nouvelles que tu veux recevoir.' })); return; }
  box.append(h('div.loading', { style: { minHeight: '80px' } }, h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
  let s = {};
  try { s = (await act('au_release22', 'settings'))?.settings || {}; } catch (e) { box.replaceChildren(h('p.note', { text: e.message })); return; }
  const state = { email: !!s.email, push: !!s.push, frequency: s.frequency || 'weekly', topics: new Set(Array.isArray(s.topics) ? s.topics : ['patches']), quietStart: Number.isInteger(s.quietStart) ? s.quietStart : 23, quietEnd: Number.isInteger(s.quietEnd) ? s.quietEnd : 9 };
  const hours = (v, onChange, label) => h('select.input', { 'aria-label': label, style: { width: 'auto', minHeight: '44px' }, onchange: (e) => onChange(Number(e.target.value)) }, Array.from({ length: 24 }, (_, i) => h('option', { value: String(i), selected: i === v, text: i + ' h' })));
  const saveBtn = h('button.btn.btn-main', { type: 'button', text: 'Enregistrer mes choix', onclick: async () => {
    saveBtn.disabled = true;
    try {
      if (state.push && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
      await act('au_release22', 'save_settings', { settings: { email: state.email, push: state.push && 'Notification' in window && Notification.permission === 'granted', frequency: state.frequency, topics: [...state.topics], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, quietStart: state.quietStart, quietEnd: state.quietEnd, platform: 'web' } });
      toast('Choix enregistrés.');
    } catch (e) { toast(e.message); }
    saveBtn.disabled = false;
  } });
  box.replaceChildren(
    h('p.note', { text: 'Rien n’est envoyé sans ton accord. Chaque e-mail contient un lien de désinscription.' }),
    toggle('Recevoir des e-mails', state.email, (v) => { state.email = v; }),
    toggle('Notifications dans ce navigateur', state.push, (v) => { state.push = v; }),
    h('div.field', h('span', { text: 'Fréquence' }), seg([['weekly', 'Une fois par semaine'], ['slots', 'Quelques fois par semaine'], ['hourly', 'Dès qu’il y a du nouveau']], state.frequency, (v) => { state.frequency = v; }, 'Fréquence')),
    h('div.field', h('span', { text: 'Sujets' }), ...TOPICS.map(([id, label]) => toggle(label, state.topics.has(id), (v) => { if (v) state.topics.add(id); else state.topics.delete(id); }))),
    h('div.field', h('span', { text: 'Heures calmes (aucune notification)' }), h('div.row-actions', { style: { alignItems: 'center' } }, h('span', { text: 'de' }), hours(state.quietStart, (v) => { state.quietStart = v; }, 'Début des heures calmes'), h('span', { text: 'à' }), hours(state.quietEnd, (v) => { state.quietEnd = v; }, 'Fin des heures calmes'))),
    h('div.row-actions', saveBtn));
}

/* ---------- Sauvegarde ---------- */
function sauvegarde(body) {
  const status = h('p.note', { role: 'status' });
  body.append(
    group('Exporter',
      h('p', { text: 'Télécharge un fichier avec tes favoris et tes playlists. Garde-le précieusement : il permet de tout retrouver sur un autre appareil, même sans compte.' }),
      h('div.row-actions', h('button.btn.btn-main', { type: 'button', onclick: exportBackup }, icon('download'), h('span', { text: 'Télécharger ma sauvegarde' })))),
    group('Restaurer',
      h('p', { text: 'Choisis un fichier de sauvegarde Avant l’usine. Tu pourras ajouter son contenu à ta bibliothèque actuelle ou la remplacer.' }),
      h('label.btn.btn-line', { style: { cursor: 'pointer', justifySelf: 'start' } }, 'Choisir un fichier', h('input.sr', { type: 'file', accept: '.json,application/json', onchange: (e) => importBackup(e.target.files[0]) })),
      status));

  async function exportBackup() {
    const data = { format: 'avant-l-usine-sauvegarde', version: 26, created_at: new Date().toISOString(), library: lib.snapshot() };
    if (account()?.roles?.creator || account()?.roles?.moderator) {
      try { const proof = await rpc('au_backup_role_18v06', { p_action: 'issue', p_token: null }); data.role = proof; } catch { /* rôle non inclus */ }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'avant-l-usine-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    toast('Sauvegarde téléchargée.');
  }

  async function importBackup(file) {
    if (!file) return;
    status.textContent = '';
    let data;
    try { data = JSON.parse(await file.text()); } catch { status.textContent = 'Ce fichier n’est pas une sauvegarde Avant l’usine lisible.'; return; }
    const library = data.library || data;
    if (!Array.isArray(library?.favorites) && !Array.isArray(library?.playlists)) { status.textContent = 'Sauvegarde Avant l’usine non reconnue.'; return; }
    const unknown = [...(library.favorites || []), ...(library.playlists || []).flatMap((p) => p.keys || [])].filter((k) => !cat.track(k));
    const replace = await confirm('Restaurer la sauvegarde', `${(library.favorites || []).length} favoris et ${(library.playlists || []).length} playlists trouvés${unknown.length ? ` (${unknown.length} morceaux inconnus seront ignorés)` : ''}. Remplacer ta bibliothèque actuelle ? Choisis « Annuler » pour seulement ajouter.`, { ok: 'Remplacer' });
    const cur = lib.snapshot();
    const keep = (k) => !!cat.track(k);
    const fav = replace ? (library.favorites || []).filter(keep) : [...new Set([...cur.favorites, ...(library.favorites || []).filter(keep)])];
    const pls = replace ? [] : cur.playlists;
    for (const p of library.playlists || []) {
      if (!p?.name) continue;
      const target = pls.find((x) => x.id === p.id) || (() => { const n = { id: p.id || String(Date.now()) + Math.random(), name: String(p.name).slice(0, 80), keys: [] }; pls.push(n); return n; })();
      for (const k of p.keys || []) if (keep(k) && !target.keys.includes(k)) target.keys.push(k);
    }
    lib.replaceAll({ favorites: fav, playlists: pls });
    if (data.role?.token && account()) { try { await rpc('au_backup_role_18v06', { p_action: 'redeem', p_token: data.role.token }); toast('Rôle restauré.'); } catch (e) { toast(e.message); } }
    status.textContent = 'Sauvegarde restaurée.';
    toast('Sauvegarde restaurée.');
  }
}

/* ---------- Données et suppression ---------- */
function confidentialite(body) {
  const reason = h('select.input', h('option', { value: 'unused', text: 'Je n’utilise plus le site' }), h('option', { value: 'privacy', text: 'Pour protéger mes données' }), h('option', { value: 'community', text: 'À cause de la communauté' }), h('option', { value: 'technical', text: 'Problème technique' }), h('option', { value: 'other', text: 'Autre raison' }));
  const details = h('textarea.input', { maxlength: '2000', placeholder: 'Facultatif : dis-nous ce qui t’a manqué.' });
  const typed = h('input.input', { autocomplete: 'off', spellcheck: 'false', placeholder: 'SUPPRIMER' });
  body.append(
    group('Tes données',
      h('p', { text: 'Ton adresse e-mail reste privée. Tes favoris, playlists, statistiques et réglages ne servent qu’à ton propre usage.' }),
      h('a.btn.btn-line', { href: '#/a-propos/confidentialite', style: { justifySelf: 'start' }, text: 'Lire la page Confidentialité' })),
    group('Supprimer mon compte',
      h('p', { text: 'La suppression est définitive : profil, messages, favoris synchronisés et statistiques seront effacés. Pense à télécharger une sauvegarde avant.' }),
      h('label.field', h('span', { text: 'Pourquoi pars-tu ?' }), reason),
      h('label.field', h('span', { text: 'Un commentaire' }), details),
      h('label.field', h('span', { text: 'Écris SUPPRIMER pour confirmer' }), typed),
      h('div.row-actions', h('button.btn.btn-danger', { type: 'button', text: 'Supprimer définitivement mon compte', onclick: async () => {
        if (typed.value.trim() !== 'SUPPRIMER') { toast('Écris SUPPRIMER en majuscules pour confirmer.'); typed.focus(); return; }
        try { await act('au_moderation_v12', 'delete_self', { confirm: 'SUPPRIMER', reason: reason.value, details: details.value.trim() }); toast('Ton compte a été supprimé.'); const { signOut } = await import('../core/account.js?v=202611161845'); await signOut().catch(() => {}); go('/'); }
        catch (e) { toast(e.message); }
      } }))));
}
