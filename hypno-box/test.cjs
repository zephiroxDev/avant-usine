const { chromium } = require('playwright');
(async () => {
  const id = process.argv[2], secs = +(process.argv[3]||20);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('file://' + __dirname + '/index.html');
  await p.waitForTimeout(500); await p.screenshot({ path: 'shot-home.png' });
  await p.click('[data-game='+id+']');
  for (let i = 1; i <= 4; i++) { await p.waitForTimeout(secs*250); await p.screenshot({ path: `shot-${id}-${i}.png` });
    console.log(i, await p.evaluate(id => document.querySelector('#view-'+id+' .status').textContent, id)); }
  const fps = await p.evaluate(() => new Promise(ok => { let n=0; const t0=performance.now(); const f=()=>{ n++; if (performance.now()-t0<2000) requestAnimationFrame(f); else ok(n/2); }; requestAnimationFrame(f); }));
  console.log('fps', fps, 'errors', JSON.stringify(errs));
  await b.close();
})();
