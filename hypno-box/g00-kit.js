/* Boîte à outils des jeux de billes : réserve de billes (Verlet), collisions par grille, rendu par vignettes. */
window.HBP = (() => {
  const COLS = ['#8fdc6e', '#6f7fe6', '#b06bff', '#e0607a', '#f0a050', '#5cc8e0', '#ff5fa8', '#e6d35a', '#5ad6a6', '#c77dff', '#ff8a5c', '#7fb2ff'];
  // physics randomness: seeded, so a run never depends on the graphics quality (particle effects keep Math.random)
  let sd = 1; const seed = v => { sd = (v >>> 0) || 1; };
  const rnd = () => { sd = (sd + 0x6D2B79F5) >>> 0; let t = sd; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const sm = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  const lerp = (a, b, k) => a + (b - a) * k;
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  let LAT = null;
  function lattice() {
    if (LAT) return LAT; const p = [];
    for (let j = -50; j <= 50; j++) for (let i = -50; i <= 50; i++) { const x = i + (j & 1) * 0.5, y = j * 0.866; p.push([x, y, x * x + y * y]); }
    p.sort((a, b) => a[2] - b[2]); return (LAT = p.slice(0, 6000));
  }
  function pool(cap) {
    return { cap, n: 0, X: new Float32Array(cap), Y: new Float32Array(cap), PX: new Float32Array(cap), PY: new Float32Array(cap),
      col: new Uint16Array(cap), age: new Float32Array(cap), rad: new Float32Array(cap), next: new Int32Array(cap), head: null };
  }
  function add(p, x, y, vx, vy, col, age, rad) {
    if (p.n >= p.cap) return -1; const i = p.n++;
    p.X[i] = x; p.Y[i] = y; p.PX[i] = x - (vx || 0); p.PY[i] = y - (vy || 0); p.col[i] = col || 0; p.age[i] = age == null ? 1 : age; p.rad[i] = rad || 0; return i;
  }
  function remove(p, i) {
    const j = --p.n; if (i === j) return;
    p.X[i] = p.X[j]; p.Y[i] = p.Y[j]; p.PX[i] = p.PX[j]; p.PY[i] = p.PY[j]; p.col[i] = p.col[j]; p.age[i] = p.age[j]; p.rad[i] = p.rad[j];
  }
  // one Verlet step: damping per second, acceleration callback (x, y, i) -> [ax, ay] in units / s²
  function integrate(p, h, damp, acc, vmax) {
    const X = p.X, Y = p.Y, PX = p.PX, PY = p.PY, k = Math.pow(damp, h), h2 = h * h, vm2 = vmax ? vmax * vmax * h2 : 0;
    for (let i = 0; i < p.n; i++) {
      let vx = (X[i] - PX[i]) * k, vy = (Y[i] - PY[i]) * k;
      if (acc) { const a = acc(X[i], Y[i], i); vx += a[0] * h2; vy += a[1] * h2; }
      if (vm2) { const v2 = vx * vx + vy * vy; if (v2 > vm2) { const s = Math.sqrt(vm2 / v2); vx *= s; vy *= s; } }
      PX[i] = X[i]; PY[i] = Y[i]; X[i] += vx; Y[i] += vy; if (p.age[i] < 1) p.age[i] = Math.min(1, p.age[i] + h);
    }
  }
  // ball–ball contacts for equal radii r inside the box [x0, x0 + w] × [y0, y0 + h]; young balls (age < 1) push harder
  function collide(p, r, x0, y0, w, h, stiff, rest) {
    const n = p.n, X = p.X, Y = p.Y, D = 2 * r, D2 = D * D, cs = D, GX = Math.max(1, Math.ceil(w / cs) + 1), GY = Math.max(1, Math.ceil(h / cs) + 1);
    if (GX * GY > 400000) return;
    if (!p.head || p.head.length < GX * GY) p.head = new Int32Array(GX * GY);
    const head = p.head, next = p.next, age = p.age, maxC = r * 0.5, k0 = stiff || 0.85; head.fill(-1, 0, GX * GY);
    for (let i = 0; i < n; i++) { const gx = Math.min(GX - 1, Math.max(0, ((X[i] - x0) / cs) | 0)), gy = Math.min(GY - 1, Math.max(0, ((Y[i] - y0) / cs) | 0)), id = gy * GX + gx; next[i] = head[id]; head[id] = i; }
    const pair = (i, j) => {
      const dx = X[j] - X[i], dy = Y[j] - Y[i], d2 = dx * dx + dy * dy; if (d2 >= D2) return;
      if (d2 < 1e-14) { X[j] += r * 0.1 * (rnd() - 0.5); Y[j] += r * 0.1 * (rnd() - 0.5); return; }
      const wi = age[i] >= 1 ? 1 : 0.2 + age[i] * 0.8, wj = age[j] >= 1 ? 1 : 0.2 + age[j] * 0.8;
      const d = Math.sqrt(d2), o = Math.min(maxC, D - d) * k0 / d, s = wi + wj, ki = o * wi / s, kj = o * wj / s;
      if (rest == null) { X[i] -= dx * ki; Y[i] -= dy * ki; X[j] += dx * kj; Y[j] += dy * kj; return; }
      // with a restitution: real bounce (equal masses), and the overlap correction does not turn into extra speed
      const PX = p.PX, PY = p.PY, vix = X[i] - PX[i], viy = Y[i] - PY[i], vjx = X[j] - PX[j], vjy = Y[j] - PY[j], nx = dx / d, ny = dy / d;
      X[i] -= dx * ki; Y[i] -= dy * ki; X[j] += dx * kj; Y[j] += dy * kj;
      const vn = (vjx - vix) * nx + (vjy - viy) * ny; let ji = 0, jj = 0;
      if (vn < 0) { const J = -(1 + rest) * vn / s; ji = J * wi; jj = J * wj; }
      PX[i] = X[i] - (vix - nx * ji); PY[i] = Y[i] - (viy - ny * ji); PX[j] = X[j] - (vjx + nx * jj); PY[j] = Y[j] - (vjy + ny * jj);
    };
    for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
      for (let i = head[gy * GX + gx]; i >= 0; i = next[i]) {
        for (let j = next[i]; j >= 0; j = next[j]) pair(i, j);
        if (gx + 1 < GX) for (let j = head[gy * GX + gx + 1]; j >= 0; j = next[j]) pair(i, j);
        if (gy + 1 < GY) for (let ox = -1; ox <= 1; ox++) { const x2 = gx + ox; if (x2 < 0 || x2 >= GX) continue; for (let j = head[(gy + 1) * GX + x2]; j >= 0; j = next[j]) pair(i, j); }
      }
    }
  }
  // audit: worst and mean overlap between balls of radius r, as a fraction of the diameter (0 = none)
  function overlap(p, r) {
    const n = p.n, X = p.X, Y = p.Y, D = 2 * r, cs = D, m = new Map(); let worst = 0, sum = 0, cnt = 0;
    for (let i = 0; i < n; i++) { const k = ((X[i] / cs) | 0) * 73856093 ^ ((Y[i] / cs) | 0) * 19349663; let a = m.get(k); if (!a) m.set(k, a = []); a.push(i); }
    for (let i = 0; i < n; i++) { const gx = (X[i] / cs) | 0, gy = (Y[i] / cs) | 0;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const a = m.get((gx + ox) * 73856093 ^ (gy + oy) * 19349663); if (!a) continue;
        for (const j of a) { if (j <= i) continue; const d = Math.hypot(X[j] - X[i], Y[j] - Y[i]); if (d < D) { const o = (D - d) / D; if (o > worst) worst = o; sum += o; cnt++; } } } }
    return { worst, mean: cnt ? sum / cnt : 0, pairs: cnt };
  }
  // occupancy of a ball set, to spawn new balls only on free places: free(x, y, d) is true when no ball centre is closer than d
  function occupancy(p, cell) {
    const m = new Map(), key = (gx, gy) => gx * 73856093 ^ gy * 19349663;
    for (let i = 0; i < p.n; i++) { const k = key(Math.floor(p.X[i] / cell), Math.floor(p.Y[i] / cell)); let a = m.get(k); if (!a) m.set(k, a = []); a.push(p.X[i], p.Y[i]); }
    return {
      free(x, y, d) { const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const a = m.get(key(gx + ox, gy + oy)); if (!a) continue; for (let j = 0; j < a.length; j += 2) if ((a[j] - x) ** 2 + (a[j + 1] - y) ** 2 < d * d) return false; }
        return true; },
      count(x, y, d) { let n = 0; const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const a = m.get(key(gx + ox, gy + oy)); if (!a) continue; for (let j = 0; j < a.length; j += 2) if ((a[j] - x) ** 2 + (a[j + 1] - y) ** 2 < d * d) n++; }
        return n; },
      mark(x, y) { const k = key(Math.floor(x / cell), Math.floor(y / cell)); let a = m.get(k); if (!a) m.set(k, a = []); a.push(x, y); }
    };
  }
  // 3D camera (y points down, like the screen): perspective projection of world points, and of directions for face culling
  function camera(W, H, o) {
    const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), S = o.scale, cx0 = o.cx == null ? W / 2 : o.cx, cy0 = o.cy == null ? H / 2 : o.cy;
    const view = (dx, dy, dz) => { const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy; return [x1, dy * cp - z1 * sp, dy * sp + z1 * cp]; };
    return {
      p(x, y, z) { const [x1, y2, z2] = view(x - o.tx, y - o.ty, z - o.tz), d = z2 + o.dist, k = S * o.dist / d; return [cx0 + x1 * k, cy0 + y2 * k, d, k]; },
      facing(nx, ny, nz, px, py, pz) { const [vx, vy, vz] = view(px - o.tx, py - o.ty, pz - o.tz), [ax, ay, az] = view(nx, ny, nz); return ax * vx + ay * vy + az * (vz + o.dist) < 0; }
    };
  }
  // Music as an input, shared by every game: store what the song says (pending kicks, energy, bass, strength of the setting)
  function mus(st, m) { st.mt = st.t; st.mk = m.k; st.lv = m.level || 0; st.bs = m.bass || 0; st.pc = m.perc || 0; st.sil = !!m.silent;
    // light: one kick out of two; balanced: every kick; strong: kicks plus the other attacks (snares, hats)
    st.bq = m.silent ? 0 : Math.min(2, (st.bq || 0) + (m.kick || 0) * Math.min(1, m.k) + (m.k > 1 ? Math.max(0, (m.hit || 0) - (m.kick || 0)) * 0.5 : 0)); st.hq = Math.min(4, (st.hq || 0) + (m.hit || 0)); }
  const live = st => st.mt != null && st.t - st.mt < 0.35;                       // a song is playing and drives this game right now
  function take(st, q) { if (!(st[q] >= 1)) return false; st[q]--; st.mh = (st.mh || 0) + 1; return true; }   // consume one musical event
  const finite = p => { for (let i = 0; i < p.n; i++) if (!isFinite(p.X[i]) || !isFinite(p.Y[i])) return false; return true; };
  // keep balls inside a circle of radius R centred on the origin, with a bounce
  function inCircle(p, R, r, bounce) {
    const lim = R - r, X = p.X, Y = p.Y, PX = p.PX, PY = p.PY, b = 1 + (bounce == null ? 0.5 : bounce);
    for (let i = 0; i < p.n; i++) {
      const d2 = X[i] * X[i] + Y[i] * Y[i]; if (d2 <= lim * lim) continue;
      const d = Math.sqrt(d2), nx = X[i] / d, ny = Y[i] / d; X[i] = nx * lim; Y[i] = ny * lim;
      let vx = X[i] - PX[i], vy = Y[i] - PY[i]; const vn = vx * nx + vy * ny; if (vn > 0) { vx -= b * vn * nx; vy -= b * vn * ny; PX[i] = X[i] - vx; PY[i] = Y[i] - vy; }
    }
  }
  // push a ball out of a thick segment (capsule), with optional bounce
  function capsule(p, i, ax, ay, bx, by, rr, bounce) {
    const X = p.X, Y = p.Y, ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-12; let t = ((X[i] - ax) * ex + (Y[i] - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = X[i] - ax - ex * t, py = Y[i] - ay - ey * t, d2 = px * px + py * py; if (d2 >= rr * rr || d2 < 1e-16) return false;
    const d = Math.sqrt(d2), nx = px / d, ny = py / d, k = rr - d; X[i] += nx * k; Y[i] += ny * k;
    if (bounce) { let vx = X[i] - p.PX[i], vy = Y[i] - p.PY[i]; const vn = vx * nx + vy * ny; if (vn < 0) { vx -= (1 + bounce) * vn * nx; vy -= (1 + bounce) * vn * ny; p.PX[i] = X[i] - vx; p.PY[i] = Y[i] - vy; } }
    return true;
  }
  // ball pictures: one per colour and size, redrawn only when the size changes
  const cache = {};
  function sprite(col, rpx, style) {
    const key = col + (style || ''), o = cache[key], dp = Math.min(3, (window.devicePixelRatio || 1) * 1.5);
    if (o && Math.abs(o.r - rpx) / Math.max(rpx, 0.1) < 0.06) return o.cv;
    const sz = Math.max(4, Math.ceil(rpx * 2 * dp) + 2), cv = (o && o.cv) || document.createElement('canvas'); cv.width = cv.height = sz;
    const x = cv.getContext('2d'), R = sz / 2 - 1;
    x.fillStyle = col; x.beginPath(); x.arc(sz / 2, sz / 2, R, 0, 7); x.fill();
    if (style !== 'flat') {
      const gr = x.createRadialGradient(sz / 2 - R * 0.35, sz / 2 - R * 0.4, 0, sz / 2, sz / 2, R);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.35, 'rgba(255,255,255,.08)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,6,30,.45)');
      x.fillStyle = gr; x.beginPath(); x.arc(sz / 2, sz / 2, R, 0, 7); x.fill();
    }
    cache[key] = { r: rpx, cv }; return cv;
  }
  function drawBalls(g, p, ox, oy, sc, r, colOf) {
    const rpx = r * sc;
    for (let i = 0; i < p.n; i++) {
      const s2 = (p.rad[i] || r) * sc * (p.age[i] < 1 ? 0.45 + 0.55 * Math.min(1, p.age[i] * 3) : 1);
      g.drawImage(sprite(colOf ? colOf(p.col[i]) : COLS[p.col[i] % COLS.length], s2), ox + p.X[i] * sc - s2, oy + p.Y[i] * sc - s2, s2 * 2, s2 * 2);
    }
    return rpx;
  }
  function counter(g, c, text, y) {          // big count at the top of the arena, like the videos
    const fs = Math.round(Math.min(c.W * 0.07, 30));
    g.save(); g.font = '800 ' + fs + 'px "Unbounded", system-ui, sans-serif'; const w = g.measureText(text).width; if (w > c.W * 0.9) g.font = '800 ' + Math.floor(fs * c.W * 0.9 / w) + 'px "Unbounded", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(241,238,255,.92)'; g.fillText(text, c.W / 2, y); g.restore();
  }
  // shared ending: a short hold, fade out, history line, new round
  function ending(c, st, dt, game, line, hold) {
    st.end = (st.end || 0) + dt;
    if (!st.logged && !c.thumb) { st.logged = true; HBH.add(game, line); }
    return st.end > (hold || 4) + 1.6 && !c.thumb;
  }
  function fade(g, c, st, hold) { const k = ((st.end || 0) - (hold || 4)) / 1.4; if (k > 0 && !c.thumb) { g.globalAlpha = Math.min(1, k); g.fillStyle = '#0d0b1e'; g.fillRect(0, 0, c.W, c.H); g.globalAlpha = 1; } }
  return { seed, rnd, overlap, finite, occupancy, camera, mus, live, take, COLS, sm, lerp, wrap, lattice, pool, add, remove, integrate, collide, inCircle, capsule, sprite, drawBalls, counter, ending, fade };
})();
