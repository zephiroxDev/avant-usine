/* Jeu 11 · Lentille : une forme en amande (l'intersection de deux cercles). Des billes partent toutes du centre,
   réparties en éventail, et rebondissent parfaitement sur les bords sans se toucher. À chaque manche leur nombre
   grandit (2, 16, 64… jusqu'à 65 536) : leurs fronts dessinent des anneaux et des rectangles lumineux. */
(() => {
  const D = 0.55, TIP = Math.sqrt(1 - D * D), STEPS = [2, 16, 64, 128, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
  const BW = 240, BH = Math.round(BW * (TIP * 2 + 0.1) / (2 * (1 - D) + 0.1));
  function reset(c) {
    const st = c.st = { round: 0, t: 0, rt: 0, buf: new Float32Array(BW * BH * 3), img: null, cv: null, flash: 1 };
    start(c, st);
  }
  function start(c, st) {
    const max = c.thumb ? 512 : STEPS[Math.min(STEPS.length - 1, Math.round(c.opt.top == null ? 11 : c.opt.top))];
    let n = STEPS[st.round % STEPS.length]; if (n > max) { st.round = 0; n = STEPS[0]; }
    st.n = n; st.X = new Float32Array(n); st.Y = new Float32Array(n); st.VX = new Float32Array(n); st.VY = new Float32Array(n); st.C = new Float32Array(n * 3); st.rt = 0; st.flash = 1;
    const off = HBP.rnd() * 6.283;
    for (let i = 0; i < n; i++) {
      const a = off + i * 2 * Math.PI / n; st.VX[i] = Math.cos(a); st.VY[i] = Math.sin(a);
      const h = i / n * 6, k = h % 2 - 1, x = 1 - Math.abs(k), sec = Math.floor(h) % 6;      // rainbow by starting angle
      const rgb = [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]][sec];
      st.C[i * 3] = 0.45 + rgb[0] * 0.55; st.C[i * 3 + 1] = 0.45 + rgb[1] * 0.55; st.C[i * 3 + 2] = 0.55 + rgb[2] * 0.45;
    }
    if (!c.thumb) c.note(c.scale(st.round % 12), 1, 1.6);
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt; st.rt += dt; st.flash = Math.max(0, st.flash - dt * 1.5);
    const n = st.n, X = st.X, Y = st.Y, VX = st.VX, VY = st.VY, sp = 0.7, sub = 2, h = dt * sp / sub;
    for (let s = 0; s < sub; s++) for (let i = 0; i < n; i++) {
      let x = X[i] + VX[i] * h, y = Y[i] + VY[i] * h;
      // leaving the disc of one circle = hitting its arc: mirror reflection on the arc's normal. Two passes, because near the
      // pointed ends a ball can be outside both circles at once.
      for (let pass = 0; pass < 2; pass++) for (const cx of [-D, D]) {
        const dx = x - cx, d2 = dx * dx + y * y;
        if (d2 > 1) { const d = Math.sqrt(d2), nx = dx / d, ny = y / d, vn = VX[i] * nx + VY[i] * ny; if (vn > 0) { VX[i] -= 2 * vn * nx; VY[i] -= 2 * vn * ny; } x = cx + nx * 0.9999; y = ny * 0.9999; }
      }
      X[i] = x; Y[i] = y;
    }
    // light buffer: fades a little each frame, every ball adds its colour
    const buf = st.buf, fade = Math.pow(c.opt.trail == null ? 0.82 : c.opt.trail, dt * 60);
    for (let i = 0; i < buf.length; i++) buf[i] *= fade;
    const sx = (BW - 1) / (2 * (1 - D) + 0.1), sy = (BH - 1) / (2 * TIP + 0.1), gain = Math.min(1.2, 40 / Math.sqrt(n));
    for (let i = 0; i < n; i++) {
      const px = ((X[i] + (1 - D) + 0.05) * sx) | 0, py = ((Y[i] + TIP + 0.05) * sy) | 0; if (px < 0 || py < 0 || px >= BW || py >= BH) continue;
      const o = (py * BW + px) * 3; buf[o] += st.C[i * 3] * gain; buf[o + 1] += st.C[i * 3 + 1] * gain; buf[o + 2] += st.C[i * 3 + 2] * gain;
    }
    if (st.rt > (c.opt.secs || 7)) { st.round++; start(c, st); if (!c.thumb && st.round % STEPS.length === 0) HBH.add('Lentille', 'Cycle complet jusqu\'à ' + STEPS[STEPS.length - 1].toLocaleString('fr-FR') + ' billes'); }
    if (!c.thumb) c.status(n.toLocaleString('fr-FR') + ' billes · manche ' + (st.round % STEPS.length + 1));
  }
  function draw(c, g) {
    const st = c.st; if (!st) return;
    if (!st.cv) { st.cv = document.createElement('canvas'); st.cv.width = BW; st.cv.height = BH; st.cx = st.cv.getContext('2d'); st.img = st.cx.createImageData(BW, BH); }
    const d = st.img.data, b = st.buf, beat = c.react ? c.react.beat : 0;
    for (let i = 0, j = 0; i < b.length; i += 3, j += 4) { d[j] = Math.min(255, b[i] * 255); d[j + 1] = Math.min(255, b[i + 1] * 255); d[j + 2] = Math.min(255, b[i + 2] * 255); d[j + 3] = 255; }
    st.cx.putImageData(st.img, 0, 0);
    const H = Math.min(c.H * 0.78, c.W * 0.95 * (2 * TIP + 0.1) / (2 * (1 - D) + 0.1)), Wd = H * (2 * (1 - D) + 0.1) / (2 * TIP + 0.1), ox = (c.W - Wd) / 2, oy = (c.H - H) / 2 + c.H * 0.03;
    const sc = H / (2 * TIP + 0.1), cx = ox + Wd / 2, cy = oy + H / 2;
    g.save(); g.beginPath(); g.arc(cx - D * sc, cy, sc, 0, 7); g.clip(); g.beginPath(); g.arc(cx + D * sc, cy, sc, 0, 7); g.clip();
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, sc); bg.addColorStop(0, '#1e1a3c'); bg.addColorStop(1, '#100c26'); g.fillStyle = bg; g.fillRect(ox, oy, Wd, H);
    g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.drawImage(st.cv, ox, oy, Wd, H);
    if (st.n <= 128) for (let i = 0; i < st.n; i++) { g.fillStyle = 'rgb(' + (st.C[i * 3] * 255 | 0) + ',' + (st.C[i * 3 + 1] * 255 | 0) + ',' + (st.C[i * 3 + 2] * 255 | 0) + ')'; g.beginPath(); g.arc(cx + st.X[i] * sc, cy + st.Y[i] * sc, Math.max(2, sc * 0.02), 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over'; g.restore();
    // lens outline (two arcs) and the starting point
    const a = Math.atan2(TIP, D);
    g.strokeStyle = 'rgba(200,214,240,' + (0.7 + beat * 0.3).toFixed(2) + ')'; g.lineWidth = Math.max(1.5, sc * 0.008);
    g.beginPath(); g.arc(cx - D * sc, cy, sc, -a, a); g.stroke(); g.beginPath(); g.arc(cx + D * sc, cy, sc, Math.PI - a, Math.PI + a); g.stroke();
    g.strokeStyle = 'rgba(214,206,255,.6)'; g.beginPath(); g.arc(cx, cy, Math.max(3, sc * 0.02), 0, 7); g.stroke();
    if (st.flash > 0) { g.globalAlpha = st.flash * 0.35; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, sc * 0.3 * (1.3 - st.flash), 0, 7); g.fill(); g.globalAlpha = 1; }
    if (!c.thumb) HBP.counter(g, c, st.n.toLocaleString('fr-FR') + ' billes', oy - Math.min(26, c.H * 0.035));
  }
  HB.game({
    id: 'lentille', name: 'Lentille',
    desc: 'Des billes partent du centre d\'une amande et rebondissent sans fin : plus elles sont nombreuses, plus les formes lumineuses apparaissent.',
    ranges: [
      { key: 'secs', label: 'Durée manche', min: 3, max: 20, step: 0.5, value: 7 },
      { key: 'trail', label: 'Traînée', min: 0.5, max: 0.97, step: 0.01, value: 0.82 },
      { key: 'top', label: 'Jusqu\'à', min: 3, max: 11, step: 1, value: 11 }
    ],
    thumbSteps: 160, reset, step, draw,
    audit(c) {                              // any ball outside the lens (outside either circle)
      const st = c.st; let out = 0, sp = 0;
      for (let i = 0; i < st.n; i++) { out = Math.max(out, Math.hypot(st.X[i] + D, st.Y[i]) - 1, Math.hypot(st.X[i] - D, st.Y[i]) - 1); sp = Math.max(sp, Math.abs(Math.hypot(st.VX[i], st.VY[i]) - 1)); }
      return { pen: Math.max(0, out) * 100, bad: sp > 1e-3 ? 1 : 0, note: st.n + ' billes, écart de vitesse max ' + sp.toExponential(1) };
    }
  });
})();
