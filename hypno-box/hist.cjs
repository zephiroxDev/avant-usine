const { chromium } = require('playwright');
(async () => { const [id, secs] = [process.argv[2], +process.argv[3]];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game='+id+']');
  await p.evaluate(id => { const v = document.getElementById(id + '-speed'); v.value = 2.5; v.dispatchEvent(new Event('input', { bubbles: true })); }, id);
  await p.waitForTimeout(secs * 1000);
  console.log(await p.evaluate(() => localStorage.getItem('hypno.history')), JSON.stringify(errs)); await b.close(); })();
