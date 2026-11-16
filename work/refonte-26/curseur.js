// Curseur rose « Claude » visible dans l'aperçu : suit la souris et marque chaque clic.
// Injection : fetch('/work/refonte-26/curseur.js').then(r=>r.text()).then(eval)
(() => {
  if (window.__claudeCursor) return;
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transition:transform .35s cubic-bezier(.2,.7,.3,1);transform:translate(-100px,-100px)';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#ff4fa3" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>'
    + '<span style="position:absolute;left:20px;top:20px;background:#ff4fa3;color:#fff;font:600 12px/1 system-ui;padding:4px 7px;border-radius:999px;white-space:nowrap">Claude</span>';
  document.documentElement.append(c);
  const move = (x, y) => { c.style.transform = `translate(${x - 3}px,${y - 2}px)`; };
  addEventListener('mousemove', (e) => move(e.clientX, e.clientY), true);
  addEventListener('pointerdown', (e) => {
    move(e.clientX, e.clientY);
    const r = document.createElement('div');
    r.style.cssText = `position:fixed;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border-radius:50%;border:3px solid #ff4fa3;z-index:2147483646;pointer-events:none;transition:transform .5s,opacity .5s`;
    document.documentElement.append(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 600);
  }, true);
  window.__claudeCursor = { move };
})();
