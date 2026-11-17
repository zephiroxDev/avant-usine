const { chromium } = require('playwright');
(async () => {
  const [id, start, n, gap] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5]];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 820 } });
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game='+id+']');
  await p.waitForTimeout(start*1000);
  for (let i = 0; i < n; i++) { await p.screenshot({ path: `seq-${i}.png`, clip: { x: 16, y: 10, width: 368, height: 615 } }); await p.waitForTimeout(gap); }
  await b.close();
})();
