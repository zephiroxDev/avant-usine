const { chromium } = require('playwright');
(async () => { const [id, secs] = [process.argv[2], +process.argv[3]];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game=' + id + ']'); await p.waitForTimeout(100);
  console.log(await p.evaluate(([id, secs]) => { const { c, def } = window['__hb_' + id]; window.HypnoGames[id].leave(); HBP.seed(12345); def.reset(c);
    const out = []; for (let i = 0; i < secs * 60; i++) { def.step(c, HB.FIX); if (i % 30 === 29) { const a = def.audit(c); if (a.pen > 0.2) out.push(((i + 1) / 60).toFixed(1) + 's pen ' + a.pen.toFixed(2) + ' ' + (a.where || '')); } }
    return out.slice(0, 15).join('\n'); }, [id, secs])); await b.close(); })();
