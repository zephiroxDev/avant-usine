// node music.cjs analyse | games <song> <secs> | levels | flow
const { chromium } = require('playwright');
const SONGS = __dirname + '/../songs/';
(async () => {
  const mode = process.argv[2], b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForTimeout(300);
  const open = async id => { await p.evaluate(() => { location.hash = 'jeux'; }); await p.waitForTimeout(80); await p.click('[data-game=' + id + ']'); await p.waitForTimeout(100); };
  const load = async (id, file) => { await p.setInputFiles('#' + id + '-file', SONGS + file); await p.waitForFunction(id => !/Analyse/.test(document.querySelector('#view-' + id + ' [data-import]').textContent), id, { timeout: 120000 }); };
  const setGp = async (id, v) => p.evaluate(([id, v]) => { const s = document.querySelector('#view-' + id + ' [data-gp]'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  if (mode === 'analyse') {
    await open('sablier');
    for (const f of require('fs').readdirSync(SONGS).sort()) {
      await load('sablier', f);
      console.log(f.padEnd(30), await p.evaluate(() => { const c = HBM.curves; if (!c) return 'ÉCHEC'; const sil = c.sil.reduce((a, v) => a + v, 0) / c.FR; return 'battements ' + c.kicks.length + ', attaques ' + c.all.length + ', tempo ' + c.tempo + ' BPM, silence ' + sil.toFixed(1) + ' s, notes mélodie ' + (HB.melody ? HB.melody.notes.length : 0); }));
    }
    // a file that is not audio must be refused with a message
    require('fs').writeFileSync('/tmp/claude-0/-home-user-avant-usine/ee9d7379-b091-55e6-8ed4-1771656a0aab/scratchpad/songs-bad.mp3', 'ceci n est pas un son');
    await p.setInputFiles('#sablier-file', '/tmp/claude-0/-home-user-avant-usine/ee9d7379-b091-55e6-8ed4-1771656a0aab/scratchpad/songs-bad.mp3'); await p.waitForTimeout(1500);
    console.log('faux fichier →', await p.evaluate(() => document.querySelector('#view-sablier .status').textContent + ' | bouton : ' + document.querySelector('#view-sablier [data-import]').textContent));
  }
  if (mode === 'games') {
    const song = process.argv[3], secs = +(process.argv[4] || 8), ids = await p.evaluate(() => Object.keys(window.HypnoGames));
    await open(ids[0]); await load(ids[0], song);
    for (const id of ids) for (const gp of ['1', '0']) {
      await open(id); await setGp(id, gp);
      await p.click('#view-' + id + ' [data-a=reset]'); await p.evaluate(() => { if (HBM.curves && !HBM.playing) HBM.play(); });
      await p.waitForTimeout(secs * 1000);
      const r = await p.evaluate(id => { const st = window['__hb_' + id].c.st; return { err: (JSON.parse(localStorage.getItem('hypno.errors') || '[]')[0] || {}).x || '', mh: st.mh || 0, t: +(st.t || 0).toFixed(1), playing: HBM.playing, status: document.querySelector('#view-' + id + ' .status').textContent }; }, id);
      console.log(id.padEnd(11), 'influence ' + gp, 'événements musicaux ' + String(r.mh).padStart(3), '· temps de jeu ' + r.t + ' s · ' + r.status + (r.err ? ' · dernière erreur : ' + r.err : ''));
    }
  }
  if (mode === 'levels') {
    await open('sablier'); await load('sablier', 'percussions-120bpm.wav');
    for (const gp of ['0.5', '1', '1.7']) { await setGp('sablier', gp); await p.click('#view-sablier [data-a=reset]'); await p.evaluate(() => { if (!HBM.playing) HBM.play(); }); await p.waitForTimeout(10000);
      console.log('Sablier, influence ' + gp + ' →', await p.evaluate(() => { const st = window.__hb_sablier.c.st; return st.crushes + ' écrasements, ' + (st.mh || 0) + ' déclenchés par la musique, ' + st.p.n + ' billes'; })); }
    await open('ricochet'); for (const gp of ['0.5', '1.7']) { await setGp('ricochet', gp); await p.click('#view-ricochet [data-a=reset]'); await p.evaluate(() => { if (!HBM.playing) HBM.play(); }); await p.waitForTimeout(6000);
      console.log('Ricochet, influence ' + gp + ' →', await p.evaluate(() => { const st = window.__hb_ricochet.c.st; return st.bounces + ' rebonds en ' + st.t.toFixed(1) + ' s'; })); }
  }
  if (mode === 'flow') {
    await open('fusion'); await load('fusion', 'percussions-120bpm.wav'); await p.click('#view-fusion [data-a=play]'); await p.evaluate(() => { if (!HBM.playing) HBM.play(); }); await p.waitForTimeout(1500);
    console.log('en jeu, musique joue :', await p.evaluate(() => HBM.playing));
    await p.click('#view-fusion [data-a=play]'); console.log('pause du jeu → musique :', await p.evaluate(() => HBM.playing));
    await p.click('#view-fusion [data-a=play]'); console.log('reprise → musique :', await p.evaluate(() => HBM.playing));
    await p.click('#view-fusion [data-home]'); await p.waitForTimeout(300); console.log('retour au menu → musique :', await p.evaluate(() => HBM.playing));
    await open('sablier'); console.log('autre jeu, même morceau chargé :', await p.evaluate(() => !!HBM.curves && document.querySelector('#view-sablier [data-import]').textContent));
    await load('sablier', 'lent-70bpm.wav'); console.log('changement de morceau → tempo', await p.evaluate(() => HBM.curves.tempo + ' BPM, ' + HBM.curves.kicks.length + ' battements'));
    await p.click('#view-sablier [data-opts]'); await p.click('#view-sablier .tab:text("Musique")'); await p.click('#view-sablier [data-clear]');
    console.log('retirer le morceau →', await p.evaluate(() => 'chargé ' + !!HBM.curves + ', joue ' + HBM.playing + ', bouton « ' + document.querySelector('#view-sablier [data-import]').textContent + ' »'));
    await p.click('#view-sablier .sheet-head button:not(.tab)'); await p.click('#view-sablier [data-a=reset]'); await p.waitForTimeout(3000);
    console.log('sans musique, le jeu tourne :', await p.evaluate(() => window.__hb_sablier.c.st.crushes + ' écrasements'));
  }
  console.log('erreurs', JSON.stringify(errs)); await b.close();
})();
