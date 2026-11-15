// Fenêtres (feuilles) et messages courts. Une seule feuille ouverte à la fois, fermée par Échap, le fond ou ✕.
import { h, icon } from '../core/dom.js?v=202611152246';

let toastEl = null;
let toastTimer = 0;

/** Message court ; `action` = { label, run } pour proposer « Annuler ». */
export function toast(message, action) {
  if (!toastEl) { toastEl = h('div.toast', { role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
  toastEl.replaceChildren(h('span', { text: message }));
  if (action) toastEl.append(h('button', { type: 'button', text: action.label, onclick: () => { action.run(); hideToast(); } }));
  toastEl.style.pointerEvents = action ? 'auto' : 'none';
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 6000 : 3200);
}
function hideToast() { toastEl?.classList.remove('show'); }

let openSheet = null;

/** Ouvre une feuille. Retourne { body, close }. `onClose` est appelé une fois. */
export function sheet(title, build, { onClose } = {}) {
  openSheet?.close();
  const heading = h('h2', { id: 'sheet-title', text: title });
  const body = h('div.sheet-body');
  const card = h('div.sheet-card', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
    h('div.sheet-head', heading, h('button.icon-btn', { type: 'button', 'aria-label': 'Fermer', onclick: () => api.close() }, icon('close'))),
    body);
  const root = h('div.sheet', { onclick: (e) => { if (e.target === root) api.close(); } }, card);
  const previous = document.activeElement;
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); api.close(); } };
  const api = {
    body, title: heading,
    close() {
      if (openSheet !== api) return;
      openSheet = null;
      root.classList.remove('open');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => root.remove(), 220);
      previous?.focus?.({ preventScroll: true });
      onClose?.();
    },
  };
  openSheet = api;
  document.body.append(root);
  document.addEventListener('keydown', onKey, true);
  build?.(body, api);
  requestAnimationFrame(() => { root.classList.add('open'); (body.querySelector('input,textarea,select') || card.querySelector('button'))?.focus({ preventScroll: true }); });
  return api;
}

export const closeSheet = () => openSheet?.close();

/** Confirmation explicite pour les actions définitives. */
export function confirm(title, message, { ok = 'Confirmer', danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    sheet(title, (body, s) => {
      body.append(h('p', { text: message }), h('div.row-actions',
        h('button.btn' + (danger ? '.btn-danger' : '.btn-main'), { type: 'button', text: ok, onclick: () => { answered = true; resolve(true); s.close(); } }),
        h('button.btn.btn-line', { type: 'button', text: 'Annuler', onclick: () => s.close() })));
    }, { onClose: () => { if (!answered) resolve(false); } });
  });
}
