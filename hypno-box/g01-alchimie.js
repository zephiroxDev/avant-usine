/* Jeu 1 · Alchimie : deux grandes pinces fixées à des engrenages sur le bord du cercle se renvoient les billes.
   Chacune à son tour ramasse la nuée qui arrive, la compresse en losange, puis tire à travers le cercle une nuée
   plus nombreuse d'une nouvelle couleur, que l'autre pince attrape à son tour, jusqu'à remplir le cercle.
   Simulation dans un cercle de rayon 1, dessinée ensuite à la taille de l'écran. */
(() => {
  const P = HBP;
  const COLS = ['#8fdc6e', '#6f7fe6', '#8b5cf0', '#e0607a', '#f0a050', '#5cc8e0', '#ff5fa8', '#e6d35a', '#5ad6a6', '#c77dff'];
  const BAR = 0.05, HUB = 0.085;
  const sm = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  const lerp = (a, b, k) => a + (b - a) * k;
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  let LAT = null;
  function lattice() {
    if (LAT) return LAT; const p = [];
    for (let j = -45; j <= 45; j++) for (let i = -45; i <= 45; i++) { const x = i + (j & 1) * 0.5, y = j * 0.866; p.push([x, y, x * x + y * y]); }
    p.sort((a, b) => a[2] - b[2]); return (LAT = p);
  }
  // claw poses: rot is relative to the inward direction, e = stem, B = half plate, A = arms, be = arm angle, sp = box spin
  const POSE = {
    idle: { e: 0, B: 0.03, A: 0.56, be: 0.8, sp: 0 },
    open: { e: 0, B: 0.3, A: 0.46, be: 0.12, sp: 0 },
    shut: { e: 0.02, B: 0.28, A: 0.44, be: -0.1, sp: 0 },
    press: { e: 0.06, B: 0.17, A: 0.3, be: 0, sp: Math.PI / 4 },
    fire: { e: 0.34, B: 0.06, A: 0.36, be: Math.PI / 2, sp: 0 }
  };

  function reset(c) {
    const cap = c.thumb ? 300 : Math.round(c.opt.max || 1600), nc = c.thumb ? 2 : Math.round(c.opt.claws || 2);
    const st = c.st = {
      cap, n: 0, X: new Float32Array(cap), Y: new Float32Array(cap), PX: new Float32Array(cap), PY: new Float32Array(cap),
      col: new Uint16Array(cap), age: new Float32Array(cap), head: null, next: new Int32Array(cap),
      r: 0.036, rmin: Math.sqrt(0.72 / cap), gen: 0, claws: [], turn: 0, rings: [], sparks: [], flashes: [], t: 0, end: 0, zoom: 0, fp: [0, 0], logged: false, sprites: {}
    };
    for (let i = 0; i < nc; i++) {
      const h = i * 2 * Math.PI / nc;
      st.claws.push(Object.assign({ h, rot: 0, s: 'idle', t: 0, dur: 0.5, from: null, to: null, held: [], hc: 0, wait: 0 }, POSE.idle));
    }
    for (let i = 0; i < 12; i++) { const p = lattice()[i]; add(st, 0.42 + p[0] * 0.075, p[1] * 0.075, 0, 0, 0, 1); }
    st.target = 0; st.lastM = 12;
  }
  function add(st, x, y, vx, vy, g, age) {
    if (st.n >= st.cap) return; const i = st.n++;
    st.X[i] = x; st.Y[i] = y; st.PX[i] = x - vx; st.PY[i] = y - vy; st.col[i] = g; st.age[i] = age;
  }
  function remove(st, i) {
    const j = --st.n; if (i === j) return;
    st.X[i] = st.X[j]; st.Y[i] = st.Y[j]; st.PX[i] = st.PX[j]; st.PY[i] = st.PY[j]; st.col[i] = st.col[j]; st.age[i] = st.age[j];
  }
  function geo(k) {
    const hx = Math.cos(k.h), hy = Math.sin(k.h), a = k.h + Math.PI + k.rot, ux = Math.cos(a), uy = Math.sin(a);
    const cx = hx + ux * (k.e + k.A / 2), cy = hy + uy * (k.e + k.A / 2);
    const ca = Math.cos(a + k.sp), sa = Math.sin(a + k.sp), vx = -sa, vy = ca;
    const p0x = cx - ca * k.A / 2, p0y = cy - sa * k.A / 2, seg = [];
    if (k.e > 0.01) seg.push([hx, hy, hx + ux * k.e, hy + uy * k.e]);
    if (k.B > 0.01) seg.push([p0x - vx * k.B, p0y - vy * k.B, p0x + vx * k.B, p0y + vy * k.B]);
    for (const s of [1, -1]) {
      const bx = p0x + vx * k.B * s, by = p0y + vy * k.B * s, dx = ca * Math.cos(k.be) + vx * s * Math.sin(k.be), dy = sa * Math.cos(k.be) + vy * s * Math.sin(k.be);
      seg.push([bx, by, bx + dx * k.A, by + dy * k.A]);
    }
    return { hx, hy, ux, uy, cx, cy, ca, sa, vx, vy, p0x, p0y, seg };
  }
  function go(k, s, dur, pose, rot) {
    k.s = s; k.t = 0; k.dur = dur; k.from = { e: k.e, B: k.B, A: k.A, be: k.be, sp: k.sp, rot: k.rot };
    k.to = Object.assign({}, k.from, pose, rot == null ? {} : { rot });
  }
  function aim(st, k) {
    const hx = Math.cos(k.h), hy = Math.sin(k.h); let sx = 0, sy = 0, near = 0;
    for (let i = 0; i < st.n; i++) {
      if (st.col[i] !== st.target) continue; const dx = st.X[i] - hx, dy = st.Y[i] - hy;
      if (dx * dx + dy * dy < 0.9) { near++; sx += dx; sy += dy; }
    }
    const rot = near ? Math.max(-0.95, Math.min(0.95, wrap(Math.atan2(sy, sx) - (k.h + Math.PI)))) : 0;
    return { rot, near };
  }
  function clawStep(c, st, k, i, dt) {
    k.t += dt; const q = Math.min(1, k.t / k.dur), e = sm(q), f = k.from, to = k.to;     // claw tempo: one catch-and-throw ≈ 3 s
    if (f) { for (const p of ['e', 'B', 'A', 'be', 'sp']) k[p] = lerp(f[p], to[p], k.s === 'fire' && p === 'e' ? 1 - Math.pow(1 - q, 3) : e); k.rot = f.rot + wrap(to.rot - f.rot) * e; }
    if (k.s === 'press') k.sp = Math.sin(q * Math.PI * 0.5) * Math.PI / 4 + Math.sin(q * Math.PI * 6) * 0.06;
    if (k.s === 'idle') {
      const full = st.n >= st.cap * 0.985;                    // circle full: the claws rest, nothing is created out of nowhere
      if (!full) k.rot = lerp(k.rot, Math.sin(st.t * 0.9 + i * 2) * 0.35, Math.min(1, dt * 2));
      if (st.turn !== i || st.end || full) return;
      k.wait += dt; const a = aim(st, k);
      if (a.near >= Math.max(1, st.lastM * 0.55) || k.wait > 2.6) { k.wait = 0; go(k, 'open', 0.4, POSE.open, a.rot); }
      return;
    }
    if (q < 1) return;
    if (k.s === 'open') {
      const G = geo(k); k.held = [];
      for (let j = st.n - 1; j >= 0; j--) {
        const dx = st.X[j] - G.p0x, dy = st.Y[j] - G.p0y, lx = dx * G.ca + dy * G.sa, ly = dx * G.vx + dy * G.vy;
        if (lx > -0.01 && lx < k.A + 0.06 && Math.abs(ly) < k.B + 0.03) { k.held.push([lx - k.A / 2, ly, st.col[j]]); remove(st, j); }
      }
      k.hc = k.held.length;
      if (!k.hc) { k.wait = 1.5; go(k, 'back', 0.4, POSE.idle, 0); return; }
      c.note(c.scale(2 + (st.gen % 9)), 0.75);
      go(k, 'shut', 0.25, POSE.shut);
    }
    else if (k.s === 'shut') { go(k, 'press', 0.75, POSE.press); st.rings.push({ k, t: 0 }); }
    else if (k.s === 'press') { Object.assign(k, { sp: 0, be: Math.PI / 2, B: POSE.fire.B, A: POSE.fire.A }); fire(c, st, k, i); go(k, 'fire', 0.4, POSE.fire, 0); }
    else if (k.s === 'fire') go(k, 'back', 0.55, POSE.idle, 0);
    else if (k.s === 'back') { k.s = 'idle'; k.from = null; }
  }
  function fire(c, st, k, i) {
    const mult = c.opt.mult || 4, room = st.cap - st.n, g = ++st.gen, m = Math.max(Math.min(k.hc, room), Math.min(Math.round(k.hc * mult), room));
    k.held = []; k.hc = 0;
    const s = 2 * st.r * 1.02, G = geo(k), L0 = lattice(), R0 = s * Math.sqrt(m) * 0.5;
    const ahead = k.e + BAR / 2 + st.r * 1.1 + R0, qx = G.hx + G.ux * ahead, qy = G.hy + G.uy * ahead;      // in front of the plate, never inside it
    const nk = st.claws[(i + 1) % st.claws.length], tx = Math.cos(nk.h) * 0.45 - qx, ty = Math.sin(nk.h) * 0.45 + (P.rnd() - 0.5) * 0.5 - qy, tl = Math.hypot(tx, ty) || 1;
    const sp = 0.009 * (st.claws.length === 1 ? 0.6 : 1);
    // the cluster fills the lattice around its centre, skipping places outside the circle or behind the plate
    const lim = 1 - st.r * 1.05, occ = P.occupancy(st, s);
    for (let j = 0, put = 0; put < m && j < L0.length; j++) {
      const x = qx + L0[j][0] * s, y = qy + L0[j][1] * s;
      if (x * x + y * y > lim * lim || (x - G.hx) * G.ux + (y - G.hy) * G.uy < k.e + BAR / 2 + st.r || !occ.free(x, y, s * 0.98)) continue;
      add(st, x, y, tx / tl * sp, ty / tl * sp, g, 0); put++; occ.mark(x, y);
    }
    st.target = g; st.lastM = m; st.turn = (i + 1) % st.claws.length;
    st.flashes.push({ x: G.hx + G.ux * 0.12, y: G.hy + G.uy * 0.12, t: 0 });
    for (let j = 0, nS = HBT.n(c.thumb ? 0 : 30); j < nS; j++) { const an = Math.atan2(G.uy, G.ux) + Math.PI + (Math.random() - 0.5) * 1.6, v = 0.3 + Math.random() * 0.8; st.sparks.push({ x: G.hx + G.ux * 0.1, y: G.hy + G.uy * 0.1, vx: Math.cos(an) * v, vy: Math.sin(an) * v, t: 0, g: g - 1 }); }
    c.note(c.scale(5 + (g % 9)), 1, 1.5);
  }

  function solve(st) {
    const n = st.n, r = st.r, X = st.X, Y = st.Y, D = 2 * r, D2 = D * D, cs = D, G = Math.ceil(2 / cs) + 1;
    if (!st.head || st.head.length < G * G) st.head = new Int32Array(G * G);
    const head = st.head, next = st.next; head.fill(-1, 0, G * G);
    for (let i = 0; i < n; i++) { const gx = Math.min(G - 1, Math.max(0, ((X[i] + 1) / cs) | 0)), gy = Math.min(G - 1, Math.max(0, ((Y[i] + 1) / cs) | 0)), id = gy * G + gx; next[i] = head[id]; head[id] = i; }
    const age = st.age, maxC = r * 0.5;
    const pair = (i, j) => {
      const dx = X[j] - X[i], dy = Y[j] - Y[i], d2 = dx * dx + dy * dy; if (d2 >= D2 || d2 < 1e-14) return;
      const wi = age[i] >= 1 ? 1 : 0.2 + age[i] * 0.8, wj = age[j] >= 1 ? 1 : 0.2 + age[j] * 0.8;
      const d = Math.sqrt(d2), o = Math.min(maxC, D - d) * 0.85 / d, s = wi + wj, ki = o * wi / s, kj = o * wj / s;
      X[i] -= dx * ki; Y[i] -= dy * ki; X[j] += dx * kj; Y[j] += dy * kj;
    };
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      for (let i = head[gy * G + gx]; i >= 0; i = next[i]) {
        for (let j = next[i]; j >= 0; j = next[j]) pair(i, j);
        if (gx + 1 < G) for (let j = head[gy * G + gx + 1]; j >= 0; j = next[j]) pair(i, j);
        if (gy + 1 < G) for (let ox = -1; ox <= 1; ox++) { const x2 = gx + ox; if (x2 < 0 || x2 >= G) continue; for (let j = head[(gy + 1) * G + x2]; j >= 0; j = next[j]) pair(i, j); }
      }
    }
  }
  function walls(st, G) {
    const n = st.n, r = st.r, X = st.X, Y = st.Y, PX = st.PX, PY = st.PY, lim = 1 - r, rr = r + BAR / 2;
    for (let i = 0; i < n; i++) {
      const d2 = X[i] * X[i] + Y[i] * Y[i];
      if (d2 > lim * lim) {
        const d = Math.sqrt(d2), nx = X[i] / d, ny = Y[i] / d; X[i] = nx * lim; Y[i] = ny * lim;
        let vx = X[i] - PX[i], vy = Y[i] - PY[i]; const vn = vx * nx + vy * ny; if (vn > 0) { vx -= 1.5 * vn * nx; vy -= 1.5 * vn * ny; PX[i] = X[i] - vx; PY[i] = Y[i] - vy; }
      }
      // alternate bar / gear / rim projections: a ball in a wedge converges to the free spot instead of staying inside a solid
      for (let rep = 0, hit = true; rep < 4 && hit; rep++) { hit = false;
      for (const gk of G) for (const [ax, ay, bx, by] of gk.seg) {
        const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-9; let t = ((X[i] - ax) * ex + (Y[i] - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = X[i] - ax - ex * t, py = Y[i] - ay - ey * t, p2 = px * px + py * py;
        if (p2 < rr * rr && p2 > 1e-14) { const p = Math.sqrt(p2), k = (rr - p) / p; X[i] += px * k; Y[i] += py * k; hit = X[i] * X[i] + Y[i] * Y[i] > lim * lim; }
      }
      if (hit) { const d = Math.hypot(X[i], Y[i]); X[i] *= lim / d; Y[i] *= lim / d; } }
      for (const gk of G) { const dx = X[i] - gk.hx, dy = Y[i] - gk.hy, d = Math.hypot(dx, dy), hr = HUB + r; if (d < hr && d > 1e-9) { X[i] = gk.hx + dx / d * hr; Y[i] = gk.hy + dy / d * hr; } }   // the gear is solid
      // a ball squeezed between a bar and the rim slides along the rim, out of the wedge, instead of going through either
      const e2 = X[i] * X[i] + Y[i] * Y[i]; if (e2 > lim * lim) { const d = Math.sqrt(e2); X[i] *= lim / d; Y[i] *= lim / d; }
    }
  }

  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt;
    const rT = Math.max(st.rmin, Math.min(0.036, Math.sqrt(0.26 / Math.max(1, st.n))));
    st.r += (rT - st.r) * Math.min(1, dt * 1.2);
    st.claws.forEach((k, i) => clawStep(c, st, k, i, dt));
    const sub = 2, h = dt / sub, X = st.X, Y = st.Y, PX = st.PX, PY = st.PY, vmax2 = Math.pow(st.r * 0.6, 2), damp = Math.pow(0.55, h);
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < st.n; i++) {
        let vx = (X[i] - PX[i]) * damp, vy = (Y[i] - PY[i]) * damp; const v2 = vx * vx + vy * vy; if (v2 > vmax2) { const k = Math.sqrt(vmax2 / v2); vx *= k; vy *= k; }
        PX[i] = X[i]; PY[i] = Y[i]; X[i] += vx; Y[i] += vy; if (st.age[i] < 1) st.age[i] += h * 1.2;
      }
      const G = st.claws.map(geo);
      for (let it = 0; it < 6; it++) { solve(st); walls(st, G); }
    }
    for (const rg of st.rings) rg.t += dt; st.rings = st.rings.filter(rg => rg.t < 0.9);
    for (const f of st.flashes) f.t += dt; st.flashes = st.flashes.filter(f => f.t < 0.6);
    for (const p of st.sparks) { p.t += dt; p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5; p.vx *= 0.95; p.vy *= 0.95; } st.sparks = st.sparks.filter(p => p.t < 0.8);
    if (st.n >= st.cap * 0.985 && !st.end) { st.fullT = (st.fullT || 0) + dt; if (st.fullT > 3) { const i = Math.floor(P.rnd() * st.n); st.fp = [st.X[i] * 0.6, st.Y[i] * 0.6]; st.end = 0.001; } }
    if (st.end) {
      st.end += dt; st.zoom = sm(st.end / 3.5) * 1.3;
      if (!st.logged && !c.thumb) { st.logged = true; HBH.add('Alchimie', 'Cercle rempli : ' + st.n + ' billes, ' + (st.gen + 1) + ' couleurs en ' + Math.round(st.t) + ' s'); }
      if (st.end > 6.5 && !c.thumb) reset(c);
    }
    if (!c.thumb) c.status(st.n + ' billes · ' + (st.gen + 1) + (st.gen ? ' couleurs' : ' couleur'));
  }

  function sprite(st, ci, rpx) {
    const o = st.sprites[ci], dp = Math.min(3, (window.devicePixelRatio || 1) * 1.5);
    if (o && Math.abs(o.r - rpx) / rpx < 0.05) return o.cv;
    const sz = Math.max(4, Math.ceil(rpx * 2 * dp) + 2), cv = document.createElement('canvas'); cv.width = cv.height = sz;
    const x = cv.getContext('2d'), R = sz / 2 - 1, col = COLS[ci % COLS.length];
    x.fillStyle = col; x.beginPath(); x.arc(sz / 2, sz / 2, R, 0, 7); x.fill();
    const gr = x.createRadialGradient(sz / 2 - R * 0.35, sz / 2 - R * 0.4, 0, sz / 2, sz / 2, R);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.35, 'rgba(255,255,255,.08)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,6,30,.45)');
    x.fillStyle = gr; x.beginPath(); x.arc(sz / 2, sz / 2, R, 0, 7); x.fill();
    st.sprites[ci] = { r: rpx, cv }; return cv;
  }
  function gear(g, x, y, r, a, beat) {
    const n = 11; g.fillStyle = '#9d97c4'; g.beginPath();
    for (let i = 0; i < n * 2; i++) { const an = a + i * Math.PI / n, rr = i % 2 ? r * 0.8 : r * (1.02 + beat * 0.08), w = Math.PI / n * 0.45; g.lineTo(x + Math.cos(an - w) * rr, y + Math.sin(an - w) * rr); g.lineTo(x + Math.cos(an + w) * rr, y + Math.sin(an + w) * rr); }
    g.closePath(); g.fill(); g.fillStyle = '#5d5786'; g.beginPath(); g.arc(x, y, r * 0.5, 0, 7); g.fill();
    g.fillStyle = '#c9c3ea'; g.beginPath(); g.arc(x, y, r * 0.2, 0, 7); g.fill();
  }
  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.42, c.H * 0.36), cx = c.W / 2, cy = c.H / 2, beat = c.react ? c.react.beat : 0;
    const z = st.zoom, sc = R * (1 + z), ox = cx - st.fp[0] * R * z, oy = cy - st.fp[1] * R * z, P = (x, y) => [ox + x * sc, oy + y * sc];
    const bg = g.createRadialGradient(ox, oy, 0, ox, oy, sc); bg.addColorStop(0, '#171233'); bg.addColorStop(1, '#0f0b24');
    g.fillStyle = bg; g.beginPath(); g.arc(ox, oy, sc, 0, 7); g.fill();
    const rpx = st.r * sc;
    for (let i = 0; i < st.n; i++) {
      const sp = sprite(st, st.col[i], rpx), x = ox + st.X[i] * sc, y = oy + st.Y[i] * sc, s2 = st.age[i] < 1 ? rpx * (0.6 + 0.4 * Math.min(1, st.age[i] * 4)) : rpx;
      g.drawImage(sp, x - s2, y - s2, s2 * 2, s2 * 2);
    }
    g.lineWidth = Math.max(1.5, R * 0.01) * (1 + beat * 0.8); g.strokeStyle = 'rgba(214,206,255,' + (0.75 + beat * 0.25).toFixed(2) + ')';
    g.beginPath(); g.arc(ox, oy, sc, 0, 7); g.stroke();
    for (const rg of st.rings) {
      const G = geo(rg.k), [x, y] = P(G.cx, G.cy), k = rg.t / 0.9;
      g.strokeStyle = 'rgba(230,224,255,.8)'; g.lineWidth = Math.max(1, R * 0.004);
      for (const d of [0, 0.33, 0.66]) { const kk = (k * 1.5 + d) % 1; g.globalAlpha = (1 - kk) * (1 - k) * 0.8; g.beginPath(); g.arc(x, y, (0.12 + kk * 0.2) * sc, 0, 7); g.stroke(); }
      g.globalAlpha = 1;
    }
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const k of st.claws) {
      const G = geo(k);
      for (const [w, col] of [[BAR, '#7f79a8'], [BAR * 0.55, '#a59fcb']]) {
        g.strokeStyle = col; g.lineWidth = Math.max(2, w * sc); g.beginPath();
        for (const [x1, y1, x2, y2] of G.seg) { const a = P(x1, y1), b = P(x2, y2); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      }
      if (k.held.length) {
        const shrink = k.s === 'press' ? 1 - 0.55 * sm(k.t / k.dur) : 1, an = k.h + Math.PI + k.rot + k.sp, cs = Math.cos(an), sn = Math.sin(an), wob = k.s === 'press' ? k.t * 9 : 0;
        for (let j = 0; j < k.held.length; j++) {
          const [lx0, ly0, ci] = k.held[j], lx = lx0 * shrink + Math.sin(wob + j) * 0.01, ly = ly0 * shrink + Math.cos(wob * 1.3 + j) * 0.01;
          const [px, py] = P(G.cx + lx * cs - ly * sn, G.cy + lx * sn + ly * cs);
          g.drawImage(sprite(st, ci, rpx), px - rpx, py - rpx, rpx * 2, rpx * 2);
        }
      }
      const [hx, hy] = P(G.hx, G.hy); gear(g, hx, hy, HUB * sc, st.t * 0.6 + k.rot * 2 + (k.s === 'press' ? k.t * 8 : 0), beat);
    }
    for (const f of st.flashes) {
      const [x, y] = P(f.x, f.y), k = f.t / 0.6, rad = (0.12 + k * 0.18) * sc, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    }
    for (const p of st.sparks) { const [x, y] = P(p.x, p.y); g.globalAlpha = 1 - p.t / 0.8; g.fillStyle = COLS[p.g % COLS.length]; g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); }
    g.globalAlpha = 1;
    if (st.end > 4.5 && !c.thumb) { g.globalAlpha = Math.min(1, (st.end - 4.5) / 1.5); g.fillStyle = '#0d0b1e'; g.fillRect(0, 0, c.W, c.H); g.globalAlpha = 1; }
  }

  HB.game({
    id: 'alchimie', name: 'Alchimie',
    desc: 'Deux pinces se renvoient les billes : chacune attrape la nuée qui arrive et la relance multipliée, d\'une nouvelle couleur.',
    ranges: [
      { key: 'mult', label: 'Multiplier', min: 2, max: 8, step: 1, value: 4 },
      { key: 'max', label: 'Billes', min: 400, max: 3000, step: 100, value: 1600, restart: true },
      { key: 'claws', label: 'Pinces', min: 1, max: 4, step: 1, value: 2, restart: true }
    ],
    thumbSteps: 360, reset, step, draw,
    audit(c) {                                    // penetration of balls into the claw bars, overlap between balls
      const st = c.st, G = st.claws.map(geo), rr = st.r + BAR / 2; let pen = 0, where = '';
      for (let i = 0; i < st.n; i++) { if (st.age[i] < 1) continue; for (const gk of G) for (const [ax, ay, bx, by] of gk.seg) {
        const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-9; let t = ((st.X[i] - ax) * ex + (st.Y[i] - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(st.X[i] - ax - ex * t, st.Y[i] - ay - ey * t); if ((rr - d) / st.r > pen) { pen = (rr - d) / st.r; where = 'barre ' + gk.hx.toFixed(1) + ' ' + st.claws.map(k => k.s).join('/') + ' d=' + Math.hypot(st.X[i], st.Y[i]).toFixed(2); } }
        for (const gk of G) { const ph = (HUB + st.r - Math.hypot(st.X[i] - gk.hx, st.Y[i] - gk.hy)) / st.r; if (ph > pen) { pen = ph; where = 'engrenage'; } }
        const pc = (Math.hypot(st.X[i], st.Y[i]) + st.r - 1) / st.r; if (pc > pen) { pen = pc; where = 'bord'; } }
      return { pen, where, ov: P.overlap(st, st.r), note: st.n + ' billes, ' + (st.gen + 1) + ' couleurs' };
    }
  });
})();
