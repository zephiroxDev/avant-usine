/* Jeu 10 · Démolition : vue de côté. Une tour de petits blocs liés entre eux ; une boule de métal tombe sur une
   rampe et la percute. À chaque manche, la boule pèse dix fois plus (1 kg, 10 kg, 100 kg, 1 000 kg) : les liens
   cassent de plus en plus et la tour s'effondre en avalanche de blocs. Monde de 1 × 1.6, sol en y = 1.45. */
(() => {
  const P = HBP, GROUND = 1.45, CELL = 0.024, MASSES = [1, 10, 100, 1000];
  const RAMP = [[1.02, 0.86, 0.74, 1.3], [0.74, 1.3, 0.62, 1.42]];
  function reset(c) { c.st = { round: 0, t: 0 }; build(c, c.st); }
  function build(c, st) {
    const cols = Math.round(c.opt.cols || 12), rows = Math.round((c.opt.height || 0.85) / CELL), cap = cols * rows;
    const p = P.pool(cap), x0 = 0.42 - cols * CELL / 2, bonds = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) P.add(p, x0 + (x + 0.5) * CELL, GROUND - (y + 0.5) * CELL, 0, 0, (x * 7 + y * 3) % 5, 1);
    const id = (x, y) => y * cols + x;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (x + 1 < cols) bonds.push([id(x, y), id(x + 1, y), CELL, 0.45]);
      if (y + 1 < rows) bonds.push([id(x, y), id(x, y + 1), CELL, 1]);
      if (x + 1 < cols && y + 1 < rows) { bonds.push([id(x, y), id(x + 1, y + 1), CELL * Math.SQRT2, 0.4]); bonds.push([id(x + 1, y), id(x, y + 1), CELL * Math.SQRT2, 0.4]); }
    }
    const m = MASSES[st.round % MASSES.length], br = 0.034 * (1 + Math.log10(m) * 0.22);
    const hb = new Int32Array(cap).fill(-1), vb = new Int32Array(cap).fill(-1);
    bonds.forEach(([i, j, L, w], k) => { if (j === i + 1 && w < 1) hb[i] = k; else if (j === i + cols) vb[i] = k; });
    Object.assign(st, { hb, vb, ang: new Float32Array(cap), p, bonds, alive: new Uint8Array(bonds.length).fill(1), broken: 0, m, ball: { x: 0.92, y: -0.1, px: 0.92, py: -0.1, r: br, rot: 0 }, rt: 0, hit: false, still: 0, label: 1.4, dust: [] });
  }
  function solve(c, st, h) {
    const p = st.p, X = p.X, Y = p.Y, B = st.bonds, al = st.alive, brk = c.opt.strength || 0.07;
    for (let k = 0; k < B.length; k++) {
      if (!al[k]) continue; const [i, j, L, w] = B[k], dx = X[j] - X[i], dy = Y[j] - Y[i], d = Math.hypot(dx, dy) || 1e-9, e = (d - L) / L;
      if (Math.abs(e) > brk * w) { al[k] = 0; st.broken++; if (st.broken % 6 === 0) c.note(c.scale(4 + (st.broken / 6) % 12), 0.35, 0.4); continue; }
      const f = (d - L) / d * 0.5; X[i] += dx * f; Y[i] += dy * f; X[j] -= dx * f; Y[j] -= dy * f;
    }
  }
  function ground(st) {
    const p = st.p, r = CELL / 2;
    for (let i = 0; i < p.n; i++) {
      if (p.Y[i] > GROUND - r) { p.Y[i] = GROUND - r; const vx = p.X[i] - p.PX[i]; p.PX[i] = p.X[i] - vx * 0.55; if (p.PY[i] > p.Y[i]) p.PY[i] = p.Y[i]; }
      if (p.X[i] < r) p.X[i] = r; if (p.X[i] > 1.3) p.X[i] = 1.3;
      for (const q of RAMP) P.capsule(p, i, q[0], q[1], q[2], q[3], r + 0.012);
    }
  }
  function contacts(c, st) {
    const b = st.ball;
    // ball against blocks: the heavier the ball, the more the blocks give way
    const p = st.p, wb = 1 / (st.m * 0.25), wp = 1, rr = b.r + CELL / 2;
    for (let i = 0; i < p.n; i++) {
      const dx = p.X[i] - b.x, dy = p.Y[i] - b.y, d2 = dx * dx + dy * dy; if (d2 >= rr * rr || d2 < 1e-12) continue;
      const d = Math.sqrt(d2), o = (rr - d) / d, s = wb + wp;
      p.X[i] += dx * o * wp / s; p.Y[i] += dy * o * wp / s; b.x -= dx * o * wb / s; b.y -= dy * o * wb / s;
      if (!st.hit) { st.hit = true; c.note(c.scale(2), 1, 1.6); for (let k = 0; k < 20; k++) st.dust.push({ x: b.x - b.r, y: b.y, vx: -Math.random() * 0.5, vy: -Math.random() * 0.5, t: 0 }); }
    }
  }
  function ballStep(c, st, h) {
    const b = st.ball, vx = (b.x - b.px) * 0.999, vy = (b.y - b.py) * 0.999;
    b.px = b.x; b.py = b.y; b.x += vx; b.y += vy + 2.4 * h * h;
    for (const [ax, ay, bx, by] of RAMP) {
      const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey; let t = ((b.x - ax) * ex + (b.y - ay) * ey) / l2; t = Math.max(0, Math.min(1, t));
      const qx = b.x - ax - ex * t, qy = b.y - ay - ey * t, d = Math.hypot(qx, qy), rr = b.r + 0.012;
      if (d < rr && d > 1e-9) { const nx = qx / d, ny = qy / d; b.x += nx * (rr - d); b.y += ny * (rr - d); let wx = b.x - b.px, wy = b.y - b.py; const vn = wx * nx + wy * ny; if (vn < 0) { wx -= 1.15 * vn * nx; wy -= 1.15 * vn * ny; b.px = b.x - wx; b.py = b.y - wy; } }
    }
    if (b.y > GROUND - b.r) { b.y = GROUND - b.r; const wx = b.x - b.px; b.px = b.x - wx * 0.995; if (b.py > b.y) b.py = b.y + (b.py - b.y) * -0.2; }
    contacts(c, st);
    b.rot += (b.x - b.px) / b.r;
  }
  function step(c, dt) {
    const st = c.st; if (!st || !st.p) return; st.t += dt; st.rt += dt; st.label = Math.max(0, st.label - dt);
    const sub = 4, h = dt / sub, p = st.p;
    for (let s = 0; s < sub; s++) {
      P.integrate(p, h, 0.9, () => [0, 2.4], 4);
      ballStep(c, st, h);
      for (let it = 0; it < 4; it++) { solve(c, st, h); P.collide(p, CELL / 2, -0.1, -0.2, 1.5, 1.8, 0.8); contacts(c, st); ground(st); }
    }
    for (const d of st.dust) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 0.6 * dt; } st.dust = st.dust.filter(d => d.t < 1.5);
    const b = st.ball, sp = Math.hypot(b.x - b.px, b.y - b.py) / h;
    if (st.hit && sp < 0.05) st.still += dt; else st.still = 0;
    if ((st.still > 1.5 || st.rt > 9) && st.rt > 4) {
      if (!c.thumb) HBH.add('Démolition', st.m.toLocaleString('fr-FR') + ' kg : ' + st.broken + ' liens cassés');
      st.round++; build(c, st);
    }
    if (!c.thumb) c.status(st.m.toLocaleString('fr-FR') + ' kg · ' + st.broken + ' liens cassés');
  }
  const TONES = ['#c9a77a', '#bf9c6e', '#d2b183', '#b89466', '#c5a273'];
  function draw(c, g) {
    const st = c.st; if (!st || !st.p) return;
    const s = Math.min(c.W / 1, c.H / 1.6), ox = (c.W - s) / 2, oy = (c.H - 1.6 * s) / 2, X = x => ox + x * s, Y = y => oy + y * s, beat = c.react ? c.react.beat : 0;
    const bg = g.createLinearGradient(0, oy, 0, oy + 1.6 * s); bg.addColorStop(0, '#1c1738'); bg.addColorStop(1, '#0e0b20'); g.fillStyle = bg; g.fillRect(ox, oy, s, 1.6 * s);
    g.fillStyle = '#2a2550'; g.fillRect(ox, Y(GROUND), s, (1.6 - GROUND) * s);
    g.strokeStyle = 'rgba(214,206,255,' + (0.4 + beat * 0.4).toFixed(2) + ')'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox, Y(GROUND)); g.lineTo(ox + s, Y(GROUND)); g.stroke();
    // blocks
    const p = st.p, z = CELL * s * 0.94;
    // each block is drawn turned like the structure around it (from its bonds); a loose block keeps the angle it had
    const ang = st.ang;
    for (let i = 0; i < p.n; i++) { let a = null; const hb = st.hb[i], vb = st.vb[i];
      if (hb >= 0 && st.alive[hb]) { const j = st.bonds[hb][1]; a = Math.atan2(p.Y[j] - p.Y[i], p.X[j] - p.X[i]); }
      else if (vb >= 0 && st.alive[vb]) { const j = st.bonds[vb][1]; a = Math.atan2(p.Y[j] - p.Y[i], p.X[j] - p.X[i]) + Math.PI / 2; }
      if (a !== null) ang[i] = a; else if (p.Y[i] > GROUND - CELL * 0.6) ang[i] *= 0.9;           // a free block settles flat on the ground
    }
    for (let k = 0; k < 5; k++) { g.fillStyle = TONES[k]; g.beginPath();
      for (let i = 0; i < p.n; i++) { if (p.col[i] !== k) continue; const cx = X(p.X[i]), cy = Y(p.Y[i]), ca = Math.cos(ang[i]) * z / 2, sa = Math.sin(ang[i]) * z / 2;
        g.moveTo(cx - ca + sa, cy - sa - ca); g.lineTo(cx + ca + sa, cy + sa - ca); g.lineTo(cx + ca - sa, cy + sa + ca); g.lineTo(cx - ca - sa, cy - sa + ca); g.closePath(); }
      g.fill(); }

    // ramp
    g.lineCap = 'round'; g.strokeStyle = 'rgba(111,127,230,.75)'; g.lineWidth = Math.max(4, 0.024 * s); g.beginPath(); g.moveTo(X(RAMP[0][0]), Y(RAMP[0][1])); g.lineTo(X(RAMP[0][2]), Y(RAMP[0][3])); g.lineTo(X(RAMP[1][2]), Y(RAMP[1][3])); g.stroke();
    g.fillStyle = 'rgba(111,127,230,.25)'; g.beginPath(); g.moveTo(X(RAMP[0][0]), Y(RAMP[0][1])); g.lineTo(X(RAMP[0][2]), Y(RAMP[0][3])); g.lineTo(X(RAMP[1][2]), Y(RAMP[1][3])); g.lineTo(X(RAMP[1][2]), Y(GROUND)); g.lineTo(X(1.05), Y(GROUND)); g.lineTo(X(1.05), Y(RAMP[0][1])); g.closePath(); g.fill();
    // metal ball
    const b = st.ball, br = b.r * s, gr = g.createRadialGradient(X(b.x) - br * 0.35, Y(b.y) - br * 0.4, br * 0.1, X(b.x), Y(b.y), br);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#c9c6d8'); gr.addColorStop(0.75, '#6e6a86'); gr.addColorStop(1, '#2e2b40');
    g.fillStyle = gr; g.beginPath(); g.arc(X(b.x), Y(b.y), br, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, br * 0.08); g.beginPath(); g.arc(X(b.x), Y(b.y), br * 0.6, b.rot, b.rot + 1.2); g.stroke();
    g.fillStyle = '#e6dcc8'; for (const d of st.dust) { g.globalAlpha = Math.max(0, 1 - d.t / 1.5) * 0.7; g.fillRect(X(d.x) - 1.5, Y(d.y) - 1.5, 3, 3); } g.globalAlpha = 1;
    if (!c.thumb) {
      const txt = st.m.toLocaleString('fr-FR') + ' kg', fs = Math.round(Math.min(c.W * 0.11, 46) * (1 + st.label * 0.3));
      g.save(); g.font = '800 ' + fs + 'px "Unbounded", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(241,238,255,.92)'; g.fillText(txt, c.W / 2, oy + 0.12 * s); g.restore();
    }
  }
  HB.game({
    id: 'demolition', name: 'Démolition',
    desc: 'Une boule de métal dévale une rampe et percute une tour de blocs : dix fois plus lourde à chaque manche.',
    ranges: [
      { key: 'strength', label: 'Solidité', min: 0.03, max: 0.2, step: 0.01, value: 0.07 },
      { key: 'cols', label: 'Largeur', min: 6, max: 18, step: 1, value: 12, restart: true },
      { key: 'height', label: 'Hauteur', min: 0.4, max: 1.1, step: 0.05, value: 0.85, restart: true }
    ],
    thumbSteps: 200, reset, step, draw,
    audit(c) {                                     // blocks under the ground or inside the ramp / the ball, overlap between blocks
      const st = c.st, p = st.p, r = CELL / 2, b = st.ball; let pen = 0;
      for (let i = 0; i < p.n; i++) { pen = Math.max(pen, (p.Y[i] + r - GROUND) / r, (b.r + r - Math.hypot(p.X[i] - b.x, p.Y[i] - b.y)) / r);
        for (const q of RAMP) { const ex = q[2] - q[0], ey = q[3] - q[1], t = Math.max(0, Math.min(1, ((p.X[i] - q[0]) * ex + (p.Y[i] - q[1]) * ey) / (ex * ex + ey * ey))); pen = Math.max(pen, (r + 0.012 - Math.hypot(p.X[i] - q[0] - ex * t, p.Y[i] - q[1] - ey * t)) / r); } }
      return { pen, ov: P.overlap(p, r), note: st.m + ' kg, ' + st.broken + ' liens cassés' };
    }
  });
})();
