const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 760 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForTimeout(300);
  // fixed step: the same number of physics steps at 30, 60 and 120 images per second (10 s), and a long pause is dropped
  console.log('pas fixes', await p.evaluate(() => [1 / 30, 1 / 60, 1 / 120, 1 / 144].map(f => { const c = {}; let n = 0; for (let t = 0; t < 10; t += f) n += HB.fixedSteps(c, f); return n; }).join(' / ') + ' ; pause 5 s → ' + HB.fixedSteps({}, Math.min(0.25, 5))));
  const ids = await p.evaluate(() => Object.keys(window.HypnoGames));
  for (const id of ids) {
    await p.evaluate(() => { location.hash = 'jeux'; }); await p.waitForTimeout(100); await p.click('[data-game=' + id + ']');
    await p.evaluate(id => { const { c, def } = window['__hb_' + id]; HBP.seed(7); def.reset(c); for (let i = 0; i < 60 * 18; i++) def.step(c, HB.FIX); }, id);
    await p.waitForTimeout(250); await p.screenshot({ path: 'v-' + id + '.png', clip: { x: 0, y: 0, width: 360, height: 560 } });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (over) errs.push(id + ': défilement horizontal');
  }
  console.log('erreurs', JSON.stringify(errs)); await b.close();
})();
