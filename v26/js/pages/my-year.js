// « Mon année » : statistiques (moteur et libellés de l'ancien site réutilisés), résumés et trophées.
// Chaque rubrique n'est construite qu'à son ouverture : l'ancienne page fabriquait 12 000 éléments d'un coup.
import { h } from '../core/dom.js?v=202611162020';
import { rpc } from '../core/api.js?v=202611162020';
import { account } from '../core/account.js?v=202611162020';
import * as cat from '../core/catalog.js?v=202611162020';

let enginePromise = null;
function loadEngine() {
  const add = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.append(s); });
  enginePromise ||= (async () => {
    if (!window.AU_SUMMARY_RULES) await add('../summary-rules-17v01.js');
    if (!window.AU_STATS_ENGINE) await add('../statistics-engine-17v01.js');
    if (!window.AU_STATS_METRICS) await add('../metrics-17v01.js');
    return { engine: window.AU_STATS_ENGINE, metrics: window.AU_STATS_METRICS };
  })();
  enginePromise.catch(() => { enginePromise = null; });
  return enginePromise;
}

const nf = (n, d = 1) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d });
function duration(seconds) {
  const s = Math.round(Number(seconds) || 0);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60);
  if (hh) return hh + ' h' + (mm ? ' ' + String(mm).padStart(2, '0') : '');
  if (mm) return mm + ' min';
  return s + ' s';
}
function label(key) { const t = cat.track(key); return t ? t.title : key; }
/** Valeur brute du moteur → texte lisible. */
function show(v, id) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return /^a-(1|4|6|7|8|9)$/.test(id) ? duration(v) : nf(v);
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (typeof v === 'string') return /^\d+:\d+$/.test(v) ? label(v) : v;
  if (Array.isArray(v)) return v.length ? v.slice(0, 10).map((x) => show(x, '')).join(' · ') : '—';
  if (typeof v === 'object') {
    const name = v.label ?? v.name ?? v.title ?? (v.key ? label(v.key) : v.trackKey ? label(v.trackKey) : null);
    const val = v.value ?? v.seconds ?? v.count ?? v.plays ?? v.total;
    if (name != null && val != null) return name + ' (' + show(val, v.seconds != null ? 'a-1' : '') + ')';
    if (name != null) return String(name);
    return Object.entries(v).slice(0, 4).map(([k, x]) => k + ' : ' + show(x, '')).join(' · ');
  }
  return String(v);
}

export default function myYear(body) {
  if (!account()) {
    body.replaceChildren(h('p.empty', h('a', { href: '#/compte', style: { color: 'var(--accent)', fontWeight: '600' }, text: 'Connecte-toi' }), ' pour suivre ton temps d’écoute, tes morceaux préférés, tes résumés et tes trophées.'));
    return;
  }
  const now = new Date();
  let year = now.getFullYear();
  let month = -1; // -1 = année complète
  const picker = h('div.row-actions');
  const stats = h('div', { style: { display: 'grid', gap: '14px' } });
  const summaries = h('div', { style: { display: 'grid', gap: '10px' } });
  const trophies = h('div', { style: { display: 'grid', gap: '10px' } });
  body.replaceChildren(h('div', { style: { display: 'grid', gap: '28px' } },
    picker, stats,
    h('section', { style: { display: 'grid', gap: '12px' } }, h('h2', { style: { fontSize: '26px' }, text: 'Mes résumés' }), summaries),
    h('section', { style: { display: 'grid', gap: '12px' } }, h('h2', { style: { fontSize: '26px' }, text: 'Mes trophées' }), trophies)));
  paintPicker();
  loadStats();
  loadSummaries();
  loadTrophies();

  function paintPicker() {
    const years = [];
    for (let y = now.getFullYear(); y >= 2026; y--) years.push(y);
    const ySel = h('select.input', { 'aria-label': 'Année', style: { width: 'auto', minHeight: '44px' }, onchange: (e) => { year = Number(e.target.value); loadStats(); } }, years.map((y) => h('option', { value: String(y), selected: y === year, text: String(y) })));
    const mSel = h('select.input', { 'aria-label': 'Période', style: { width: 'auto', minHeight: '44px' }, onchange: (e) => { month = Number(e.target.value); loadStats(); } },
      h('option', { value: '-1', text: 'Année complète' }),
      Array.from({ length: 12 }, (_, i) => h('option', { value: String(i), selected: i === month, text: new Date(2026, i, 1).toLocaleDateString('fr-FR', { month: 'long' }) })));
    picker.replaceChildren(ySel, mSel);
  }

  async function loadStats() {
    stats.replaceChildren(h('div.loading', { style: { minHeight: '160px' } }, h('div.spin', { role: 'status', 'aria-label': 'Calcul de tes statistiques' })));
    // Bornes en heure de Paris, comme le serveur.
    const start = month < 0 ? new Date(year, 0, 1) : new Date(year, month, 1);
    const end = month < 0 ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
    try {
      const [{ engine, metrics }, facts] = await Promise.all([loadEngine(), rpc('au_stats_view_17v01', { p: { start: start.toISOString(), end: end.toISOString(), kind: month < 0 ? 'annual' : 'programmed' } })]);
      const result = engine.calculate(facts, facts.previous || null);
      paintStats(result, metrics, facts);
    } catch (e) { stats.replaceChildren(h('p.empty', { text: e.message || 'Statistiques indisponibles pour le moment.' })); }
  }

  function paintStats(r, metrics) {
    const v = r.values || {};
    const songs = Object.entries(r.songTime || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const volumes = Object.entries(r.volumeTime || {}).sort((a, b) => b[1] - a[1]);
    const card = (title, value, note) => h('div.tile', { style: { gap: '4px' } }, h('p.note', { text: title }), h('p', { style: { fontFamily: 'var(--display)', fontWeight: '600', fontSize: '30px', lineHeight: '1.15' }, text: value }), note ? h('p.note', { text: note }) : null);
    stats.replaceChildren(
      r.coverageComplete ? null : h('p.note', { text: 'Suivi disponible depuis le ' + (r.trackingSince ? new Date(r.trackingSince).toLocaleDateString('fr-FR') : '—') + ' : la période n’est que partiellement couverte.' }),
      h('div.tiles',
        card('Temps d’écoute', duration(v['a-1'] || r.total || 0)),
        card('Morceau le plus écouté', songs[0] ? label(songs[0][0]) : '—', songs[0] ? duration(songs[0][1]) : ''),
        card('Volume favori', volumes[0] ? 'Volume ' + volumes[0][0] : '—', volumes[0] ? duration(volumes[0][1]) : '')),
      songs.length ? h('div.tile', h('h3', { text: 'Tes morceaux les plus écoutés' }), h('ol', { style: { display: 'grid', gap: '6px', paddingLeft: '22px', listStyle: 'decimal' } }, songs.map(([k, s]) => h('li', { text: label(k) + ' · ' + duration(s) })))) : null,
      h('h2', { style: { fontSize: '22px', marginTop: '8px' }, text: 'Toutes les statistiques' }),
      ...metrics.map((group) => {
        const d = h('details.tile', { style: { gap: '0' } }, h('summary', { style: { cursor: 'pointer', fontWeight: '600', minHeight: '28px' }, text: group.label }));
        d.addEventListener('toggle', () => {
          if (!d.open || d.dataset.built) return;
          d.dataset.built = '1';
          d.append(h('dl.dl', { style: { marginTop: '14px' } }, group.metrics.flatMap((m) => [h('dt', { text: m.label.charAt(0).toUpperCase() + m.label.slice(1) }), h('dd', { text: show(v[m.id], m.id) })])));
        });
        return d;
      }));
  }

  async function loadSummaries() {
    try {
      const r = await rpc('au_summary_access_17v01', { p: { action: 'mine' } });
      const list = r?.summaries || [];
      summaries.replaceChildren(...(list.length ? list.map((s) => h('button.choice', { type: 'button', onclick: () => openSummary(s) },
        h('span', { text: s.kind === 'annual' ? 'Résumé ' + s.year : 'Résumé du ' + new Date(s.start).toLocaleDateString('fr-FR') + ' au ' + new Date(s.end).toLocaleDateString('fr-FR') }), h('small', { text: 'Ouvrir' })))
        : [h('p.empty', { text: 'Ton premier résumé annuel apparaîtra ici à la fin de l’année.' })]));
    } catch (e) { summaries.replaceChildren(h('p.note', { text: e.message })); }
  }

  async function openSummary(s) {
    const { sheet } = await import('../ui/overlay.js?v=202611162020');
    sheet(s.kind === 'annual' ? 'Résumé ' + s.year : 'Mon résumé', async (b) => {
      b.append(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
      try {
        const [{ engine, metrics }, data] = await Promise.all([loadEngine(), rpc('au_summary_access_17v01', { p: { action: 'read', summaryId: s.id } })]);
        const snap = data.snapshot || {};
        const r = snap.values ? snap : engine.calculate(snap, snap.previous || null);
        const synth = metrics.find((g) => g.id === 'S') || metrics.at(-1);
        b.replaceChildren(h('dl.dl', synth.metrics.flatMap((m) => [h('dt', { text: m.label.charAt(0).toUpperCase() + m.label.slice(1) }), h('dd', { text: show(r.values?.[m.id], m.id) })])));
      } catch (e) { b.replaceChildren(h('p.empty', { text: e.message })); }
    });
  }

  async function loadTrophies() {
    try {
      const r = await rpc('au_trophy_collection_17v01', { p: { action: 'list' } });
      const list = r?.trophies || [];
      trophies.replaceChildren(...(list.length ? [h('div.tiles', list.map((t) => h('div.tile', { style: { gap: '4px' } },
        h('h3', { text: t.name || t.title || t.label || 'Trophée' }), h('p', { text: t.description || '' }),
        h('p.note', { text: [t.year, t.level ? 'niveau ' + t.level : '', t.exhibited ? 'exposé sur ton profil' : ''].filter(Boolean).join(' · ') }))))]
        : [h('p.empty', { text: 'Pas encore de trophée. Ils récompensent ton écoute, tes contributions et tes parties de Blind Test.' })]));
    } catch (e) { trophies.replaceChildren(h('p.note', { text: e.message })); }
  }
}
