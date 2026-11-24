const { chromium } = require('playwright');
(async () => { const [id, secs] = [process.argv[2], +process.argv[3]];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game=' + id + ']'); await p.waitForTimeout(100);
  console.log(await p.evaluate(([id, secs]) => { const { c, def } = window['__hb_' + id]; window.HypnoGames[id].leave(); HBP.seed(12345); def.reset(c);
    const out = []; for (let i = 0; i < secs * 60; i++) { def.step(c, HB.FIX); if (i % 30 === 29) { const st = c.st, p = st.p || st, r = st.r, D = 2 * r; let w = 0, wi = -1, wj = -1;
      for (let a = 0; a < p.n; a++) for (let b2 = a + 1; b2 < p.n; b2++) { const d = Math.hypot(p.X[a] - p.X[b2], p.Y[a] - p.Y[b2]); if (D - d > w * D) { w = (D - d) / D; wi = a; wj = b2; } }
      if (w > 0.25) out.push(((i + 1) / 60).toFixed(1) + 's ov ' + w.toFixed(2) + ' n=' + p.n + ' ages ' + p.age[wi].toFixed(2) + '/' + p.age[wj].toFixed(2) + ' at ' + p.X[wi].toFixed(2) + ',' + p.Y[wi].toFixed(2) + (st.claws ? ' claws ' + st.claws.map(k => k.s).join('/') : '') + ' r=' + Math.hypot(p.X[wi], p.Y[wi]).toFixed(2) + ' ph=' + st.ph + ' hv=' + (st.hv||0).toFixed(2) + ' hh=' + (st.hh||0).toFixed(2)); } }
    return out.slice(0, 12).join('\n'); }, [id, secs])); await b.close(); })();
