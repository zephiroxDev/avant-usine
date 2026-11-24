const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => errs.push(m.type() + ': ' + m.text()));
  const t0 = Date.now(); await p.goto('file://' + __dirname + '/index.html', { timeout: 60000 }).catch(e => errs.push('goto ' + e.message));
  console.log('loaded in', Date.now() - t0, 'ms', await p.evaluate(() => Object.keys(window.HypnoGames).length).catch(e => 'eval ' + e.message), JSON.stringify(errs.slice(0, 5))); await b.close(); })();
