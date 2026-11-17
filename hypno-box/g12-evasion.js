/* Jeu 12 · Évasion : un anneau percé d'une ouverture qui tourne lentement. Chaque bille qui s'échappe par
   l'ouverture en fait apparaître deux au centre. Les évadées tombent et s'entassent sous l'anneau, jusqu'à
   ce que l'intérieur soit plein. Anneau de rayon 1 ; les évadées vivent dans tout l'écran. */
(() => {
  const P = HBP, TH = 0.03;
  function reset(c) {
    const cap = c.thumb ? 300 : Math.round(c.opt.max || 1600);
    const st = c.st = { p: P.pool(cap), out: P.pool(cap * 2), r: 0.038, gap: c.opt.gap || 0.55, rot: Math.random() * 6.28, t: 0, esc: 0, end: 0, sparks: [] };
    P.add(st.p, 0, 0, 0.012, -0.007, 0, 1);
  }
  const inGap = (st, a) => { let d = a - st.rot; d = ((d % 6.2832) + 6.2832) % 6.2832; return d < st.gap; };
  function ring(c, st) {
    const p = st.p, X = p.X, Y = p.Y, r = st.r;
    for (let i = p.n - 1; i >= 0; i--) {
      const d = Math.hypot(X[i], Y[i]); if (d < 1 - TH - r) continue;
      const a = Math.atan2(Y[i], X[i]);
      if (inGap(st, a) && d > 1 - TH - r * 0.2) {                  // escaped: moves to the outside, two new balls at the centre
        if (d > 1 + TH + r) {
          P.add(st.out, X[i], Y[i], X[i] - p.PX[i], Y[i] - p.PY[i], p.col[i], 1); P.remove(p, i); st.esc++;
          for (let k = 0; k < 2 && p.n < p.cap; k++) { const an = Math.random() * 6.283, sp = 0.012 + Math.random() * 0.01; P.add(p, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, Math.cos(an) * sp, Math.sin(an) * sp, (st.esc + k) % P.COLS.length, 0.3); }
          if (st.esc % 2 === 0) c.note(c.scale(st.esc % 15), 0.6, 0.7);
          st.sparks.push({ x: Math.cos(a) * 1.02, y: Math.sin(a) * 1.02, t: 0 });
        }
        continue;
      }
      if (inGap(st, a)) continue;
      const nx = X[i] / d, ny = Y[i] / d, lim = 1 - TH - r; X[i] = nx * lim; Y[i] = ny * lim;
      let vx = X[i] - p.PX[i], vy = Y[i] - p.PY[i]; const vn = vx * nx + vy * ny; if (vn > 0) { vx -= 2 * vn * nx; vy -= 2 * vn * ny; const tw = (Math.random() - 0.5) * 0.5, cs = Math.cos(tw), sn = Math.sin(tw), wx = vx * cs - vy * sn, wy = vx * sn + vy * cs; p.PX[i] = X[i] - wx; p.PY[i] = Y[i] - wy; }
    }
    // the two ends of the opening are round posts
    for (const a of [st.rot, st.rot + st.gap]) { const ex = Math.cos(a), ey = Math.sin(a); for (let i = 0; i < p.n; i++) { const dx = X[i] - ex, dy = Y[i] - ey, d = Math.hypot(dx, dy); if (d < r + TH && d > 1e-9) { X[i] = ex + dx / d * (r + TH); Y[i] = ey + dy / d * (r + TH); } } }
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
    const st = c.st; if (!st) return; st.t += dt; st.rot += dt * (c.opt.spin || 0.5);
    const W = c.W && c.H ? Math.max(1.05, (c.W / 2) / Math.min(c.W * 0.4, c.H * 0.3)) : 1.25, H = c.W && c.H ? (c.H / 2) / Math.min(c.W * 0.4, c.H * 0.3) : 1.6;
    const sub = 2, h = dt / sub, jit = c.react ? c.react.beat * 0.6 : 0;
    for (let s = 0; s < sub; s++) {
      P.integrate(st.p, h, 1, jit ? () => [(Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit] : null, 2.2);
      const vmin = (c.opt.speed || 1.2) * h, p = st.p;                  // balls never slow down inside the ring
      for (let i = 0; i < p.n; i++) { const vx = p.X[i] - p.PX[i], vy = p.Y[i] - p.PY[i], v = Math.hypot(vx, vy); if (v < vmin) { const k = v > 1e-9 ? vmin / v : 0, a = Math.random() * 6.283; p.PX[i] = p.X[i] - (k ? vx * k : Math.cos(a) * vmin); p.PY[i] = p.Y[i] - (k ? vy * k : Math.sin(a) * vmin); } }
      P.integrate(st.out, h, 0.6, () => [0, 2.5], 3);
      for (let it = 0; it < 2; it++) { P.collide(st.p, st.r, -1.2, -1.2, 2.4, 2.4, 0.9); ring(c, st); P.collide(st.out, st.r, -W - 0.1, -H - 0.5, 2 * W + 0.2, 2 * H + 0.6); outside(st, W, H); }
    }
    for (const sp of st.sparks) sp.t += dt; st.sparks = st.sparks.filter(sp => sp.t < 0.5);
    if (st.p.n >= st.p.cap * 0.97 || st.out.n >= st.out.cap - 2 || st.end) { if (P.ending(c, st, dt, 'Évasion', st.esc + ' évadées, ' + st.p.n + ' billes dans l\'anneau, en ' + Math.round(st.t) + ' s', 4)) reset(c); }
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
      { key: 'gap', label: 'Ouverture', min: 0.15, max: 1.4, step: 0.05, value: 0.55, restart: true },
      { key: 'spin', label: 'Rotation', min: 0, max: 2, step: 0.05, value: 0.5 },
      { key: 'speed', label: 'Vitesse billes', min: 0.4, max: 2.2, step: 0.05, value: 1.2 },
      { key: 'max', label: 'Billes', min: 400, max: 2600, step: 100, value: 1600, restart: true }
    ],
    thumbSteps: 500, reset, step, draw
  });
})();
