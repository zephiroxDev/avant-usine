const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 375, height: 667 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForTimeout(300);
  // an old saved configuration with a removed slider, an out-of-range value and a value of the wrong type
  await p.evaluate(() => localStorage.setItem('hypno.cfg.fusion', JSON.stringify({ list: [{ name: 'Ancienne', fav: false, vals: { 'fusion-magnet': '0.9', 'fusion-rate': '99', 'fusion-speed': 'abc' } }], last: null })));
  await p.reload(); await p.waitForTimeout(300);
  await p.click('[data-game=sablier]'); await p.click('#view-sablier [data-opts]'); await p.click('#view-sablier .tab:text("Configs")');
  await p.evaluate(() => { const s = document.getElementById('sablier-mult'); s.value = 9; s.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.fill('#view-sablier-cfgname', 'Neuf fois'); await p.click('#view-sablier [data-save]');
  await p.click('#view-sablier [data-def]'); const def = await p.evaluate(() => document.getElementById('sablier-mult').value);
  await p.click('#view-sablier .cfg-name'); const loaded = await p.evaluate(() => document.getElementById('sablier-mult').value);
  console.log('Sablier : par défaut', def, '· configuration rechargée', loaded);
  await p.evaluate(() => { location.hash = 'jeux'; }); await p.waitForTimeout(100); await p.click('[data-game=fusion]'); await p.click('#view-fusion [data-opts]'); await p.click('#view-fusion .tab:text("Configs")');
  console.log('Fusion : configurations listées', await p.evaluate(() => [...document.querySelectorAll('#view-fusion .cfg-name')].map(e => e.textContent).join(', ')));
  await p.click('#view-fusion .cfg-name'); console.log('ancienne configuration appliquée → débit', await p.evaluate(() => document.getElementById('fusion-rate').value + ' (borné au maximum 5), vitesse ' + document.getElementById('fusion-speed').value + ' (valeur invalide ignorée)'));
  await p.click('#view-fusion [data-rnd]'); console.log('aléatoire → débit', await p.evaluate(() => document.getElementById('fusion-rate').value));
  await p.click('#view-fusion .tab:text("Affichage")'); await p.click('#view-fusion [data-fs]'); await p.waitForTimeout(300);
  console.log('plein écran (refusé en test) →', await p.evaluate(() => document.body.classList.contains('cine') ? 'mode cinéma activé' : 'rien'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); console.log('Échap → cinéma', await p.evaluate(() => document.body.classList.contains('cine')));
  await p.evaluate(() => { location.hash = 'jeux'; }); await p.waitForTimeout(4200); await p.click('[data-game=lentille]'); await p.waitForTimeout(4200); await p.evaluate(() => { location.hash = 'jeux'; }); await p.waitForTimeout(300);
  await p.click('#hist-btn'); console.log('statistiques :', await p.evaluate(() => [...document.querySelectorAll('.stats tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ')).join(' | ')));
  console.log('défilement horizontal du menu :', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  console.log('erreurs', JSON.stringify(errs)); await b.close();
})();
