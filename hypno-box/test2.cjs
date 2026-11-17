const { chromium } = require('playwright');
(async () => {
  const id = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game='+id+']');
  // ending: small capacity, fast speed
  await p.evaluate(() => { const s = document.getElementById('alchimie-max'); s.value = 400; s.dispatchEvent(new Event('input', { bubbles: true })); const v = document.getElementById('alchimie-speed'); v.value = 2.5; v.dispatchEvent(new Event('input', { bubbles: true })); });
  let seen = false;
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(1000); const st = await p.evaluate(() => document.querySelector('#view-alchimie .status').textContent);
    if (st.startsWith('400') && !seen) { seen = true; console.log('full at', i, 's'); await p.waitForTimeout(1200); await p.screenshot({ path: 'shot-end.png' }); }
    if (seen && /^\d+ billes · 1 couleur$/.test(st)) { console.log('restarted', st); break; } }
  console.log('history', await p.evaluate(() => localStorage.getItem('hypno.history')));
  // options tabs
  await p.click('#view-alchimie [data-opts]'); console.log('tabs', await p.evaluate(() => [...document.querySelectorAll('#view-alchimie .tab')].map(t => t.textContent).join(',')));
  await p.click('#view-alchimie .sheet-head button:not(.tab)');
  // recording
  await p.click('#view-alchimie [data-a=rec]'); await p.waitForTimeout(5500); await p.click('#view-alchimie canvas'); await p.waitForTimeout(1500);
  console.log('export', await p.evaluate(() => !!document.querySelector('.export video')), await p.evaluate(() => document.querySelector('.export-title') && document.querySelector('.export-title').textContent));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
