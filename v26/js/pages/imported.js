// Mes musiques importées : import, écoute, paroles (surlignage estimé ou synchronisé dans l'Atelier),
// pochettes classiques ou animées, Blind Test. Tout reste sur l'appareil.
import { h, icon, clock } from '../core/dom.js?v=202611161830';
import { on } from '../core/bus.js?v=202611161830';
import * as local from '../core/local.js?v=202611161830';
import * as player from '../core/player.js?v=202611161830';
import { forgetLyrics } from '../core/lyrics.js?v=202611161830';
import { app, inApp, localOnly, standalone, isIOS, isPhone } from '../core/platform.js?v=202611161830';
import { sheet, toast, confirm } from '../ui/overlay.js?v=202611161830';
import { markCurrent } from '../ui/track.js?v=202611161830';

const pick = (accept, multiple = false) => new Promise((resolve) => {
  const input = h('input', { type: 'file', accept, multiple, style: { display: 'none' } });
  input.addEventListener('change', () => { resolve([...input.files]); input.remove(); }, { once: true });
  document.body.append(input);
  input.click();
});

/** Avertissement : sur un site web, le navigateur peut effacer les fichiers importés. */
function warning() {
  if (inApp || standalone) return null;
  if (!isPhone) {
    return h('div.tile.notice', { role: 'note' },
      h('h3', { text: 'Garde tes musiques à l’abri' }),
      h('p', { text: 'Sur un site web, le navigateur peut effacer tes musiques importées (nettoyage, manque de place, navigation privée). Pour les garder pour toujours, installe l’appli Windows Avant l’usine : c’est le même site, en appli.' }),
      h('a.btn.btn-line.btn-sm', { href: '#/a-propos/applications', style: { justifySelf: 'start' }, text: 'Installer l’appli Windows' }));
  }
  const steps = isIOS
    ? ['Ouvre ce site dans Safari.', 'Touche le bouton Partager (le carré avec une flèche vers le haut).', 'Choisis « Sur l’écran d’accueil ».', 'Touche « Ajouter ». Ouvre ensuite Avant l’usine depuis son icône.']
    : ['Ouvre ce site dans Chrome.', 'Touche le menu ⋮ en haut à droite.', 'Choisis « Ajouter à l’écran d’accueil » ou « Installer l’application ».', 'Confirme avec « Ajouter » ou « Installer ». Ouvre ensuite Avant l’usine depuis son icône.'];
  return h('div.tile.notice', { role: 'note' },
    h('h3', { text: 'Garde tes musiques à l’abri' }),
    h('p', { text: 'Sur un site web, ton téléphone peut effacer tes musiques importées, par exemple si tu ne reviens pas pendant plusieurs jours. Ajoute Avant l’usine à ton écran d’accueil pour les protéger :' }),
    h('ol.steps', steps.map((s) => h('li', { text: s }))));
}

export default function imported(body) {
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const listBox = h('div', { style: { display: 'grid', gap: '28px' } });
  const importBtn = h('button.btn.btn-main', { type: 'button', onclick: doImport }, icon('plus'), h('span', { text: 'Importer des musiques' }));
  const blindBtn = h('a.btn.btn-line', { href: '#/communaute/blind-test?source=appareil' }, h('span', { text: 'Blind Test avec mes musiques' }));
  body.append(h('div', { style: { display: 'grid', gap: '24px' } },
    warning(),
    h('div.row-actions', importBtn, blindBtn),
    status, listBox,
    localOnly ? h('div.row-actions', { style: { borderTop: '1px solid var(--line)', paddingTop: '18px' } },
      h('a.btn.btn-soft.btn-sm', { href: '#/compte/reglages', text: 'Réglages' }),
      h('a.btn.btn-soft.btn-sm', { href: '#/a-propos/confidentialite', text: 'Confidentialité' }),
      updateHost()) : null));

  const offs = [on('local', paint), on('player', () => markCurrent(listBox))];
  listBox.append(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
  local.ready().then(paint).catch((e) => listBox.replaceChildren(h('p.empty', { text: 'Le stockage de cet appareil est indisponible : ' + e.message })));
  return () => offs.forEach((f) => f?.());

  function paint() {
    const all = local.tracks();
    blindBtn.hidden = all.length < 4;
    if (!all.length) {
      listBox.replaceChildren(h('div.tile', { style: { gap: '8px' } },
        h('h3', { text: 'Aucune musique importée pour l’instant' }),
        h('p', { text: 'Importe tes fichiers audio (MP3, M4A, FLAC, WAV…). Le titre, l’artiste, l’album et la pochette intégrés sont repris automatiquement. Tes paroles défileront avec le surlignage estimé, ou synchronisé si tu passes par l’Atelier.' })));
      return;
    }
    const groups = new Map();
    for (const t of all) {
      const a = local.albumOf(t.id);
      const k = a?.id || '';
      if (!groups.has(k)) groups.set(k, { album: a, tracks: [] });
      groups.get(k).tracks.push(t);
    }
    listBox.replaceChildren(...[...groups.values()].map(({ album, tracks }) => {
      const t0 = tracks[0];
      const keys = tracks.map((t) => t.key);
      const head = h('div.local-head',
        coverNode(t0.volume.cover, t0.volume.motion, 'local-cover'),
        h('div', { style: { display: 'grid', gap: '4px', minWidth: '0' } },
          h('h3', { text: album?.name || 'Sans album' }),
          h('p.note', { text: tracks.length + (tracks.length > 1 ? ' morceaux' : ' morceau') }),
          h('div.row-actions',
            h('button.btn.btn-main.btn-sm', { type: 'button', onclick: () => { player.playList(keys, keys[0]); window.AU26.openPlayer(); } }, icon('play'), h('span', { text: 'Écouter' })),
            album ? h('button.btn.btn-line.btn-sm', { type: 'button', text: 'Pochette de l’album', onclick: () => coverSheet({ album }) }) : null)));
      return h('section', { style: { display: 'grid', gap: '8px' } }, head,
        h('div.tracks', tracks.map((t) => row(t, keys))));
    }));
    markCurrent(listBox);
  }

  function row(t, keys) {
    const r = local.record(t.id);
    const sub = [r.artist, clock(t.duration), t.lyricsData?.sync_mode === 'highlight' ? 'synchronisé' : t.plain ? 'paroles' : ''].filter(Boolean).join(' · ');
    return h('div.trk.with-cover', { dataset: { key: t.key } },
      h('img.trk-cover', { src: t.volume.cover, alt: '', width: '44', height: '44' }),
      h('button.trk-main', { type: 'button', 'aria-label': 'Écouter ' + t.title, onclick: () => { if (t.unavailable) { toast('Ce fichier n’est plus lisible sur cet appareil. Importe-le à nouveau.'); return; } player.playList(keys, t.key); } },
        h('span.trk-title', { text: t.title }), sub ? h('span.trk-sub', { text: sub }) : null),
      h('span.trk-tools', h('button.icon-btn', { type: 'button', 'aria-label': 'Options de ' + t.title, onclick: () => options(t) }, icon('more'))));
  }

  async function doImport() {
    const files = await pick(local.AUDIO_TYPES, true);
    if (!files.length) return;
    importBtn.disabled = true;
    const bar = h('progress', { max: String(files.length), value: '0', style: { width: '100%', height: '8px', accentColor: 'var(--accent)' } });
    const line = h('p.note', { text: 'Préparation…' });
    status.replaceChildren(h('div.tile', { style: { gap: '8px' } }, bar, line));
    try {
      const { added, failed } = await local.importFiles(files, ({ position, total, name }) => { bar.value = position - 1; line.textContent = `${position} sur ${total} · ${name}`; });
      status.replaceChildren(h('p.note', { text: added + (added > 1 ? ' morceaux importés.' : ' morceau importé.') + (failed.length ? ' Non importé' + (failed.length > 1 ? 's' : '') + ' : ' + failed.map((f) => f.name).join(', ') + '.' : '') }));
    } catch (e) { status.replaceChildren(h('p.note', { text: e.message })); }
    finally { importBtn.disabled = false; }
  }

  function options(t) {
    sheet(t.title, (b, s) => {
      const act = (label, ico, fn, cls = '.btn-line') => h('button.btn' + cls, { type: 'button', style: { justifyContent: 'flex-start' }, onclick: () => { s.close(); fn(); } }, ico ? icon(ico) : null, h('span', { text: label }));
      b.append(h('div', { style: { display: 'grid', gap: '10px' } },
        act('Écouter', 'play', () => player.playList(t.volume.tracks.map((x) => x.key), t.key)),
        act('Modifier les infos', 'edit', () => editInfo(t)),
        act('Paroles', 'lyrics', () => editLyrics(t)),
        act('Synchroniser dans l’Atelier', 'lyrics', () => import('./community/studio.js?v=202611161830').then((m) => m.openStudio(t.key))),
        act('Pochette (classique ou animée)', 'cover', () => coverSheet({ t })),
        act('Supprimer de l’appareil', 'trash', () => remove(t), '.btn-soft')));
    });
  }

  function editInfo(t) {
    const r = local.record(t.id);
    sheet('Modifier les infos', (b, s) => {
      const title = h('input.input', { value: r.title || '', maxlength: '200' });
      const artist = h('input.input', { value: r.artist || '', maxlength: '200' });
      b.append(h('form', { style: { display: 'grid', gap: '14px' }, onsubmit: async (e) => {
        e.preventDefault();
        if (!title.value.trim()) { title.focus(); return; }
        try { await local.updateTrack(t.id, { title: title.value.trim(), artist: artist.value.trim() }); s.close(); toast('Infos enregistrées.'); } catch (err) { toast(err.message); }
      } }, h('label.field', h('span', { text: 'Titre' }), title), h('label.field', h('span', { text: 'Artiste' }), artist),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Enregistrer' }))));
    });
  }

  function editLyrics(t) {
    const r = local.record(t.id);
    sheet('Paroles', (b, s) => {
      const area = h('textarea.input', { rows: '12', placeholder: 'Une phrase par ligne. Les chœurs entre parenthèses s’affichent sous la phrase.', 'aria-label': 'Paroles' });
      area.value = r.plain || (r.lyrics?.lines || []).join('\n');
      const synced = r.lyrics?.sync_mode === 'highlight';
      b.append(h('div', { style: { display: 'grid', gap: '14px' } },
        h('p.note', { text: synced ? 'Ce morceau est synchronisé. Si tu modifies le texte, la synchronisation sera retirée et le surlignage redeviendra estimé.' : 'Sans synchronisation, les paroles défilent avec un surlignage estimé. Pour un surlignage exact, passe ensuite par l’Atelier.' }),
        area,
        h('div.row-actions',
          h('button.btn.btn-main', { type: 'button', text: 'Enregistrer', onclick: async () => {
            const text = area.value.replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean).join('\n');
            const same = text === (r.plain || (r.lyrics?.lines || []).join('\n'));
            try { await local.updateTrack(t.id, same ? {} : { plain: text, lyrics: null }); forgetLyrics(t.key); s.close(); toast('Paroles enregistrées.'); } catch (e) { toast(e.message); }
          } }))));
    });
  }

  function coverSheet({ t, album }) {
    sheet(album ? 'Pochette de l’album' : 'Pochette du morceau', (b, s) => {
      const choose = async () => {
        const [file] = await pick(local.COVER_TYPES);
        if (!file) return;
        if (file.size > 60 * 1024 * 1024) { toast('Fichier trop lourd (60 Mo au maximum).'); return; }
        try { await (album ? local.setAlbumCover(album.id, file) : local.setCover(t.id, file)); s.close(); toast('Pochette enregistrée.'); } catch (e) { toast(e.message); }
      };
      b.append(h('div', { style: { display: 'grid', gap: '14px' } },
        h('p', { text: 'Choisis une image (pochette classique) ou une courte vidéo (pochette animée, lue en boucle sans son). Tu peux avoir les deux : l’image sert quand l’animation ne peut pas être lue.' }),
        h('div.row-actions',
          h('button.btn.btn-main', { type: 'button', text: 'Choisir un fichier', onclick: choose }),
          h('button.btn.btn-soft', { type: 'button', text: 'Retirer les pochettes', onclick: async () => { try { await (album ? local.setAlbumCover(album.id, null) : local.setCover(t.id, null)); s.close(); toast('Pochettes retirées.'); } catch (e) { toast(e.message); } } }))));
    });
  }

  async function remove(t) {
    if (!(await confirm('Supprimer ce morceau ?', '« ' + t.title + ' » sera effacé de cet appareil, avec ses paroles et sa pochette. Ce n’est pas réversible.', { ok: 'Supprimer', danger: true }))) return;
    if (player.current()?.key === t.key) player.el.pause();
    try { await local.removeTracks([t.id]); toast('Morceau supprimé.'); } catch (e) { toast(e.message); }
  }
}

/** Applis iPhone et Android : emplacement où ios.js / android.js (mises à jour de l'appli) range son bouton « Forcer une mise à jour ».
 *  ios.js cherche #accountDialog et appelle sa méthode close() avant de vérifier. */
function updateHost() {
  if (app !== 'ios' && app !== 'android') return null;
  document.getElementById('accountDialog')?.remove();
  const host = h('div#accountDialog');
  host.close = () => {};
  return host;
}

/** Pochette : vidéo animée en boucle si elle existe, sinon image. */
export function coverNode(still, motion, cls) {
  if (motion && document.documentElement.dataset.motion !== 'off') {
    const v = h('video.' + cls, { src: motion, poster: still, muted: true, loop: true, playsinline: true, autoplay: true, 'aria-hidden': 'true' });
    v.muted = true; v.playsInline = true; v.play?.().catch(() => {});
    return v;
  }
  return h('img.' + cls, { src: still, alt: '' });
}
