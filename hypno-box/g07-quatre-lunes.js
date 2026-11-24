/* Jeu 7 · Quatre lunes : une boîte carrée ; à chaque coin, un arc en demi-cercle tourne autour du coin et balaie
   les billes. Quand un arc enferme des billes, un anneau se referme sur elles et les change en une nuée plus
   nombreuse d'une nouvelle couleur, jusqu'à remplir la boîte. Boîte de -1 à 1. */
(() => {
  const P = HBP, A = 0.42, TH = 0.025;
  function reset(c) {
    const cap = c.thumb ? 260 : Math.round(c.opt.max || 1400);
    const st = c.st = { p: P.pool(cap), r: 0.04, rmin: Math.sqrt(0.75 / cap), gen: 1, arcs: [], rings: [], t: 0, end: 0, caught: 0 };
    const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    C.forEach(([x, y], i) => st.arcs.push({ cx: x, cy: y, th: P.rnd() * 6.28, w: (i % 2 ? -1 : 1) * (0.55 + P.rnd() * 0.4), cd: 1 + P.rnd() * 2, close: 0 }));
    for (let i = 0; i < 4; i++) P.add(st.p, (P.rnd() - 0.5) * 1.2, (P.rnd() - 0.5) * 1.2, (P.rnd() - 0.5) * 0.02, (P.rnd() - 0.5) * 0.02, i % 2, 1);
  }
  // semicircle from the corner to the far point, on one side of the diameter
  function geo(k) { const ux = Math.cos(k.th), uy = Math.sin(k.th); return { mx: k.cx + ux * A, my: k.cy + uy * A, a0: k.th + Math.PI, a1: k.th + 2 * Math.PI, ex: k.cx + ux * 2 * A, ey: k.cy + uy * 2 * A }; }
  const inArc = (ang, a0) => { let d = ang - a0; d = ((d % 6.2832) + 6.2832) % 6.2832; return d <= Math.PI; };
  function arcs(st) {
    const p = st.p, X = p.X, Y = p.Y, r = st.r;
    for (const k of st.arcs) {
      const G = geo(k);
      for (let i = 0; i < p.n; i++) {
        const dx = X[i] - G.mx, dy = Y[i] - G.my, d = Math.hypot(dx, dy) || 1e-9;
        if (Math.abs(d - A) < r + TH && inArc(Math.atan2(dy, dx), G.a0)) { const tgt = d < A ? A - r - TH : A + r + TH; X[i] = G.mx + dx / d * tgt; Y[i] = G.my + dy / d * tgt; }
        for (const [ex, ey] of [[k.cx, k.cy], [G.ex, G.ey]]) { const qx = X[i] - ex, qy = Y[i] - ey, q = Math.hypot(qx, qy); if (q < r + TH && q > 1e-9) { X[i] = ex + qx / q * (r + TH); Y[i] = ey + qy / q * (r + TH); } }
      }
    }
  }
  // a ball caught in the closing angle between an arc and a wall has no room left: it is squeezed to the other side of the arc
  function squeeze(st) {
    const p = st.p, r = st.r, lim = 1 - r;
    for (let i = 0; i < p.n; i++) for (const k of st.arcs) {
      const G = geo(k), dx = p.X[i] - G.mx, dy = p.Y[i] - G.my, d = Math.hypot(dx, dy) || 1e-9;
      if (Math.abs(d - A) > (r + TH) * 0.75 || !inArc(Math.atan2(dy, dx), G.a0)) continue;
      for (const tgt of d < A ? [A + r + TH, A - r - TH] : [A - r - TH, A + r + TH]) {
        const x = G.mx + dx / d * tgt, y = G.my + dy / d * tgt;
        if (Math.abs(x) <= lim && Math.abs(y) <= lim) { const vx = p.X[i] - p.PX[i], vy = p.Y[i] - p.PY[i]; p.X[i] = x; p.Y[i] = y; p.PX[i] = x - vx; p.PY[i] = y - vy; break; }
      }
    }
  }
  function box(st) {
    const p = st.p, lim = 1 - st.r;
    for (let i = 0; i < p.n; i++) {
      for (const [A_, PA] of [[p.X, p.PX], [p.Y, p.PY]]) {
        if (A_[i] > lim) { const v = A_[i] - PA[i]; A_[i] = lim; if (v > 0) PA[i] = lim + v * 0.8; }
        if (A_[i] < -lim) { const v = A_[i] - PA[i]; A_[i] = -lim; if (v < 0) PA[i] = -lim + v * 0.8; }
      }
    }
  }
  // step 1: the open half closes into a full ring around the balls it holds (only if it holds some, and the ring lies inside the box)
  function tryClose(st, k) {
    const G = geo(k), p = st.p; if (Math.abs(G.mx) > 0.9 || Math.abs(G.my) > 0.9) return false;                     // the ring's centre must be inside the box
    let n = 0; for (let i = 0; i < p.n; i++) { const dx = p.X[i] - G.mx, dy = p.Y[i] - G.my; if (dx * dx + dy * dy < (A - TH - st.r) ** 2) n++; }
    if (!n) return false; k.close = 0.35; k.fx = G.mx; k.fy = G.my; st.rings.push({ x: G.mx, y: G.my, t: 0, g: st.gen + 1, closing: true }); return true;
  }
  // step 2: the balls inside the closed ring become a larger crowd of a new colour, placed on free places inside the ring first
  function capture(c, st, k) {
    const G = geo(k), p = st.p; let n = 0;
    for (let i = p.n - 1; i >= 0; i--) { const dx = p.X[i] - G.mx, dy = p.Y[i] - G.my; if (dx * dx + dy * dy < (A - TH) * (A - TH)) { P.remove(p, i); n++; } }
    if (!n) return;
    const g = ++st.gen, m = Math.min(p.cap - p.n, Math.max(n, Math.round(n * (c.opt.mult || 4)))), L = P.lattice(), s = st.r * 2.04, occ = P.occupancy(p, s), lim = 1 - st.r * 1.05;
    for (let j = 0, put = 0; put < m && j < L.length; j++) { const x = G.mx + L[j][0] * s, y = G.my + L[j][1] * s;
      if (Math.abs(x) > lim || Math.abs(y) > lim || !occ.free(x, y, s * 0.98)) continue;
      const din = Math.hypot(x - G.mx, y - G.my); if (Math.abs(din - A) < st.r + TH) continue;              // not on the ring itself
      P.add(p, x, y, (x - G.mx) * 0.02, (y - G.my) * 0.02, g, 0); occ.mark(x, y); put++; }
    st.rings.push({ x: G.mx, y: G.my, t: 0, g }); st.caught++;
    c.note(c.scale(3 + g % 10), 1, 1.3);
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt;
    for (const k of st.arcs) {
      if (k.close > 0) { k.close -= dt; if (k.close <= 0) { k.close = 0; capture(c, st, k); } continue; }       // the ring stops while it is closed
      k.th += k.w * dt; k.cd -= dt; if (k.cd <= 0) k.cd = tryClose(st, k) ? 0.9 + P.rnd() * 1.1 : 0.25;
    }
    const rT = Math.max(st.rmin, Math.min(0.035, Math.sqrt(0.5 / Math.max(1, st.p.n))));
    st.r += (rT - st.r) * Math.min(1, dt * 1.2);
    const sub = 2, h = dt / sub, jit = 0.25;
    for (let s = 0; s < sub; s++) {
      P.integrate(st.p, h, st.p.n < 60 ? 0.97 : 0.7, () => [(P.rnd() - 0.5) * jit, (P.rnd() - 0.5) * jit], 4);
      for (let it = 0; it < 5; it++) { P.collide(st.p, st.r, -1.05, -1.05, 2.1, 2.1, 1); arcs(st); box(st); }
      squeeze(st);
      for (let it = 0; it < 8; it++) { arcs(st); box(st); }            // a ball pinched between an arc and a wall slides along the wall
    }
    for (const rg of st.rings) rg.t += dt; st.rings = st.rings.filter(rg => rg.t < 0.8);
    if (st.p.n >= st.p.cap * 0.98 || st.end) { if (P.ending(c, st, dt, 'Quatre lunes', 'Boîte remplie : ' + st.p.n + ' billes, ' + st.gen + ' couleurs en ' + Math.round(st.t) + ' s', 4)) reset(c); }
    if (!c.thumb) c.status(st.p.n + ' billes · ' + st.caught + ' captures');
  }
  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.38, c.H * 0.3), ox = c.W / 2, oy = c.H / 2, beat = c.react ? c.react.beat : 0;
    g.fillStyle = '#100c26'; g.fillRect(ox - R, oy - R, 2 * R, 2 * R);
    P.drawBalls(g, st.p, ox, oy, R, st.r);
    g.strokeStyle = 'rgba(214,206,255,.8)'; g.lineWidth = Math.max(1.5, R * 0.01) * (1 + beat * 0.6); g.strokeRect(ox - R, oy - R, 2 * R, 2 * R);
    for (const rg of st.rings) {
      const k = rg.t / 0.8, col = P.COLS[rg.g % P.COLS.length];
      g.strokeStyle = col; g.globalAlpha = 1 - k; g.lineWidth = Math.max(1.5, R * 0.012);
      g.beginPath(); g.arc(ox + rg.x * R, oy + rg.y * R, A * R * (1 + k * 0.25), 0, 7); g.stroke();
      g.globalAlpha = (1 - k) * 0.25; g.fillStyle = col; g.fill(); g.globalAlpha = 1;
    }
    g.lineCap = 'round';
    for (const k of st.arcs) {
      const G = geo(k);
      for (const [w, col] of [[TH * 2, '#7f79a8'], [TH * 1.1, '#a59fcb']]) { g.strokeStyle = col; g.lineWidth = Math.max(2, w * R); g.beginPath(); g.arc(ox + G.mx * R, oy + G.my * R, A * R, G.a0, G.a1); g.stroke(); }
    }
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.fillStyle = '#a59fcb'; g.beginPath(); g.arc(ox + x * R, oy + y * R, Math.max(3, R * 0.035), 0, 7); g.fill(); g.fillStyle = '#100c26'; g.beginPath(); g.arc(ox + x * R, oy + y * R, Math.max(1.5, R * 0.015), 0, 7); g.fill(); }
    if (!c.thumb) P.counter(g, c, st.p.n + ' BILLES', oy - R - Math.min(40, c.H * 0.07));
    P.fade(g, c, st, 4);
  }
  HB.game({
    id: 'lunes', name: 'Quatre lunes',
    desc: 'Quatre arcs tournent autour des coins d\'une boîte : chaque bille enfermée renaît multipliée, d\'une nouvelle couleur.',
    ranges: [
      { key: 'mult', label: 'Multiplier', min: 2, max: 8, step: 1, value: 4 },
      { key: 'max', label: 'Billes', min: 400, max: 2600, step: 100, value: 1400, restart: true }
    ],
    thumbSteps: 300, reset, step, draw,
    audit(c) {
      const st = c.st, p = st.p, r = st.r; let pen = 0, where = '';
      for (let i = 0; i < p.n; i++) { if (p.age[i] < 1) continue;
        for (const k of st.arcs) { const G = geo(k), d = Math.hypot(p.X[i] - G.mx, p.Y[i] - G.my); if (inArc(Math.atan2(p.Y[i] - G.my, p.X[i] - G.mx), G.a0) && Math.abs(d - A) < r + TH && (r + TH - Math.abs(d - A)) / r > pen) { pen = (r + TH - Math.abs(d - A)) / r; where = 'arc age ' + p.age[i].toFixed(2) + ' n ' + p.n + ' close ' + st.arcs.map(q => q.close > 0 ? 1 : 0).join(''); } }
        const pb = (Math.max(Math.abs(p.X[i]), Math.abs(p.Y[i])) + r - 1) / r; if (pb > pen) { pen = pb; where = 'boite'; } }
      return { pen, where, ov: P.overlap(p, r), note: p.n + ' billes' };
    }
  });
})();
