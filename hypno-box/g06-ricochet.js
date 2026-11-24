/* Jeu 6 · Ricochet : un petit cube aux yeux file à 45° dans une grotte de blocs qui monte sans fin. Il rebondit
   sur les parois en laissant une traînée de chevrons dont la couleur glisse à chaque rebond ; chaque rebond
   allume un repère sur la paroi et soulève de la poussière. La caméra le suit vers le haut. */
(() => {
  const P = HBP;
  const NC = 14, CS = 1 / NC, VH = 1.8, SZ = 0.042;
  function rock(st, cx, cy) { if (cx < 0 || cx >= NC) return true; const row = st.rows.get(cy); return row ? row[cx] === 1 : true; }
  function ensure(st, topRow) {
    let built = false;
    while (st.genTop > topRow - 4) { built = true;                     // carve rooms upward, each overlapping the previous one
      const prev = st.last, w = 3 + Math.floor(P.rnd() * (3 + (st.wide || 0))), h = 3 + Math.floor(P.rnd() * 4);
      let x0 = Math.max(1, Math.min(NC - 1 - w, prev.x + Math.floor((P.rnd() - 0.5) * (prev.w + w))));
      const ov = Math.min(3, w, prev.w);                                // rooms share at least three columns: a real passage, not a slit
      if (x0 + w < prev.x + ov) x0 = prev.x + ov - w; if (x0 > prev.x + prev.w - ov) x0 = prev.x + prev.w - ov; x0 = Math.max(1, Math.min(NC - 1 - w, x0));
      const y1 = prev.y + 1 + Math.floor(P.rnd() * 2), y0 = y1 - h;           // rows grow toward negative y
      for (let y = y0; y <= y1; y++) { if (!st.rows.has(y)) st.rows.set(y, new Uint8Array(NC).fill(1)); const r = st.rows.get(y); for (let x = x0; x < x0 + w; x++) r[x] = 0; }
      st.last = { x: x0, y: y0, w }; st.genTop = Math.min(st.genTop, y0);
    }
    return built;
  }
  const SP = 0.62, MS = CS * 0.2, TAU = MS / SP;
  // the cube moves on a fine integer grid (step U on each axis): its path is exactly periodic, so a closed loop can be recognised
  const U = MS / Math.SQRT2;
  function micro(o, onBounce) {
    const S = o.st || o;
    if (hits(S, (o.xi + o.sx) * U, o.yi * U)) { if (onBounce) onBounce(o.xi * U + o.sx * SZ / 2, o.yi * U, 'x'); o.sx = -o.sx; } else o.xi += o.sx;
    if (hits(S, o.xi * U, (o.yi + o.sy) * U)) { if (onBounce) onBounce(o.xi * U, o.yi * U + o.sy * SZ / 2, 'y'); o.sy = -o.sy; } else o.yi += o.sy;
    o.x = o.xi * U; o.y = o.yi * U; o.vx = o.sx * SP / Math.SQRT2; o.vy = o.sy * SP / Math.SQRT2;
  }
  // Look-ahead: follow the cube's future path through the rooms already built. If it would circle in a room without climbing,
  // the exit is dug into that room's ceiling, right above the highest point of its loop — while that room is still out of sight.
  // The cube never goes through rock: the level is simply designed so that it can always climb.
  function lookahead(st) {
    const o = { st, xi: st.xi, yi: st.yi, sx: st.sx, sy: st.sy, x: st.x, y: st.y }; let best = o.y, bx = o.x, since = 0, seen = new Set(), loop = false;
    const onB = () => { const k = o.xi + ',' + o.yi + ',' + o.sx + ',' + o.sy; if (seen.has(k)) loop = true; else seen.add(k); };
    for (let n = 0; n < 40000; n++) {
      micro(o, onB);
      if (o.y < best - 0.02) { best = o.y; bx = o.x; since = 0; seen = new Set(); } else since++;
      if (o.y < (st.genTop + 6) * CS) return;                          // reached the newest rooms: checked again when more are built
      if ((loop || since > 600) && best < st.cam - 0.1) {                 // only out of sight loop = false; seen = new Set();   // the same bounce came back: a closed loop                                             // looping: dig a two-cell shaft up from the top of the loop
        let changed = false; const cx = Math.max(1, Math.min(NC - 3, Math.floor(bx / CS) - (bx / CS % 1 < 0.5 ? 1 : 0)));
        for (let y = Math.floor(best / CS) - 1, k = 0; k < 20; y--, k++) {
          if (!st.rows.has(y)) st.rows.set(y, new Uint8Array(NC).fill(1)); const row = st.rows.get(y);
          if (!row[cx] && !row[cx + 1] && k > 1) break; if ((row[cx] || row[cx + 1]) && y * CS > st.cam - 0.05) { st.seenDig = (st.seenDig || 0) + 1; } if (row[cx] || row[cx + 1]) changed = true; row[cx] = 0; row[cx + 1] = 0;
        }
        if (changed) st.dug = (st.dug || 0) + 1; since = 0;
      }
    }
  }
  function reset(c) {
    const st = c.st = { rows: new Map(), genTop: 0, last: { x: 5, y: 2, w: 4 }, wide: Math.round(c.opt.wide == null ? 2 : c.opt.wide), t: 0, hue: 50, trail: [], marks: [], dust: [], bounces: 0, cam: 0, best: 0, stuck: 0, squash: 0 };
    for (let y = -2; y <= 6; y++) { const r = new Uint8Array(NC).fill(1); if (y >= -2 && y <= 3) for (let x = 3; x < 10; x++) r[x] = 0; st.rows.set(y, r); }
    st.last = { x: 3, y: -2, w: 7 }; st.genTop = -2; ensure(st, -40);
    st.xi = Math.round(6.5 * CS / U); st.yi = Math.round(2 * CS / U); st.sx = 1; st.sy = -1; st.x = st.xi * U; st.y = st.yi * U; st.vx = SP / Math.SQRT2; st.vy = -SP / Math.SQRT2; st.cam = st.y - VH * 0.6; st.best = st.y; lookahead(st);
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
    // fixed micro-steps: the motion is exactly reproducible, so the look-ahead below predicts the real path
    st.acc = (st.acc || 0) + dt;
    while (st.acc >= TAU) { st.acc -= TAU; micro(st, (x, y, ax) => bounce(c, st, x, y, ax)); }
    const last = st.trail[st.trail.length - 1];
    if (Math.hypot(st.x - last.x, st.y - last.y) > 0.012) { st.trail.push({ x: st.x, y: st.y, h: st.hue }); if (st.trail.length > (c.opt.trail || 420)) st.trail.shift(); }
    if (st.y < st.best - 0.02) st.best = st.y;
    st.la = (st.la || 0) + dt;
    if (ensure(st, Math.floor((st.cam - 0.5) / CS) - 30) || st.la > 2) { st.la = 0; lookahead(st); }      // rooms are built two screens ahead, out of sight
    const want = st.y - VH * 0.55; st.cam += (want - st.cam) * Math.min(1, dt * 2.2);
    for (const m of st.marks) m.t += dt;
    for (const p of st.dust) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; } st.dust = st.dust.filter(p => p.t < 1.4);
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
    thumbSteps: 240, reset, step, draw, leave,
    audit(c) { const st = c.st; return { pen: hits(st, st.x, st.y) ? 1 : 0, bad: st.seenDig ? 1 : 0, note: st.bounces + ' rebonds, ' + Math.round(-st.best * 10) + ' m, sorties creusées ' + (st.dug || 0) + ', dont visibles ' + (st.seenDig || 0) }; }   // the cube overlapping rock = went through
  });
})();
