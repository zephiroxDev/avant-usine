const { chromium } = require('playwright');
(async () => { const [id, js] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game='+id+']'); await p.waitForTimeout(500);
  if (js) await p.evaluate(js); await p.waitForTimeout(1500);
  const fps = await p.evaluate(() => new Promise(ok => { let n=0; const t0=performance.now(); const f=()=>{ n++; if (performance.now()-t0<2000) requestAnimationFrame(f); else ok(n/2); }; requestAnimationFrame(f); }));
  await p.screenshot({ path: 'shot-fps-' + id + '.png' }); console.log('fps', fps, JSON.stringify(errs)); await b.close(); })();
