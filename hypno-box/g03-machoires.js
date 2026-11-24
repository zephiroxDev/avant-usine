/* Jeu 3 · Mâchoires : deux mâchoires en dents de scie s'ouvrent (les billes tombent et s'entassent), puis se
   referment jusqu'à être bloquées par les billes, qu'elles tassent dans un couloir en zigzag. Chaque fermeture
   ajoute une nouvelle fournée ; quand le zigzag déborde jusqu'en haut, c'est plein. */
(() => {
  const P = HBP, A = 0.15, HALF = 0.11, SLOPE = Math.sqrt(1 + Math.pow(A / HALF, 2));
  const tri = y => { const u = y / HALF, m = ((u % 2) + 2) % 2; return Math.abs(m - 1); };
  const T = y => A * tri(y);

  function reset(c) {
    const cap = c.thumb ? 200 : 1800;
    const st = c.st = { p: P.pool(cap), r: c.thumb ? 0.03 : 0.0165 * (c.opt.size || 1), s: 1.1 + A, ph: 'open', pt: 0, gen: 0, t: 0, full: false, blocked: 0, pen: 0, end: 0, shake: 0, squeezed: 16 };
    for (let i = 0; i < 16; i++) P.add(st.p, -0.3 + (i % 8) * 0.08, -0.5 - Math.floor(i / 8) * 0.08, (P.rnd() - 0.5) * 0.004, 0, 0, 1);
  }
  // each jaw edge is a real zigzag line: vertex k at y = k·HALF; a ball is pushed out along the normal of the nearest tooth face
  const edgeX = (side, k, s) => side < 0 ? -s + (k % 2 === 0 ? A : 0) : s - A + (k % 2 === 0 ? A : 0);
  function contact(side, s, x, y, r) {                          // returns [push x, push y] (0, 0 when free)
    const k0 = Math.floor(y / HALF); let best = 1e9, qx = 0, qy = 0;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const ax = edgeX(side, ((k % 2) + 2) % 2, s), ay = k * HALF, bx = edgeX(side, (((k + 1) % 2) + 2) % 2, s), by = (k + 1) * HALF;
      const ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))), cx = ax + ex * t, cy = ay + ey * t, d = Math.hypot(x - cx, y - cy);
      if (d < best) { best = d; qx = cx; qy = cy; }
    }
    const inside = side < 0 ? x < -s + T(y) : x > s - A + T(y);
    if (!inside && best >= r) return null;
    let nx = x - qx, ny = y - qy; const l = Math.hypot(nx, ny) || 1e-9; nx /= l; ny /= l; if (inside) { nx = -nx; ny = -ny; }
    const push = inside ? best + r : r - best; return [nx * push, ny * push, push];
  }
  function jaws(st) {
    const p = st.p, X = p.X, Y = p.Y, r = st.r; let pen = 0;
    for (let i = 0; i < p.n; i++) for (const side of [-1, 1]) {
      const q = contact(side, st.s, X[i], Y[i], r); if (!q) continue;
      X[i] += q[0]; Y[i] += q[1]; if (q[2] > pen) pen = q[2];
    }
    st.pen = Math.max(st.pen, pen);
  }
  function batch(c, st) {
    // new balls: as many as grow × the balls that were squeezed, released above the pile on free places only
    const p = st.p, grow = c.opt.grow || 0.6, m = Math.min(p.cap - p.n, Math.max(4, Math.round(st.squeezed * grow))), g = ++st.gen, s = 2 * st.r * 1.05, occ = P.occupancy(p, s);
    let top = 1; for (let i = 0; i < p.n; i++) top = Math.min(top, p.Y[i]);
    for (let y = top - s * 1.5, put = 0; put < m && y > -0.97; y -= s * 0.87) for (let x = -0.95 + (Math.round(y / s) & 1) * s / 2; x < 0.95 && put < m; x += s)
      if (x * x + y * y < (1 - st.r * 1.1) ** 2 && occ.free(x, y, s * 0.98)) { P.add(p, x, y, (P.rnd() - 0.5) * 0.003, 0, g, 0.6); occ.mark(x, y); put++; }
    c.note(c.scale(4 + g % 8), 1, 1.3);
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt; st.pt += dt;
    const open = 1.1 + A, smin = A / 2 + 0.004;
    if (st.ph === 'open') { st.s = Math.min(open, st.s + dt * 1.1); if (st.pt > 2.4 && !st.full) { st.ph = 'close'; st.pt = 0; st.blocked = 0; } }
    else if (st.ph === 'close') {
      if (st.pen < st.r * 0.2) st.s = Math.max(smin, st.s - dt * 0.75); else { st.blocked += dt; st.s += dt * 0.02; }      // the jaws stall against the packed balls
      if (st.s <= smin + 1e-4 || st.blocked > 0.45) {
        st.ph = 'hold'; st.pt = 0; st.shake = 0.25; st.squeezed = st.p.n; c.note(c.scale(1 + st.gen % 8), 0.9, 0.8);
        let top = 0; for (let i = 0; i < st.p.n; i++) if (st.p.Y[i] < -0.8) top++;
        if (top > 4 || st.p.n >= st.p.cap * 0.97) st.full = true;
      }
    } else if (st.ph === 'hold') { if (st.pt > 0.7) { if (st.full) { st.ph = 'done'; } else { st.ph = 'open'; st.pt = 0; batch(c, st); } } }
    st.pen = 0; st.shake = Math.max(0, st.shake - dt);
    const sub = 3, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      P.integrate(st.p, h, 0.6, () => [0, 3.2], 4);
      for (let it = 0; it < 5; it++) { P.collide(st.p, st.r, -1.05, -1.05, 2.1, 2.1, 1); P.inCircle(st.p, 1, st.r, 0.15); jaws(st); }
    }
    if (st.ph === 'done' && P.ending(c, st, dt, 'Mâchoires', 'Plein : ' + st.p.n + ' billes en ' + Math.round(st.t) + ' s', 3.5)) reset(c);
    if (!c.thumb) c.status(st.p.n + ' billes' + (st.full ? ' · plein !' : ''));
  }

  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.44, c.H * 0.36), sh = st.shake > 0 ? (Math.random() - 0.5) * R * 0.02 * st.shake * 4 : 0, ox = c.W / 2 + sh, oy = c.H * 0.47, beat = c.react ? c.react.beat : 0;
    g.fillStyle = '#100c26'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.fill();
    P.drawBalls(g, st.p, ox, oy, R, st.r);
    g.save(); g.beginPath(); g.arc(ox, oy, R, 0, 7); g.clip();
    for (const side of [-1, 1]) {
      g.beginPath();
      const x0 = side < 0 ? -1.3 : 1.3; g.moveTo(ox + x0 * R, oy - 1.1 * R);
      for (let y = -1.1; y <= 1.1001; y += HALF) { const e = side < 0 ? -st.s + T(y) : st.s - A + T(y); g.lineTo(ox + e * R, oy + y * R); }
      g.lineTo(ox + x0 * R, oy + 1.1 * R); g.closePath();
      g.fillStyle = '#35305c'; g.fill(); g.strokeStyle = '#a49ecb'; g.lineWidth = Math.max(1, R * 0.006); g.stroke();
      // rail and rivets on each jaw
      const rail = side < 0 ? -st.s - 0.06 : st.s + 0.06 - A; g.strokeStyle = 'rgba(164,158,203,.45)'; g.beginPath(); g.moveTo(ox + rail * R, oy - R); g.lineTo(ox + rail * R, oy + R); g.stroke();
      g.fillStyle = 'rgba(164,158,203,.5)'; for (let y = -0.9; y < 0.95; y += 0.22) { g.beginPath(); g.arc(ox + (rail + side * -0.08) * R, oy + y * R, Math.max(1, R * 0.007), 0, 7); g.fill(); }
    }
    g.restore();
    g.lineWidth = Math.max(1.5, R * 0.009) * (1 + beat * 0.8); g.strokeStyle = 'rgba(214,206,255,.85)'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.stroke();
    if (!c.thumb) {
      const y = oy + R + Math.min(40, c.H * 0.06);
      P.counter(g, c, st.p.n + ' BILLES', y);
      if (st.full) { const fs = Math.round(Math.min(c.W * 0.1, 44)); g.save(); g.font = '800 ' + fs + 'px "Unbounded", system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ff5fa8'; g.fillText('PLEIN !', c.W / 2, y + fs * 1.2); g.restore(); }
    }
    P.fade(g, c, st, 3.5);
  }

  HB.game({
    id: 'machoires', name: 'Mâchoires',
    desc: 'Deux mâchoires en dents de scie tassent les billes dans un zigzag. À chaque fermeture il en arrive plus, jusqu\'à ce que ce soit plein.',
    ranges: [
      { key: 'grow', label: 'Croissance', min: 0.2, max: 1.2, step: 0.05, value: 0.6 },
      { key: 'size', label: 'Taille billes', min: 0.7, max: 1.5, step: 0.05, value: 1, restart: true }
    ],
    thumbSteps: 200, reset, step, draw,
    audit(c) {
      const st = c.st, p = st.p; let pen = 0;
      for (let i = 0; i < p.n; i++) { for (const side of [-1, 1]) { const q = contact(side, st.s, p.X[i], p.Y[i], st.r * 0.999); if (q) pen = Math.max(pen, q[2] / st.r); } pen = Math.max(pen, (Math.hypot(p.X[i], p.Y[i]) + st.r - 1) / st.r); }
      return { pen, ov: P.overlap(p, st.r), note: p.n + ' billes' };
    }
  });
})();
