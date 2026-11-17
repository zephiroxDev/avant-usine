/* Jeu 1 · Alchimie : des pinces fixées au bord du cercle attrapent des billes, les compressent, puis relâchent
   une nuée plus grande d'une nouvelle couleur, qui pousse les autres, jusqu'à remplir le cercle.
   Tout est simulé dans un cercle de rayon 1, puis dessiné à la taille de l'écran. */
(() => {
  const COLS = ['#7dff9a', '#7a8cff', '#b06bff', '#ff6f7d', '#ffb35c', '#6fd8ff', '#ff5fa8', '#ffe66b'];
  const W2 = 0.14, L = 0.27, TH = 0.022, OPEN = 0.78;          // cup half-width, depth, bar thickness, open angle
  const sm = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  const lerp = (a, b, k) => a + (b - a) * k;
  const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
  let LAT = null;                                              // hex lattice points sorted by distance, for new clusters
  function lattice() {
    if (LAT) return LAT; const p = [];
    for (let j = -40; j <= 40; j++) for (let i = -40; i <= 40; i++) { const x = i + (j & 1) * 0.5, y = j * 0.866; p.push([x, y, x * x + y * y]); }
    p.sort((a, b) => a[2] - b[2]); return (LAT = p.slice(0, 3200));
  }

  function reset(c) {
    const cap = c.thumb ? 300 : Math.round(c.opt.max || 1600), nc = c.thumb ? 2 : Math.round(c.opt.claws || 2);
    const st = c.st = {
      cap, n: 0, X: new Float32Array(cap), Y: new Float32Array(cap), PX: new Float32Array(cap), PY: new Float32Array(cap),
      col: new Uint8Array(cap), age: new Float32Array(cap), head: null, next: new Int32Array(cap),
      r: 0.045, rmin: Math.sqrt(0.74 / cap), gen: 0, claws: [], rings: [], sparks: [], flashes: [], t: 0, end: 0, zoom: 0, fp: [0, 0], logged: false, sprites: {}
    };
    for (let i = 0; i < nc; i++) {
      const h = (nc === 1 ? Math.PI : 0) + i * 2 * Math.PI / nc;
      st.claws.push({ h, a: h + Math.PI, e: 0.12, phi: OPEN, spin: 0, s: 'rest', t: 0, dur: 0.4 + i * 0.9, from: null, to: null, held: [], hc: 0 });
    }
    for (let i = 0; i < 6; i++) { const p = lattice()[i]; add(st, 0.42 + p[0] * 0.095, p[1] * 0.095, 0, 0, 0, 1); }
  }
  function add(st, x, y, vx, vy, g, age) {
    if (st.n >= st.cap) return; const i = st.n++;
    st.X[i] = x; st.Y[i] = y; st.PX[i] = x - vx; st.PY[i] = y - vy; st.col[i] = g % COLS.length; st.age[i] = age;
  }
  function remove(st, i) {
    const j = --st.n; if (i === j) return;
    st.X[i] = st.X[j]; st.Y[i] = st.Y[j]; st.PX[i] = st.PX[j]; st.PY[i] = st.PY[j]; st.col[i] = st.col[j]; st.age[i] = st.age[j];
  }
  // geometry of one claw: hub on the rim, telescopic stem, cup (back plate + two arms)
  function geo(k) {
    const hx = Math.cos(k.h), hy = Math.sin(k.h), ux = Math.cos(k.a), uy = Math.sin(k.a);
    const cx = hx + ux * (k.e + L / 2), cy = hy + uy * (k.e + L / 2);
    const ca = Math.cos(k.a + k.spin), sa = Math.sin(k.a + k.spin), vx = -sa, vy = ca;
    const p0x = cx - ca * L / 2, p0y = cy - sa * L / 2;
    const seg = [[hx, hy, hx + ux * k.e, hy + uy * k.e]];
    seg.push([p0x - vx * W2, p0y - vy * W2, p0x + vx * W2, p0y + vy * W2]);
    for (const sg of [1, -1]) {
      const bx = p0x + vx * W2 * sg, by = p0y + vy * W2 * sg, dx = ca * Math.cos(k.phi) + vx * sg * Math.sin(k.phi), dy = sa * Math.cos(k.phi) + vy * sg * Math.sin(k.phi);
      seg.push([bx, by, bx + dx * L, by + dy * L]);
    }
    return { hx, hy, cx, cy, ca, sa, vx, vy, p0x, p0y, seg };
  }
  function pickTarget(st, k) {
    const hx = Math.cos(k.h), hy = Math.sin(k.h);
    const reach = st.n < 60 ? 1.2 : 0.5;
    for (let tries = 0; tries < 60 && st.n; tries++) {
      const i = Math.floor(Math.random() * st.n), dx = st.X[i] - hx, dy = st.Y[i] - hy, d = Math.hypot(dx, dy);
      let da = Math.atan2(dy, dx) - (k.h + Math.PI); while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      if (d > 0.18 && d < reach + L && Math.abs(da) < 1.05) return { a: Math.atan2(dy, dx), e: Math.max(0.03, Math.min(reach, d - L * 0.5)) };
    }
    return { a: k.h + Math.PI + (Math.random() - 0.5) * 0.8, e: 0.2 + Math.random() * 0.3 };
  }
  function go(k, s, dur, to) { k.s = s; k.t = 0; k.dur = dur; k.from = { a: k.a, e: k.e, phi: k.phi, spin: k.spin }; k.to = Object.assign({}, k.from, to); }

  function clawStep(c, st, k, dt) {
    k.t += dt; const q = Math.min(1, k.t / k.dur), e = sm(q), f = k.from, to = k.to;
    if (f) { k.a = angLerp(f.a, to.a, e); k.e = lerp(f.e, to.e, k.s === 'burst' ? 1 - Math.pow(1 - q, 3) : e); k.phi = lerp(f.phi, to.phi, e); k.spin = lerp(f.spin, to.spin, e); }
    if (k.s === 'press') { k.spin = Math.sin(q * Math.PI) * Math.PI / 4; }
    if (q < 1) return;
    const full = st.n >= st.cap * 0.985;
    if (k.s === 'rest') { if (full) { go(k, 'rest', 0.5, { phi: OPEN, e: 0.1, a: k.h + Math.PI, spin: 0 }); return; } go(k, 'seek', 0.9 + Math.random() * 0.5, Object.assign(pickTarget(st, k), { phi: OPEN, spin: 0 })); }
    else if (k.s === 'seek') go(k, 'close', 0.28, { phi: 0 });
    else if (k.s === 'close') {
      const G = geo(k); k.held = [];
      for (let i = st.n - 1; i >= 0; i--) {
        const dx = st.X[i] - G.p0x, dy = st.Y[i] - G.p0y, lx = dx * G.ca + dy * G.sa, ly = dx * G.vx + dy * G.vy;
        if (lx > -st.r * 0.3 && lx < L + st.r * 0.3 && Math.abs(ly) < W2 + st.r * 0.3) { k.held.push([lx - L / 2, ly, st.col[i]]); remove(st, i); }
      }
      k.hc = k.held.length;
      if (!k.hc) { go(k, 'rest', 0.35, { phi: OPEN, e: 0.1 + Math.random() * 0.15, a: k.h + Math.PI }); return; }
      c.note(c.scale(3 + (st.gen % 8)), 0.7);
      go(k, 'retract', 0.5, { e: 0.04, a: k.h + Math.PI });
    }
    else if (k.s === 'retract') { go(k, 'press', 0.7, {}); st.rings.push({ k, t: 0, g: st.gen + 1 }); }
    else if (k.s === 'press') { k.spin = 0; k.phi = Math.PI / 2; go(k, 'burst', 0.55, { phi: Math.PI / 2, e: 0.3 }); burst(c, st, k); }
    else if (k.s === 'burst') go(k, 'rest', 0.5 + Math.random() * 0.4, { phi: OPEN, e: 0.12, spin: 0 });
  }
  function burst(c, st, k) {
    const mult = c.opt.mult || 5, g = ++st.gen, m = Math.max(k.hc, Math.min(Math.round(k.hc * mult), st.cap - st.n));
    k.held = []; k.hc = 0;
    const s = 2 * st.r * 1.02, ux = Math.cos(k.a), uy = Math.sin(k.a);
    const R0 = s * Math.sqrt(m) * 0.52, qx = Math.cos(k.h) + ux * (k.e + TH + st.r + R0), qy = Math.sin(k.h) + uy * (k.e + TH + st.r + R0), L0 = lattice();
    for (let i = 0; i < m && i < L0.length; i++) {
      let x = qx + L0[i][0] * s, y = qy + L0[i][1] * s; const d = Math.hypot(x, y); if (d > 0.97) { x *= 0.97 / d; y *= 0.97 / d; }
      add(st, x, y, ux * 0.002, uy * 0.002, g, 0);
    }
    st.flashes.push({ x: qx, y: qy, t: 0, g, R: R0 });
    for (let i = 0, nS = HBT.n(c.thumb ? 0 : 26); i < nS; i++) { const an = Math.random() * 6.283, sp = 0.3 + Math.random() * 0.9; st.sparks.push({ x: qx, y: qy, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, t: 0, g }); }
    c.note(c.scale(5 + (g % 8)), 1, 1.4);
  }

  function solve(st) {
    const n = st.n, r = st.r, X = st.X, Y = st.Y, D = 2 * r, D2 = D * D, cs = D, G = Math.ceil(2 / cs) + 1;
    if (!st.head || st.head.length < G * G) st.head = new Int32Array(G * G);
    const head = st.head, next = st.next; head.fill(-1, 0, G * G);
    const cell = new Int32Array(n);
    for (let i = 0; i < n; i++) { const gx = Math.min(G - 1, Math.max(0, ((X[i] + 1) / cs) | 0)), gy = Math.min(G - 1, Math.max(0, ((Y[i] + 1) / cs) | 0)), id = gy * G + gx; cell[i] = id; next[i] = head[id]; head[id] = i; }
    const wOf = i => st.age[i] >= 1 ? 1 : 0.1 + st.age[i] * 0.9, maxC = r * 0.6;
    const pair = (i, j) => {
      const dx = X[j] - X[i], dy = Y[j] - Y[i], d2 = dx * dx + dy * dy; if (d2 >= D2 || d2 < 1e-14) return;
      const d = Math.sqrt(d2), o = Math.min(maxC, D - d) * 0.9 / d, wi = wOf(i), wj = wOf(j), s = wi + wj, ki = o * wi / s, kj = o * wj / s;
      X[i] -= dx * ki; Y[i] -= dy * ki; X[j] += dx * kj; Y[j] += dy * kj;
    };
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      for (let i = head[gy * G + gx]; i >= 0; i = next[i]) {
        for (let j = next[i]; j >= 0; j = next[j]) pair(i, j);
        if (gx + 1 < G) for (let j = head[gy * G + gx + 1]; j >= 0; j = next[j]) pair(i, j);
        if (gy + 1 < G) { for (let ox = -1; ox <= 1; ox++) { const x2 = gx + ox; if (x2 < 0 || x2 >= G) continue; for (let j = head[(gy + 1) * G + x2]; j >= 0; j = next[j]) pair(i, j); } }
      }
    }
  }
  function walls(st, G) {
    const n = st.n, r = st.r, X = st.X, Y = st.Y, lim = 1 - r, rr = r + TH;
    for (let i = 0; i < n; i++) {
      let d = X[i] * X[i] + Y[i] * Y[i]; if (d > lim * lim) { d = Math.sqrt(d); X[i] *= lim / d; Y[i] *= lim / d; }
      for (const gk of G) for (const [ax, ay, bx, by] of gk.seg) {
        const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-9; let t = ((X[i] - ax) * ex + (Y[i] - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = X[i] - ax - ex * t, py = Y[i] - ay - ey * t, p2 = px * px + py * py;
        if (p2 < rr * rr && p2 > 1e-14) { const p = Math.sqrt(p2), k = (rr - p) / p; X[i] += px * k; Y[i] += py * k; }
      }
    }
  }

  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt;
    const rT = Math.max(st.rmin, Math.min(0.045, Math.sqrt(0.30 / Math.max(1, st.n))));
    st.r += (rT - st.r) * Math.min(1, dt * 1.6);
    for (const k of st.claws) clawStep(c, st, k, dt);
    const sub = 2, h = dt / sub, X = st.X, Y = st.Y, PX = st.PX, PY = st.PY, jit = 0.00002 * (c.react ? 1 + c.react.beat * 3 : 1), pull = 0.3 * h * h, vmax2 = Math.pow(st.r * 0.25, 2);
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < st.n; i++) {
        const vx = (X[i] - PX[i]) * 0.95 - X[i] * pull + (Math.random() - 0.5) * jit, vy = (Y[i] - PY[i]) * 0.95 - Y[i] * pull + (Math.random() - 0.5) * jit;
        const v2 = vx * vx + vy * vy, k2 = v2 > vmax2 ? Math.sqrt(vmax2 / v2) : 1;
        PX[i] = X[i]; PY[i] = Y[i]; X[i] += vx * k2; Y[i] += vy * k2; if (st.age[i] < 1) st.age[i] += h * 0.9;
      }
      const G = st.claws.map(geo);
      for (let it = 0; it < 4; it++) { solve(st); walls(st, G); }
    }
    for (const rg of st.rings) rg.t += dt; st.rings = st.rings.filter(rg => rg.t < 1.1);
    for (const f of st.flashes) f.t += dt; st.flashes = st.flashes.filter(f => f.t < 0.7);
    for (const p of st.sparks) { p.t += dt; p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5; p.vx *= 0.96; p.vy *= 0.96; } st.sparks = st.sparks.filter(p => p.t < 0.9);
    // the circle is full: slow zoom on the colours, then a new round
    const full = st.n >= st.cap * 0.985 && st.claws.every(k => k.s === 'rest');
    if (full || st.end > 0) {
      if (!st.end && st.n) { const i = Math.floor(Math.random() * st.n); st.fp = [st.X[i] * 0.7, st.Y[i] * 0.7]; }
      st.end += dt; st.zoom = sm((st.end - 0.8) / 3.5) * 1.1;
      if (!st.logged && !c.thumb && st.end > 0.8) { st.logged = true; HBH.add('Alchimie', 'Cercle rempli : ' + st.n + ' billes, ' + (st.gen + 1) + ' couleurs en ' + Math.round(st.t) + ' s'); }
      if (st.end > 7 && !c.thumb) reset(c);
    }
    if (!c.thumb) c.status(st.n + ' billes · ' + (st.gen + 1) + (st.gen ? ' couleurs' : ' couleur'));
  }

  function sprite(st, ci, rpx) {
    const key = ci, dp = Math.min(3, (window.devicePixelRatio || 1) * 1.5), o = st.sprites[key];
    if (o && Math.abs(o.r - rpx) / rpx < 0.05) return o.cv;
    const sz = Math.max(4, Math.ceil(rpx * 2 * dp) + 2), cv = document.createElement('canvas'); cv.width = cv.height = sz;
    const x = cv.getContext('2d'), R = sz / 2 - 1, col = COLS[ci];
    const gr = x.createRadialGradient(sz / 2 - R * 0.35, sz / 2 - R * 0.4, R * 0.1, sz / 2, sz / 2, R);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, col); gr.addColorStop(0.85, col); gr.addColorStop(1, 'rgba(13,11,30,.9)');
    x.fillStyle = gr; x.beginPath(); x.arc(sz / 2, sz / 2, R, 0, 7); x.fill();
    st.sprites[key] = { r: rpx, cv }; return cv;
  }
  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.43, c.H * 0.36), cx = c.W / 2, cy = c.H / 2, now = st.t, beat = c.react ? c.react.beat : 0;
    const z = st.zoom, sc = R * (1 + z), ox = cx - st.fp[0] * R * z, oy = cy - st.fp[1] * R * z;
    const P = (x, y) => [ox + x * sc, oy + y * sc];
    // arena
    const [ax, ay] = P(0, 0), bg = g.createRadialGradient(ax, ay, 0, ax, ay, sc);
    bg.addColorStop(0, '#1d1640'); bg.addColorStop(1, '#100c26');
    g.fillStyle = bg; g.beginPath(); g.arc(ax, ay, sc, 0, 7); g.fill();
    // balls
    const rpx = st.r * sc;
    for (let i = 0; i < st.n; i++) {
      const sp = sprite(st, st.col[i], rpx), x = ox + st.X[i] * sc, y = oy + st.Y[i] * sc;
      if (st.age[i] < 1) { const s2 = rpx * (0.55 + 0.45 * Math.min(1, st.age[i] * 3)); g.drawImage(sp, x - s2, y - s2, s2 * 2, s2 * 2); }
      else g.drawImage(sp, x - rpx, y - rpx, rpx * 2, rpx * 2);
    }
    // rim
    g.lineWidth = Math.max(1.5, R * 0.012) * (1 + beat * 0.6); g.strokeStyle = 'rgba(255,95,168,.35)'; g.beginPath(); g.arc(ax, ay, sc + g.lineWidth, 0, 7); g.lineWidth *= 3; g.stroke();
    g.lineWidth = Math.max(1.2, R * 0.008); g.strokeStyle = '#e9dcff'; g.beginPath(); g.arc(ax, ay, sc, 0, 7); g.stroke();
    // shock rings while a claw compresses
    for (const rg of st.rings) {
      const G = geo(rg.k), [x, y] = P(G.cx, G.cy), k = rg.t / 1.1;
      g.strokeStyle = COLS[rg.g % COLS.length]; g.globalAlpha = (1 - k) * 0.7; g.lineWidth = Math.max(1, R * 0.006);
      for (const d of [0, 0.25, 0.5]) { const kk = (k + d) % 1; g.beginPath(); g.arc(x, y, (0.1 + kk * 0.35) * sc, 0, 7); g.stroke(); }
      g.globalAlpha = 1;
    }
    for (const f of st.flashes) {
      const [x, y] = P(f.x, f.y), k = f.t / 0.7, rad = (f.R + 0.08 + k * 0.25) * sc, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,' + (0.55 * (1 - k)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    }
    for (const p of st.sparks) { const [x, y] = P(p.x, p.y); g.globalAlpha = 1 - p.t / 0.9; g.fillStyle = COLS[p.g % COLS.length]; g.beginPath(); g.arc(x, y, Math.max(1, R * 0.008), 0, 7); g.fill(); }
    g.globalAlpha = 1;
    // claws
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const k of st.claws) {
      const G = geo(k);
      for (const [w, col] of [[TH * 2.6, 'rgba(255,95,168,.28)'], [TH * 1.5, '#f1eeff']]) {
        g.strokeStyle = col; g.lineWidth = Math.max(1.5, w * sc);
        g.beginPath(); for (const [x1, y1, x2, y2] of G.seg) { const a = P(x1, y1), b = P(x2, y2); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      }
      // balls held in the cup shrink while it compresses
      if (k.held.length) {
        const shrink = k.s === 'press' ? 1 - sm(k.t / k.dur) : 1, cs = Math.cos(k.a + k.spin), sn = Math.sin(k.a + k.spin);
        for (const [lx, ly, ci] of k.held) {
          const x = G.cx + (lx * cs - ly * sn) * shrink, y = G.cy + (lx * sn + ly * cs) * shrink, [px, py] = P(x, y), s2 = rpx * Math.max(0.15, shrink);
          g.drawImage(sprite(st, ci, rpx), px - s2, py - s2, s2 * 2, s2 * 2);
        }
      }
      // hub: a neon rotor on the rim
      const [hx, hy] = P(G.hx, G.hy), hr = 0.075 * sc * (1 + beat * 0.15);
      g.fillStyle = '#1a1733'; g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill();
      g.strokeStyle = '#ff5fa8'; g.lineWidth = Math.max(1.5, hr * 0.22); g.beginPath(); g.arc(hx, hy, hr * 0.78, 0, 7); g.stroke();
      g.fillStyle = '#f1eeff';
      for (let i = 0; i < 6; i++) { const an = now * (k.s === 'press' ? 6 : 1.2) + i * Math.PI / 3; g.beginPath(); g.arc(hx + Math.cos(an) * hr * 0.78, hy + Math.sin(an) * hr * 0.78, hr * 0.16, 0, 7); g.fill(); }
      g.beginPath(); g.arc(hx, hy, hr * 0.28, 0, 7); g.fill();
    }
    if (st.end > 4.5 && !c.thumb) { g.globalAlpha = Math.min(1, (st.end - 4.5) / 1.5); g.fillStyle = '#0d0b1e'; g.fillRect(0, 0, c.W, c.H); g.globalAlpha = 1; }
  }

  HB.game({
    id: 'alchimie', name: 'Alchimie',
    desc: 'Deux pinces attrapent des billes et les relâchent multipliées, d\'une nouvelle couleur, jusqu\'à remplir le cercle.',
    ranges: [
      { key: 'mult', label: 'Multiplier', min: 2, max: 8, step: 1, value: 5 },
      { key: 'max', label: 'Billes', min: 400, max: 3000, step: 100, value: 1600, restart: true },
      { key: 'claws', label: 'Pinces', min: 1, max: 4, step: 1, value: 2, restart: true }
    ],
    thumbSteps: 420, reset, step, draw
  });
})();
