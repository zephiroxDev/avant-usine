const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForTimeout(800);
  const ids = await p.evaluate(() => [...document.querySelectorAll('[data-game]')].map(e => e.dataset.game));
  console.log(ids.length, ids.join(','));
  await p.screenshot({ path: 'shot-home.png', fullPage: false });
  for (const id of ids) {
    await p.evaluate(() => { location.hash = 'jeux'; }); await p.waitForTimeout(200);
    await p.click('[data-game=' + id + ']'); await p.waitForTimeout(2500);
    const r = await p.evaluate(id => { const v = document.getElementById('view-' + id); return { tabs: v.querySelectorAll('.tab').length, status: v.querySelector('.status').textContent }; }, id);
    console.log(id, r.tabs, r.status);
  }
  // one video export on the last game
  const last = ids[ids.length - 1];
  await p.click('#view-' + last + ' [data-a=rec]'); await p.waitForTimeout(5000); await p.click('#view-' + last + ' canvas'); await p.waitForTimeout(1500);
  console.log('export', await p.evaluate(() => !!document.querySelector('.export video')));
  await p.evaluate(() => { location.hash = 'jeux'; }); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shot-home2.png', fullPage: true });
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
