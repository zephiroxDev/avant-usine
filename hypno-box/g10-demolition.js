/* Jeu 10 · Démolition (3D) : une tour de petits cubes (largeur × profondeur × hauteur) liés à leurs voisins. Une boule de métal
   dévale une rampe et la percute de face. À chaque manche, elle pèse dix fois plus (1 kg, 10 kg, 100 kg, 1 000 kg) : les liens
   cassent sous l'effort, la gravité fait le reste. Physique en 3D (y vers le bas, sol en y = 0), rendu en perspective. */
(() => {
  const P = HBP, CELL = 0.032, R = CELL / 2, MASSES = [1, 10, 100, 1000], G = 2.4;
  const RAMP = [[1.25, -0.95, 0.62, -0.12], [0.62, -0.12, 0.42, 0]];       // ramp profile in x / y, as wide as the tower is deep
  const TONES = [[214, 177, 131], [201, 164, 118], [224, 190, 143], [190, 152, 108], [208, 170, 124]];

  function reset(c) { c.st = { round: 0, t: 0 }; build(c, c.st); }
  function build(c, st) {
    const nx = Math.round(c.opt.cols || 8), nz = c.thumb ? 2 : 4, ny = Math.round((c.opt.height || 0.85) / CELL), N = nx * ny * nz;
    const X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N), PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N), tone = new Uint8Array(N);
    const id = (i, j, k) => (j * nz + k) * nx + i, bonds = [];
    for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const q = id(i, j, k); X[q] = PX[q] = (i - (nx - 1) / 2) * CELL; Y[q] = PY[q] = -(j + 0.5) * CELL; Z[q] = PZ[q] = (k - (nz - 1) / 2) * CELL; tone[q] = (i * 7 + j * 3 + k * 5) % 5;
      // neighbours: x and z (side by side, weaker), y (stacked, stronger), diagonals in the x-y and z-y planes (shear)
      if (i + 1 < nx) bonds.push(q, id(i + 1, j, k), 0); if (k + 1 < nz) bonds.push(q, id(i, j, k + 1), 0); if (j + 1 < ny) bonds.push(q, id(i, j + 1, k), 1);
      if (i + 1 < nx && j + 1 < ny) { bonds.push(q, id(i + 1, j + 1, k), 2); bonds.push(id(i + 1, j, k), id(i, j + 1, k), 2); }
      if (k + 1 < nz && j + 1 < ny) { bonds.push(q, id(i, j + 1, k + 1), 2); bonds.push(id(i, j, k + 1), id(i, j + 1, k), 2); }
    }
    const nb = bonds.length / 3, A = new Int32Array(nb), B = new Int32Array(nb), L = new Float32Array(nb), W = new Float32Array(nb), hb = new Int32Array(N).fill(-1);
    for (let m = 0; m < nb; m++) { A[m] = bonds[m * 3]; B[m] = bonds[m * 3 + 1]; const t = bonds[m * 3 + 2]; L[m] = t === 2 ? CELL * Math.SQRT2 : CELL; W[m] = t === 1 ? 1 : t === 0 ? 0.45 : 0.4; if (t === 0 && B[m] === A[m] + 1) hb[A[m]] = m; }
    const m = MASSES[st.round % MASSES.length], br = 0.036 * (1 + Math.log10(m) * 0.22);
    Object.assign(st, { N, nx, ny, nz, X, Y, Z, PX, PY, PZ, tone, A, B, L, W, hb, alive: new Uint8Array(nb).fill(1), ang: new Float32Array(N), broken: 0, m,
      ball: startBall(br), hold: P.live(st) ? 4 : 0, rt: 0, hit: false, still: 0, label: 1.4, dust: [], head: null, next: new Int32Array(N) });
  }
  // the ball starts resting on the slope, whatever its size (never inside the ramp)
  function startBall(r) {
    const [ax, ay, bx, by] = RAMP[0], t = 0.1, ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey), nx = -ey / l, ny = ex / l, k = r + 0.0125;      // normal pointing up, above the slope
    const x = ax + ex * t + nx * k, y = ay + ey * t + ny * k; return { x, y, z: 0, px: x, py: y, pz: 0, r, rot: 0 };
  }
  function bondsPass(c, st) {
    const { X, Y, Z, A, B, L, W, alive } = st, brk = c.opt.strength || 0.07;
    for (let m = 0; m < A.length; m++) {
      if (!alive[m]) continue; const i = A[m], j = B[m], dx = X[j] - X[i], dy = Y[j] - Y[i], dz = Z[j] - Z[i], d = Math.hypot(dx, dy, dz) || 1e-9, e = (d - L[m]) / L[m];
      if (Math.abs(e) > brk * W[m]) { alive[m] = 0; st.broken++; if (st.broken % 12 === 0) c.note(c.scale(4 + (st.broken / 12) % 12), 0.35, 0.4); continue; }
      const f = (d - L[m]) / d * 0.5; X[i] += dx * f; Y[i] += dy * f; Z[i] += dz * f; X[j] -= dx * f; Y[j] -= dy * f; Z[j] -= dz * f;
    }
  }
  // block against block (spheres of radius R) with a 3D spatial hash
  function contacts(st) {
    const { X, Y, Z, N, next } = st, D = 2 * R, cs = D, key = (a, b, c2) => ((a * 73856093) ^ (b * 19349663) ^ (c2 * 83492791)) & 16383;
    if (!st.head) st.head = new Int32Array(16384); const head = st.head; head.fill(-1);
    for (let i = 0; i < N; i++) { const k = key(Math.floor(X[i] / cs), Math.floor(Y[i] / cs), Math.floor(Z[i] / cs)); next[i] = head[k]; head[k] = i; }
    for (let i = 0; i < N; i++) {
      const gx = Math.floor(X[i] / cs), gy = Math.floor(Y[i] / cs), gz = Math.floor(Z[i] / cs);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) for (let j = head[key(gx + a, gy + b, gz + e)]; j >= 0; j = next[j]) {
        if (j <= i) continue; const dx = X[j] - X[i], dy = Y[j] - Y[i], dz = Z[j] - Z[i], d2 = dx * dx + dy * dy + dz * dz; if (d2 >= D * D || d2 < 1e-12) continue;
        const d = Math.sqrt(d2), f = (D - d) / d * 0.5; X[i] -= dx * f; Y[i] -= dy * f; Z[i] -= dz * f; X[j] += dx * f; Y[j] += dy * f; Z[j] += dz * f;
      }
    }
  }
  function ground(st) {
    const { X, Y, Z, PX, PZ, N } = st;
    for (let i = 0; i < N; i++) {
      if (Y[i] > -R) { Y[i] = -R; PX[i] = X[i] - (X[i] - PX[i]) * 0.55; PZ[i] = Z[i] - (Z[i] - PZ[i]) * 0.55; if (st.PY[i] > Y[i]) st.PY[i] = Y[i]; }
      for (const q of RAMP) if (Math.abs(Z[i]) < 0.2) { const ex = q[2] - q[0], ey = q[3] - q[1], t = Math.max(0, Math.min(1, ((X[i] - q[0]) * ex + (Y[i] - q[1]) * ey) / (ex * ex + ey * ey))), ox = X[i] - q[0] - ex * t, oy = Y[i] - q[1] - ey * t, d = Math.hypot(ox, oy); if (d < R + 0.01 && d > 1e-9) { X[i] += ox / d * (R + 0.01 - d); Y[i] += oy / d * (R + 0.01 - d); } }
    }
  }
  // the ball: a heavy sphere; contact with a block shares the correction by inverse mass (ball mass ∝ its kilograms)
  function ballBlocks(c, st) {
    const b = st.ball, { X, Y, Z, N } = st, wb = 1 / (st.m * 0.25), rr = b.r + R;
    for (let i = 0; i < N; i++) {
      const dx = X[i] - b.x, dy = Y[i] - b.y, dz = Z[i] - b.z, d2 = dx * dx + dy * dy + dz * dz; if (d2 >= rr * rr || d2 < 1e-12) continue;
      const d = Math.sqrt(d2), o = (rr - d) / d, s = wb + 1;
      X[i] += dx * o / s; Y[i] += dy * o / s; Z[i] += dz * o / s; b.x -= dx * o * wb / s; b.y -= dy * o * wb / s; b.z -= dz * o * wb / s;
      if (!st.hit) { st.hit = true; c.note(c.scale(2), 1, 1.6); for (let k = 0; k < 24; k++) st.dust.push({ x: b.x - b.r, y: b.y, z: (Math.random() - 0.5) * 0.2, vx: -Math.random() * 0.5, vy: -Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.4, t: 0 }); }
    }
  }
  function ballMove(st, h) {
    const b = st.ball, vx = b.x - b.px, vy = b.y - b.py, vz = b.z - b.pz; b.px = b.x; b.py = b.y; b.pz = b.z; b.x += vx; b.y += vy + G * h * h; b.z += vz * 0.98;
    for (const [ax, ay, bx, by] of RAMP) {
      const ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((b.x - ax) * ex + (b.y - ay) * ey) / (ex * ex + ey * ey))), qx = b.x - ax - ex * t, qy = b.y - ay - ey * t, d = Math.hypot(qx, qy), rr = b.r + 0.012;
      if (d < rr && d > 1e-9) { const nx = qx / d, ny = qy / d; b.x += nx * (rr - d); b.y += ny * (rr - d); let wx = b.x - b.px, wy = b.y - b.py; const vn = wx * nx + wy * ny; if (vn < 0) { wx -= vn * nx; wy -= vn * ny; b.px = b.x - wx; b.py = b.y - wy; } }
    }
    if (b.y > -b.r) { b.y = -b.r; b.px = b.x - (b.x - b.px) * 0.995; if (b.py > b.y) b.py = b.y; }
    b.rot += (b.x - b.px) / b.r;
  }
  function step(c, dt) {
    const st = c.st; if (!st || !st.X) return; st.t += dt; st.rt += dt; if (st.hold > 0) { st.hold -= dt; if (P.live(st) && st.rt > 0.6 && P.take(st, 'bq')) st.hold = 0; } st.label = Math.max(0, st.label - dt);
    const sub = 3, h = dt / sub, { X, Y, Z, PX, PY, PZ, N } = st, k = Math.pow(0.9, h), g2 = G * h * h;
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < N; i++) { const vx = (X[i] - PX[i]) * k, vy = (Y[i] - PY[i]) * k, vz = (Z[i] - PZ[i]) * k; PX[i] = X[i]; PY[i] = Y[i]; PZ[i] = Z[i]; X[i] += vx; Y[i] += vy + g2; Z[i] += vz; }
      if (st.hold > 0) { const b = st.ball; b.px = b.x; b.py = b.y; b.pz = b.z; } else ballMove(st, h);
      for (let it = 0; it < 3; it++) { bondsPass(c, st); contacts(st); ballBlocks(c, st); ground(st); }
    }
    for (const d of st.dust) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.vy += 0.6 * dt; } st.dust = st.dust.filter(d => d.t < 1.5);
    const b = st.ball, sp = Math.hypot(b.x - b.px, b.y - b.py) / h;
    if (st.hit && sp < 0.05) st.still += dt; else st.still = 0;
    if ((st.still > 2.5 || st.rt > 18) && st.rt > 13) {
      if (!c.thumb) HBH.add('Démolition', st.m.toLocaleString('fr-FR') + ' kg : ' + st.broken + ' liens cassés');
      st.round++; build(c, st);
    }
    if (!c.thumb) c.status(st.m.toLocaleString('fr-FR') + ' kg · ' + st.broken + ' liens cassés');
  }

  function draw(c, g) {
    const st = c.st; if (!st || !st.X) return;
    const S = Math.min(c.W, c.H * 0.62), cam = P.camera(c.W, c.H, { yaw: -0.55, pitch: 0.32, dist: 3.2, scale: S * 0.62, tx: 0.25, ty: -0.5, tz: 0, cy: c.H * 0.56 }), beat = c.react ? c.react.beat : 0;
    const bg = g.createLinearGradient(0, 0, 0, c.H); bg.addColorStop(0, '#1c1738'); bg.addColorStop(1, '#0e0b20'); g.fillStyle = bg; g.fillRect(0, 0, c.W, c.H);
    // floor with a fading grid
    const fl = [[-1.6, -1.2], [1.8, -1.2], [1.8, 1.2], [-1.6, 1.2]].map(([x, z]) => cam.p(x, 0, z));
    g.fillStyle = '#231e45'; g.beginPath(); fl.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(214,206,255,' + (0.08 + beat * 0.1).toFixed(2) + ')'; g.lineWidth = 1; g.beginPath();
    for (let x = -1.6; x <= 1.81; x += 0.2) { const a = cam.p(x, 0, -1.2), b2 = cam.p(x, 0, 1.2); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); }
    for (let z = -1.2; z <= 1.21; z += 0.2) { const a = cam.p(-1.6, 0, z), b2 = cam.p(1.8, 0, z); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); } g.stroke();
    // ramp: a slab as deep as the tower
    const rz = 0.17, rp = [[RAMP[0][0], RAMP[0][1]], [RAMP[0][2], RAMP[0][3]], [RAMP[1][2], RAMP[1][3]]];
    const face = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y, z], i) => { const q = cam.p(x, y, z); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.fill(); };
    face([[rp[0][0], 0, -rz], [rp[0][0], rp[0][1], -rz], [rp[1][0], rp[1][1], -rz], [rp[2][0], 0, -rz]], 'rgba(80,90,190,.55)');
    face([[rp[0][0], rp[0][1], -rz], [rp[1][0], rp[1][1], -rz], [rp[1][0], rp[1][1], rz], [rp[0][0], rp[0][1], rz]], 'rgba(111,127,230,.75)');
    face([[rp[1][0], rp[1][1], -rz], [rp[2][0], rp[2][1], -rz], [rp[2][0], rp[2][1], rz], [rp[1][0], rp[1][1], rz]], 'rgba(111,127,230,.75)');
    face([[rp[0][0], 0, rz], [rp[0][0], rp[0][1], rz], [rp[1][0], rp[1][1], rz], [rp[2][0], 0, rz]], 'rgba(95,110,215,.7)');
    // blocks and ball, painted from far to near; each block turned like its row (angle from its sideways bond)
    const { X, Y, Z, N, ang } = st, items = [];
    for (let i = 0; i < N; i++) {
      const m = st.hb[i]; if (m >= 0 && st.alive[m]) { const j = st.B[m]; ang[i] = Math.atan2(Y[j] - Y[i], X[j] - X[i]); } else if (Y[i] > -R * 1.3) ang[i] *= 0.9;
      items.push([cam.p(X[i], Y[i], Z[i])[2], i]);
    }
    const b = st.ball; items.push([cam.p(b.x, b.y, b.z)[2], -1]);
    items.sort((p1, p2) => p2[0] - p1[0]);
    const h = R * 0.96, LIGHT = [0.45, -0.75, -0.5];
    for (const [, i] of items) {
      if (i < 0) { const [bx, by, , bk] = cam.p(b.x, b.y, b.z), rr = b.r * bk, gr = g.createRadialGradient(bx - rr * 0.35, by - rr * 0.4, rr * 0.1, bx, by, rr);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#c9c6d8'); gr.addColorStop(0.75, '#6e6a86'); gr.addColorStop(1, '#2e2b40'); g.fillStyle = gr; g.beginPath(); g.arc(bx, by, rr, 0, 7); g.fill(); continue; }
      const ca = Math.cos(ang[i]), sa = Math.sin(ang[i]), x = X[i], y = Y[i], z = Z[i], [r0, g0, b0] = TONES[st.tone[i]];
      const P8 = []; for (const [u, v, w] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) P8.push(cam.p(x + (u * ca - v * sa) * h, y + (u * sa + v * ca) * h, z + w * h));
      for (const [f, nx, ny, nz] of [[[0, 1, 2, 3], 0, 0, -1], [[5, 4, 7, 6], 0, 0, 1], [[4, 0, 3, 7], -ca, -sa, 0], [[1, 5, 6, 2], ca, sa, 0], [[4, 5, 1, 0], sa, -ca, 0], [[3, 2, 6, 7], -sa, ca, 0]]) {
        if (!cam.facing(nx, ny, nz, x + nx * h, y + ny * h, z + nz * h)) continue;
        const l = 0.55 + 0.45 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        g.fillStyle = 'rgb(' + (r0 * l | 0) + ',' + (g0 * l | 0) + ',' + (b0 * l | 0) + ')'; g.beginPath(); f.forEach((q, n) => n ? g.lineTo(P8[q][0], P8[q][1]) : g.moveTo(P8[q][0], P8[q][1])); g.closePath(); g.fill();
      }
    }
    g.fillStyle = '#e6dcc8'; for (const d of st.dust) { const q = cam.p(d.x, d.y, d.z); g.globalAlpha = Math.max(0, 1 - d.t / 1.5) * 0.7; g.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); } g.globalAlpha = 1;
    if (!c.thumb) {
      const txt = st.m.toLocaleString('fr-FR') + ' kg', fs = Math.round(Math.min(c.W * 0.11, 46) * (1 + st.label * 0.3));
      g.save(); g.font = '800 ' + fs + 'px "Unbounded", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(241,238,255,.92)'; g.fillText(txt, c.W / 2, c.H * 0.1); g.restore();
    }
  }
  HB.game({
    id: 'demolition', name: 'Démolition',
    desc: 'En 3D : une boule de métal dévale une rampe et percute une tour de petits cubes, dix fois plus lourde à chaque manche.',
    ranges: [
      { key: 'strength', label: 'Solidité', min: 0.03, max: 0.2, step: 0.01, value: 0.07 },
      { key: 'cols', label: 'Largeur', min: 4, max: 14, step: 1, value: 8, restart: true },
      { key: 'height', label: 'Hauteur', min: 0.4, max: 1.1, step: 0.05, value: 0.85, restart: true }
    ],
    thumbSteps: 160, reset, step, draw,
    // the song drives the game: what each musical event does here
    music(c, m) { const st = c.st; P.mus(st, m); if (st.rt < 0.3 && !(st.hold > 0) && !st.hit) st.hold = 4; },      // with a song, the ball waits for a kick from the first round on
    audit(c) {                                     // blocks under the ground or inside the ball, overlap between nearby blocks
      const st = c.st, b = st.ball; let pen = 0, ov = 0;
      for (let i = 0; i < st.N; i++) pen = Math.max(pen, (st.Y[i] + R) / R, (b.r + R - Math.hypot(st.X[i] - b.x, st.Y[i] - b.y, st.Z[i] - b.z)) / R);
      for (let i = 0; i < st.N; i += 3) for (let j = i + 1; j < Math.min(st.N, i + 40); j++) { const d = Math.hypot(st.X[i] - st.X[j], st.Y[i] - st.Y[j], st.Z[i] - st.Z[j]); ov = Math.max(ov, (2 * R - d) / (2 * R)); }
      return { pen, ov: { worst: ov, mean: 0 }, note: st.m + ' kg, ' + st.broken + ' liens cassés' };
    }
  });
})();
