const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.click('[data-game=escalier]'); await p.waitForTimeout(200);
  await p.setInputFiles('#escalier-file', __dirname + '/../songs/' + process.argv[2]); await p.waitForFunction(() => !/Analyse/.test(document.querySelector('#view-escalier [data-import]').textContent));
  await p.evaluate(() => { if (!HBM.playing) HBM.play(); }); await p.waitForTimeout(6000);
  console.log(process.argv[2], '→', await p.evaluate(() => { const st = window.__hb_escalier.c.st, t = HBM.time, i = st.ball.i;
    // the landing that just happened must match a song note (or kick) time
    const landed = st.times[i % st.times.length], err = Math.abs(((t - landed) % st.loopLen)), hop = st.hops[i];
    return document.querySelector('#view-escalier .status').textContent + ' · temps du morceau ' + t.toFixed(2) + ' s, dernier rebond prévu à ' + landed.toFixed(2) + ' s, prochain à ' + st.times[(i + 1) % st.times.length].toFixed(2) + ' s'; }));
  await p.screenshot({ path: 'shot-esc.png' }); console.log('erreurs', JSON.stringify(errs)); await b.close(); })();
