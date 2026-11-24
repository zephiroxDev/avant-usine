const { chromium } = require('playwright');
(async () => { const [id, secs, expr] = [process.argv[2], +process.argv[3], process.argv[4]]; const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game=' + id + ']'); await p.waitForTimeout(100);
  console.log(await p.evaluate(([id, secs, expr]) => { const { c, def } = window['__hb_' + id]; window.HypnoGames[id].leave(); HBP.seed(12345); def.reset(c); const out = []; const f = new Function('c', 'return ' + expr);
    for (let i = 0; i < secs * 60; i++) { def.step(c, HB.FIX); if (i % 60 === 59) out.push(((i + 1) / 60) + 's ' + f(c)); } return out.join('\n'); }, [id, secs, expr])); await b.close(); })();
