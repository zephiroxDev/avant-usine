/* Jeu 12 · Évasion : un anneau percé d'une ouverture qui tourne lentement. Chaque bille qui s'échappe par
   l'ouverture en fait apparaître deux au centre. Les évadées tombent et s'entassent sous l'anneau, jusqu'à
   ce que l'intérieur soit plein. Anneau de rayon 1 ; les évadées vivent dans tout l'écran. */
(() => {
  const P = HBP, TH = 0.03;
  function reset(c) {
    const cap = c.thumb ? 300 : Math.round(c.opt.max || 520);
    const st = c.st = { p: P.pool(cap), out: P.pool(Math.round(cap * 1.6)), r: 0.038, gap: c.opt.gap || 0.7, rot: P.rnd() * 6.28, t: 0, esc: 0, end: 0, sparks: [] };
    P.add(st.p, 0, -0.3, 0.012, -0.004, 0, 1);
  }
  const inGap = (st, a) => { let d = a - st.rot; d = ((d % 6.2832) + 6.2832) % 6.2832; return d < st.gap; };
  function ring(c, st) {
    const p = st.p, X = p.X, Y = p.Y, r = st.r; let occ = null;
    // the two ends of the opening are round posts (solved first, so the ring itself has the last word)
    for (const a of [st.rot, st.rot + st.gap]) { const ex = Math.cos(a), ey = Math.sin(a); for (let i = 0; i < p.n; i++) { const dx = X[i] - ex, dy = Y[i] - ey, d = Math.hypot(dx, dy); if (d < r + TH && d > 1e-9) { X[i] = ex + dx / d * (r + TH); Y[i] = ey + dy / d * (r + TH); } } }
    for (let i = p.n - 1; i >= 0; i--) {
      const d = Math.hypot(X[i], Y[i]); if (d < 1 - TH - r) continue;
      const a = Math.atan2(Y[i], X[i]);
      const g0 = inGap(st, a);
      // escaped: through the opening, or already more out than in when the ring end came back (the post pushes it out)
      if ((g0 && d > 1 - TH - r * 0.2) || (!g0 && d > 1)) {
        if (!g0 && d <= 1 + TH + r) { const k = (1 + TH + r * 1.01) / d; X[i] *= k; Y[i] *= k; p.PX[i] *= k; p.PY[i] *= k; }
        if (Math.hypot(X[i], Y[i]) > 1 + TH + r) {
          if (st.out.n >= st.out.cap) { st.full = true; continue; }          // no room left outside: the game ends, no ball is lost
          P.add(st.out, X[i], Y[i], X[i] - p.PX[i], Y[i] - p.PY[i], p.col[i], 1); P.remove(p, i); st.esc++;
          // exactly two new balls, at the nearest free places to the centre, thrown in opposite random directions
          if (!occ) occ = P.occupancy(p, 2 * r); const L = P.lattice(), an = P.rnd() * 6.283, sp = 0.012 + P.rnd() * 0.008;
          for (let k = 0, j = 0; k < 2 && p.n < p.cap && j < L.length; j++) { const x = L[j][0] * 2.05 * r, y = L[j][1] * 2.05 * r; if (!occ.free(x, y, 2 * r)) continue;
            const a2 = an + k * Math.PI; P.add(p, x, y, Math.cos(a2) * sp, Math.sin(a2) * sp, (st.esc + k) % P.COLS.length, 0.3); occ.mark(x, y); k++; }
          if (st.esc % 2 === 0) c.note(c.scale(st.esc % 15), 0.6, 0.7);
          st.sparks.push({ x: Math.cos(a) * 1.02, y: Math.sin(a) * 1.02, t: 0 });
        }
        continue;
      }
      if (inGap(st, a)) continue;
      const nx = X[i] / d, ny = Y[i] / d, lim = 1 - TH - r; X[i] = nx * lim; Y[i] = ny * lim;
      let vx = X[i] - p.PX[i], vy = Y[i] - p.PY[i]; const vn = vx * nx + vy * ny; if (vn > 0) { vx -= 2 * vn * nx; vy -= 2 * vn * ny; p.PX[i] = X[i] - vx; p.PY[i] = Y[i] - vy; }          // mirror bounce on the ring, no added randomness
    }
  }
  function outside(st, W, H) {
    const o = st.out, r = st.r, X = o.X, Y = o.Y, d0 = 1 + TH + r;
    for (let i = 0; i < o.n; i++) {
      const d = Math.hypot(X[i], Y[i]); if (d < d0) { X[i] *= d0 / d; Y[i] *= d0 / d; }
      if (Y[i] > H - r) { Y[i] = H - r; if (o.PY[i] < Y[i]) o.PY[i] = Y[i] + (Y[i] - o.PY[i]) * 0.3; }
      if (X[i] < -W + r) { X[i] = -W + r; o.PX[i] = X[i] + (X[i] - o.PX[i]) * 0.5; } if (X[i] > W - r) { X[i] = W - r; o.PX[i] = X[i] + (X[i] - o.PX[i]) * 0.5; }
    }
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt; st.rot += dt * (c.opt.spin || 0.5) * (P.live(st) ? 0.4 + st.lv * 1.3 * st.mk : 1);
    const W = c.W && c.H ? Math.max(1.05, (c.W / 2) / Math.min(c.W * 0.4, c.H * 0.3)) : 1.25, H = c.W && c.H ? (c.H / 2) / Math.min(c.W * 0.4, c.H * 0.3) : 1.6;
    const sub = 2, h = dt / sub, G = c.opt.grav == null ? 1.4 : c.opt.grav;
    for (let s = 0; s < sub; s++) {
      P.integrate(st.p, h, 1, () => [0, G], 4);                      // gravity inside the ring, as in the reference
      P.integrate(st.out, h, 0.6, () => [0, 2.5], 3);
      for (let it = 0; it < 4; it++) { P.collide(st.p, st.r, -1.2, -1.2, 2.4, 2.4, 0.9, 0.95); ring(c, st); P.collide(st.out, st.r, -W - 0.1, -H - 0.5, 2 * W + 0.2, 2 * H + 0.6); outside(st, W, H); }
    }
    for (const sp of st.sparks) sp.t += dt; st.sparks = st.sparks.filter(sp => sp.t < 0.5);
    if (st.p.n >= st.p.cap * 0.97 || st.full || st.end) { if (P.ending(c, st, dt, 'Évasion', st.esc + ' évadées, ' + st.p.n + ' billes dans l\'anneau, en ' + Math.round(st.t) + ' s', 4)) reset(c); }
    if (!c.thumb) c.status(st.p.n + ' dedans · ' + st.esc + ' évadées');
  }
  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.4, c.H * 0.3), ox = c.W / 2, oy = c.H / 2, beat = c.react ? c.react.beat : 0;
    g.fillStyle = '#120e2a'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.fill();
    P.drawBalls(g, st.out, ox, oy, R, st.r);
    P.drawBalls(g, st.p, ox, oy, R, st.r);
    g.strokeStyle = '#d9d3ff'; g.lineWidth = Math.max(2, TH * 2 * R) * (1 + beat * 0.4); g.lineCap = 'round';
    g.beginPath(); g.arc(ox, oy, R, st.rot + st.gap, st.rot + 2 * Math.PI); g.stroke();
    for (const sp of st.sparks) { const k = sp.t / 0.5; g.fillStyle = 'rgba(255,230,107,' + (1 - k).toFixed(2) + ')'; g.beginPath(); g.arc(ox + sp.x * R, oy + sp.y * R, R * 0.05 * (0.5 + k), 0, 7); g.fill(); }
    if (!c.thumb) P.counter(g, c, st.esc + ' ÉVADÉES', oy - R - Math.min(44, c.H * 0.07));
    P.fade(g, c, st, 4);
  }
  HB.game({
    id: 'evasion', name: 'Évasion',
    desc: 'Une ouverture tourne autour de l\'anneau : chaque bille qui s\'échappe en fait apparaître deux au centre.',
    ranges: [
      { key: 'gap', label: 'Ouverture', min: 0.15, max: 1.4, step: 0.05, value: 0.7, restart: true },
      { key: 'spin', label: 'Rotation', min: 0, max: 2, step: 0.05, value: 0.5 },
      { key: 'grav', label: 'Gravité', min: 0, max: 3, step: 0.05, value: 1.4 },
      { key: 'max', label: 'Billes', min: 150, max: 700, step: 10, value: 520, restart: true }
    ],
    thumbSteps: 500, reset, step, draw,
    // the song drives the game: what each musical event does here
    music(c, m) { const st = c.st; P.mus(st, m); if (P.take(st, 'bq')) { const p = st.p, v = 0.006 * st.mk; for (let i = 0; i < p.n; i++) p.PY[i] += v; } },
    audit(c) {                    // inside balls in the closed part of the ring; escaped balls back inside
      const st = c.st, p = st.p, r = st.r; let pen = 0; if (st.end) return {};
      for (let i = 0; i < p.n; i++) { const d = Math.hypot(p.X[i], p.Y[i]); if (!inGap(st, Math.atan2(p.Y[i], p.X[i])) && d > 1 - TH - r) pen = Math.max(pen, (d - (1 - TH - r)) / r); }
      for (let i = 0; i < st.out.n; i++) pen = Math.max(pen, (1 + TH + r - Math.hypot(st.out.X[i], st.out.Y[i])) / r);
      return { pen, ov: P.overlap(p, r), note: p.n + ' dedans, ' + st.esc + ' évadées' };
    }
  });
})();
