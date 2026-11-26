/* Jeu 4 · Sablier : deux pistons claquent au centre du cercle. Les billes, attirées vers le milieu, se font
   écraser quand elles sont prises entre les pistons : chaque écrasement fait jaillir une gerbe de nouvelles
   billes vers le haut et vers le bas, jusqu'à remplir le cercle. */
(() => {
  const P = HBP, TIP = 0.18, FLARE = 0.2, OPEN = 0.26;

  function reset(c) {
    const cap = c.thumb ? 200 : Math.round(c.opt.max || 1500);
    const st = c.st = { p: P.pool(cap), r: 0.032, rmin: Math.sqrt(0.5 / cap), g: OPEN, ph: 'wait', pt: 0.6, gen: 0, t: 0, bursts: [], end: 0, crushes: 0, caught: 0 };
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.3; P.add(st.p, Math.cos(a) * 0.4, Math.sin(a) * 0.4, (P.rnd() - 0.5) * 0.01, (P.rnd() - 0.5) * 0.01, 0, 1); }
  }
  const half = (st, x) => TIP + Math.max(0, Math.abs(x) - st.g) * FLARE;
  function pistons(st) {
    const p = st.p, X = p.X, Y = p.Y, r = st.r;
    for (let i = 0; i < p.n; i++) {
      const ax = Math.abs(X[i]), s = X[i] < 0 ? -1 : 1, hw = half(st, X[i]);
      if (ax + r <= st.g || Math.abs(Y[i]) > hw + r) continue;
      if (st.ph === 'slam' && ax < st.g + r && Math.abs(Y[i]) < TIP && st.g < r) { st.caught++; P.remove(p, i); i--; continue; }   // no room left between the two faces: crushed
      // inside or touching a piston: leave by the nearest side (the tip face or the top / bottom edge)
      const dFace = ax + r - st.g, dEdge = hw + r - Math.abs(Y[i]);
      if (dFace < dEdge && ax < st.g + 0.02) { X[i] = s * (st.g - r); let vx = X[i] - p.PX[i]; if (vx * s > 0) p.PX[i] = X[i] + vx * 0.9; }
      else { const sy = Y[i] < 0 ? -1 : 1; Y[i] = sy * (hw + r); let vy = Y[i] - p.PY[i]; if (vy * sy < 0) p.PY[i] = Y[i] + vy * 0.9; }
    }
  }
  function crush(c, st) {
    const p = st.p; let k = 0;
    for (let i = p.n - 1; i >= 0; i--) if (Math.abs(p.X[i]) < st.r && Math.abs(p.Y[i]) < TIP) { k++; P.remove(p, i); }
    k += st.caught; st.caught = 0; st.bursts.push({ t: 0, k });
    if (!k) { c.note(c.scale(0), 0.4, 0.5); return; }
    const gcol = ++st.gen, m = Math.min(p.cap - p.n, Math.round(k * (c.opt.mult || 3)));
    // the new balls spurt out of the seam, up and down, on free places just outside the pistons, moving away from them
    const s = 2 * st.r * 1.03, occ = P.occupancy(p, s); let put = 0;
    for (let row = 0; put < m && row < 40; row++) for (const sy of [1, -1]) for (let col = 0; col < 25 && put < m; col++) {
      const x = (col % 2 ? 1 : -1) * Math.ceil(col / 2) * s * 0.9, y = sy * (TIP + st.r * 1.05 + row * s * 0.87);
      if (x * x + y * y > (1 - st.r * 1.1) ** 2 || !occ.free(x, y, s * 0.98)) continue;
      const sp = 0.012 + P.rnd() * 0.012; P.add(p, x, y, x * 0.02, sy * sp, gcol, 0.3); occ.mark(x, y); put++;
    }
    st.crushes++; c.note(c.scale(3 + gcol % 9), 1, 1.3);
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt; st.pt += dt;
    if (st.ph === 'wait' && (P.live(st) ? (st.pt > 0.12 && P.take(st, 'bq')) || st.pt > 2.2 : st.pt > (st.wait || 0.9))) { st.ph = 'slam'; st.pt = 0; }
    else if (st.ph === 'slam') { st.g = Math.max(0, OPEN * (1 - st.pt / 0.14)); if (st.g <= 0) { st.ph = 'hold'; st.pt = 0; crush(c, st); } }
    else if (st.ph === 'hold' && st.pt > 0.12) { st.ph = 'open'; st.pt = 0; }
    else if (st.ph === 'open') { st.g = OPEN * P.sm(st.pt / 0.45); if (st.pt >= 0.45) { st.ph = 'wait'; st.pt = 0; st.wait = 0.15 + P.rnd() * 0.35; } }
    const rT = Math.max(st.rmin, Math.min(0.032, Math.sqrt(0.35 / Math.max(1, st.p.n))));
    st.r += (rT - st.r) * Math.min(1, dt * 1.5);
    const sub = 3, h = dt / sub, pull = 1.8;
    for (let s = 0; s < sub; s++) {
      P.integrate(st.p, h, 0.85, (x, y) => [-x * pull, -y * pull], 3);
      for (let it = 0; it < 4; it++) { P.collide(st.p, st.r, -1.05, -1.05, 2.1, 2.1, 0.9); P.inCircle(st.p, 1, st.r, 0.8); pistons(st); }
    }
    for (const b of st.bursts) b.t += dt; st.bursts = st.bursts.filter(b => b.t < 0.6);
    if (st.p.n >= st.p.cap * 0.98 || st.end) { if (P.ending(c, st, dt, 'Sablier', 'Cercle rempli : ' + st.p.n + ' billes après ' + st.crushes + ' écrasements, en ' + Math.round(st.t) + ' s', 4)) reset(c); }
    if (!c.thumb) c.status(st.p.n + ' billes · ' + st.crushes + ' écrasements');
  }

  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.44, c.H * 0.38), ox = c.W / 2, oy = c.H / 2, beat = c.react ? c.react.beat : 0;
    g.fillStyle = '#100c26'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.fill();
    P.drawBalls(g, st.p, ox, oy, R, st.r);
    for (const b of st.bursts) {
      const k = b.t / 0.6; g.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)).toFixed(3) + ')';
      for (let j = 0; j < 14; j++) { const sy = j % 2 ? 1 : -1, yy = sy * (TIP + k * (0.2 + (j % 5) * 0.08)), xx = ((j * 37) % 11 - 5) * 0.012 * (1 + k); g.fillRect(ox + xx * R - 1.5, oy + yy * R - 1.5, 3, 3); }
    }
    g.save(); g.beginPath(); g.arc(ox, oy, R, 0, 7); g.clip();
    for (const s of [-1, 1]) {
      const x0 = s * st.g, x1 = s * 1.15, h0 = TIP, h1 = TIP + (1.15 - st.g) * FLARE;
      g.beginPath(); g.moveTo(ox + x0 * R, oy - h0 * R); g.lineTo(ox + x1 * R, oy - h1 * R); g.lineTo(ox + x1 * R, oy + h1 * R); g.lineTo(ox + x0 * R, oy + h0 * R); g.closePath();
      g.fillStyle = '#3b3666'; g.fill(); g.strokeStyle = '#a49ecb'; g.lineWidth = Math.max(1, R * 0.006); g.stroke();
      // inner frame, centre rail and rivets
      const xi = s * (st.g + 0.05), hi = TIP - 0.03;
      g.strokeStyle = 'rgba(164,158,203,.4)'; g.beginPath(); g.moveTo(ox + xi * R, oy - hi * R); g.lineTo(ox + x1 * R, oy - (h1 - 0.04) * R); g.moveTo(ox + xi * R, oy + hi * R); g.lineTo(ox + x1 * R, oy + (h1 - 0.04) * R); g.moveTo(ox + xi * R, oy - hi * R); g.lineTo(ox + xi * R, oy + hi * R); g.stroke();
      g.strokeStyle = 'rgba(20,16,40,.6)'; g.lineWidth = Math.max(1.5, R * 0.012); g.beginPath(); g.moveTo(ox + (x0 + s * 0.12) * R, oy); g.lineTo(ox + x1 * R, oy); g.stroke();
      g.fillStyle = 'rgba(164,158,203,.55)'; for (const fx of [0.3, 0.55, 0.8]) for (const fy of [-1, 1]) { const xx = s * (st.g + fx), hh = TIP + fx * FLARE - 0.05; g.beginPath(); g.arc(ox + xx * R, oy + fy * hh * R, Math.max(1, R * 0.008), 0, 7); g.fill(); }
    }
    g.restore();
    g.lineWidth = Math.max(1.5, R * 0.009) * (1 + beat * 0.8); g.strokeStyle = 'rgba(214,206,255,.85)'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.stroke();
    if (!c.thumb) P.counter(g, c, st.p.n + ' BILLES', oy - R - Math.min(34, c.H * 0.05));
    P.fade(g, c, st, 4);
  }

  HB.game({
    id: 'sablier', name: 'Sablier',
    desc: 'Deux pistons claquent au centre : chaque bille écrasée fait jaillir une gerbe de nouvelles billes.',
    ranges: [
      { key: 'mult', label: 'Multiplier', min: 2, max: 10, step: 1, value: 3 },
      { key: 'max', label: 'Billes', min: 400, max: 3000, step: 100, value: 1500, restart: true }
    ],
    thumbSteps: 300, reset, step, draw,
    // the song drives the game: what each musical event does here
    music(c, m) { const st = c.st; P.mus(st, m); },
    audit(c) {
      const st = c.st, p = st.p, r = st.r; let pen = 0;
      for (let i = 0; i < p.n; i++) { const ax = Math.abs(p.X[i]), hw = half(st, p.X[i]), ay = Math.abs(p.Y[i]);
        if (ax + r > st.g && ay < hw + r && p.age[i] >= 1) pen = Math.max(pen, Math.min(ax + r - st.g, hw + r - ay) / r);
        pen = Math.max(pen, (Math.hypot(p.X[i], p.Y[i]) + r - 1) / r); }
      return { pen, ov: P.overlap(p, r), note: p.n + ' billes' };
    }
  });
})();
