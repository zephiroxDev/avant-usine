/* Jeu 5 · Brèche : une raquette automatique renvoie des billes qui creusent un mur de minuscules briques
   (rose, puis grise une fois touchée, puis détruite). Des bonus tombent : billes en plus, raquette plus large,
   vitesse, billes perforantes. Quand le mur est presque vide, il explose. Monde fixe de 1 × 1.8. */
(() => {
  const P = HBP;
  const WW = 1, WH = 1.8, COLS = 56, Y0 = 0.08, CELL = WW / COLS, ROWS = Math.floor(0.86 / CELL), PY = 1.56, BR = 0.0065;
  const KINDS = { multi: ['#6fd8ff', '⁂'], large: ['#8fdc6e', '↔'], fast: ['#f0a050', '»'], pierce: ['#ffe66b', '★'] };

  function reset(c) {
    const st = c.st = {
      hp: new Uint8Array(COLS * ROWS), left: 0, total: COLS * ROWS, balls: [], caps: [], parts: [], pw: 0.2, px: 0.5, t: 0, speed: 1.8,
      fast: 0, pierce: 0, dirty: true, wall: null, wx: null, end: 0, boom: 0, broken: 0
    };
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) st.hp[y * COLS + x] = (y === 0 || y === ROWS - 1) ? 1 : 2;
    const tc = Math.floor(COLS * (0.35 + P.rnd() * 0.3));                // a narrow tunnel to start the digging
    for (let y = Math.floor(ROWS * 0.55); y < ROWS; y++) for (let x = tc; x < tc + 2; x++) { st.hp[y * COLS + x] = 0; }
    for (let y = Math.floor(ROWS * 0.55) - 1; y < ROWS; y++) for (const x of [tc - 1, tc + 2]) st.hp[y * COLS + x] = 1;
    st.left = 0; for (const h of st.hp) if (h) st.left++; st.total = st.left; st.px = (tc + 1) * CELL; launch(st);
  }
  function launch(st) { const a = (P.rnd() - 0.5) * 0.6; st.balls.push({ x: st.px, y: PY - 0.02, vx: Math.sin(a), vy: -Math.cos(a) }); }
  function paint(st, i) {
    if (!st.wx) return; const x = i % COLS, y = (i / COLS) | 0, h = st.hp[i];
    st.wx.clearRect(x * 4, y * 4, 4, 4); if (!h) return;
    st.wx.fillStyle = h === 2 ? '#6a2453' : '#625d8c'; st.wx.fillRect(x * 4, y * 4, 3, 3);
  }
  function hit(c, st, i, b) {
    const h = st.hp[i]; if (!h) return;
    st.hp[i] = st.pierce > 0 ? 0 : h - 1; paint(st, i);
    if (!st.hp[i]) {
      st.left--; st.broken++;
      if (P.rnd() < (c.opt.bonus || 0.035) && !c.thumb) { const ks = Object.keys(KINDS); st.caps.push({ x: (i % COLS + 0.5) * CELL, y: Y0 + (((i / COLS) | 0) + 0.5) * CELL, k: ks[Math.floor(P.rnd() * ks.length)] }); }
      if (Math.random() < 0.25) st.parts.push({ x: (i % COLS + 0.5) * CELL, y: Y0 + (((i / COLS) | 0) + 0.5) * CELL, vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.3, t: 0, col: h === 2 ? '#ff5fa8' : '#a7a2cc' });
      c.note(c.scale(6 + (((i / COLS) | 0) % 10)), 0.45, 0.5);
    }
  }
  const cellAt = (x, y) => { const cx = Math.floor(x / CELL), cy = Math.floor((y - Y0) / CELL); return cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS ? -1 : cy * COLS + cx; };
  function moveBall(c, st, b, dist) {
    const steps = Math.ceil(dist / (CELL * 0.4)), d = dist / steps;
    for (let s = 0; s < steps; s++) {
      const oy = b.y;
      // axis by axis, with the edge of the ball (not its centre): a brick is hit by the side that actually touches it
      b.x += b.vx * d;
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); } if (b.x > WW - BR) { b.x = WW - BR; b.vx = -Math.abs(b.vx); }
      let i = cellAt(b.x + Math.sign(b.vx) * BR, b.y);
      if (i >= 0 && st.hp[i]) { hit(c, st, i, b); if (st.pierce <= 0) { b.x -= b.vx * d; b.vx = -b.vx; } }
      b.y += b.vy * d;
      if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy); }
      i = cellAt(b.x, b.y + Math.sign(b.vy) * BR);
      if (i >= 0 && st.hp[i]) { hit(c, st, i, b); if (st.pierce <= 0) { b.y -= b.vy * d; b.vy = -b.vy; } }
      if (b.vy > 0 && b.y >= PY - BR && oy < PY - BR + 0.004 && Math.abs(b.x - st.px) <= st.pw / 2 + BR) {
        // classic paddle: the angle only depends on where the ball touches it (centre = straight up, edges = 60°)
        const off = Math.max(-1, Math.min(1, (b.x - st.px) / (st.pw / 2))) * 1.05;
        b.vx = Math.sin(off); b.vy = -Math.cos(off); b.y = PY - BR; b.plan = null;
      }
    }
  }
  function apply(c, st, k) {
    if (k === 'multi') { const add = []; for (const b of st.balls) for (const da of [-0.35, 0.35]) { if (st.balls.length + add.length >= (c.opt.max || 300)) break; const a = Math.atan2(b.vx, -b.vy) + da; add.push({ x: b.x, y: b.y, vx: Math.sin(a), vy: -Math.cos(a) }); } st.balls.push(...add); }
    if (k === 'large') st.pw = Math.min(1, st.pw + 0.12);
    if (k === 'fast') st.fast = 6;
    if (k === 'pierce') st.pierce = 3.5;
    c.note(c.scale(12), 1, 1.5);
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt; st.fast = Math.max(0, st.fast - dt); st.pierce = Math.max(0, st.pierce - dt);
    if (st.end) { st.boom += dt; for (const p of st.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.6 * dt; } if (P_end(c, st, dt)) reset(c); return; }
    // the paddle follows the lowest falling ball, or a falling bonus when no ball is close
    // the automatic player picks the ball that lands first, predicts where (bounces on the side walls included),
    // and moves there with a limited speed, offset so that the ball leaves toward the hollow it wants to dig
    let tx = st.px, best = 1e9, bb = null;
    for (const b of st.balls) if (b.vy > 0) { const tl = (PY - BR - b.y) / b.vy; if (tl >= 0 && tl < best) { best = tl; bb = b; } }
    if (bb) {
      let lx = bb.x + bb.vx * best; const span = WW - 2 * BR; lx -= BR; lx = ((lx % (2 * span)) + 2 * span) % (2 * span); if (lx > span) lx = 2 * span - lx; lx += BR;
      if (!bb.plan) { let u = (P.rnd() - 0.5) * 1.4;
        if (P.rnd() < (c.opt.aim == null ? 0.75 : c.opt.aim)) for (let tries = 0; tries < 30; tries++) { const j = Math.floor(P.rnd() * st.hp.length); if (st.hp[j]) continue;
          const gx = (j % COLS + 0.5) * CELL, gy = Y0 + (((j / COLS) | 0) + 0.5) * CELL; u = Math.max(-0.95, Math.min(0.95, Math.atan2(gx - lx, PY - gy) / 1.05)); break; }
        bb.plan = u; }
      tx = lx - bb.plan * st.pw / 2;
    }
    for (const k of st.caps) if (k.y > 1.2 && (best < 1.3)) { tx = k.x; break; }
    const ms = 2.2 * dt; st.px += Math.max(-ms, Math.min(ms, tx - st.px)); st.px = Math.max(st.pw / 2, Math.min(WW - st.pw / 2, st.px));
    const v = st.speed * (st.fast > 0 ? 1.8 : 1) * dt * (P.live(st) ? Math.min(1.8, Math.max(0.6, 0.7 + st.lv * 0.7 * st.mk)) : 1);      // louder = faster
    for (const b of st.balls) moveBall(c, st, b, v);
    st.balls = st.balls.filter(b => b.y < WH + 0.02);
    if (!st.balls.length) launch(st);
    for (const k of st.caps) { k.y += 0.35 * dt; if (Math.abs(k.y - PY) < 0.015 && Math.abs(k.x - st.px) < st.pw / 2 + 0.02) { k.got = true; apply(c, st, k.k); } }
    st.caps = st.caps.filter(k => !k.got && k.y < WH);
    for (const p of st.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.8 * dt; } st.parts = st.parts.filter(p => p.t < 1.2);
    if (st.left < st.total * (c.thumb ? 0 : 0.015)) boom(c, st);
    if (!c.thumb) c.status(Math.round(100 * (1 - st.left / st.total)) + ' % creusé · ' + st.balls.length + (st.balls.length > 1 ? ' billes' : ' bille'));
  }
  function boom(c, st) {
    st.end = 0.001;
    for (let i = 0; i < st.hp.length; i++) if (st.hp[i]) { st.hp[i] = 0; paint(st, i); for (let j = 0; j < 3; j++) st.parts.push({ x: (i % COLS + 0.5) * CELL, y: Y0 + (((i / COLS) | 0) + 0.5) * CELL, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.8) * 1.2, t: 0, col: '#ffffff' }); }
    for (const b of st.balls) for (let j = 0; j < 4; j++) st.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.7) * 1.5, t: 0, col: '#f1eeff' });
    st.balls = []; c.note(c.scale(14), 1, 2);
  }
  function P_end(c, st, dt) { return HBP.ending(c, st, dt, 'Brèche', 'Mur détruit : ' + st.broken + ' briques en ' + Math.round(st.t) + ' s', 3.5); }

  function draw(c, g) {
    const st = c.st; if (!st) return;
    const s = Math.min(c.W / WW, c.H / WH), ox = (c.W - WW * s) / 2, oy = (c.H - WH * s) / 2, beat = c.react ? c.react.beat : 0;
    g.fillStyle = '#16122c'; g.fillRect(ox, oy, WW * s, WH * s);
    g.fillStyle = 'rgba(255,95,168,' + (0.05 + beat * 0.08).toFixed(3) + ')'; g.fillRect(ox, oy + Y0 * s, WW * s, ROWS * CELL * s);
    const cs = CELL * s, gap = Math.max(0.6, cs * 0.18);
    for (const [hv, col] of [[2, '#6a2453'], [1, '#625d8c']]) {
      g.fillStyle = col; g.beginPath();
      for (let i = 0; i < st.hp.length; i++) if (st.hp[i] === hv) g.rect(ox + (i % COLS) * cs, oy + Y0 * s + ((i / COLS) | 0) * cs, cs - gap, cs - gap);
      g.fill();
    }
    // paddle
    g.fillStyle = '#c08a5e'; g.fillRect(ox + (st.px - st.pw / 2) * s, oy + PY * s, st.pw * s, Math.max(3, 0.012 * s));
    // bonuses
    for (const k of st.caps) {
      const [col, ic] = KINDS[k.k], x = ox + k.x * s, y = oy + k.y * s, r = Math.max(5, 0.022 * s);
      g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = '#16122c'; g.font = '700 ' + Math.round(r * 1.2) + 'px "DM Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ic, x, y + r * 0.05);
    }
    // balls
    g.fillStyle = st.pierce > 0 ? '#ffe66b' : '#f1eeff';
    const br = Math.max(1.5, BR * s);
    for (const b of st.balls) { g.beginPath(); g.arc(ox + b.x * s, oy + b.y * s, br, 0, 7); g.fill(); }
    for (const p of st.parts) { g.globalAlpha = Math.max(0, 1 - p.t / 1.2); g.fillStyle = p.col; g.fillRect(ox + p.x * s - 1.5, oy + p.y * s - 1.5, 3, 3); }
    g.globalAlpha = 1;
    if (st.fast > 0 && !c.thumb) { g.fillStyle = 'rgba(240,160,80,.9)'; g.font = '800 ' + Math.round(0.04 * s) + 'px "Unbounded", system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('×2', ox + 0.5 * s, oy + (Y0 - 0.025) * s); }
    HBP.fade(g, c, st, 3.5);
  }

  HB.game({
    id: 'breche', name: 'Brèche',
    desc: 'Une raquette automatique renvoie des billes qui creusent un mur de minuscules briques, avec des bonus qui pleuvent.',
    ranges: [
      { key: 'bonus', label: 'Bonus', min: 0.005, max: 0.1, step: 0.005, value: 0.035 },
      { key: 'max', label: 'Billes max', min: 20, max: 600, step: 10, value: 300 },
      { key: 'aim', label: 'Visée', min: 0, max: 1, step: 0.05, value: 0.75 }
    ],
    thumbSteps: 500, reset, step, draw,
    // the song drives the game: what each musical event does here
    music(c, m) { const st = c.st; P.mus(st, m); if (P.take(st, 'bq')) st.pulse = 1; },
    audit(c) {                                        // a ball overlapping a standing brick (centre inside a brick = went through)
      const st = c.st; let pen = 0; if (!st.balls) return {};
      for (const b of st.balls) { const i = cellAt(b.x, b.y); if (i >= 0 && st.hp[i]) pen = Math.max(pen, 1); }
      return { pen, note: Math.round(100 * (1 - st.left / st.total)) + ' % · ' + st.balls.length + ' billes' };
    }
  });
})();
