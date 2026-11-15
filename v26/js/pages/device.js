// « Sur cet appareil » (ex-Local). Sur le site web : préparer un volume complet à emporter
// (audio étiqueté, pochettes, paroles synchronisées en LRC) grâce aux modules d'export de l'ancien site, réutilisés tels quels.
// L'import et le stockage de fichiers personnels restent dans les applications (avec le même surlignage estimé des paroles).
import { h, icon } from '../core/dom.js?v=202611152246';
import * as cat from '../core/catalog.js?v=202611152246';
import { toast } from '../ui/overlay.js?v=202611152246';

let modPromise = null;
function loadExport() {
  const add = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.append(s); });
  modPromise ||= (async () => {
    if (!window.AU_LOCAL_STORAGE_18 && !window.AU_LOCAL_18) await add('../local-storage-18v07.js');
    if (!window.AU_LOCAL_18) await add('../local-18v00.js');
    if (!window.AU_AUDIO_EDITS_19) await add('../audio-edits-19v06.js');
    return import('../../../album-download-21.mjs?v=202611152246');
  })();
  modPromise.catch(() => { modPromise = null; });
  return modPromise;
}

export default function device(body) {
  let controller = null;
  const list = h('div.tracks');
  const status = h('div', { role: 'status', 'aria-live': 'polite', style: { display: 'grid', gap: '10px' } });
  body.replaceChildren(h('div', { style: { display: 'grid', gap: '24px', maxWidth: '760px' } },
    h('div.tile', { style: { gap: '8px' } },
      h('h3', { text: 'Emporter un volume' }),
      h('p', { text: 'Le site prépare une archive avec chaque morceau (titre, numéro et pochette intégrés), la pochette en grand et les paroles synchronisées lisibles par la plupart des lecteurs. La préparation se fait sur ton appareil : garde cet onglet ouvert jusqu’au téléchargement.' })),
    list, status,
    h('div.tile', { style: { gap: '8px' } },
      h('h3', { text: 'Tes propres fichiers' }),
      h('p', { text: 'Importer tes fichiers audio et les garder durablement est possible dans les applications Avant l’usine. Leurs paroles y défilent avec le même surlignage estimé que sur le site.' }),
      h('a.btn.btn-line.btn-sm', { href: '#/a-propos/applications', style: { justifySelf: 'start' }, text: 'Voir les applications' }))));
  list.replaceChildren(...cat.available().map((v) => h('div.trk.with-cover',
    h('img.trk-cover', { src: v.cover, alt: '', width: '44', height: '44' }),
    h('span.trk-main', h('span.trk-title', { text: v.title }), h('span.trk-sub', { text: v.tracks.length + ' morceaux' })),
    h('button.btn.btn-line.btn-sm', { type: 'button', onclick: () => prepare(v) }, icon('download'), h('span', { text: 'Préparer' })))));
  return () => controller?.abort();

  async function prepare(v) {
    if (controller) { toast('Une préparation est déjà en cours.'); return; }
    controller = new AbortController();
    const bar = h('progress', { max: '100', value: '0', style: { width: '100%', height: '8px', accentColor: 'var(--accent)' } });
    const line = h('p.note', { text: 'Chargement des outils de préparation…' });
    const cancel = h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Annuler', onclick: () => controller?.abort() });
    status.replaceChildren(h('p', { style: { fontWeight: '600' }, text: v.title }), bar, line, h('div.row-actions', cancel));
    try {
      const { prepareAlbum, albumZip } = await loadExport();
      const snapshot = {
        number: v.number, title: v.title, name: v.title,
        cover: new URL(v.cover, location.href).href, motion: v.motion ? new URL(v.motion, location.href).href : '',
        tracks: v.tracks.map((t) => ({ number: t.number, title: t.fullTitle, artist: t.artist, src: t.src, filename: t.filename })),
      };
      const result = await prepareAlbum(snapshot, { signal: controller.signal, onprogress: ({ position, total, title, stage }) => {
        bar.value = Math.round(((position - 1) / total) * 90);
        line.textContent = `${position} sur ${total} · ${title} · ${stage}`;
      } });
      line.textContent = 'Fabrication de l’archive…';
      const zip = await albumZip({ ...result, name: v.title, preparedAt: new Date().toISOString() }, () => {});
      bar.value = 100;
      const blob = zip instanceof Blob ? zip : zip?.blob;
      const a = h('a', { href: URL.createObjectURL(blob), download: v.title.replace(/[\\/:*?"<>|]/g, '') + '.zip' });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 120000);
      const missing = result.missing?.length || 0;
      status.replaceChildren(h('p', { style: { fontWeight: '600', color: 'var(--ok)' }, text: 'Archive prête et téléchargée.' }),
        missing ? h('p.note', { text: `${missing} morceau${missing > 1 ? 'x' : ''} n’${missing > 1 ? 'ont' : 'a'} pas pu être récupéré${missing > 1 ? 's' : ''} : ` + result.missing.map((m) => m.title).join(', ') + '.' }) : null);
    } catch (e) {
      status.replaceChildren(h('p.note', { text: controller?.signal.aborted ? 'Préparation annulée.' : 'La préparation a échoué : ' + (e.message || 'erreur inconnue') + '.' }));
    } finally { controller = null; }
  }
}
