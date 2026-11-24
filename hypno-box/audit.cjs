// node audit.cjs <id|all> [seconds] [opts json]  — headless physics audit of the games
const { chromium } = require('playwright');
(async () => {
  const which = process.argv[2] || 'all', secs = +(process.argv[3] || 60), opts = JSON.parse(process.argv[4] || '{}');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForTimeout(400);
  const ids = which === 'all' ? await p.evaluate(() => Object.keys(window.HypnoGames)) : which.split(',');
  for (const id of ids) {
    await p.click('[data-game=' + id + ']'); await p.waitForTimeout(150);
    const r = await p.evaluate(([id, secs, opts]) => {
      const H = window['__hb_' + id], c = H.c, def = H.def;
      document.querySelector('#view-' + id + ' [data-a=play]'); window.HypnoGames[id].leave();        // stop the live loop, we drive it
      for (const [k, v] of Object.entries(opts)) c.opt[k] = v;
      const hash = () => { let h = 0; const walk = (o, d) => { if (!o || d > 2) return; for (const k of Object.keys(o)) { const v = o[k];
        if (v instanceof Float32Array) { for (let i = 0; i < v.length; i += 7) h = (h * 31 + Math.round(v[i] * 1e5)) | 0; }
        else if (typeof v === 'number' && isFinite(v)) h = (h * 31 + Math.round(v * 1e5)) | 0; else if (typeof v === 'object' && v && !(v instanceof HTMLElement) && !/spark|dust|flash|ring|wave|part|mark|burst|sprite|trail/.test(k)) walk(v, d + 1); } }; walk(c.st, 0); return h; };
      const once = (q) => {
        HBT.set('quality', q); HBP.seed(12345); def.reset(c);
        let worstPen = 0, worstOv = 0, meanOv = 0, nOv = 0, bad = 0, firstEnd = -1, steps = Math.round(secs * 60), t0 = performance.now(), notes = [];
        for (let i = 0; i < steps; i++) {
          def.step(c, HB.FIX);
          if (i % 30 === 29 && def.audit) { const a = def.audit(c) || {}; worstPen = Math.max(worstPen, a.pen || 0); if (a.ov) { worstOv = Math.max(worstOv, a.ov.worst); meanOv += a.ov.mean; nOv++; } if (a.bad) bad++; if (a.note) notes.push(a.note); }
          if (firstEnd < 0 && c.st && c.st.end) firstEnd = (i + 1) / 60;
        }
        return { q, ms: Math.round(performance.now() - t0), pen: +worstPen.toFixed(3), ov: +worstOv.toFixed(3), ovMean: nOv ? +(meanOv / nOv).toFixed(3) : 0, bad, end: firstEnd, hash: hash(), last: notes.slice(-1)[0] || '' };
      };
      const A = once('eco'), B = once('ultra');
      return { A, same: A.hash === B.hash };
    }, [id, secs, opts]);
    console.log(id.padEnd(11), JSON.stringify(r.A), 'déterministe:', r.same);
    await p.evaluate(() => { location.hash = 'jeux'; }); await p.waitForTimeout(100);
  }
  console.log('erreurs', JSON.stringify(errs)); await b.close();
})();
