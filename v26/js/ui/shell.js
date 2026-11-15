// En-tête, onglets, mini-lecteur et lecteur plein écran.
import { h, icon, clock } from '../core/dom.js';
import { on } from '../core/bus.js';
import * as player from '../core/player.js';
import { getLyrics, locate } from '../core/lyrics.js';
import { go } from '../router.js';
import { favButton, addToPlaylist, markCurrent } from './track.js';
import { toast } from './overlay.js';
import { account } from '../core/account.js';
import { buildFooter } from './footer.js';

const TABS = [
  ['accueil', 'Accueil', '/', 'home'],
  ['volumes', 'Volumes', '/volumes', 'disc'],
  ['recherche', 'Recherche', '/recherche', 'search'],
  ['musique', 'Ma musique', '/ma-musique', 'library'],
  ['communaute', 'Communauté', '/communaute', 'people'],
];

export function buildShell(app) {
  const navLinks = TABS.filter(([id]) => id !== 'recherche').map(([id, label, href]) => h('a', { href: '#' + href, dataset: { tab: id }, text: label }));
  const avatar = h('a.avatar', { href: '#/compte', 'aria-label': 'Mon compte', title: 'Mon compte' }, icon('user'));
  // Easter egg (phrase cachée du Guide) : 7 appuis rapides sur « Mon compte » ouvrent la candidature de modérateur.
  let taps = 0; let tapTimer = 0;
  avatar.addEventListener('click', (e) => {
    e.preventDefault();
    clearTimeout(tapTimer);
    taps++;
    if (taps === 7) { taps = 0; import('./apply.js').then((m) => m.openApplication()); return; }
    tapTimer = setTimeout(() => { taps = 0; go('/compte'); }, 600);
  });
  const top = h('header.top', h('div.wrap',
    h('a.brand', { href: '#/', 'aria-label': 'Avant l’usine, accueil' }, 'Avant l’', h('b', 'usine')),
    h('nav.nav', { 'aria-label': 'Navigation principale' }, navLinks),
    h('div.top-end',
      h('a.searchbox', { href: '#/recherche', 'aria-label': 'Rechercher' }, icon('search'), h('span', { text: 'Rechercher un morceau' })),
      avatar)));
  const tabs = h('nav.tabs', { 'aria-label': 'Onglets' }, TABS.map(([id, label, href, ic]) => h('a', { href: '#' + href, dataset: { tab: id } }, icon(ic), h('span', { text: label }))));
  const outlet = h('div.outlet');
  const mini = buildMini();
  const full = buildPlayer();
  app.replaceChildren(top, outlet, buildFooter(), mini.el, tabs, full.el);
  app.dataset.player = 'off';

  on('route', ({ detail }) => {
    for (const a of [...navLinks, ...tabs.children]) {
      if (a.dataset.tab === detail.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    full.close(false);
  });
  on('account', () => {
    const u = account();
    avatar.replaceChildren(u ? (u.avatar ? h('img', { src: u.avatar, alt: '' }) : h('span', { text: (u.name || '?').slice(0, 1).toUpperCase() })) : icon('user'));
    avatar.setAttribute('aria-label', u ? 'Mon compte (' + (u.name || 'connecté') + ')' : 'Mon compte, se connecter');
  });
  on('player', ({ detail }) => {
    if (detail.type === 'track') { app.dataset.player = 'on'; markCurrent(outlet); }
    if (detail.type === 'blocked') toast('Appuie sur lecture pour démarrer le son.');
    if (detail.type === 'error') toast('Ce morceau ne se charge pas pour le moment. Réessaie ou passe au suivant.');
  });
  return { outlet, openPlayer: full.open };

  function buildMini() {
    const cover = h('img', { alt: '', width: '52', height: '52' });
    const title = h('span.trk-title');
    const sub = h('span.trk-sub');
    const playBtn = h('button.icon-btn.play', { type: 'button', 'aria-label': 'Lecture', onclick: player.toggle }, icon('play'));
    const bar = h('i');
    const el = h('section.mini', { 'aria-label': 'Lecteur', hidden: true },
      h('button.mini-open', { type: 'button', 'aria-label': 'Ouvrir le lecteur', onclick: () => full.open() }, cover, h('span.trk-main', title, sub)),
      h('div.mini-ctrl',
        h('button.icon-btn.side', { type: 'button', 'aria-label': 'Morceau précédent', onclick: player.prev }, icon('prev')),
        playBtn,
        h('button.icon-btn.side', { type: 'button', 'aria-label': 'Morceau suivant', onclick: player.next }, icon('next'))),
      h('div.mini-bar', bar));
    const paintTrack = () => {
      const t = player.current();
      el.hidden = !t;
      if (!t) return;
      cover.src = t.volume.cover;
      title.textContent = t.title;
      sub.textContent = (t.feat ? 'feat. ' + t.feat + ' · ' : '') + t.volume.label;
    };
    const paintState = () => {
      const playing = player.isPlaying();
      playBtn.replaceChildren(icon(playing ? 'pause' : 'play'));
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
    };
    on('player', ({ detail }) => { if (detail.type === 'track') paintTrack(); paintState(); });
    on('time', () => { const a = player.el; bar.style.width = a.duration ? (a.currentTime / a.duration) * 100 + '%' : '0'; });
    paintTrack(); paintState();
    return { el, paintTrack };
  }

  function buildPlayer() {
    let view = 'cover';
    let lyricData = null;
    let lyricKey = '';
    let lineEls = [];
    let active = -1;
    let follow = true;
    let raf = 0;

    const close = h('button.icon-btn', { type: 'button', 'aria-label': 'Fermer le lecteur', onclick: () => api.close() }, icon('down'));
    const viewBtns = [['cover', 'Pochette'], ['lyrics', 'Paroles'], ['queue', 'File']].map(([id, label]) =>
      h('button.chip', { type: 'button', role: 'tab', dataset: { view: id }, text: label, onclick: () => setView(id) }));
    const coverImg = h('img', { alt: '' });
    const idTitle = h('h2');
    const idSub = h('p');
    const songLink = h('a', { href: '#/', text: 'Voir la page du morceau' });
    const coverView = h('div.p-cover', coverImg, h('div.p-id', idTitle, idSub, h('p', songLink)));
    const lyricsList = h('div.p-lyrics', { role: 'list' });
    const lyricsNote = h('p.ly-note');
    const lyricsView = h('div', { style: { display: 'grid', gridTemplateRows: 'minmax(0,1fr) auto', minHeight: '0' } }, lyricsList, lyricsNote);
    const queueView = h('div.p-queue');
    const body = h('div.player-body', coverView, lyricsView, queueView);

    const seek = h('input.seek', { type: 'range', min: '0', max: '1000', value: '0', step: '1', 'aria-label': 'Position dans le morceau' });
    const tNow = h('span', { text: '0:00' });
    const tEnd = h('span', { text: '0:00' });
    let seeking = false;
    seek.addEventListener('input', () => { seeking = true; const a = player.el; tNow.textContent = clock((seek.value / 1000) * (a.duration || 0)); paintSeek(); });
    seek.addEventListener('change', () => { const a = player.el; player.seek((seek.value / 1000) * (a.duration || 0)); seeking = false; });
    const playBtn = h('button.icon-btn.play', { type: 'button', onclick: player.toggle });
    const shuffleBtn = h('button.icon-btn', { type: 'button', 'aria-label': 'Lecture aléatoire', onclick: () => { player.setShuffle(!player.state().shuffle); } }, icon('shuffle'));
    const repeatBtn = h('button.icon-btn', { type: 'button', onclick: () => { const r = player.cycleRepeat(); toast(r === 'off' ? 'Répétition désactivée.' : r === 'all' ? 'Répétition de la liste.' : 'Répétition du morceau.'); } }, icon('repeat'));
    const actions = h('div.p-actions');
    const foot = h('div.p-foot',
      h('div.p-time', tNow, seek, tEnd),
      h('div.p-ctrl', shuffleBtn,
        h('button.icon-btn', { type: 'button', 'aria-label': 'Morceau précédent', onclick: player.prev }, icon('prev')),
        playBtn,
        h('button.icon-btn', { type: 'button', 'aria-label': 'Morceau suivant', onclick: player.next }, icon('next')),
        repeatBtn),
      actions);
    const el = h('section.player', { 'aria-label': 'Lecteur plein écran', 'aria-hidden': 'true', inert: true },
      h('div.player-top', close, h('div.tablist', { role: 'tablist', 'aria-label': 'Affichage du lecteur' }, viewBtns), h('span')),
      body, foot);

    lyricsList.addEventListener('wheel', () => { follow = false; }, { passive: true });
    lyricsList.addEventListener('touchmove', () => { follow = false; }, { passive: true });

    function setView(v) {
      view = v;
      coverView.hidden = v !== 'cover';
      lyricsView.hidden = v !== 'lyrics';
      queueView.hidden = v !== 'queue';
      for (const b of viewBtns) b.setAttribute('aria-selected', String(b.dataset.view === v));
      if (v === 'lyrics') { follow = true; loadLyrics(); }
      if (v === 'queue') paintQueue();
      loop();
    }

    function paintSeek() { seek.style.setProperty('--p', (seek.value / 10) + '%'); }

    function paintTrack() {
      const t = player.current();
      if (!t) return;
      coverImg.src = t.volume.cover;
      idTitle.textContent = t.title;
      idSub.textContent = (t.feat ? 'feat. ' + t.feat + ' · ' : t.artist + ' · ') + t.volume.title;
      songLink.href = '#/morceau/' + t.key;
      actions.replaceChildren(
        favButton(t),
        h('button.icon-btn', { type: 'button', 'aria-label': 'Ajouter à une playlist', onclick: () => addToPlaylist(t) }, icon('plus')),
        h('button.icon-btn', { type: 'button', 'aria-label': 'Partager', onclick: () => go('/morceau/' + t.key + '?partager=1') }, icon('share')));
      if (view === 'lyrics') loadLyrics();
      if (view === 'queue') paintQueue();
    }

    function paintState() {
      const playing = player.isPlaying();
      playBtn.replaceChildren(icon(playing ? 'pause' : 'play'));
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
      const s = player.state();
      shuffleBtn.setAttribute('aria-pressed', String(s.shuffle));
      repeatBtn.setAttribute('aria-pressed', String(s.repeat !== 'off'));
      repeatBtn.setAttribute('aria-label', s.repeat === 'one' ? 'Répétition du morceau' : s.repeat === 'all' ? 'Répétition de la liste' : 'Répétition désactivée');
      loop();
    }

    async function loadLyrics() {
      const t = player.current();
      if (!t || t.key === lyricKey) return;
      lyricKey = t.key; lyricData = null; active = -1; lineEls = [];
      lyricsList.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement des paroles' })));
      lyricsNote.textContent = '';
      const data = await getLyrics(t.key).catch(() => null);
      if (lyricKey !== t.key) return;
      lyricData = data;
      if (!data?.lines?.length) {
        lyricsList.replaceChildren(h('p.empty', { text: data?.membersOnly ? 'Les paroles de ce morceau sont réservées aux membres connectés.' : 'Les paroles de ce morceau ne sont pas encore disponibles.' }));
        return;
      }
      lineEls = data.lines.map((text, i) => {
        const b = h('button.ly', { type: 'button', role: 'listitem', onclick: () => { if (data.synced) { player.seek(data.times[i]); follow = true; } } }, h('span.on'), h('span.off', { text }));
        b.dataset.text = text;
        return b;
      });
      lyricsList.replaceChildren(...lineEls);
      lyricsNote.textContent = data.synced ? '' : 'Défilement estimé : ce morceau n’est pas encore synchronisé.';
      paintLyrics(true);
    }

    function paintLyrics(force) {
      if (!lyricData) return;
      const a = player.el;
      const { index, progress } = locate(lyricData, a.currentTime, a.duration);
      if (index !== active || force) {
        lineEls.forEach((b, i) => { b.classList.toggle('past', i < index); b.classList.toggle('cur', i === index); if (i !== index) { b.firstChild.textContent = ''; b.lastChild.textContent = b.dataset.text; } });
        active = index;
        if (follow && index >= 0) {
          const target = lineEls[index];
          lyricsList.scrollTo({ top: target.offsetTop - lyricsList.clientHeight * 0.38, behavior: force ? 'auto' : 'smooth' });
        }
      }
      if (index >= 0) {
        const b = lineEls[index];
        const text = b.dataset.text;
        const n = Math.round(text.length * Math.max(0, Math.min(1, progress)));
        if (b.firstChild.textContent.length !== n) { b.firstChild.textContent = text.slice(0, n); b.lastChild.textContent = text.slice(n); }
      }
    }

    function paintQueue() {
      const list = player.upcoming();
      queueView.replaceChildren(h('div.tracks', list.map(({ i, t }, n) =>
        h('div.trk.with-cover' + (n === 0 ? '.is-current' : ''), { dataset: { key: t.key } },
          h('img.trk-cover', { src: t.volume.cover, alt: '', loading: 'lazy', width: '44', height: '44' }),
          h('button.trk-main', { type: 'button', onclick: () => player.jump(i) }, h('span.trk-title', { text: t.title }), h('span.trk-sub', { text: n === 0 ? 'En cours · ' + t.volume.label : t.volume.label })),
          h('span')))));
    }

    function loop() {
      cancelAnimationFrame(raf);
      const tick = () => {
        const a = player.el;
        if (!seeking) { seek.value = a.duration ? Math.round((a.currentTime / a.duration) * 1000) : 0; tNow.textContent = clock(a.currentTime); paintSeek(); }
        tEnd.textContent = clock(a.duration);
        if (view === 'lyrics') paintLyrics(false);
        if (el.classList.contains('open') && !a.paused) raf = requestAnimationFrame(tick);
      };
      tick();
    }

    const onKey = (e) => { if (e.key === 'Escape') api.close(); };
    const api = {
      el,
      open(v) {
        if (!player.current()) return;
        if (v) setView(v);
        el.classList.add('open');
        el.removeAttribute('aria-hidden'); el.inert = false;
        document.addEventListener('keydown', onKey);
        document.documentElement.style.overflow = 'hidden';
        paintTrack(); paintState(); loop();
        close.focus({ preventScroll: true });
      },
      close(restoreFocus = true) {
        if (!el.classList.contains('open')) return;
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true'); el.inert = true;
        document.removeEventListener('keydown', onKey);
        document.documentElement.style.overflow = '';
        cancelAnimationFrame(raf);
        if (restoreFocus) document.querySelector('.mini-open')?.focus({ preventScroll: true });
      },
    };
    on('player', ({ detail }) => { if (detail.type === 'track') paintTrack(); paintState(); });
    on('time', () => { if (el.classList.contains('open') && player.el.paused) loop(); });
    setView('cover');
    return api;
  }
}
