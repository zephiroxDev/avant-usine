/* Jeu 14 · Fusion : un flacon rond au long col ; des orbes du plus petit niveau tombent une à une dans le col.
   Deux orbes du même niveau qui se touchent fusionnent en un orbe du niveau suivant, plus gros, avec une onde de
   choc. La chaîne monte jusqu'à l'orbe géant final, puis le flacon se vide. Coordonnées : flacon de rayon 1. */
(() => {
  const NECK = 0.16, NECK_TOP = -2.1, NECK_BOT = -0.98;
  // nine original orb designs, from small to giant: colour, ring count, symbol
  const LV = [
    ['#ff9a3c', '#ffd36b', 'flame'], ['#6fd8ff', '#2d6bd8', 'wave'], ['#8fdc6e', '#2f8a4a', 'leaf'], ['#ff5fa8', '#8a2a6a', 'star'],
    ['#b06bff', '#4a2a8a', 'ring'], ['#ffe66b', '#c08a2a', 'sun'], ['#ff6f7d', '#8a1f2f', 'heart'], ['#f1eeff', '#8a85b8', 'crown']
  ];
  const rad = k => 0.085 * Math.pow(1.32, k);
  function reset(c) {
    const st = c.st = { o: [], t: 0, drop: 0.2, waves: [], sparks: [], best: 0, merges: 0, end: 0, drained: 0 };
  }
  function add(st, x, y, k, vy) { st.o.push({ x, y, px: x, py: y - (vy || 0), k, born: 0 }); }
  function walls(o) {
    const r = rad(o.k);
    if (o.y < NECK_BOT + 0.05) {                            // in the neck: two vertical walls
      if (o.x < -NECK + r) o.x = -NECK + r; if (o.x > NECK - r) o.x = NECK - r;
      if (r > NECK) o.x = 0;
    } else {
      const d = Math.hypot(o.x, o.y), lim = 1 - r;
      if (d > lim) {
        const ang = Math.atan2(o.y, o.x), top = Math.abs(ang + Math.PI / 2) < Math.asin(NECK);       // the opening into the neck
        if (!top || r > NECK) { o.x *= lim / d; o.y *= lim / d; }
      }
    }
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt;
    if (st.end) { st.end += dt; for (const o of st.o) { o.y += dt * 1.8 * st.end; } if (st.end > 3.2 && !c.thumb) reset(c); upd(st, dt); return; }
    st.drop -= dt;
    const topFree = !st.o.some(o => o.y < NECK_TOP + 0.4);
    if (st.drop <= 0 && topFree) { add(st, (Math.random() - 0.5) * 0.02, NECK_TOP, 0, 0.004); st.drop = 1 / (c.opt.rate || 3); }
    const sub = 4, h = dt / sub, G = 3;
    for (let s = 0; s < sub; s++) {
      const mag = (c.opt.magnet == null ? 0.6 : c.opt.magnet) * h * h;           // orbs of the same level drift toward each other
      if (mag) for (let i = 0; i < st.o.length; i++) for (let j = i + 1; j < st.o.length; j++) { const p = st.o[i], q = st.o[j]; if (p.k !== q.k || p.y < NECK_BOT || q.y < NECK_BOT) continue; const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1; p.x += dx / d * mag; p.y += dy / d * mag; q.x -= dx / d * mag; q.y -= dy / d * mag; }
      for (const o of st.o) { const vx = (o.x - o.px) * 0.985, vy = (o.y - o.py) * 0.985; o.px = o.x; o.py = o.y; o.x += vx; o.y += vy + G * h * h; o.born += h; }
      for (let it = 0; it < 4; it++) {
        for (let i = 0; i < st.o.length; i++) for (let j = i + 1; j < st.o.length; j++) {
          const a = st.o[i], b = st.o[j], ra = rad(a.k), rb = rad(b.k), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-9;
          if (d >= ra + rb) continue;
          if (a.k === b.k && a.k < LV.length - 1 && !a.dead && !b.dead && a.born > 0.12 && b.born > 0.12) { merge(c, st, a, b); continue; }
          const o = (ra + rb - d) / d, ma = ra * ra, mb = rb * rb, s2 = ma + mb;
          a.x -= dx * o * mb / s2; a.y -= dy * o * mb / s2; b.x += dx * o * ma / s2; b.y += dy * o * ma / s2;
        }
        st.o = st.o.filter(o => !o.dead);
        for (const o of st.o) walls(o);
      }
    }
    upd(st, dt);
    if (st.best >= LV.length - 1 && !st.end) { st.end = 0.001; if (!c.thumb) HBH.add('Fusion', 'Orbe géant atteint après ' + st.merges + ' fusions, en ' + Math.round(st.t) + ' s'); c.note(c.scale(16), 1, 2.5); }
    // the flask overflows: the giant never came, so it empties and starts again
    if (st.t > 240 && !st.end) { st.end = 0.001; if (!c.thumb) HBH.add('Fusion', 'Flacon plein au niveau ' + (st.best + 1) + ', ' + st.merges + ' fusions'); }
    if (!c.thumb) c.status('Niveau ' + (st.best + 1) + ' / ' + LV.length + ' · ' + st.merges + ' fusions');
  }
  function merge(c, st, a, b) {
    a.dead = b.dead = true; const k = a.k + 1, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    add(st, x, y, k, -0.004); st.best = Math.max(st.best, k); st.merges++;
    st.waves.push({ x, y, t: 0, r: rad(k) }); for (let i = 0, n = HBT.n(20 + k * 6); i < n; i++) { const an = Math.random() * 6.283, v = 0.3 + Math.random() * 0.8; st.sparks.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, t: 0, col: LV[k][0] }); }
    c.note(c.scale(2 + k * 2), 1, 1 + k * 0.15);
  }
  function upd(st, dt) {
    for (const w of st.waves) w.t += dt; st.waves = st.waves.filter(w => w.t < 0.8);
    for (const p of st.sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; } st.sparks = st.sparks.filter(p => p.t < 1);
  }
  function orb(g, x, y, r, k, beat) {
    const [c1, c2, sym] = LV[k], gl = g.createRadialGradient(x, y, r * 0.6, x, y, r * 1.5);
    gl.addColorStop(0, c1 + '55'); gl.addColorStop(1, c1 + '00'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * 1.5, 0, 7); g.fill();
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * (1 + beat * 0.03), 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.fillStyle = 'rgba(255,255,255,.8)'; g.lineWidth = Math.max(1, r * 0.1); g.lineCap = 'round'; g.lineJoin = 'round';
    const u = r * 0.5; g.beginPath();
    if (sym === 'flame') { g.moveTo(x, y - u); g.quadraticCurveTo(x + u, y, x, y + u); g.quadraticCurveTo(x - u, y, x, y - u); g.fill(); }
    else if (sym === 'wave') { g.moveTo(x - u, y); g.bezierCurveTo(x - u * 0.5, y - u, x, y + u, x + u, y - u * 0.2); g.stroke(); }
    else if (sym === 'leaf') { g.moveTo(x - u, y + u); g.quadraticCurveTo(x - u, y - u, x + u, y - u); g.quadraticCurveTo(x + u, y + u, x - u, y + u); g.stroke(); }
    else if (sym === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? u * 0.45 : u; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else if (sym === 'ring') { g.arc(x, y, u * 0.75, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, u * 0.3, 0, 7); g.fill(); }
    else if (sym === 'sun') { g.arc(x, y, u * 0.45, 0, 7); g.fill(); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.moveTo(x + Math.cos(a) * u * 0.65, y + Math.sin(a) * u * 0.65); g.lineTo(x + Math.cos(a) * u, y + Math.sin(a) * u); } g.stroke(); }
    else if (sym === 'heart') { g.moveTo(x, y + u * 0.8); g.bezierCurveTo(x - u * 1.3, y - u * 0.1, x - u * 0.5, y - u, x, y - u * 0.35); g.bezierCurveTo(x + u * 0.5, y - u, x + u * 1.3, y - u * 0.1, x, y + u * 0.8); g.fill(); }
    else if (sym === 'drop') { g.moveTo(x, y - u); g.quadraticCurveTo(x + u * 0.9, y + u * 0.2, x, y + u * 0.8); g.quadraticCurveTo(x - u * 0.9, y + u * 0.2, x, y - u); g.fill(); }
    else { g.moveTo(x - u, y + u * 0.5); g.lineTo(x - u, y - u * 0.4); g.lineTo(x - u * 0.45, y + u * 0.05); g.lineTo(x, y - u * 0.7); g.lineTo(x + u * 0.45, y + u * 0.05); g.lineTo(x + u, y - u * 0.4); g.lineTo(x + u, y + u * 0.5); g.closePath(); g.fill(); }
  }
  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.44, c.H / 3.6), ox = c.W / 2, oy = c.H - R * 1.25, X = x => ox + x * R, Y = y => oy + y * R, beat = c.react ? c.react.beat : 0;
    // flask outline with a gradient like the video (purple, pink, orange, green)
    const a0 = -Math.PI / 2 + Math.asin(NECK), a1 = -Math.PI / 2 - Math.asin(NECK) + 2 * Math.PI;
    const gr = g.createLinearGradient(X(-1), 0, X(1), 0); gr.addColorStop(0, '#7f5cff'); gr.addColorStop(0.35, '#ff5fa8'); gr.addColorStop(0.65, '#ff9a3c'); gr.addColorStop(1, '#8fdc6e');
    g.strokeStyle = gr; g.lineWidth = Math.max(2, R * 0.022) * (1 + beat * 0.5); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(X(-NECK), Y(NECK_TOP - 0.4)); g.lineTo(X(-NECK), Y(-Math.cos(Math.asin(NECK)))); g.arc(ox, oy, R, -Math.PI / 2 - Math.asin(NECK), a0 - 2 * Math.PI + 2 * Math.PI, true);
    g.lineTo(X(NECK), Y(NECK_TOP - 0.4)); g.stroke();
    void a1;
    for (const w of st.waves) { const k = w.t / 0.8; g.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(2) + ')'; g.lineWidth = Math.max(1, R * 0.008); for (const d of [0, 0.15, 0.3]) { g.beginPath(); g.arc(X(w.x), Y(w.y), (w.r + (k + d) * 0.35) * R, 0, 7); g.stroke(); } }
    for (const o of st.o) orb(g, X(o.x), Y(o.y), rad(o.k) * R * Math.min(1, 0.6 + o.born * 4), o.k, beat);
    for (const p of st.sparks) { g.globalAlpha = Math.max(0, 1 - p.t); g.fillStyle = p.col; g.fillRect(X(p.x) - 1.5, Y(p.y) - 1.5, 3, 3); } g.globalAlpha = 1;
    // level ladder on the right
    if (!c.thumb) { const s0 = Math.min(18, c.W * 0.045); for (let k = 0; k < LV.length; k++) { const yy = c.H * 0.08 + k * s0 * 2.4; g.globalAlpha = k <= st.best ? 1 : 0.25; orb(g, c.W - s0 * 1.8, yy, s0 * (0.6 + k * 0.05), k, 0); } g.globalAlpha = 1; }
  }
  HB.game({
    id: 'fusion', name: 'Fusion',
    desc: 'Des orbes tombent dans un flacon : deux identiques fusionnent en un plus gros, jusqu\'à l\'orbe géant.',
    ranges: [{ key: 'rate', label: 'Débit', min: 0.8, max: 5, step: 0.1, value: 3 }, { key: 'magnet', label: 'Aimant', min: 0, max: 2, step: 0.05, value: 0.6 }],
    thumbSteps: 900, reset, step, draw
  });
})();
