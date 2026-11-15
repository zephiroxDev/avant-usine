// Contrôle visuel automatique de la v26 (à injecter dans la page : fetch + eval, ou import()).
// window.QA26.run(routes) → { route: [problèmes…] }
(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const det = e.closest('details:not([open])'); if (det && !e.closest('summary')) return false; for (let p = e; p && p !== document.documentElement; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
  const isSr = (e) => !!e.closest('.sr,.sr-only,[aria-hidden=true] .sr');
  const root = () => document.querySelector('.sheet.open .sheet-body') || document.querySelector('.player.open') || document.getElementById('app');
  function scan() {
    const out = [];
    const fixedLayer = (e) => !!e.closest('.top,.mini,.tabs,.toast');
    const leaves = [...root().querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent.trim().length > 1 && vis(e) && !isSr(e) && !e.closest('#claude-cursor'));
    // 1. Textes coupés (hors ellipses voulues sur titres de lignes).
    for (const e of leaves) {
      const cs = getComputedStyle(e);
      const ellipsis = cs.textOverflow === 'ellipsis';
      if (!ellipsis && ((e.scrollWidth > e.clientWidth + 1 && cs.overflowX !== 'visible') || (e.scrollHeight > e.clientHeight + 2 && cs.overflowY === 'hidden' && e.clientHeight > 0))) out.push('COUPÉ « ' + e.textContent.trim().slice(0, 40) + ' »');
      if (ellipsis && e.scrollWidth > e.clientWidth + 1) out.push('TRONQUÉ (…) « ' + e.textContent.trim().slice(0, 40) + ' »');
    }
    // 2. Chevauchements de texte.
    const boxes = [];
    for (const e of leaves) { const rg = document.createRange(); rg.selectNodeContents(e); for (const r of rg.getClientRects()) if (r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight) boxes.push({ e, r }); }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]; if (a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e) || fixedLayer(a.e) !== fixedLayer(b.e)) continue;
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox > 2 && oy > 2) out.push('CHEVAUCHE « ' + a.e.textContent.trim().slice(0, 25) + ' » / « ' + b.e.textContent.trim().slice(0, 25) + ' »');
    }
    // 3. Mot ou signe seul sur la dernière ligne.
    for (const e of [...root().querySelectorAll('h1,h2,h3,p,button,a,li,dd,dt,span,small,label,summary,strong')].filter((x) => vis(x) && !isSr(x) && x.textContent.trim().length > 2)) {
      if ([...e.children].some((c) => /^(P|DIV|LI|H\d|UL|OL|SECTION|INPUT)$/.test(c.tagName)) || e.closest('.top,.mini,.tabs')) continue;
      const rg = document.createRange(); rg.selectNodeContents(e);
      const lines = {}; for (const r of rg.getClientRects()) { if (r.width < 0.5) continue; const k = Math.round(r.top / 4); lines[k] = lines[k] || { l: r.left, r: r.right }; lines[k].l = Math.min(lines[k].l, r.left); lines[k].r = Math.max(lines[k].r, r.right); }
      const ks = Object.keys(lines).map(Number).sort((a, b) => a - b); if (ks.length < 2) continue;
      const last = lines[ks.at(-1)]; const fs = parseFloat(getComputedStyle(e).fontSize);
      if (last.r - last.l < fs * 1.6) out.push('SEUL SUR SA LIGNE « …' + e.textContent.trim().replace(/\s+/g, ' ').slice(-24) + ' »');
    }
    // 4. Interligne des grands titres accentués.
    for (const e of root().querySelectorAll('h1,h2')) { if (!vis(e)) continue; const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize); const lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight); if (fs >= 30 && lh / fs < 1.08 && /[ÀÂÉÈÊËÎÏÔÙÛÜÇàâéèêëîïôùûüç]/.test(e.textContent)) out.push('INTERLIGNE ' + (lh / fs).toFixed(2) + ' « ' + e.textContent.trim().slice(0, 30) + ' »'); }
    // 5. Espaces normales devant ? ! : ; »
    const w = document.createTreeWalker(root(), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (/ [?!:;»]|« /.test(n.nodeValue) && n.parentElement && vis(n.parentElement)) out.push('ESPACE « ' + n.nodeValue.trim().slice(0, 40) + ' »'); }
    // 6. Débordement horizontal de la page.
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('PAGE PLUS LARGE QUE L’ÉCRAN (' + document.documentElement.scrollWidth + ' px)');
    return out;
  }
  async function run(routes, wait = 1500) {
    const res = {};
    for (const r of routes) {
      location.hash = '#' + r;
      await new Promise((x) => setTimeout(x, wait));
      const found = [];
      const H = document.documentElement.scrollHeight;
      for (let y = 0; y < Math.min(H, 6000); y += Math.round(innerHeight * 0.8)) { scrollTo(0, y); await new Promise((x) => setTimeout(x, 80)); found.push(...scan()); }
      scrollTo(0, 0);
      res[r] = [...new Set(found)];
    }
    return res;
  }
  window.QA26 = { scan, run };
})();
