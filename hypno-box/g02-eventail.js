/* Jeu 2 · Éventail : quatre pales entourent le moyeu ; les billes sont poussées vers le bord. Les ouvertures
   verticales et horizontales se ferment tour à tour : les billes coincées sont écrasées puis renaissent,
   multipliées et d'une nouvelle couleur, quand l'ouverture se rouvre. */
(() => {
  const P = HBP, SUM = 0.66, HUB = 0.07;
  // one cycle per pair: close (squeeze), hold closed, reopen, pause with both open
  const PH = [['close', 1.6], ['hold', 0.45], ['open', 1.25], ['pause', 1]];

  function reset(c) {
    const cap = c.thumb ? 260 : Math.round(c.opt.max || 2000);
    const st = c.st = { p: P.pool(cap), cap, r: 0.03, rmin: Math.sqrt(0.27 / cap), gen: 0, pair: 0, ph: 0, pt: 0, hv: SUM / 2, hh: SUM / 2, pend: [], crushed: [0, 0], t: 0, flash: [], end: 0, rounds: 0 };
    for (let i = 0; i < 32; i++) { const a = (i % 4) * Math.PI / 2 + (P.rnd() - 0.5) * 0.3, rho = 0.35 + P.rnd() * 0.6; P.add(st.p, Math.cos(a) * rho, Math.sin(a) * rho, 0, 0, 0, 1); }   // a few balls in each of the four gaps
  }
  // half-width of the gaps of each pair over the cycle (pair 0 = vertical, 1 = horizontal)
  function widths(st) {
    const [name, d] = PH[st.ph], k = P.sm(st.pt / d), a = st.pair, half = SUM / 2;
    let w;                                                              // width of the active pair
    if (name === 'close') w = P.lerp(half, 0, k); else if (name === 'hold') w = 0; else if (name === 'open') w = P.lerp(0, half, k); else w = half;
    const other = name === 'hold' ? SUM : SUM - w;
    if (a === 0) { st.hv = w; st.hh = other; } else { st.hh = w; st.hv = other; }
  }
  function inPair(st, i, pair) {
    const x = st.p.X[i], y = st.p.Y[i];
    return pair === 0 ? Math.abs(y) > Math.abs(x) : Math.abs(x) >= Math.abs(y);
  }
  function convert(c, st) {
    const p = st.p, pair = st.pair; let k = 0;
    for (let i = p.n - 1; i >= 0; i--) if (inPair(st, i, pair)) { k++; P.remove(p, i); }      // gap shut: nothing can stay in it
    k += st.crushed[pair]; st.crushed[pair] = 0;
    if (!k) return;
    const full = p.n + k * 2 > st.cap, mult = full ? 1 : (c.opt.mult || 2), m = Math.min(Math.round(k * mult), st.cap - p.n);
    st.pend.push({ m, m0: m, g: ++st.gen, pair });
    if (full) st.rounds++;
    st.flash.push({ pair, t: 0 });
    c.note(c.scale(2 + st.gen % 9), 0.8);
  }
  // the new balls appear while the gap reopens, only on free places inside it (from the rim inward), never inside a blade
  function release(c, st, q) {
    if (q.m <= 0) return;
    const p = st.p, r = st.r, s = 2 * r * 1.02, hw = q.pair === 0 ? st.hv : st.hh, occ = P.occupancy(p, s), base = q.pair === 0 ? Math.PI / 2 : 0;
    let budget = Math.max(6, Math.ceil(q.m0 / 30));
    for (let rho = 1 - r * 1.05; rho > HUB + r * 2 && budget > 0 && q.m > 0; rho -= s * 0.87) {
      const lim = hw - Math.asin(Math.min(1, r * 1.05 / rho)); if (lim <= 0) continue;
      for (let a = -lim; a <= lim && budget > 0 && q.m > 0; a += s / rho) for (const side of [0, Math.PI]) {
        if (q.m <= 0 || budget <= 0) break; const an = base + side + a, x = Math.cos(an) * rho, y = Math.sin(an) * rho;
        if (!occ.free(x, y, s * 0.98)) continue; P.add(p, x, y, 0, 0, q.g, 0); occ.mark(x, y); q.m--; budget--;
      }
    }
    if (!q.sang) { q.sang = true; c.note(c.scale(5 + q.g % 9), 1, 1.4); }
    // gap fully open and no free place left for the rest: the circle is full (the remaining balls are not created)
    if (budget === Math.max(6, Math.ceil(q.m0 / 30)) && hw >= SUM / 2 - 0.01 && Math.abs(st.r - st.rT) < st.rT * 0.03) { q.m = 0; st.rounds++; }
  }
  // keep every ball in a gap: an angular wedge around 0°, 90°, 180° or 270°
  function blades(st) {
    const p = st.p, r = st.r, X = p.X, Y = p.Y;
    for (let i = 0; i < p.n; i++) {
      let rho = Math.hypot(X[i], Y[i]); if (rho < HUB + r) { const k = (HUB + r) / (rho || 1e-9); X[i] *= k; Y[i] *= k; rho = HUB + r; }   // the hub is solid
      const phi = Math.atan2(Y[i], X[i]), q = Math.round(phi / (Math.PI / 2)), c0 = q * Math.PI / 2, hw = (q & 1) ? st.hv : st.hh;
      const d = P.wrap(phi - c0), lim = hw - Math.asin(Math.min(1, r / rho));
      if (Math.abs(d) <= lim) continue;
      if (lim <= 0) { st.crushed[(q & 1) ? 0 : 1]++; P.remove(p, i); i--; continue; }      // no room left between the blades: the ball is crushed
      // the blade face is a straight edge from the hub: push the ball perpendicular to it, to one radius away
      const sg = Math.sign(d), te = c0 + sg * hw, nx = Math.cos(te - sg * Math.PI / 2), ny = Math.sin(te - sg * Math.PI / 2), sd = X[i] * nx + Y[i] * ny;
      if (sd < r) { X[i] += nx * (r - sd); Y[i] += ny * (r - sd); }
    }
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt;
    st.pt += dt; const nm = PH[st.ph][0];
    if (PH[st.ph][0] === 'pause' && P.live(st) && st.pt > 0.25 && P.take(st, 'bq')) st.pt = PH[st.ph][1];      // a kick starts the next closing
    if (st.pt >= PH[st.ph][1]) {
      st.pt = 0;
      if (nm === 'close') convert(c, st);
      st.ph = (st.ph + 1) % PH.length; if (st.ph === 0) st.pair = 1 - st.pair;
    }
    widths(st);
    for (const q of st.pend) if ((q.pair === 0 ? st.hv : st.hh) > st.r * 3) release(c, st, q);
    st.pend = st.pend.filter(q => q.m > 0);
    const rT = st.rT = Math.max(st.rmin, Math.min(0.03, Math.sqrt(0.09 / Math.max(1, st.p.n + st.pend.reduce((a, q) => a + q.m, 0)))));   // balls shrink as the crowd grows, new ones included
    st.r += (rT - st.r) * Math.min(1, dt * 1.5);
    const sub = 2, h = dt / sub, g0 = 1.6 * (P.live(st) ? 0.8 + st.bs * 0.6 * st.mk : 1);
    for (let s = 0; s < sub; s++) {
      P.integrate(st.p, h, 0.5, (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d * g0, y / d * g0]; }, 3);
      for (let it = 0; it < 10; it++) { blades(st); P.inCircle(st.p, 1, st.r, 0.2); P.collide(st.p, st.r, -1.05, -1.05, 2.1, 2.1, 1); }
      blades(st); P.inCircle(st.p, 1, st.r, 0.2);
    }
    // closing gap with more balls than it can hold: the ones squeezed hardest against a neighbour are crushed (counted for the rebirth)
    if (PH[st.ph][0] === 'close') {
      const p = st.p, D = 2 * st.r, occ = P.occupancy(p, D);
      for (let i = p.n - 1; i >= 0; i--) if (inPair(st, i, st.pair) && occ.count(p.X[i], p.Y[i], D * 0.45) > 1) { st.crushed[st.pair]++; P.remove(p, i); }
    }
    for (const f of st.flash) f.t += dt; st.flash = st.flash.filter(f => f.t < 0.7);
    if (st.rounds >= 2 || st.end) {
      if (P.ending(c, st, dt, 'Éventail', 'Éventail rempli : ' + st.p.n + ' billes, ' + (st.gen + 1) + ' couleurs en ' + Math.round(st.t) + ' s', 3)) reset(c);
    }
    if (!c.thumb) c.status(st.p.n + ' billes · ' + (st.gen + 1) + (st.gen ? ' couleurs' : ' couleur'));
  }

  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.44, c.H * 0.38), ox = c.W / 2, oy = c.H / 2, beat = c.react ? c.react.beat : 0;
    g.fillStyle = '#100c26'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.fill();
    P.drawBalls(g, st.p, ox, oy, R, st.r);
    // the four blades: wedges between the gaps
    for (let q = 0; q < 4; q++) {
      const a0 = q * Math.PI / 2 + (q & 1 ? st.hv : st.hh), a1 = (q + 1) * Math.PI / 2 - ((q + 1) & 1 ? st.hv : st.hh);
      if (a1 - a0 < 0.002) continue;
      g.fillStyle = '#4f4a78'; g.strokeStyle = '#2f2a52'; g.lineWidth = Math.max(1, R * 0.006);
      g.beginPath(); g.moveTo(ox, oy); g.arc(ox, oy, R, a0, a1); g.closePath(); g.fill(); g.stroke();
      const am = (a0 + a1) / 2, sw = (a1 - a0) / 2;
      g.strokeStyle = '#3a355f'; g.lineWidth = Math.max(1.5, R * 0.014); g.lineCap = 'round';
      for (const [rr, off] of [[0.42, 0.32], [0.72, -0.32]]) { const aa = am + off * sw; g.beginPath(); g.moveTo(ox + Math.cos(aa) * R * (rr - 0.06), oy + Math.sin(aa) * R * (rr - 0.06)); g.lineTo(ox + Math.cos(aa) * R * (rr + 0.06), oy + Math.sin(aa) * R * (rr + 0.06)); g.stroke(); }
    }
    for (const f of st.flash) {
      const k = f.t / 0.7; g.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(3) + ')'; g.lineWidth = Math.max(2, R * 0.02 * (1 - k));
      g.beginPath(); for (const s of [1, -1]) { if (f.pair === 0) { g.moveTo(ox, oy + s * R * HUB); g.lineTo(ox, oy + s * R); } else { g.moveTo(ox + s * R * HUB, oy); g.lineTo(ox + s * R, oy); } } g.stroke();
    }
    g.lineWidth = Math.max(1.5, R * 0.009) * (1 + beat * 0.8); g.strokeStyle = 'rgba(214,206,255,.85)'; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.stroke();
    g.fillStyle = '#9d97c4'; g.beginPath(); g.arc(ox, oy, R * HUB * (1 + beat * 0.2), 0, 7); g.fill();
    g.fillStyle = '#4a4470'; g.beginPath(); g.arc(ox, oy, R * HUB * 0.45, 0, 7); g.fill();
    P.fade(g, c, st, 3);
  }

  HB.game({
    id: 'eventail', name: 'Éventail',
    desc: 'Quatre pales s\'ouvrent et se ferment tour à tour : les billes écrasées renaissent multipliées, d\'une nouvelle couleur.',
    ranges: [
      { key: 'mult', label: 'Multiplier', min: 2, max: 6, step: 1, value: 2 },
      { key: 'max', label: 'Billes', min: 500, max: 3500, step: 100, value: 2000, restart: true }
    ],
    thumbSteps: 300, reset, step, draw,
    // the song drives the game: what each musical event does here
    music(c, m) { const st = c.st; P.mus(st, m); },
    audit(c) {                                    // how far balls go into a blade, the hub or past the rim (in radii)
      const st = c.st, p = st.p, r = st.r; let pen = 0;
      for (let i = 0; i < p.n; i++) { if (p.age[i] < 1) continue; const rho = Math.hypot(p.X[i], p.Y[i]), phi = Math.atan2(p.Y[i], p.X[i]), q = Math.round(phi / (Math.PI / 2)), hw = (q & 1) ? st.hv : st.hh, d = Math.abs(P.wrap(phi - q * Math.PI / 2));
        if (hw > 0.02) pen = Math.max(pen, (r - rho * Math.sin(Math.max(0, hw - d))) / r * (d > hw - 0.5 ? 1 : 0));
        pen = Math.max(pen, (rho + r - 1) / r, (HUB + r - rho) / r); }
      return { pen, ov: P.overlap(p, r), note: p.n + ' billes' };
    }
  });
})();
