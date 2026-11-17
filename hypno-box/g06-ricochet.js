/* Jeu 6 · Ricochet : un petit cube aux yeux file à 45° dans une grotte de blocs qui monte sans fin. Il rebondit
   sur les parois en laissant une traînée de chevrons dont la couleur glisse à chaque rebond ; chaque rebond
   allume un repère sur la paroi et soulève de la poussière. La caméra le suit vers le haut. */
(() => {
  const NC = 14, CS = 1 / NC, VH = 1.8, SZ = 0.042;
  function rock(st, cx, cy) { if (cx < 0 || cx >= NC) return true; const row = st.rows.get(cy); return row ? row[cx] === 1 : true; }
  function ensure(st, topRow) {
    while (st.genTop > topRow - 4) {                     // carve rooms upward, each overlapping the previous one
      const prev = st.last, w = 3 + Math.floor(Math.random() * (3 + (st.wide || 0))), h = 3 + Math.floor(Math.random() * 4);
      let x0 = Math.max(1, Math.min(NC - 1 - w, prev.x + Math.floor((Math.random() - 0.5) * (prev.w + w))));
      if (x0 + w <= prev.x + 1) x0 = prev.x + 2 - w; if (x0 >= prev.x + prev.w - 1) x0 = prev.x + prev.w - 2; x0 = Math.max(1, Math.min(NC - 1 - w, x0));
      const y1 = prev.y + 1 + Math.floor(Math.random() * 2), y0 = y1 - h;           // rows grow toward negative y
      for (let y = y0; y <= y1; y++) { if (!st.rows.has(y)) st.rows.set(y, new Uint8Array(NC).fill(1)); const r = st.rows.get(y); for (let x = x0; x < x0 + w; x++) r[x] = 0; }
      st.last = { x: x0, y: y0, w }; st.genTop = Math.min(st.genTop, y0);
    }
  }
  function reset(c) {
    const st = c.st = { rows: new Map(), genTop: 0, last: { x: 5, y: 2, w: 4 }, wide: Math.round(c.opt.wide == null ? 2 : c.opt.wide), t: 0, hue: 50, trail: [], marks: [], dust: [], bounces: 0, cam: 0, best: 0, stuck: 0, squash: 0 };
    for (let y = -2; y <= 6; y++) { const r = new Uint8Array(NC).fill(1); if (y >= -2 && y <= 3) for (let x = 3; x < 10; x++) r[x] = 0; st.rows.set(y, r); }
    st.last = { x: 3, y: -2, w: 7 }; st.genTop = -2; ensure(st, -40);
    st.x = 6.5 * CS; st.y = 2 * CS; const sp = 0.62; st.vx = sp / Math.SQRT2; st.vy = -sp / Math.SQRT2; st.cam = st.y - VH * 0.6; st.best = st.y;
    st.trail.push({ x: st.x, y: st.y, h: st.hue });
  }
  function hits(st, x, y) {
    const h = SZ / 2, x0 = Math.floor((x - h) / CS), x1 = Math.floor((x + h - 1e-9) / CS), y0 = Math.floor((y - h) / CS), y1 = Math.floor((y + h - 1e-9) / CS);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (rock(st, cx, cy)) return true;
    return false;
  }
  function bounce(c, st, x, y, axis) {
    st.bounces++; st.hue = (st.hue + (c.opt.shift || 14)) % 360; st.squash = 1;
    st.marks.push({ x, y, axis, t: 0 }); if (st.marks.length > 60) st.marks.shift();
    for (let i = 0, n = HBT.n(c.thumb ? 0 : 14); i < n; i++) st.dust.push({ x, y, vx: (Math.random() - 0.5) * 0.25 + (axis === 'x' ? -Math.sign(st.vx) * 0.15 : 0), vy: (Math.random() - 0.5) * 0.25 + (axis === 'y' ? -Math.sign(st.vy) * 0.15 : 0), t: 0 });
    c.note(c.scale(st.bounces % 15), 0.8, 0.9);
  }
  function step(c, dt) {
    const st = c.st; if (!st) return; st.t += dt; st.squash = Math.max(0, st.squash - dt * 5);
    const n = Math.ceil(dt * 0.62 / (CS * 0.2)), d = dt / n;
    for (let i = 0; i < n; i++) {
      const nx = st.x + st.vx * d; if (hits(st, nx, st.y)) { bounce(c, st, st.x + Math.sign(st.vx) * SZ / 2, st.y, 'x'); st.vx = -st.vx; } else st.x = nx;
      const ny = st.y + st.vy * d; if (hits(st, st.x, ny)) { bounce(c, st, st.x, st.y + Math.sign(st.vy) * SZ / 2, 'y'); st.vy = -st.vy; } else st.y = ny;
    }
    const last = st.trail[st.trail.length - 1];
    if (Math.hypot(st.x - last.x, st.y - last.y) > 0.012) { st.trail.push({ x: st.x, y: st.y, h: st.hue }); if (st.trail.length > (c.opt.trail || 420)) st.trail.shift(); }
    // keep climbing: if the cube has not gone higher for a while, it blasts through the rock above it
    if (st.y < st.best - 0.02) { st.best = st.y; st.stuck = 0; } else st.stuck += dt;
    if (st.stuck > 4) {
      st.stuck = 0; const cx = Math.floor(st.x / CS), cy = Math.floor(st.y / CS);
      for (let y = cy - 4; y <= cy; y++) { if (!st.rows.has(y)) st.rows.set(y, new Uint8Array(NC).fill(1)); for (let x = Math.max(1, cx - 1); x <= Math.min(NC - 2, cx + 1); x++) st.rows.get(y)[x] = 0; }
      for (let i = 0; i < 40; i++) st.dust.push({ x: st.x + (Math.random() - 0.5) * 0.2, y: st.y - Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, t: 0 });
      st.vy = -Math.abs(st.vy); c.note(c.scale(14), 1, 1.4);
    }
    ensure(st, Math.floor((st.cam - 0.5) / CS));
    const want = st.y - VH * 0.55; st.cam += (want - st.cam) * Math.min(1, dt * 2.2);
    for (const m of st.marks) m.t += dt;
    for (const p of st.dust) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; } st.dust = st.dust.filter(p => p.t < 1.4);
    for (const [y] of st.rows) if (y * CS > st.cam + VH + 1) st.rows.delete(y);
    if (!c.thumb) c.status(st.bounces + ' rebonds · ' + Math.max(0, Math.round(-st.best * 10)) + ' m');
  }
  function leave(c) { const st = c.st; if (st && st.bounces > 20) HBH.add('Ricochet', st.bounces + ' rebonds, ' + Math.max(0, Math.round(-st.best * 10)) + ' m de montée en ' + Math.round(st.t) + ' s'); }

  function draw(c, g) {
    const st = c.st; if (!st) return;
    const s = Math.min(c.W, c.H / VH), ox = (c.W - s) / 2, oy = (c.H - VH * s) / 2, cam = st.cam, Y = y => oy + (y - cam) * s, beat = c.react ? c.react.beat : 0;
    g.save(); g.beginPath(); g.rect(ox, oy, s, VH * s); g.clip();
    g.fillStyle = '#0f0b22'; g.fillRect(ox, oy, s, VH * s);
    // rock
    const r0 = Math.floor(cam / CS) - 1, r1 = Math.ceil((cam + VH) / CS) + 1;
    g.fillStyle = '#2b2750'; g.beginPath();
    for (let y = r0; y <= r1; y++) for (let x = 0; x < NC; x++) if (rock(st, x, y)) g.rect(ox + x * CS * s - 0.5, Y(y * CS) - 0.5, CS * s + 1, CS * s + 1);
    g.fill();
    // trail of chevrons, coloured by the hue at each point
    const tw = 0.02 * s, tr = st.trail;
    g.lineWidth = Math.max(1, s * 0.0035); g.lineCap = 'round';
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, px = -uy, py = ux;
      if (Y(b.y) < oy - 20 || Y(b.y) > oy + VH * s + 20) continue;
      const mx = ox + b.x * s, my = Y(b.y), k = i / tr.length;
      g.strokeStyle = 'hsla(' + b.h + ',90%,' + (55 + beat * 10) + '%,' + (0.35 + 0.65 * k).toFixed(2) + ')';
      g.beginPath(); g.moveTo(mx + px * tw - ux * tw * 0.6, my + py * tw - uy * tw * 0.6); g.lineTo(mx, my); g.lineTo(mx - px * tw - ux * tw * 0.6, my - py * tw - uy * tw * 0.6); g.stroke();
    }
    // bounce marks on the walls
    for (const m of st.marks) {
      const a = Math.max(0.25, 1 - m.t / 3), x = ox + m.x * s, y = Y(m.y), L = 0.03 * s, w = Math.max(2, 0.008 * s);
      g.fillStyle = 'rgba(241,238,255,' + a.toFixed(2) + ')';
      if (m.axis === 'x') g.fillRect(x - w / 2, y - L / 2, w, L); else g.fillRect(x - L / 2, y - w / 2, L, w);
    }
    g.fillStyle = '#d9d3ff'; for (const p of st.dust) { g.globalAlpha = 1 - p.t / 1.4; g.fillRect(ox + p.x * s - 1, Y(p.y) - 1, 2, 2); } g.globalAlpha = 1;
    // the cube, squashed a little at each bounce, eyes looking where it goes
    const cx = ox + st.x * s, cy = Y(st.y), z = SZ * s * (1 + st.squash * 0.15), z2 = SZ * s * (1 - st.squash * 0.1);
    g.fillStyle = 'hsl(' + st.hue + ',70%,22%)'; g.strokeStyle = 'hsl(' + st.hue + ',90%,70%)'; g.lineWidth = Math.max(1.5, s * 0.004);
    g.beginPath(); g.roundRect ? g.roundRect(cx - z / 2, cy - z2 / 2, z, z2, z * 0.18) : g.rect(cx - z / 2, cy - z2 / 2, z, z2); g.fill(); g.stroke();
    const lx = Math.sign(st.vx) * z * 0.08, ly = Math.sign(st.vy) * z * 0.08;
    for (const e of [-1, 1]) { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx + e * z * 0.2, cy - z * 0.05, z * 0.13, z * 0.17, 0, 0, 7); g.fill(); g.fillStyle = '#16122c'; g.beginPath(); g.arc(cx + e * z * 0.2 + lx, cy - z * 0.05 + ly, z * 0.07, 0, 7); g.fill(); }
    g.restore();
  }

  HB.game({
    id: 'ricochet', name: 'Ricochet',
    desc: 'Un petit cube file en diagonale dans une grotte sans fin et laisse une traînée de couleurs à chaque rebond.',
    ranges: [
      { key: 'trail', label: 'Traînée', min: 80, max: 900, step: 20, value: 420 },
      { key: 'shift', label: 'Couleur', min: 0, max: 60, step: 1, value: 14 },
      { key: 'wide', label: 'Salles', min: 0, max: 5, step: 1, value: 2, restart: true }
    ],
    thumbSteps: 240, reset, step, draw, leave
  });
})();
