import { h, icon } from '../../core/dom.js?v=202611152246';
import { rpc } from '../../core/api.js?v=202611152246';
import * as cat from '../../core/catalog.js?v=202611152246';
import * as player from '../../core/player.js?v=202611152246';
import { account } from '../../core/account.js?v=202611152246';
import { record } from '../../core/stats.js?v=202611152246';

const LEVELS = [
  { id: 'easy', label: 'Tranquille', seconds: 10, hint: '10 secondes d’écoute' },
  { id: 'medium', label: 'Connaisseur', seconds: 5, hint: '5 secondes d’écoute' },
  { id: 'hard', label: 'Expert', seconds: 1.5, hint: 'Une seule note' },
];
const ROUNDS = [10, 20, 50];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

export default function blindTest(body) {
  let level = LEVELS[0];
  let rounds = 10;
  let pool = new Set(cat.allTracks().map((t) => t.key));
  let game = null;
  const extract = new Audio();
  extract.preload = 'auto';
  let stopTimer = 0;
  let clockRaf = 0;
  let resumeMain = false;
  let pickerOpen = false;

  setup();
  return () => endGame(true);

  function setup() {
    const levelBtns = LEVELS.map((l) => h('button.choice', { type: 'button', 'aria-pressed': String(l === level), onclick: () => { level = l; setup(); } },
      h('span', { text: l.label }), h('small', { text: l.hint })));
    levelBtns.forEach((b) => { if (b.getAttribute('aria-pressed') === 'true') b.style.outline = '2px solid var(--accent)'; });
    const roundBtns = ROUNDS.map((n) => h('button.chip', { type: 'button', 'aria-pressed': String(n === rounds), text: n + ' morceaux', onclick: () => { rounds = n; setup(); } }));
    const selCount = h('span', { text: pool.size + ' morceaux sélectionnés' });
    // Le panneau reste ouvert quand on coche un volume entier (l'écran est reconstruit, l'état ouvert est conservé).
    const picker = h('details.tile', { open: pickerOpen, ontoggle: (e) => { pickerOpen = e.target.open; } }, h('summary', { style: { cursor: 'pointer', fontWeight: '600' } }, 'Choisir les morceaux · ', selCount),
      h('div.row-actions', { style: { margin: '12px 0' } },
        h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Tout cocher', onclick: () => { pool = new Set(cat.allTracks().map((t) => t.key)); setup(); } }),
        h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Tout décocher', onclick: () => { pool.clear(); setup(); } })),
      cat.available().map((v) => h('fieldset', { style: { border: '0', padding: '0', margin: '0 0 12px' } },
        h('legend', { style: { fontWeight: '600', marginBottom: '8px' } }, h('label', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
          h('input', { type: 'checkbox', checked: v.tracks.every((t) => pool.has(t.key)), onchange: (e) => { v.tracks.forEach((t) => (e.target.checked ? pool.add(t.key) : pool.delete(t.key))); setup(); } }), v.title)),
        h('div', { style: { display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,230px),1fr))' } },
          v.tracks.map((t) => h('label', { style: { display: 'flex', gap: '10px', alignItems: 'center', minWidth: '0' } },
            h('input', { type: 'checkbox', checked: pool.has(t.key), onchange: (e) => { if (e.target.checked) pool.add(t.key); else pool.delete(t.key); selCount.textContent = pool.size + ' morceaux sélectionnés'; } }),
            h('span', { style: { minWidth: '0', textWrap: 'balance' }, text: t.title })))))));
    const history = h('div');
    body.replaceChildren(h('div', { style: { display: 'grid', gap: '22px', maxWidth: '760px' } },
      h('div', { style: { display: 'grid', gap: '10px' } }, h('h2', { style: { fontSize: '22px' }, text: 'Niveau' }), h('div', { style: { display: 'grid', gap: '10px' } }, levelBtns)),
      h('div', { style: { display: 'grid', gap: '10px' } }, h('h2', { style: { fontSize: '22px' }, text: 'Longueur de la partie' }), h('div.row-actions', roundBtns)),
      picker,
      h('div.row-actions', h('button.btn.btn-main', { type: 'button', disabled: pool.size < 4, onclick: start }, icon('play'), h('span', { text: 'Lancer la partie' }))),
      pool.size < 4 ? h('p.note', { text: 'Sélectionne au moins 4 morceaux.' }) : null,
      history));
    if (account()) rpc('au_blind_history_17v01').then((r) => {
      if (!r?.games) return;
      history.replaceChildren(h('div.tile', h('h3', { text: 'Ton parcours' }),
        h('p', { text: `${r.games} partie${r.games > 1 ? 's' : ''} · meilleur score ${r.bestScore} · ${r.correct} bonne${r.correct > 1 ? 's' : ''} réponse${r.correct > 1 ? 's' : ''} sur ${r.rounds}` + (r.fastestMs ? ` · réponse la plus rapide en ${(r.fastestMs / 1000).toFixed(1).replace('.', ',')} s` : '') })));
    }).catch(() => {});
  }

  function start() {
    const keys = shuffle([...pool]).slice(0, rounds);
    game = { id: uuid(), keys, i: 0, score: 0, played: 0, skipped: 0, answeredAt: 0 };
    resumeMain = player.isPlaying();
    if (resumeMain) player.el.pause();
    round();
  }

  function round() {
    const key = game.keys[game.i];
    const t = cat.track(key);
    const others = shuffle(cat.allTracks().filter((x) => x.key !== key && x.title !== t.title)).slice(0, 3);
    const answers = shuffle([t, ...others]);
    const clock = h('output', { style: { fontVariantNumeric: 'tabular-nums', fontSize: '15px', color: 'var(--muted)' }, text: '0,0 s' });
    const listen = h('button.btn.btn-main', { type: 'button', onclick: play }, icon('play'), h('span', { text: 'Écouter l’extrait' }));
    const grid = h('div', { style: { display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))' } },
      answers.map((a) => h('button.choice', { type: 'button', dataset: { key: a.key }, style: { minHeight: '64px', justifyContent: 'flex-start', gap: '14px' }, onclick: () => answer(a.key) },
        h('img', { src: a.volume.cover, alt: '', width: '44', height: '44', style: { width: '44px', height: '44px', borderRadius: '4px', flex: 'none' } }),
        h('span', { style: { display: 'grid', textAlign: 'left', minWidth: '0' } }, h('span', { text: a.title }), h('small', { text: a.volume.label })))));
    const after = h('div.row-actions');
    body.replaceChildren(h('div', { style: { display: 'grid', gap: '20px', maxWidth: '820px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' } },
        h('p', { style: { fontWeight: '600' }, text: `Morceau ${game.i + 1} sur ${game.keys.length}` }),
        h('p.note', { text: `Score : ${game.score} · ${level.label}` })),
      h('div.row-actions', { style: { alignItems: 'center' } }, listen, clock),
      grid,
      h('div.row-actions',
        h('button.btn.btn-line', { type: 'button', text: 'Je ne sais pas', onclick: () => answer(null) }),
        h('button.btn.btn-soft', { type: 'button', text: 'Extrait illisible, passer', title: 'Le morceau ne se charge pas : il est retiré du score.', onclick: skip }),
        h('button.btn.btn-soft', { type: 'button', text: 'Quitter la partie', onclick: () => { endGame(false); setup(); } })),
      after));
    game.view = { grid, after, clock, listen, t };
    game.started = 0;
    extract.src = t.src;
    body.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }

  function play() {
    const { t } = game.view;
    const go = () => {
      const d = extract.duration || 120;
      extract.currentTime = Math.max(5, d * (0.2 + Math.random() * 0.4));
      extract.play().catch(() => {});
      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => extract.pause(), level.seconds * 1000);
      if (!game.started) { game.started = performance.now(); tick(); }
      game.view.listen.lastChild.textContent = 'Réécouter l’extrait';
    };
    if (extract.readyState >= 1) go(); else extract.addEventListener('loadedmetadata', go, { once: true });
    void t;
  }

  function tick() {
    cancelAnimationFrame(clockRaf);
    const loop = () => {
      if (!game?.started || game.done) return;
      game.view.clock.textContent = ((performance.now() - game.started) / 1000).toFixed(1).replace('.', ',') + ' s';
      clockRaf = requestAnimationFrame(loop);
    };
    loop();
  }

  function answer(key) {
    if (!game || game.done) return;
    game.done = true;
    extract.pause(); clearTimeout(stopTimer); cancelAnimationFrame(clockRaf);
    const { t, grid, after } = game.view;
    const correct = key === t.key;
    const responseMs = game.started ? Math.round(performance.now() - game.started) : null;
    game.played++;
    if (correct) game.score++;
    for (const b of grid.children) {
      b.disabled = true;
      if (b.dataset.key === t.key) { b.style.outline = '2px solid var(--ok)'; b.lastChild.firstChild.textContent = t.title + ' ✓'; }
      else if (b.dataset.key === key) b.style.outline = '2px solid var(--danger)';
      else b.style.opacity = '.5';
    }
    record('blind_round', { gameId: game.id, trackKey: t.key, difficulty: level.id, correct, responseMs, round: game.i + 1 });
    after.replaceChildren(
      h('p', { style: { fontWeight: '600', color: correct ? 'var(--ok)' : 'var(--danger)', alignSelf: 'center' }, text: correct ? 'Bien joué.' : key ? 'Raté : c’était « ' + t.title + ' ».' : 'C’était « ' + t.title + ' ».' }),
      h('button.btn.btn-main', { type: 'button', text: game.i + 1 < game.keys.length ? 'Morceau suivant' : 'Voir le résultat', onclick: next }));
    after.lastChild.focus({ preventScroll: true });
  }

  function skip() {
    if (!game) return;
    extract.pause(); clearTimeout(stopTimer); cancelAnimationFrame(clockRaf);
    game.skipped++;
    next();
  }

  function next() {
    game.i++; game.done = false;
    if (game.i < game.keys.length) return round();
    record('blind_game', { gameId: game.id, difficulty: level.id, rounds: game.played, score: game.score, completed: true });
    const total = game.played;
    body.replaceChildren(h('div.tile', { style: { maxWidth: '560px', gap: '14px' } },
      h('h2', { style: { fontSize: '30px' }, text: `${game.score} sur ${total}` }),
      h('p', { text: total ? (game.score / total >= 0.8 ? 'Impressionnant, tu connais tes classiques.' : game.score / total >= 0.5 ? 'Belle partie.' : 'Il est temps de réécouter les volumes.') : 'Aucun morceau joué.' }),
      game.skipped ? h('p.note', { text: `${game.skipped} extrait${game.skipped > 1 ? 's' : ''} illisible${game.skipped > 1 ? 's' : ''}, non compté${game.skipped > 1 ? 's' : ''}.` }) : null,
      h('div.row-actions', h('button.btn.btn-main', { type: 'button', text: 'Rejouer', onclick: start }), h('button.btn.btn-line', { type: 'button', text: 'Changer les réglages', onclick: () => { endGame(false); setup(); } }))));
    endGame(false, true);
  }

  function endGame(leaving, keepResult) {
    extract.pause(); extract.removeAttribute('src'); clearTimeout(stopTimer); cancelAnimationFrame(clockRaf);
    if (!keepResult) game = null;
    if (resumeMain) { resumeMain = false; player.el.play().catch(() => {}); }
    void leaving;
  }
}
