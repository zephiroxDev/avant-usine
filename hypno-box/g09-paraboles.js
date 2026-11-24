/* Jeu 9 · Paraboles : un anneau garni de dents, ouvert en bas à gauche, avec un poteau au centre. Une bille est
   lancée depuis la gauche et décrit des paraboles en rebondissant sur le poteau et sur les plots. Si elle touche
   les dents, elle éclate en feu d'artifice et devient un plot gris ; si elle passe par l'ouverture, elle s'évade.
   Chaque trajectoire reste dessinée. Cercle de rayon 1. */
(() => {
  const P = HBP, TEETH = 44, DEPTH = 0.1, GAP0 = 2.18, GAP1 = 2.5, BR = 0.042, POLE = [0, -0.45, 0, 1];
  const inGap = a => { const t = ((a % 6.2832) + 6.2832) % 6.2832; return t > GAP0 && t < GAP1; };
  function reset(c) {
    c.st = { pins: [], paths: [], ball: null, wait: 0.4, t: 0, n: 0, esc: 0, sparks: [], end: 0, col: 0 };
  }
  // the two faces of each tooth are segments: base corner → tip → base corner
  function touchesTeeth(x, y) {
    const a = ((Math.atan2(y, x) % 6.2832) + 6.2832) % 6.2832, w = 2 * Math.PI / TEETH, i0 = Math.floor(a / w);
    if (Math.hypot(x, y) > 1 - BR * 0.2 && !inGap(a)) return true;
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      const a0 = i * w, a1 = (i + 1) * w, am = (a0 + a1) / 2; if (inGap(a0) || inGap(a1)) continue;
      const tx = Math.cos(am) * (1 - DEPTH), ty = Math.sin(am) * (1 - DEPTH);
      for (const [px, py] of [[Math.cos(a0), Math.sin(a0)], [Math.cos(a1), Math.sin(a1)]]) {
        const ex = tx - px, ey = ty - py, t = Math.max(0, Math.min(1, ((x - px) * ex + (y - py) * ey) / (ex * ex + ey * ey)));
        if (Math.hypot(x - px - ex * t, y - py - ey * t) < BR) return true;
      }
    }
    return false;
  }
  function seg(b, ax, ay, bx, by, rr, e) {
    const ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((b.x - ax) * ex + (b.y - ay) * ey) / (ex * ex + ey * ey))), qx = b.x - ax - ex * t, qy = b.y - ay - ey * t, d = Math.hypot(qx, qy);
    if (d >= rr || d < 1e-9) return false;
    const nx = qx / d, ny = qy / d, vn = b.vx * nx + b.vy * ny; b.x += nx * (rr - d); b.y += ny * (rr - d);
    if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; } return true;
  }
  function launch(c, st) {
    const sp = 1.25 + P.rnd() * 0.75, a = -0.25 - P.rnd() * 0.75;
    st.ball = { x: -0.86, y: -0.12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, col: P.COLS[st.col++ % P.COLS.length], path: [[-0.86, -0.12]] };
    st.n++;
  }
  function burst(st, x, y, col, k) { for (let i = 0, n = HBT.n(36 * (k || 1)); i < n; i++) { const a = Math.random() * 6.283, v = 0.2 + Math.random() * 0.6; st.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, col }); } }
  function finish(c, st, dead) {
    const b = st.ball; st.ball = null; st.wait = 0.35;
    st.paths.push({ pts: b.path, col: b.col }); if (st.paths.length > (c.opt.keep || 40)) st.paths.shift();
    if (dead) {
      st.pins.push({ x: b.x, y: b.y, t: 0 });                                     // it stays exactly where it touched the teeth
      burst(st, b.x, b.y, b.col, 1); c.note(c.scale(1 + st.pins.length % 6), 0.9, 1);
    } else { st.esc++; burst(st, b.x, b.y, '#ffe66b', 2); c.note(c.scale(12), 1, 1.6); }
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt;
    if (st.end) { st.end += dt; if (st.end > 4 && !c.thumb) reset(c); upd(st, dt); return; }
    if (!st.ball) { st.wait -= dt; if (st.wait <= 0) launch(c, st); }
    const b = st.ball, g = 1.7;
    if (b) {
      const n = Math.ceil(dt / 0.003), h = dt / n;
      for (let s = 0; s < n && st.ball; s++) {
        b.vy += g * h; b.x += b.vx * h; b.y += b.vy * h; b.life += h;
        // pole
        // pole: a thin capsule; reflection about its real normal (side or rounded top), restitution 0.95
        if (seg(b, POLE[0], POLE[1], POLE[2], POLE[3], BR + 0.008, 0.95)) c.note(c.scale(5 + st.n % 7), 0.7, 0.8);
        // pins: bounce off the balls that died before
        for (const q of st.pins) {
          const dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy);
          if (d < 2 * BR && d > 1e-6) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = q.x + nx * 2 * BR; b.y = q.y + ny * 2 * BR; if (vn < 0) { b.vx -= 1.9 * vn * nx; b.vy -= 1.9 * vn * ny; } q.t = 0.3; c.note(c.scale(8 + st.pins.indexOf(q) % 7), 0.6, 0.7); }
        }
        const d = Math.hypot(b.x, b.y);
        if (d > 1 - DEPTH - BR && touchesTeeth(b.x, b.y)) { finish(c, st, true); break; }
        if (d > 1.12 || b.life > 14) { finish(c, st, false); break; }
      }
      if (st.ball) { const L = b.path[b.path.length - 1]; if (Math.hypot(b.x - L[0], b.y - L[1]) > 0.012) b.path.push([b.x, b.y]); }
    }
    upd(st, dt);
    if (st.pins.length >= (c.opt.pins || 30) && !st.ball && !st.end) { st.end = 0.001; if (!c.thumb) HBH.add('Paraboles', st.n + ' billes lancées, ' + st.esc + ' évadées, en ' + Math.round(st.t) + ' s'); }
    if (!c.thumb) c.status(st.n + ' billes · ' + st.esc + (st.esc > 1 ? ' évadées' : ' évadée'));
  }
  function upd(st, dt) {
    for (const p of st.sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.5 * dt; } st.sparks = st.sparks.filter(p => p.t < 1.2);
    for (const q of st.pins) q.t = Math.max(0, q.t - dt);
  }
  function draw(c, g) {
    const st = c.st; if (!st) return;
    const R = Math.min(c.W * 0.42, c.H * 0.36), ox = c.W / 2, oy = c.H / 2, X = x => ox + x * R, Y = y => oy + y * R, beat = c.react ? c.react.beat : 0;
    // paths
    g.lineWidth = Math.max(1, R * 0.006); g.lineJoin = 'round';
    for (const p of st.paths) { g.strokeStyle = p.col; g.globalAlpha = 0.55; g.beginPath(); p.pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.stroke(); }
    g.globalAlpha = 1;
    if (st.ball) { const b = st.ball; g.strokeStyle = b.col; g.lineWidth = Math.max(1.5, R * 0.009); g.beginPath(); b.path.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.lineTo(X(b.x), Y(b.y)); g.stroke(); }
    // toothed ring with its opening
    g.fillStyle = '#4f4a78';
    for (let i = 0; i < TEETH; i++) {
      const a0 = i * 2 * Math.PI / TEETH, a1 = (i + 1) * 2 * Math.PI / TEETH, am = (a0 + a1) / 2; if (inGap(a0) || inGap(a1)) continue;
      g.beginPath(); g.moveTo(X(Math.cos(a0) * 1.06), Y(Math.sin(a0) * 1.06)); g.lineTo(X(Math.cos(a0)), Y(Math.sin(a0))); g.lineTo(X(Math.cos(am) * (1 - DEPTH)), Y(Math.sin(am) * (1 - DEPTH))); g.lineTo(X(Math.cos(a1)), Y(Math.sin(a1))); g.lineTo(X(Math.cos(a1) * 1.06), Y(Math.sin(a1) * 1.06)); g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(214,206,255,' + (0.5 + beat * 0.4).toFixed(2) + ')'; g.lineWidth = Math.max(1.5, R * 0.008); g.beginPath(); g.arc(ox, oy, R * 1.06, GAP1, GAP0 + 2 * Math.PI); g.stroke();
    // pole and launcher
    g.strokeStyle = '#d9d3ff'; g.lineWidth = Math.max(2, R * 0.016); g.lineCap = 'round'; g.beginPath(); g.moveTo(X(POLE[0]), Y(POLE[1])); g.lineTo(X(POLE[2]), Y(POLE[3] - 0.08)); g.stroke();
    g.strokeStyle = 'rgba(217,211,255,.5)'; g.lineWidth = Math.max(1, R * 0.006); g.beginPath(); g.arc(X(-0.86), Y(-0.12), BR * R * 1.3, 0, 7); g.stroke();
    // pins
    for (const q of st.pins) {
      const rr = BR * R * (1 + q.t);
      const gr = g.createRadialGradient(X(q.x), Y(q.y), 0, X(q.x), Y(q.y), rr * 1.8); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(X(q.x), Y(q.y), rr * 1.8, 0, 7); g.fill();
      g.fillStyle = '#a7a2cc'; g.beginPath(); g.arc(X(q.x), Y(q.y), rr, 0, 7); g.fill(); g.fillStyle = '#5d5786'; g.beginPath(); g.arc(X(q.x), Y(q.y), rr * 0.55, 0, 7); g.fill();
    }
    if (st.ball) { const b = st.ball; g.fillStyle = b.col; g.beginPath(); g.arc(X(b.x), Y(b.y), BR * R, 0, 7); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, R * 0.006); g.stroke(); }
    for (const p of st.sparks) { g.globalAlpha = Math.max(0, 1 - p.t / 1.2); g.fillStyle = p.col; g.fillRect(X(p.x) - 1.5, Y(p.y) - 1.5, 3, 3); }
    g.globalAlpha = 1;
    if (!c.thumb) P.counter(g, c, st.n + ' BILLES · ' + st.esc + ' ÉVADÉES', oy - R * 1.06 - Math.min(30, c.H * 0.045));
    if (st.end > 2.6 && !c.thumb) { g.globalAlpha = Math.min(1, (st.end - 2.6) / 1.2); g.fillStyle = '#0d0b1e'; g.fillRect(0, 0, c.W, c.H); g.globalAlpha = 1; }
  }
  HB.game({
    id: 'paraboles', name: 'Paraboles',
    desc: 'Des billes lancées en arc rebondissent sur un poteau ; celles qui touchent les dents deviennent des plots et dessinent leur chemin.',
    ranges: [
      { key: 'keep', label: 'Traces', min: 5, max: 120, step: 5, value: 40 },
      { key: 'pins', label: 'Plots max', min: 8, max: 80, step: 1, value: 30, restart: true }
    ],
    thumbSteps: 600, reset, step, draw,
    audit(c) {                             // the flying ball inside a pin, the pole or the teeth
      const st = c.st, b = st.ball; let pen = 0; if (!b) return {};
      for (const q of st.pins) pen = Math.max(pen, (2 * BR - Math.hypot(b.x - q.x, b.y - q.y)) / BR);
      const t = Math.max(0, Math.min(1, (b.y - POLE[1]) / (POLE[3] - POLE[1]))), dp = Math.hypot(b.x - POLE[0], b.y - (POLE[1] + (POLE[3] - POLE[1]) * t)); pen = Math.max(pen, (BR + 0.008 - dp) / BR);
      return { pen, note: st.n + ' billes, ' + st.pins.length + ' plots' };
    }
  });
})();
