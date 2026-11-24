/* Jeu 13 · Filet (3D) : un filet carré de nœuds reliés par des fils tombe sur une grosse boule posée au-dessus d'une boîte ouverte.
   Les fils ne résistent qu'à l'étirement ; trop étirés, ils cassent. Le filet enveloppe la boule, se tend, se déchire et glisse
   dans la boîte. À chaque manche il a plus de mailles (16, 64, 256, 1 024, 2 304). 3D, y vers le bas, sol en y = 0. */
(() => {
  const P = HBP, SPH = { x: 0, y: -0.8, z: 0, r: 0.24 }, BOX = { x: 0.33, z: 0.33, top: -0.5 }     /* as in the reference: the ball hangs just above a box wider than it */, TH = 0.012, LEVELS = [4, 8, 16, 32, 48];
  function reset(c) { c.st = { lv: 0, t: 0 }; build(c, c.st); }
  function build(c, st) {
    const n = (c.thumb ? 8 : LEVELS[st.lv % LEVELS.length]) + 1, W = 0.66, sp = W / (n - 1), N = n * n, lv = st.lv % LEVELS.length;
    const X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N), PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; X[k] = PX[k] = -W / 2 + i * sp; Z[k] = PZ[k] = -W / 2 + j * sp; Y[k] = PY[k] = -1.35 + (P.rnd() - 0.5) * 0.002; }
    const a = [], b = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; if (i + 1 < n) { a.push(k); b.push(k + 1); } if (j + 1 < n) { a.push(k); b.push(k + n); } }
    Object.assign(st, { n, N, X, Y, Z, PX, PY, PZ, A: Int32Array.from(a), B: Int32Array.from(b), sp, alive: new Uint8Array(a.length).fill(1), cut: 0, rt: 0, label: 1.4,
      tear: 1 + ((c.opt.tear || 1.4) - 1) / (1 + lv * 1.1), heavy: 1 + lv * 0.6 });   // finer nets are heavier and weaker, as in the reference
  }
  function solids(st) {
    const { X, Y, Z, PX, PZ, N } = st, R = SPH.r + 0.008;
    for (let k = 0; k < N; k++) {
      // the ball: a knot is pushed out to its surface, with a little sliding friction
      const dx = X[k] - SPH.x, dy = Y[k] - SPH.y, dz = Z[k] - SPH.z, d = Math.hypot(dx, dy, dz);
      if (d < R && d > 1e-9) { const f = R / d; X[k] = SPH.x + dx * f; Y[k] = SPH.y + dy * f; Z[k] = SPH.z + dz * f; PX[k] = X[k] - (X[k] - PX[k]) * 0.97; PZ[k] = Z[k] - (Z[k] - PZ[k]) * 0.97; }
      // the box: four thin walls from its rim down to the floor; a knot stays on the side it is on
      if (Y[k] > BOX.top) for (const [ax, lim, oth] of [[X, BOX.x, Z], [Z, BOX.z, X]]) for (const s of [-1, 1]) {
        if (Math.abs(oth[k]) > (ax === X ? BOX.z : BOX.x) + TH) continue;
        const w = s * lim, d2 = ax[k] - w; if (Math.abs(d2) < TH) ax[k] = w + (Math.sign(d2) || -s) * TH;
      }
      if (Y[k] > -TH) { Y[k] = -TH; PX[k] = X[k] - (X[k] - PX[k]) * 0.6; PZ[k] = Z[k] - (Z[k] - PZ[k]) * 0.6; }
    }
  }
  function threads(c, st) {
    const { X, Y, Z, A, B, alive, sp } = st, lim = sp * st.tear, every = Math.max(1, Math.round(A.length / 60));
    for (let m = 0; m < A.length; m++) {
      if (!alive[m]) continue; const i = A[m], j = B[m], dx = X[j] - X[i], dy = Y[j] - Y[i], dz = Z[j] - Z[i], d = Math.hypot(dx, dy, dz) || 1e-9;
      if (d > lim) { alive[m] = 0; st.cut++; if (st.cut % every === 0) c.note(c.scale(5 + st.cut % 10), 0.4, 0.4); continue; }
      if (d <= sp) continue;                                      // a thread only resists being stretched
      const f = (d - sp) / d * 0.5; X[i] += dx * f; Y[i] += dy * f; Z[i] += dz * f; X[j] -= dx * f; Y[j] -= dy * f; Z[j] -= dz * f;
    }
  }
  function step(c, dt) {
    const st = c.st; if (!st || !st.X) return; st.t += dt; st.rt += dt; st.label = Math.max(0, st.label - dt);
    const sub = 5, h = dt / sub, { X, Y, Z, PX, PY, PZ, N } = st, g2 = 1.6 * st.heavy * h * h;
    for (let s = 0; s < sub; s++) {
      for (let k = 0; k < N; k++) { const vx = (X[k] - PX[k]) * 0.996, vy = (Y[k] - PY[k]) * 0.996, vz = (Z[k] - PZ[k]) * 0.996; PX[k] = X[k]; PY[k] = Y[k]; PZ[k] = Z[k]; X[k] += vx; Y[k] += vy + g2; Z[k] += vz; }
      for (let it = 0; it < 3; it++) { threads(c, st); solids(st); }
    }
    let top = 1; for (let k = 0; k < N; k++) top = Math.min(top, Y[k]);
    if (st.rt > (c.opt.secs || 12) || (st.rt > 6 && top > BOX.top + 0.05)) { if (!c.thumb) HBH.add('Filet', (st.n - 1) * (st.n - 1) + ' mailles, ' + st.cut + ' fils coupés'); st.lv++; build(c, st); }
    if (!c.thumb) c.status((st.n - 1) * (st.n - 1) + ' mailles · ' + st.cut + ' fils coupés');
  }

  function draw(c, g) {
    const st = c.st; if (!st || !st.X) return;
    const S = Math.min(c.W, c.H * 0.6), cam = P.camera(c.W, c.H, { yaw: -0.6, pitch: 0.42, dist: 3, scale: S * 0.95, tx: 0, ty: -0.62, tz: 0, cy: c.H * 0.5 }), beat = c.react ? c.react.beat : 0;
    const bg = g.createLinearGradient(0, 0, 0, c.H); bg.addColorStop(0, '#1c1738'); bg.addColorStop(1, '#0e0b20'); g.fillStyle = bg; g.fillRect(0, 0, c.W, c.H);
    const poly = (pts, fill, stroke) => { g.beginPath(); pts.forEach(([x, y, z], i) => { const q = cam.p(x, y, z); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); } };
    poly([[-1.2, 0, -1.2], [1.2, 0, -1.2], [1.2, 0, 1.2], [-1.2, 0, 1.2]], '#211c42');
    const bx = BOX.x, bz = BOX.z, bt = BOX.top, walls = [
      { pts: [[-bx, 0, bz], [bx, 0, bz], [bx, bt, bz], [-bx, bt, bz]], n: [0, 0, 1], c: [0, 0, bz] }, { pts: [[-bx, 0, -bz], [bx, 0, -bz], [bx, bt, -bz], [-bx, bt, -bz]], n: [0, 0, -1], c: [0, 0, -bz] },
      { pts: [[bx, 0, -bz], [bx, 0, bz], [bx, bt, bz], [bx, bt, -bz]], n: [1, 0, 0], c: [bx, 0, 0] }, { pts: [[-bx, 0, -bz], [-bx, 0, bz], [-bx, bt, bz], [-bx, bt, -bz]], n: [-1, 0, 0], c: [-bx, 0, 0] }];
    // walls seen from inside are drawn before the net, walls seen from outside after it (they hide what falls in)
    const back = walls.filter(w => !cam.facing(w.n[0], w.n[1], w.n[2], w.c[0], bt / 2, w.c[2])), front = walls.filter(w => !back.includes(w));
    poly([[-bx, -0.001, -bz], [bx, -0.001, -bz], [bx, -0.001, bz], [-bx, -0.001, bz]], '#2c2656');
    for (const w of back) poly(w.pts, '#3b3566', 'rgba(214,206,255,.35)');
    // threads split around the ball: behind its centre first, then the ball, then those in front; colour = real tension
    const { X, Y, Z, A, B, alive, sp } = st, ballD = cam.p(SPH.x, SPH.y, SPH.z)[2], groups = [[[], [], []], [[], [], []]], w0 = Math.max(0.7, S * 0.0035 * Math.min(1, 12 / st.n));
    for (let m = 0; m < A.length; m++) {
      if (!alive[m]) continue; const i = A[m], j = B[m], p1 = cam.p(X[i], Y[i], Z[i]), p2 = cam.p(X[j], Y[j], Z[j]);
      const k = Math.max(0, (Math.hypot(X[j] - X[i], Y[j] - Y[i], Z[j] - Z[i]) / sp - 1) / (st.tear - 1));
      groups[(p1[2] + p2[2]) / 2 < ballD ? 1 : 0][k < 0.33 ? 0 : k < 0.7 ? 1 : 2].push(p1[0], p1[1], p2[0], p2[1]);
    }
    const strokeGroup = (grp, cols) => grp.forEach((arr, bi) => { if (!arr.length) return; g.strokeStyle = cols[bi]; g.lineWidth = w0; g.beginPath(); for (let q = 0; q < arr.length; q += 4) { g.moveTo(arr[q], arr[q + 1]); g.lineTo(arr[q + 2], arr[q + 3]); } g.stroke(); });
    strokeGroup(groups[0], ['rgba(170,176,215,.75)', 'rgba(210,160,200,.8)', 'rgba(255,95,168,.85)']);
    const [sx, sy, , sk] = cam.p(SPH.x, SPH.y, SPH.z), rr = SPH.r * sk * (1 + beat * 0.02), gr = g.createRadialGradient(sx - rr * 0.35, sy - rr * 0.4, rr * 0.1, sx, sy, rr);
    gr.addColorStop(0, '#ffe39a'); gr.addColorStop(0.5, '#e0a93a'); gr.addColorStop(1, '#6d4810'); g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill();
    strokeGroup(groups[1], ['rgba(232,236,255,.95)', 'rgba(255,190,225,.95)', 'rgba(255,95,168,1)']);
    for (const w of front) poly(w.pts, 'rgba(70,62,120,.82)', 'rgba(214,206,255,.6)');
    if (!c.thumb) { const m = (st.n - 1) * (st.n - 1), fs = Math.round(Math.min(c.W * 0.08, 34) * (1 + st.label * 0.25)); g.save(); g.font = '800 ' + fs + 'px "Unbounded", system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = 'rgba(241,238,255,.92)'; g.fillText(m.toLocaleString('fr-FR') + ' MAILLES', c.W * 0.06, c.H * 0.04); g.restore(); }
  }
  HB.game({
    id: 'filet', name: 'Filet',
    desc: 'En 3D : un filet tombe sur une boule, s\'étire et se déchire dans la boîte, avec plus de mailles à chaque manche.',
    ranges: [
      { key: 'tear', label: 'Résistance', min: 1.05, max: 2.2, step: 0.05, value: 1.4, restart: true },
      { key: 'secs', label: 'Durée manche', min: 4, max: 20, step: 0.5, value: 12 }
    ],
    thumbSteps: 120, reset, step, draw,
    audit(c) {                      // knots inside the ball, under the floor, or through a box wall
      const st = c.st; let pen = 0; if (!st.X) return {};
      for (let k = 0; k < st.N; k++) { pen = Math.max(pen, (SPH.r - Math.hypot(st.X[k] - SPH.x, st.Y[k] - SPH.y, st.Z[k] - SPH.z)) / 0.01, st.Y[k] / 0.01); }
      return { pen, note: (st.n - 1) * (st.n - 1) + ' mailles, ' + st.cut + ' fils coupés' };
    }
  });
})();
