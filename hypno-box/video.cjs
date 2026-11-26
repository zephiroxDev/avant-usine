const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.setItem('hypno.studio', JSON.stringify({ dur: 6, cd: 0.01, pos: 'haut', size: 1, color: '#ffffff', hide: false, loop: false })); localStorage.setItem('hypno.caption', 'Attends la fin…'); });
  await p.reload(); await p.waitForTimeout(300); await p.click('[data-game=fusion]'); await p.waitForTimeout(200);
  await p.setInputFiles('#fusion-file', __dirname + '/../songs/percussions-120bpm.wav'); await p.waitForFunction(() => !/Analyse/.test(document.querySelector('#view-fusion [data-import]').textContent));
  await p.evaluate(() => { const s = document.querySelector('#view-fusion [data-vol]'); });
  await p.click('#view-fusion [data-a=rec]'); await p.waitForTimeout(800);
  const during = await p.evaluate(() => { const st = document.querySelector('#view-fusion .stage').getBoundingClientRect(), cv = document.querySelector('#view-fusion canvas'); return 'cadre ' + Math.round(st.width) + '×' + Math.round(st.height) + ' (ratio ' + (st.width / st.height).toFixed(3) + '), toile ' + cv.width + '×' + cv.height + ', enregistre ' + HBX.recording; });
  console.log('pendant :', during);
  await p.waitForSelector('.export video', { timeout: 20000 });
  await p.waitForTimeout(800);
  console.log('après :', await p.evaluate(async () => { const v = document.querySelector('.export video'); await new Promise(r => v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r)); const blob = await fetch(v.src).then(r => r.blob());
    return document.querySelector('.export-title').textContent + ' · ' + v.videoWidth + '×' + v.videoHeight + ' · ' + (blob.size / 1024).toFixed(0) + ' Ko · ' + blob.type; }));
  console.log('historique :', await p.evaluate(() => (JSON.parse(localStorage.getItem('hypno.history') || '[]').find(e => e.g === 'Vidéo') || {}).x));
  await p.click('.export [data-close]');
  // scenario: run and film; the film must stop when the scenario ends
  await p.click('#view-fusion [data-opts]'); await p.click('#view-fusion .tab:text("Scénario")'); await p.click('#view-fusion [data-ex]');
  const t0 = Date.now(); await p.click('#view-fusion [data-film]');
  await p.waitForSelector('.export video', { timeout: 60000 }); console.log('scénario filmé :', await p.evaluate(() => document.querySelector('.export-title').textContent), '· durée réelle ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s (scénario exemple : 20 s)');
  console.log('erreurs', JSON.stringify(errs)); await b.close();
})();
