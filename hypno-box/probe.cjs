const { chromium } = require('playwright');
(async () => { const [id, js, secs] = [process.argv[2], process.argv[3], +(process.argv[4]||3)];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 820 } });
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game='+id+']');
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(secs * 1000); console.log(await p.evaluate(js)); }
  await b.close(); })();
