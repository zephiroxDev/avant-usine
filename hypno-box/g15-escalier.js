/* Jeu 15 · Escalier sonore (3D) : une bille lumineuse descend un escalier de blocs suspendus dans le ciel. Chaque rebond tombe
   exactement sur une note du morceau : les blocs sont posés là où la bille, soumise à la gravité, arrivera à l'instant de la
   note suivante. Le bloc touché s'allume (contour néon, numéro) et joue la note. Monde 3D : x / z horizontaux, y vers le bas. */
(() => {
  const P = HBP, G = 9.8, HALF = 0.32, BR = 0.17, SKY = [[0, '#5d6c92'], [0.45, '#8793b2'], [0.62, '#b9b2b8'], [1, '#4a5372']];
  // ----- the rhythm: song notes (or kicks) when a song plays, otherwise a built-in pattern -----
  function rhythm(c) {
    const mel = HB.melody, cv = HBM.curves, k = HBM.influence, richMel = mel && cv && mel.notes.length >= cv.kicks.length * 0.6,      // drum tracks: the detected melody is too sparse, use the beats
      src = HBM.time != null && k > 0 ? (k >= 1 && richMel ? 'notes' : cv ? 'kicks' : null) : null;
    if (src === 'notes') return { key: 'n' + HBM.name + mel.notes.length, times: mel.notes.map(n => n.t), pitches: mel.notes.map(n => n.m), len: cv ? cv.dur : mel.notes[mel.notes.length - 1].t + 1, song: true };
    if (src === 'kicks') return { key: 'k' + HBM.name + cv.kicks.length, times: cv.kicks.map(f => f / cv.FR), pitches: null, len: cv.dur, song: true };
    const pat = [0.44, 0.44, 0.22, 0.22, 0.44, 0.66, 0.22, 0.44], times = []; let t = 0.6;
    for (let i = 0; i < 64; i++) { times.push(t); t += pat[i % pat.length] / (c.opt.tempo || 1); }
    return { key: 'demo' + (c.opt.tempo || 1), times, pitches: null, len: t + 0.3, song: false };
  }
  function cleanTimes(times) {                       // notes closer than 0.16 s make one bounce; very long gaps are split
    const out = []; for (const t of times) { if (out.length && t - out[out.length - 1] < 0.16) continue; while (out.length && t - out[out.length - 1] > 1.3) out.push(out[out.length - 1] + 0.65); out.push(t); }
    return out;
  }
  function reset(c) {
    const st = c.st = { t: 0, blocks: [], hops: [], key: '', lit: new Map(), lastHop: -1, count: 0, cam: null, trail: [], rings: [], decor: [], seed: 0 };
    let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 70; i++) st.decor.push({ x: (r() - 0.5) * 40, y: -(r() * 14 - 4), z: (r() - 0.5) * 40, s: 0.4 + r() * 1.6, a: r() * 6.28 });
    plan(c, st);
  }
  // ----- the path: one hop per note. Horizontal speed is constant along a slowly turning heading; the vertical start speed is
  //       solved so that the ball, under gravity G, lands on the next block exactly at the next note time -----
  function plan(c, st) {
    const R = rhythm(c); st.R = R; st.key = R.key; st.times = cleanTimes(R.times); st.loopLen = Math.max(R.len, st.times[st.times.length - 1] + 0.5);
    st.hops = []; st.blocks = []; st.genRng = 12345; st.head = 0.3; st.turnV = 0;
    st.pos = { x: 0, y: 0, z: 0 }; addBlock(st, st.pos, 0);
  }
  const rng = st => { st.genRng = (st.genRng * 16807) % 2147483647; return st.genRng / 2147483647; };
  function tAt(st, i) { const n = st.times.length, L = Math.floor(i / n); return st.times[i % n] + L * st.loopLen; }
  function addBlock(st, p, i) { st.blocks.push({ x: p.x, y: p.y + BR + HALF, z: p.z, i, rot: (rng(st) - 0.5) * 0.5 }); }
  function ensure(c, st, upto) {
    const sp = c.opt.spd || 2.1, drop = c.opt.drop || 0.8, turn = c.opt.turn || 0.35;
    while (st.hops.length < upto) {
      const i = st.hops.length, t0 = tAt(st, i), t1 = tAt(st, i + 1), dt = Math.max(0.12, t1 - t0);
      st.turnV = st.turnV * 0.8 + (rng(st) - 0.5) * turn; st.head += st.turnV;
      const dx = Math.cos(st.head) * sp * dt, dz = Math.sin(st.head) * sp * dt, dy = drop * (0.6 + rng(st) * 0.8) * Math.min(1.4, dt / 0.44);
      const vy = (dy - 0.5 * G * dt * dt) / dt;             // y grows downward: the ball goes up first, then falls onto the block
      const a = { ...st.pos }; st.pos = { x: a.x + dx, y: a.y + dy, z: a.z + dz };
      st.hops.push({ t0, dt, a, vx: dx / dt, vy, vz: dz / dt }); addBlock(st, st.pos, i + 1);
    }
  }
  function ballAt(st, t) {
    let lo = 0, hi = st.hops.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (st.hops[m].t0 <= t) lo = m; else hi = m - 1; }
    const h = st.hops[lo], u = Math.max(0, Math.min(h.dt, t - h.t0));
    return { i: lo, x: h.a.x + h.vx * u, y: h.a.y + h.vy * u + 0.5 * G * u * u, z: h.a.z + h.vz * u, u: u / h.dt };
  }
  function clock(c, st, dt) {
    const songT = HBM.time;
    if (st.R.song && songT != null) { if (st.songLast != null && songT < st.songLast - 1) st.loops = (st.loops || 0) + 1; st.songLast = songT; return songT + (st.loops || 0) * st.loopLen; }
    st.free = (st.free || 0) + dt; return st.free;
  }
  function step(c, dt) {
    const st = c.st; if (!st) return;
    const R = rhythm(c); if (R.key !== st.key) { plan(c, st); st.free = 0; st.loops = 0; st.songLast = null; st.lastHop = -1; st.lit.clear(); }
    st.t = clock(c, st, dt);
    const t = Math.max(st.t, tAt(st, 0));
    let need = 4; while (tAt(st, need) < t + 3) need += 8; ensure(c, st, need);
    const b = ballAt(st, t);
    // landing: the block lights up and plays its note
    if (b.i > st.lastHop) {
      for (let k = st.lastHop + 1; k <= b.i; k++) if (k > 0) {
        st.count++; st.lit.set(k, { n: st.count, at: st.t });
        const blk = st.blocks[k]; st.rings.push({ x: blk.x, y: blk.y - HALF, z: blk.z, t: 0 });
        if (HB.melody && st.R.song && st.R.pitches) HB.melody.i = k % st.times.length;
        c.note(c.scale(st.count % 15), 0.9, 1.1);
      }
      st.lastHop = b.i;
    }
    st.ball = b; st.trail.push([b.x, b.y, b.z]); if (st.trail.length > 18) st.trail.shift();
    for (const r of st.rings) r.t += dt; st.rings = st.rings.filter(r => r.t < 0.7);
    for (const [k] of st.lit) if (k < b.i - 40) st.lit.delete(k);
    // camera: behind the ball along the mean direction of the next hops, smoothly
    const ahead = st.hops[Math.min(st.hops.length - 1, b.i + 3)], dir = Math.atan2(ahead.a.z - b.z, ahead.a.x - b.x);
    const want = { x: b.x, y: b.y, z: b.z, yaw: Math.atan2(Math.cos(dir), Math.sin(dir)) + (c.opt.side == null ? 1.05 : c.opt.side) };     // three-quarter view, from the side of the descent
    if (!st.cam) st.cam = { ...want }; const k = Math.min(1, dt * 7), cm = st.cam;
    cm.x += (want.x - cm.x) * k; cm.y += (want.y - cm.y) * k * 0.4; cm.z += (want.z - cm.z) * k;
    let dyaw = want.yaw - cm.yaw; while (dyaw > Math.PI) dyaw -= 2 * Math.PI; while (dyaw < -Math.PI) dyaw += 2 * Math.PI; cm.yaw += dyaw * Math.min(1, dt * 1.2);
    if (!c.thumb) c.status(st.count + ' rebonds' + (st.R.song ? ' · sur ' + (st.R.pitches ? 'les notes' : 'les battements') + ' du morceau' : ''));
  }

  // ----- rendering -----
  function fogMix(rgb, f) { const fg = [140, 148, 176]; return 'rgb(' + rgb.map((v, i) => Math.round(v + (fg[i] - v) * f)).join(',') + ')'; }
  function draw(c, g) {
    const st = c.st; if (!st || !st.ball) return;
    const W = c.W, H = c.H, cm = st.cam, beat = c.react ? c.react.beat : 0;
    const sky = g.createLinearGradient(0, 0, 0, H); SKY.forEach(([o, col]) => sky.addColorStop(o, col)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(W * 0.62, H * 0.55, 0, W * 0.62, H * 0.55, H * 0.5); sun.addColorStop(0, 'rgba(255,232,205,' + (0.3 + beat * 0.15).toFixed(2) + ')'); sun.addColorStop(1, 'rgba(255,236,210,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
    const S = Math.min(W, H * 0.62), cam = P.camera(W, H, { yaw: cm.yaw, pitch: 0.62, dist: c.opt.cam || 8, scale: S * 0.42, tx: cm.x, ty: cm.y + 0.4, tz: cm.z, cy: H * 0.5 });
    const items = [], near = 2.5, far = 22;
    for (const d of st.decor) { const x = cm.x + d.x, y = cm.y + d.y, z = cm.z + d.z, q = cam.p(x, y, z); if (q[2] > 5.5) items.push({ d: q[2], kind: 'cube', x, y, z, h: d.s * 0.5, rot: d.a, decor: true }); }
    for (let k = Math.max(0, st.ball.i - 30); k < Math.min(st.blocks.length, st.ball.i + 60); k++) { const blk = st.blocks[k], q = cam.p(blk.x, blk.y, blk.z); if (q[2] > 1.4) items.push({ d: q[2], kind: 'cube', x: blk.x, y: blk.y, z: blk.z, h: HALF, rot: blk.rot, k }); }
    const bq = cam.p(st.ball.x, st.ball.y, st.ball.z); items.push({ d: bq[2], kind: 'ball' });
    items.sort((a, b) => b.d - a.d);
    const LIGHT = [0.35, -0.85, -0.4];
    for (const it of items) {
      const f = Math.max(0, Math.min(0.85, (it.d - near) / (far - near)));
      if (it.kind === 'ball') {
        const [x, y, , kk] = bq, r = BR * kk; for (let j = 0; j < st.trail.length; j++) { const p = cam.p(...st.trail[j]); g.globalAlpha = j / st.trail.length * 0.35; g.fillStyle = '#9ff4ff'; g.beginPath(); g.arc(p[0], p[1], r * (0.4 + 0.6 * j / st.trail.length), 0, 7); g.fill(); }
        g.globalAlpha = 1; const halo = g.createRadialGradient(x, y, r * 0.5, x, y, r * 3); halo.addColorStop(0, 'rgba(140,240,255,.55)'); halo.addColorStop(1, 'rgba(140,240,255,0)'); g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * 3, 0, 7); g.fill();
        const body = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); body.addColorStop(0, '#e9feff'); body.addColorStop(0.45, '#58d8e8'); body.addColorStop(1, '#1d7c92'); g.fillStyle = body; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        continue;
      }
      g.globalAlpha = Math.min(1, (it.d - 1.4) / 1.6);
      const lit = it.k != null ? st.lit.get(it.k) : null, ca = Math.cos(it.rot), sa = Math.sin(it.rot), h = it.h, P8 = [];
      for (const [u, v, w] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) P8.push(cam.p(it.x + (u * ca - w * sa) * h, it.y + v * h, it.z + (u * sa + w * ca) * h));
      const faces = [[[0, 1, 2, 3], 0, 0, -1], [[5, 4, 7, 6], 0, 0, 1], [[4, 0, 3, 7], -1, 0, 0], [[1, 5, 6, 2], 1, 0, 0], [[4, 5, 1, 0], 0, -1, 0], [[3, 2, 6, 7], 0, 1, 0]];
      const base = it.decor ? [52, 58, 72] : [38, 42, 52];
      for (const [fc, ax, ay, az] of faces) {
        const nx = ax * ca - az * sa, nz = ax * sa + az * ca; if (!cam.facing(nx, ay, nz, it.x + nx * h, it.y + ay * h, it.z + nz * h)) continue;
        const l = 0.55 + 0.45 * Math.max(0, nx * LIGHT[0] + ay * LIGHT[1] + nz * LIGHT[2]); let col = base.map(v => v * l);
        if (lit && ay === -1) { const a = Math.max(0, 1 - (st.t - lit.at) * 1.5); col = col.map((v, i) => v + [60, 230, 140][i] * a); }
        g.fillStyle = fogMix(col, f); g.beginPath(); fc.forEach((q, n) => n ? g.lineTo(P8[q][0], P8[q][1]) : g.moveTo(P8[q][0], P8[q][1])); g.closePath(); g.fill();
        if (lit) {
          g.strokeStyle = 'rgba(255,226,40,' + (1 - f * 0.8).toFixed(2) + ')'; g.lineWidth = Math.max(1.5, P8[0][3] * 0.05); g.lineJoin = 'round'; g.stroke();
          const area = Math.abs((P8[fc[2]][0] - P8[fc[0]][0]) * (P8[fc[3]][1] - P8[fc[1]][1]) - (P8[fc[3]][0] - P8[fc[1]][0]) * (P8[fc[2]][1] - P8[fc[0]][1]));
          if (ay === 0 && area >= (it.best || 0)) it.best = area, it.bestF = fc;
        }
      }
      if (lit && it.bestF) {                                // the number, on the side face that faces the camera the most
        const fc = it.bestF; {
            const cx = fc.reduce((s2, q) => s2 + P8[q][0], 0) / 4, cy = fc.reduce((s2, q) => s2 + P8[q][1], 0) / 4, sz = Math.abs(P8[fc[0]][1] - P8[fc[3]][1]) * 0.62;
            g.save(); g.font = '800 ' + Math.max(8, sz) + 'px "Unbounded", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = Math.max(2, sz * 0.12); g.strokeStyle = '#1b1a10'; g.fillStyle = '#ffe228';
            const txt = String(lit.n % 100); g.strokeText(txt, cx, cy); g.fillText(txt, cx, cy); g.restore();
          }
        }
      }
    g.globalAlpha = 1;
    for (const r of st.rings) { const q = cam.p(r.x, r.y, r.z), k = r.t / 0.7; g.strokeStyle = 'rgba(160,255,220,' + (0.8 * (1 - k)).toFixed(2) + ')'; g.lineWidth = 2; g.beginPath(); g.ellipse(q[0], q[1], q[3] * (0.3 + k * 0.6), q[3] * (0.12 + k * 0.25), 0, 0, 7); g.stroke(); }
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6); vg.addColorStop(0, 'rgba(20,18,40,0)'); vg.addColorStop(1, 'rgba(20,18,40,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }

  HB.game({
    id: 'escalier', name: 'Escalier sonore',
    desc: 'En 3D : une bille rebondit de bloc en bloc, chaque rebond tombe pile sur une note de ta musique et allume le bloc.',
    ranges: [
      { key: 'spd', label: 'Élan', min: 1.2, max: 3.5, step: 0.05, value: 2.1, restart: true },
      { key: 'drop', label: 'Pente', min: 0.2, max: 1.4, step: 0.02, value: 0.8, restart: true },
      { key: 'turn', label: 'Virages', min: 0, max: 0.9, step: 0.05, value: 0.35, restart: true },
      { key: 'cam', label: 'Caméra', min: 5, max: 14, step: 0.1, value: 8 }
    ],
    thumbSteps: 90, reset, step, draw,
    audit(c) {                    // the ball must land on each block exactly at its note time (error in millimetres of the world)
      const st = c.st; let worst = 0;
      for (let i = 1; i < Math.min(st.hops.length, 200); i++) { const b = ballAt(st, tAt(st, i) - 1e-6), blk = st.blocks[i]; worst = Math.max(worst, Math.hypot(b.x - blk.x, b.y - (blk.y - BR - HALF), b.z - blk.z)); }
      return { pen: worst * 1000, note: st.count + ' rebonds, écart d\'atterrissage max ' + (worst * 1000).toFixed(3) + ' mm' };
    }
  });
})();
