/* Jeu 13 · Filet : vue de face. Un filet souple tombe sur une grosse boule posée au-dessus d'une boîte ouverte.
   Il l'enveloppe, s'étire, puis ses mailles se déchirent et les morceaux glissent dans la boîte. À chaque manche
   le filet a quatre fois plus de mailles (16, 64, 256, 1 024…). Monde de 1 × 1.6. */
(() => {
  const SPH = [0.5, 0.78, 0.2], BOX = { x0: 0.2, x1: 0.8, y0: 1.08, y1: 1.5 }, LEVELS = [4, 8, 16, 32, 48];
  function reset(c) { c.st = { lv: 0, t: 0 }; build(c, c.st); }
  function build(c, st) {
    const n = LEVELS[st.lv % LEVELS.length] + 1, W = 0.56, sp = W / (n - 1), x0 = 0.5 - W / 2, y0 = 0.28;
    const N = n * n, X = new Float32Array(N), Y = new Float32Array(N), PX = new Float32Array(N), PY = new Float32Array(N), Z = new Float32Array(N);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; X[k] = PX[k] = x0 + i * sp; Y[k] = PY[k] = y0 + (HBP.rnd() - 0.5) * 0.002; Z[k] = (j / (n - 1) - 0.5) * W; }
    // the net is seen in perspective: its depth (z) only shifts points up a little, physics happens in x / y
    const links = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; if (i + 1 < n) links.push([k, k + 1, sp]); if (j + 1 < n) links.push([k, k + n, sp]); }
    Object.assign(st, { n, X, Y, PX, PY, Z, links, alive: new Uint8Array(links.length).fill(1), cut: 0, rt: 0, label: 1.4, sp, tear: 1 + ((c.opt.tear || 1.4) - 1) / (1 + (st.lv % LEVELS.length) * 1.1), heavy: 1 + (st.lv % LEVELS.length) * 0.6 });
  }
  function step(c, dt) {
    const st = c.st; if (!st || !st.X) return; st.t += dt; st.rt += dt; st.label = Math.max(0, st.label - dt);
    const sub = 6, h = dt / sub, N = st.X.length, X = st.X, Y = st.Y, PX = st.PX, PY = st.PY, Z = st.Z, L = st.links, al = st.alive, [sx, sy, sr] = SPH;
    for (let s = 0; s < sub; s++) {
      for (let k = 0; k < N; k++) { const vx = (X[k] - PX[k]) * 0.995, vy = (Y[k] - PY[k]) * 0.995; PX[k] = X[k]; PY[k] = Y[k]; X[k] += vx; Y[k] += vy + 1.6 * st.heavy * h * h; }
      for (let it = 0; it < 3; it++) {
        for (let m = 0; m < L.length; m++) {
          if (!al[m]) continue; const [a, b, r0] = L[m], dx = X[b] - X[a], dy = Y[b] - Y[a], d = Math.hypot(dx, dy) || 1e-9;
          if (d > r0 * st.tear) { al[m] = 0; st.cut++; if (st.cut % Math.max(1, Math.round(L.length / 60)) === 0) c.note(c.scale(5 + st.cut % 10), 0.4, 0.4); continue; }
          if (d < r0) continue;                                          // a net only resists stretching
          const f = (d - r0) / d * 0.5; X[a] += dx * f; Y[a] += dy * f; X[b] -= dx * f; Y[b] -= dy * f;
        }
        for (let k = 0; k < N; k++) {
          // sphere: the net point sits on the visible disc only if it is in front of it in depth
          const dz = Z[k], rr = Math.sqrt(Math.max(0, sr * sr - dz * dz * 0.25)) + 0.006, dx = X[k] - sx, dy = Y[k] - sy, d = Math.hypot(dx, dy);
          if (d < rr && d > 1e-9) { X[k] = sx + dx / d * rr; Y[k] = sy + dy / d * rr; const vx = X[k] - PX[k]; PX[k] = X[k] - vx * 0.98; }
          // box walls (thin) and floor
          for (const wx of [BOX.x0, BOX.x1]) if (Y[k] > BOX.y0 && Math.abs(X[k] - wx) < 0.012) X[k] = wx + (X[k] < wx ? -0.012 : 0.012);
          if (Y[k] > BOX.y1 - 0.01 && X[k] > BOX.x0 && X[k] < BOX.x1) { Y[k] = BOX.y1 - 0.01; PX[k] = X[k] - (X[k] - PX[k]) * 0.5; }
          if (Y[k] > BOX.y1 - 0.01) { Y[k] = BOX.y1 - 0.01; PX[k] = X[k] - (X[k] - PX[k]) * 0.5; }
        }
      }
    }
    const done = st.rt > 3 && Y.reduce((m, v) => Math.min(m, v), 9) > 0.62 && st.rt > 5;
    if (st.rt > (c.opt.secs || 9) || done) { if (!c.thumb) HBH.add('Filet', (st.n - 1) * (st.n - 1) + ' mailles, ' + st.cut + ' fils coupés'); st.lv++; build(c, st); }
    if (!c.thumb) c.status((st.n - 1) * (st.n - 1) + ' mailles · ' + st.cut + ' fils coupés');
  }
  function draw(c, g) {
    const st = c.st; if (!st || !st.X) return;
    const s = Math.min(c.W, c.H / 1.6), ox = (c.W - s) / 2, oy = (c.H - 1.6 * s) / 2, PXf = x => ox + x * s, PYf = y => oy + y * s, beat = c.react ? c.react.beat : 0;
    const bg = g.createLinearGradient(0, oy, 0, oy + 1.6 * s); bg.addColorStop(0, '#1c1738'); bg.addColorStop(1, '#0f0b22'); g.fillStyle = bg; g.fillRect(ox, oy, s, 1.6 * s);
    // box: back wall, then the net, then the front rim
    g.fillStyle = '#2a2550'; g.fillRect(PXf(BOX.x0), PYf(BOX.y0), (BOX.x1 - BOX.x0) * s, (BOX.y1 - BOX.y0) * s);
    g.fillStyle = '#1a1636'; g.fillRect(PXf(BOX.x0 + 0.03), PYf(BOX.y0 + 0.03), (BOX.x1 - BOX.x0 - 0.06) * s, (BOX.y1 - BOX.y0 - 0.03) * s);
    // sphere
    const [sx, sy, sr] = SPH, gr = g.createRadialGradient(PXf(sx - sr * 0.35), PYf(sy - sr * 0.4), sr * s * 0.1, PXf(sx), PYf(sy), sr * s);
    gr.addColorStop(0, '#ffe39a'); gr.addColorStop(0.5, '#e0a93a'); gr.addColorStop(1, '#7a5214');
    g.fillStyle = gr; g.beginPath(); g.arc(PXf(sx), PYf(sy), sr * s * (1 + beat * 0.02), 0, 7); g.fill();
    // net: back half lighter, front half brighter
    const X = st.X, Y = st.Y, Z = st.Z, L = st.links, al = st.alive, w = Math.max(0.8, s * 0.004 * Math.min(1, 10 / st.n * 1.6));
    for (const front of [false, true]) {
      // the colour of a thread shows its real tension: relaxed = pale, stretched near breaking = pink
      g.lineWidth = w; const bins = [[], [], []];
      for (let m = 0; m < L.length; m++) { if (!al[m]) continue; const [a, b, r0] = L[m]; if ((Z[a] + Z[b] > 0) !== front) continue;
        const k = Math.max(0, (Math.hypot(X[b] - X[a], Y[b] - Y[a]) / r0 - 1) / (st.tear - 1)); bins[k < 0.33 ? 0 : k < 0.7 ? 1 : 2].push(a, b); }
      const cols = front ? ['rgba(220,226,255,.95)', 'rgba(255,190,225,.95)', 'rgba(255,95,168,1)'] : ['rgba(150,156,200,.55)', 'rgba(200,150,190,.6)', 'rgba(255,95,168,.7)'];
      bins.forEach((bn, bi) => { g.strokeStyle = cols[bi]; g.beginPath(); for (let q = 0; q < bn.length; q += 2) { const a = bn[q], b = bn[q + 1]; g.moveTo(PXf(X[a]), PYf(Y[a] - Z[a] * 0.12)); g.lineTo(PXf(X[b]), PYf(Y[b] - Z[b] * 0.12)); } g.stroke(); });
    }
    g.strokeStyle = 'rgba(214,206,255,.75)'; g.lineWidth = Math.max(2, s * 0.01); g.strokeRect(PXf(BOX.x0), PYf(BOX.y0), (BOX.x1 - BOX.x0) * s, (BOX.y1 - BOX.y0) * s);
    if (!c.thumb) { const m = (st.n - 1) * (st.n - 1), fs = Math.round(Math.min(c.W * 0.08, 34) * (1 + st.label * 0.25)); g.save(); g.font = '800 ' + fs + 'px "Unbounded", system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = 'rgba(241,238,255,.92)'; g.fillText(m.toLocaleString('fr-FR') + ' MAILLES', ox + 0.05 * s, oy + 0.04 * s); g.restore(); }
  }
  HB.game({
    id: 'filet', name: 'Filet',
    desc: 'Un filet tombe sur une boule, s\'étire et se déchire dans la boîte : quatre fois plus de mailles à chaque manche.',
    ranges: [
      { key: 'tear', label: 'Résistance', min: 1.05, max: 2.2, step: 0.05, value: 1.4, restart: true },
      { key: 'secs', label: 'Durée manche', min: 4, max: 20, step: 0.5, value: 9 }
    ],
    thumbSteps: 120, reset, step, draw,
    audit(c) {                      // net knots inside the ball (at their depth) or under the floor
      const st = c.st, [sx, sy, sr] = SPH; let pen = 0; if (!st.X) return {};
      for (let k = 0; k < st.X.length; k++) { const rr = Math.sqrt(Math.max(0, sr * sr - st.Z[k] * st.Z[k] * 0.25)); pen = Math.max(pen, (rr - Math.hypot(st.X[k] - sx, st.Y[k] - sy)) / 0.01, (st.Y[k] - BOX.y1) / 0.01); }
      return { pen, note: (st.n - 1) * (st.n - 1) + ' mailles, ' + st.cut + ' fils coupés' };
    }
  });
})();
