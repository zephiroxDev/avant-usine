// Atelier « Synchroniser des paroles » : maintenir et glisser la barre au rythme du chant, phrase par phrase.
// Produit le format attendu par le serveur (au_private.studio_validate_19) et l'envoie avec au_sync 'submit'.
import { h, icon, clock } from '../../core/dom.js?v=202611161830';
import { act } from '../../core/api.js?v=202611161830';
import * as cat from '../../core/catalog.js?v=202611161830';
import * as player from '../../core/player.js?v=202611161830';
import { account } from '../../core/account.js?v=202611161830';
import { isSung, forgetLyrics } from '../../core/lyrics.js?v=202611161830';
import { store } from '../../core/bus.js?v=202611161830';
import { sheet, toast, confirm, closeSheet } from '../../ui/overlay.js?v=202611161830';

export async function openStudio(initialKey) {
  if (player.isPlaying()) player.el.pause();
  const audio = new Audio();
  audio.preload = 'auto';
  let key = initialKey;
  let src = null;      // { lines, hash, provenance }
  let work = null;     // { lines:[{text,start,end,curve,voice}], voices:[{id,name}], i }
  let draftKey = '';
  let stroke = null;   // geste en cours { x0, p0 }
  let raf = 0;

  const s = sheet('Synchroniser des paroles', (body) => body.append(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' }))), { onClose: () => { audio.pause(); audio.removeAttribute('src'); cancelAnimationFrame(raf); save(); } });
  s.body.closest('.sheet-card').style.width = 'min(100%, 760px)';
  await load(key);

  async function load(k) {
    key = k;
    s.body.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' })));
    if (isLocal()) {
      // Musique importée : le texte vient de l'appareil ; s'il manque, on le demande d'abord.
      const t = cat.track(key);
      const text = t?.plain || (t?.lyricsData?.lines || []).join('\n');
      if (!text.trim()) { askText(t); return; }
      src = { lines: text.split('\n'), hash: 'local', provenance: 'tes paroles' };
    } else {
      try { src = await act('au_sync', 'source', { track: key }); }
      catch (e) { s.body.replaceChildren(h('p.empty', { text: e.message }), picker()); return; }
    }
    const raw = (src.lines || []).map((l) => (typeof l === 'string' ? l : l?.text || ''));
    draftKey = 'au26-studio:' + (account()?.id || 'invite') + ':' + key + ':' + src.hash;
    const draft = store.get(draftKey);
    work = draft?.lines?.length ? draft : {
      lines: raw.filter(isSung).map((text) => ({ text, start: null, end: null, curve: [], voice: 'main' })),
      voices: [{ id: 'main', name: 'Voix principale' }],
      i: 0,
    };
    audio.src = cat.track(key).src;
    audio.playbackRate = 1;
    render();
  }

  function save() { if (work && draftKey) store.set(draftKey, work); }
  function isLocal() { return String(key).startsWith('local:'); }

  /** Musique importée sans paroles : on colle le texte, une phrase par ligne. */
  function askText(t) {
    const area = h('textarea.input', { rows: '10', placeholder: 'Une phrase par ligne, telle qu’elle est chantée.', 'aria-label': 'Paroles' });
    s.body.replaceChildren(picker(),
      h('p', { text: 'Ce morceau n’a pas encore de paroles. Colle-les ici, une phrase par ligne, puis synchronise-les.' }),
      area,
      h('div.row-actions', h('button.btn.btn-main', { type: 'button', text: 'Continuer', onclick: async () => {
        const text = area.value.replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean).join('\n');
        if (!text) { area.focus(); return; }
        const local = await import('../../core/local.js?v=202611161830' + new URL(import.meta.url).search);
        await local.updateTrack(t.id, { plain: text });
        forgetLyrics(key);
        await load(key);
      } })));
  }

  function picker() {
    if (isLocal()) {
      const sel = h('select.input', { 'aria-label': 'Morceau à synchroniser' }, cat.track(key).volume.tracks.map((t) => h('option', { value: t.key, selected: t.key === key, text: t.number + '. ' + t.title })));
      sel.addEventListener('change', () => { save(); load(sel.value); });
      return h('label.field', h('span', { text: 'Morceau' }), sel);
    }
    const sel = h('select.input', { 'aria-label': 'Morceau à synchroniser' }, cat.available().map((v) => h('optgroup', { label: v.label }, v.tracks.map((t) => h('option', { value: t.key, selected: t.key === key, text: t.number + '. ' + t.title })))));
    sel.addEventListener('change', () => { save(); load(sel.value); });
    return h('label.field', h('span', { text: 'Morceau' }), sel);
  }

  function render() {
    const t = cat.track(key);
    const done = work.lines.filter((l) => l.end != null).length;
    const line = work.lines[work.i];
    const phrase = h('p', { style: { fontFamily: 'var(--display)', fontWeight: '600', fontSize: 'clamp(22px,5vw,30px)', lineHeight: '1.3', minHeight: '2.6em' } });
    const on = h('span', { style: { color: 'var(--accent)' } });
    const off = h('span', { style: { color: 'var(--ink)' } });
    phrase.append(on, off);
    const paintPhrase = (p) => { const txt = line?.text || ''; const n = Math.round(txt.length * Math.max(0, Math.min(1, p))); on.textContent = txt.slice(0, n); off.textContent = txt.slice(n); };
    paintPhrase(line?.end != null ? 1 : 0);
    const thumb = h('span', { style: { position: 'absolute', top: '50%', left: '0', width: '44px', height: '28px', marginTop: '-14px', marginLeft: '-22px', borderRadius: '14px', background: 'var(--accent)', boxShadow: '0 4px 14px rgb(0 0 0/.4)', pointerEvents: 'none' } });
    const fill = h('span', { style: { position: 'absolute', inset: '0 auto 0 0', width: '0', background: 'var(--accent-soft)', borderRadius: 'inherit', pointerEvents: 'none' } });
    const bar = h('div', { role: 'slider', tabindex: '0', 'aria-label': 'Barre de synchronisation : maintiens et fais glisser au rythme du chant', 'aria-valuemin': '0', 'aria-valuemax': '100', style: { position: 'relative', height: '72px', borderRadius: '16px', border: '1px solid var(--line-strong)', background: 'var(--bg)', touchAction: 'none', cursor: 'grab', userSelect: 'none' } }, fill, thumb);
    const paintBar = (p) => { const pct = Math.max(0, Math.min(1, p)) * 100; thumb.style.left = 'calc(22px + (100% - 44px) * ' + pct / 100 + ')'; fill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', String(Math.round(pct))); };
    paintBar(line?.end != null ? 1 : 0);
    const time = h('output', { style: { fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }, text: '0:00 / 0:00' });
    const playBtn = h('button.btn.btn-main', { type: 'button', onclick: () => (audio.paused ? audio.play() : audio.pause()) }, icon(audio.paused ? 'play' : 'pause'), h('span', { text: audio.paused ? 'Écouter' : 'Pause' }));
    const speed = h('select.input', { 'aria-label': 'Vitesse de lecture', style: { width: 'auto', minHeight: '46px' } }, [1, 0.85, 0.7, 0.5].map((r) => h('option', { value: String(r), selected: audio.playbackRate === r, text: r === 1 ? 'Vitesse normale' : 'Vitesse ×' + String(r).replace('.', ',') })));
    speed.addEventListener('change', () => { audio.playbackRate = Number(speed.value); });
    const voiceSel = h('select.input', { 'aria-label': 'Voix de cette phrase', style: { width: 'auto', minHeight: '38px' } }, work.voices.map((v) => h('option', { value: v.id, selected: line?.voice === v.id, text: v.name })));
    voiceSel.addEventListener('change', () => { line.voice = voiceSel.value; save(); });

    // Geste : appui = début de la phrase, glissement = avancée dans la phrase, arrivée au bout = fin.
    const pos = (e) => { const r = bar.getBoundingClientRect(); return (e.clientX - r.left - 22) / Math.max(1, r.width - 44); };
    bar.addEventListener('pointerdown', (e) => {
      if (!line) return;
      e.preventDefault(); bar.setPointerCapture(e.pointerId);
      if (audio.paused) audio.play().catch(() => {});
      line.start = audio.currentTime; line.end = null; line.curve = [[0, round(audio.currentTime)]];
      stroke = { x0: pos(e) };
      paintPhrase(0); paintBar(0);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!stroke || !line) return;
      const p = Math.max(0, Math.min(1, pos(e) - stroke.x0 + 0));
      const last = line.curve.at(-1);
      const pct = Math.round(p * 1000) / 10;
      if (pct > last[0]) line.curve.push([pct, round(audio.currentTime)]);
      paintPhrase(p); paintBar(p);
      if (p >= 0.995) finishLine();
    });
    const release = () => { if (stroke && line?.end == null) finishLine(); };
    bar.addEventListener('pointerup', release);
    bar.addEventListener('pointercancel', release);
    bar.addEventListener('keydown', (e) => {
      if (!line) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (e.repeat) return;
        if (audio.paused) audio.play().catch(() => {});
        line.start = audio.currentTime; line.end = null; line.curve = [[0, round(audio.currentTime)]]; stroke = { key: true };
        paintPhrase(0.02); paintBar(0.02);
      }
    });
    bar.addEventListener('keyup', (e) => { if ((e.key === ' ' || e.key === 'Enter') && stroke?.key) { line.curve.push([100, round(audio.currentTime)]); finishLine(); } });

    function finishLine() {
      if (!line) return;
      stroke = null;
      const tEnd = round(Math.max(audio.currentTime, (line.start ?? 0) + 0.2));
      if (line.curve.at(-1)[0] < 100) line.curve.push([100, tEnd]);
      line.end = tEnd;
      const next = work.i + 1;
      work.i = Math.min(next, work.lines.length);
      save();
      render();
      bar.focus?.();
    }

    const allDone = done === work.lines.length && work.lines.length > 0;
    s.body.replaceChildren(
      picker(),
      h('p.note', { text: t.title + ' · ' + (src.provenance ? 'texte : ' + src.provenance : 'texte du catalogue') }),
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }, playBtn, speed, time),
      h('div.tile', { style: { gap: '14px' } },
        h('p.note', { text: line ? `Phrase ${work.i + 1} sur ${work.lines.length}` + (work.lines[work.i + 1] ? ' · ensuite : ' + work.lines[work.i + 1].text : '') : 'Toutes les phrases sont placées.' }),
        line ? phrase : h('p', { text: 'Vérifie l’aperçu, puis envoie ta synchronisation.' }),
        line ? bar : null,
        line ? h('p.note', { text: 'Maintiens la barre au début de la phrase et fais-la glisser au rythme des mots, jusqu’au bout. Au clavier : maintiens Espace pendant la phrase.' }) : null),
      h('div.row-actions',
        h('button.btn.btn-soft.btn-sm', { type: 'button', disabled: work.i === 0, text: '‹ Phrase précédente', onclick: () => { work.i = Math.max(0, work.i - 1); const l = work.lines[work.i]; if (l?.start != null) audio.currentTime = Math.max(0, l.start - 2); render(); } }),
        line ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Refaire cette phrase', onclick: () => { line.start = line.end = null; line.curve = []; const prev = work.lines[work.i - 1]; if (prev?.end != null) audio.currentTime = Math.max(0, prev.end - 1); save(); render(); } }) : null,
        line ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Modifier le texte', onclick: editText }) : null,
        line ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Supprimer cette phrase', onclick: () => { work.lines.splice(work.i, 1); save(); render(); toast('Phrase supprimée.'); } }) : null,
        line ? h('span', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }, voiceSel, h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Ajouter une voix', onclick: addVoice })) : null),
      h('div.row-actions', { style: { borderTop: '1px solid var(--line)', paddingTop: '16px' } },
        h('button.btn.btn-line', { type: 'button', text: 'Aperçu', disabled: !done, onclick: preview }),
        h('button.btn.btn-main', { type: 'button', text: isLocal() ? 'Enregistrer sur l’appareil' : 'Envoyer pour validation', disabled: !allDone, onclick: submit }),
        h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Tout recommencer', onclick: async () => { if (await confirmReset()) { store.del(draftKey); await load(key); } } })),
      h('p.note', { text: `${done} phrase${done > 1 ? 's' : ''} placée${done > 1 ? 's' : ''} sur ${work.lines.length}. Ton travail est enregistré automatiquement sur cet appareil.` }));

    cancelAnimationFrame(raf);
    const loop = () => { time.textContent = clock(audio.currentTime) + ' / ' + clock(audio.duration); raf = requestAnimationFrame(loop); };
    loop();
    audio.onplay = audio.onpause = () => { playBtn.replaceChildren(icon(audio.paused ? 'play' : 'pause'), h('span', { text: audio.paused ? 'Écouter' : 'Pause' })); };
  }

  function round(x) { return Math.round(x * 1000) / 1000; }

  async function confirmReset() {
    // La feuille de confirmation remplacerait l'atelier : on demande en ligne.
    return window.confirm('Effacer toute la synchronisation de ce morceau et recommencer ?');
  }

  function editText() {
    const line = work.lines[work.i];
    const v = window.prompt('Texte de la phrase (tel qu’il est chanté) :', line.text);
    if (v != null && v.trim()) { line.text = v.trim(); save(); render(); }
  }

  function addVoice() {
    const name = window.prompt('Nom de la voix (ex. : chœurs, invité) :', '');
    if (!name?.trim()) return;
    const id = 'v' + (work.voices.length + 1) + '-' + Date.now().toString(36);
    work.voices.push({ id, name: name.trim().slice(0, 100) });
    work.lines[work.i].voice = id;
    save(); render();
  }

  function preview() {
    const lines = work.lines.filter((l) => l.end != null);
    audio.currentTime = Math.max(0, (lines[0]?.start ?? 0) - 1);
    audio.play().catch(() => {});
    toast('Aperçu : regarde la phrase en cours s’éclairer.');
    work.i = 0; render();
    const paint = () => {
      const tNow = audio.currentTime;
      const idx = work.lines.findIndex((l) => l.start != null && l.start <= tNow && tNow <= (l.end ?? l.start));
      if (idx >= 0 && idx !== work.i) { work.i = idx; render(); }
      if (!audio.paused) requestAnimationFrame(paint);
    };
    paint();
  }

  /** Données de synchronisation au format du serveur (studio_validate_19) :
   *  courbe = [[lettre, temps]…], de 0 à la longueur de la phrase, temps entre son début et sa fin.
   *  Le geste est enregistré en pourcentage : on le convertit ici en nombre de lettres. */
  function studioData() {
    const lines = work.lines;
    const duration = round(audio.duration || cat.track(key).duration || 0);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].start == null || lines[i].end == null) { toast('La phrase ' + (i + 1) + ' n’est pas placée.'); return null; }
      if (i > 0 && lines[i].start < lines[i - 1].start) { toast('La phrase ' + (i + 1) + ' commence avant la précédente. Refais-la.'); work.i = i; render(); return null; }
    }
    const curves = lines.map((l) => {
      const len = l.text.length;
      const a = round(l.start), b = round(Math.min(l.end, duration));
      const pts = [[0, a]];
      for (const [p, t] of l.curve.length >= 2 ? l.curve : [[0, a], [100, b]]) {
        const x = round((Math.max(0, Math.min(100, p)) / 100) * len);
        const tt = round(Math.max(a, Math.min(b, t)));
        const last = pts[pts.length - 1];
        if (x > last[0] && tt > last[1]) pts.push([x, tt]);
      }
      const last = pts[pts.length - 1];
      if (last[0] < len) { if (b > last[1]) pts.push([len, b]); else last[0] = len; }
      return pts;
    });
    return {
      sync_mode: 'highlight',
      duration,
      lines: lines.map((l) => l.text),
      times: lines.map((l) => round(l.start)),
      line_ends: lines.map((l) => round(Math.min(l.end, duration))),
      curves,
      tracks: work.voices.map((v, i) => ({ id: v.id, name: v.name, kind: i === 0 ? 'main' : 'voice' })),
      line_tracks: lines.map((l) => l.voice || 'main'),
      version: '2.0',
    };
  }

  async function submit() {
    const studio_data = studioData();
    if (!studio_data) return;
    if (isLocal()) {
      // Musique importée : la synchronisation reste sur l'appareil, rien n'est envoyé.
      try {
        const local = await import('../../core/local.js?v=202611161830' + new URL(import.meta.url).search);
        await local.updateTrack(cat.track(key).id, { lyrics: studio_data, plain: studio_data.lines.join('\n') });
        forgetLyrics(key);
        store.del(draftKey);
        closeSheet();
        toast('Synchronisation enregistrée sur cet appareil.');
      } catch (e) { toast(e.message); }
      return;
    }
    try {
      await act('au_sync', 'submit', { track: key, hash: src.hash, studio_data });
      store.del(draftKey);
      closeSheet();
      toast('Merci : ta synchronisation sera vérifiée avant publication.');
    } catch (e) { toast(e.message); }
  }
  void confirm;
}
