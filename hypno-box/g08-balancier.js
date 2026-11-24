/* Jeu 8 · Balancier : un lourd pendule accroché en haut du cercle balance un bloc trapézoïdal. À chaque bout de sa
   course, il presse les billes coincées contre la plaque d'un panneau latéral : elles renaissent multipliées,
   d'une nouvelle couleur, et retombent quand le bloc repart. Cercle de rayon 1, pivot en (0, -1). */
(() => {
  const P = HBP, AMP = 0.45, GAP = 0.08, ROD = 1.0, BOT = 1.62, TW = 0.17, BW = 0.23;
  function local(th, u, v) { const s = Math.sin(th), c = Math.cos(th); return [u * c + v * s, -1 + (-u * s + v * c)]; }   // u across, v along the rod
  function bob(th) { return [local(th, -TW, ROD), local(th, TW, ROD), local(th, BW, BOT), local(th, -BW, BOT)]; }
  // the plate of each side panel: the bob face at the end of its swing, moved outward by the gap
  function plate(side) {
    const th = side * AMP, a = local(th, side * TW, ROD), b = local(th, side * BW, BOT), ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey);
    let nx = -ey / l, ny = ex / l; if (nx * side < 0) { nx = -nx; ny = -ny; }        // outward normal
    const ax = a[0] + nx * GAP, ay = a[1] + ny * GAP, bx = b[0] + nx * GAP, by = b[1] + ny * GAP, tx = ex / l, ty = ey / l;
    return { ax: ax - tx * 0.12, ay: ay - ty * 0.12, bx: bx + tx * 0.03, by: by + ty * 0.03, nx, ny, tx, ty, len: l + 0.15, lip: [bx + tx * 0.03, by + ty * 0.03, bx + tx * 0.03 - nx * 0.09, by + ty * 0.03 - ny * 0.09] };
  }
  const PL = [plate(-1), plate(1)];
  function reset(c) {
    const cap = c.thumb ? 200 : Math.round(c.opt.max || 1300);
    const st = c.st = { p: P.pool(cap), r: 0.03, rmin: Math.sqrt(0.45 / cap), th: 0, w: 1.4, gen: 0, pressed: 0, dwell: 0, t: 0, flashes: [], end: 0, presses: 0 };
    for (let i = 0; i < 18; i++) P.add(st.p, (P.rnd() - 0.5) * 1.2, -0.3 + P.rnd() * 0.6, (P.rnd() - 0.5) * 0.02, (P.rnd() - 0.5) * 0.02, 0, 1);
  }
  function solids(st) {
    const p = st.p, X = p.X, Y = p.Y, r = st.r, B = bob(st.th);
    for (let i = 0; i < p.n; i++) {
      // bob: convex polygon, leave by the closest edge
      let best = -1e9, bn = null;
      for (let e = 0; e < 4; e++) {
        const [ax, ay] = B[e], [bx, by] = B[(e + 1) % 4], ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey), nx = ey / l, ny = -ex / l, d = (X[i] - ax) * nx + (Y[i] - ay) * ny;
        if (d > best) { best = d; bn = [nx, ny]; }
      }
      if (best < r) { const k = r - best; X[i] += bn[0] * k; Y[i] += bn[1] * k; }
      // rod
      const tip = local(st.th, 0, ROD); P.capsule(p, i, 0, -1, tip[0], tip[1], r + 0.02);
      // side panels: everything beyond the plate, down to its lip
      for (const q of PL) {
        const dx = X[i] - q.ax, dy = Y[i] - q.ay, along = dx * q.tx + dy * q.ty, out = dx * q.nx + dy * q.ny;
        if (along > 0 && along < q.len && out > -r && out < 0.6) { const k = out + r; X[i] -= q.nx * k; Y[i] -= q.ny * k; }
        P.capsule(p, i, q.ax, q.ay, q.ax + q.nx * 1.2, q.ay + q.ny * 1.2, r + 0.012);
        P.capsule(p, i, q.lip[0], q.lip[1], q.lip[2], q.lip[3], r + 0.015);
      }
    }
  }
  function press(c, st, side) {
    const q = PL[side < 0 ? 0 : 1], p = st.p; let k = 0;
    for (let i = p.n - 1; i >= 0; i--) {
      const dx = p.X[i] - q.ax, dy = p.Y[i] - q.ay, along = dx * q.tx + dy * q.ty, out = dx * q.nx + dy * q.ny;
      if (along > 0.05 && along < q.len && out > -GAP - st.r * 1.5 && out < 0.01) { k++; P.remove(p, i); }
    }
    st.flashes.push({ side, t: 0 });
    if (!k) { c.note(c.scale(0), 0.5, 0.6); return; }
    const g = ++st.gen, m = Math.min(p.cap - p.n, Math.max(k, Math.round(k * (c.opt.mult || 2))));
    // reborn balls: first in the slot itself, then just below it, only on free places outside the bob and the panels
    const s = 2 * st.r * 1.03, occ = P.occupancy(p, s), B = bob(st.th), free = (x, y) => {
      if (x * x + y * y > (1 - st.r * 1.1) ** 2 || !occ.free(x, y, s * 0.98)) return false;
      let worst = -1e9; for (let e = 0; e < 4; e++) { const [ax, ay] = B[e], [bx, by] = B[(e + 1) % 4], ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey); worst = Math.max(worst, (x - ax) * ey / l - (y - ay) * ex / l); }
      if (worst < st.r) return false;                                                           // inside or touching the bob
      const dx = x - q.ax, dy = y - q.ay, al = dx * q.tx + dy * q.ty; return al > q.len + st.r || dx * q.nx + dy * q.ny < -st.r;   // not inside the panel
    };
    let put = 0;
    const cx0 = q.ax + q.tx * q.len * 0.5 - q.nx * st.r, cy0 = q.ay + q.ty * q.len * 0.5 - q.ny * st.r, L = P.lattice();
    for (let j = 0; j < L.length && put < m; j++) {                                   // nearest free places around the slot, spreading outward
      const x = cx0 + L[j][0] * s, y = cy0 + L[j][1] * s; if (!free(x, y)) continue;
      P.add(p, x, y, -q.nx * 0.02, -0.01, g, 0.2); occ.mark(x, y); put++;
    }
    st.presses++; st.last = [k, m, put]; c.note(c.scale(4 + g % 9), 1, 1.4);
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt;
    // a real pendulum: θ'' = −(g/L)·sin θ. The panels stop it at ±AMP (impact, partial rebound); a motor in the pivot gives back,
    // at the bottom of each swing, just the energy lost, so that it keeps reaching the panels. Its period comes from g/L.
    const T = c.opt.period || 3.6, k2 = Math.pow(2 * Math.PI / T, 2), w0 = Math.sqrt(2 * k2 * (1 - Math.cos(AMP))) * 1.12;
    st.w -= k2 * Math.sin(st.th) * dt; const prev = st.th; st.th += st.w * dt;
    if (prev * st.th <= 0 && prev !== st.th) st.w = Math.sign(st.w || 1) * Math.max(Math.abs(st.w), w0);   // motor pulse at the bottom
    if (Math.abs(st.th) >= AMP) {                                                                         // hits a panel
      const side = Math.sign(st.th); st.th = side * AMP;
      if (st.w * side > 0) { st.w = -st.w * 0.35; if (st.pressed !== side) { st.pressed = side; press(c, st, side); } }
    }
    if (Math.abs(st.th) < AMP * 0.3) st.pressed = 0;
    const rT = Math.max(st.rmin, Math.min(0.03, Math.sqrt(0.3 / Math.max(1, st.p.n))));
    st.r += (rT - st.r) * Math.min(1, dt * 1.2);
    const sub = 3, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      P.integrate(st.p, h, 1, () => [0, 2.2], 3.2);
      // bouncy balls: elastic contacts (restitution) instead of random kicks
      for (let it = 0; it < 4; it++) { P.collide(st.p, st.r, -1.05, -1.05, 2.1, 2.1, 0.8, c.opt.rest == null ? 1 : c.opt.rest); P.inCircle(st.p, 1, st.r, 1); solids(st); }
    }
    for (const f of st.flashes) f.t += dt; st.flashes = st.flashes.filter(f => f.t < 0.5);
    if (st.p.n >= st.p.cap * 0.98 || st.end) { if (P.ending(c, st, dt, 'Balancier', 'Cercle rempli : ' + st.p.n + ' billes après ' + st.presses + ' pressions, en ' + Math.round(st.t) + ' s', 4)) reset(c); }
    if (!c.thumb) c.status(st.p.n + ' billes · ' + st.presses + ' pressions');
  }
  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.44, c.H * 0.38), ox = c.W / 2, oy = c.H / 2, X = x => ox + x * R, Y = y => oy + y * R, beat = c.react ? c.react.beat : 0;
    g.fillStyle = '#100c26'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.fill();
    P.drawBalls(g, st.p, ox, oy, R, st.r);
    g.save(); g.beginPath(); g.arc(ox, oy, R, 0, 7); g.clip();
    // side panels
    for (const q of PL) {
      const s = q.nx < 0 ? -1 : 1, far = 1.5;
      g.beginPath(); g.moveTo(X(q.ax), Y(q.ay)); g.lineTo(X(q.bx), Y(q.by)); g.lineTo(X(q.bx + q.nx * far), Y(q.by + q.ny * far)); g.lineTo(X(q.ax + q.nx * far), Y(q.ay + q.ny * far)); g.closePath();
      g.fillStyle = '#3b3666'; g.fill(); g.strokeStyle = '#a49ecb'; g.lineWidth = Math.max(1, R * 0.006); g.stroke();
      g.lineCap = 'round'; g.strokeStyle = '#7f79a8'; g.lineWidth = Math.max(2, R * 0.03); g.beginPath(); g.moveTo(X(q.lip[0]), Y(q.lip[1])); g.lineTo(X(q.lip[2]), Y(q.lip[3])); g.stroke();
      g.fillStyle = 'rgba(164,158,203,.5)'; for (const t of [0.25, 0.6]) { g.beginPath(); g.arc(X(q.ax + q.tx * q.len * t + q.nx * 0.18), Y(q.ay + q.ty * q.len * t + q.ny * 0.18), Math.max(1, R * 0.01), 0, 7); g.fill(); }
      void s;
    }
    for (const f of st.flashes) {
      const q = PL[f.side < 0 ? 0 : 1], k = f.t / 0.5; g.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(2) + ')'; g.lineWidth = Math.max(2, R * 0.02 * (1 - k));
      g.beginPath(); g.moveTo(X(q.ax - q.nx * GAP / 2), Y(q.ay - q.ny * GAP / 2)); g.lineTo(X(q.bx - q.nx * GAP / 2), Y(q.by - q.ny * GAP / 2)); g.stroke();
    }
    g.restore();
    // pendulum: rod, bob with its slots, pivot
    const tip = local(st.th, 0, ROD);
    g.lineCap = 'round'; g.strokeStyle = '#7f79a8'; g.lineWidth = Math.max(3, R * 0.04); g.beginPath(); g.moveTo(X(0), Y(-1)); g.lineTo(X(tip[0]), Y(tip[1])); g.stroke();
    const B = bob(st.th); g.beginPath(); B.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.closePath();
    g.fillStyle = '#4a4577'; g.fill(); g.strokeStyle = '#b4aedb'; g.lineWidth = Math.max(1.5, R * 0.008); g.stroke();
    g.fillStyle = 'rgba(20,16,40,.55)';
    for (const v of [1.05, 1.13, 1.21]) { const a = local(st.th, -0.06, v), b = local(st.th, 0.06, v); g.beginPath(); g.moveTo(X(a[0]), Y(a[1])); g.lineTo(X(b[0]), Y(b[1])); g.lineWidth = Math.max(2, R * 0.035); g.strokeStyle = 'rgba(20,16,40,.55)'; g.stroke(); }
    const o = local(st.th, 0, 1.37); g.strokeStyle = 'rgba(20,16,40,.6)'; g.lineWidth = Math.max(1.5, R * 0.01); g.beginPath(); g.arc(X(o[0]), Y(o[1]), R * 0.025, 0, 7); g.stroke();
    g.fillStyle = '#b4aedb'; g.beginPath(); g.arc(X(0), Y(-1), Math.max(3, R * 0.035), 0, 7); g.fill();
    g.lineWidth = Math.max(1.5, R * 0.009) * (1 + beat * 0.8); g.strokeStyle = 'rgba(214,206,255,.85)'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.stroke();
    if (!c.thumb) P.counter(g, c, st.p.n + ' BILLES', oy + R + Math.min(40, c.H * 0.06));
    P.fade(g, c, st, 4);
  }
  HB.game({
    id: 'balancier', name: 'Balancier',
    desc: 'Un lourd pendule presse les billes contre les panneaux : chaque pression les fait renaître multipliées.',
    ranges: [
      { key: 'mult', label: 'Multiplier', min: 2, max: 8, step: 1, value: 2 },
      { key: 'period', label: 'Balancement', min: 1.6, max: 5, step: 0.1, value: 3.6 },
      { key: 'max', label: 'Billes', min: 400, max: 2400, step: 100, value: 1300, restart: true }
    ],
    thumbSteps: 300, reset, step, draw,
    audit(c) {                                   // balls inside the bob (convex polygon) or past the rim
      const st = c.st, p = st.p, r = st.r, B = bob(st.th); let pen = 0;
      for (let i = 0; i < p.n; i++) { let worst = 1e9;
        for (let e = 0; e < 4; e++) { const [ax, ay] = B[e], [bx, by] = B[(e + 1) % 4], ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey); worst = Math.min(worst, (p.X[i] - ax) * ey / l - (p.Y[i] - ay) * ex / l); }
        pen = Math.max(pen, (r + worst) / r * (worst > -r ? 1 : 0), (Math.hypot(p.X[i], p.Y[i]) + r - 1) / r); }
      return { pen, ov: P.overlap(p, r), note: p.n + ' billes, θ=' + st.th.toFixed(2) };
    }
  });
})();
