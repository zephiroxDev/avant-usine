// Fabrication d'éléments + typographie française appliquée à tout texte affiché.
const NNBSP = ' ';

/** Espaces insécables fines avant ? ! ; : » et après «, pour qu'aucun signe ne se retrouve seul en début de ligne. */
export function fr(text) {
  return String(text ?? '')
    .replace(/[  ]+([?!;:»])/g, NNBSP + '$1')
    .replace(/«[  ]+/g, '«' + NNBSP)
    .replace(/(\d) (?=\d{3}\b)/g, '$1' + NNBSP)
    // Un nombre reste collé à son mot : « 118 morceaux », « 5 secondes », « piste 2 ».
    .replace(/(\d) (?=[a-zàâçéèêëîïôûùüÿœ])/g, '$1 ')
    .replace(/\b(piste|Volume|Vol\.|volume|Build|build|niveau) (?=\d)/g, '$1 ');
}

/** h('div.classe#id', {attr}, enfants…) */
export function h(spec, props, ...kids) {
  if (props == null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    if (props != null) kids.unshift(props);
    props = {};
  }
  const [, tag = 'div', rest = ''] = /^([a-z0-9-]*)(.*)$/i.exec(spec);
  const el = document.createElement(tag || 'div');
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'text') el.textContent = fr(v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(fr(kid)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const P = {
  play: '<path d="M8 5.6v12.8a.8.8 0 0 0 1.2.7l10.3-6.4a.8.8 0 0 0 0-1.4L9.2 4.9A.8.8 0 0 0 8 5.6z" fill="currentColor"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
  prev: '<path d="M7 6v12M19 6.8v10.4a.8.8 0 0 1-1.2.7L10 13a1.2 1.2 0 0 1 0-2l7.8-4.9a.8.8 0 0 1 1.2.7z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  next: '<path d="M17 6v12M5 6.8v10.4a.8.8 0 0 0 1.2.7L14 13a1.2 1.2 0 0 0 0-2L6.2 6.1A.8.8 0 0 0 5 6.8z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  search: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  close: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  down: '<path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  back: '<path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  heartFill: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  share: '<path d="M12 15V4m0 0L8 8m4-4 4 4M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  disc: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>',
  library: '<path d="M5 4v16M10 4v16M14.5 5l4.5 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  people: '<circle cx="9" cy="9" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 20c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2M16 5.6a3 3 0 0 1 0 6M17.6 15c1.9.6 3 2.2 3.4 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  user: '<circle cx="12" cy="8.5" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20.5c1-4 4.2-6 8-6s7 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  lyrics: '<path d="M4 6h16M4 11h16M4 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  queue: '<path d="M4 6h12M4 11h12M4 16h7M17 14v6l4-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  cover: '<rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
  shuffle: '<path d="M4 7h3.5c2 0 3 1 4.5 3.5l1 1.5c1.5 2.5 2.5 3.5 4.5 3.5H20M17 4l3 3-3 3M4 17h3.5c1.3 0 2.2-.4 3-1.2M17 14l3 3-3 3M13.5 8.2c.8-.8 1.7-1.2 3-1.2H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  repeat: '<path d="M5 11V9a2 2 0 0 1 2-2h11m-3-3 3 3-3 3M19 13v2a2 2 0 0 1-2 2H6m3 3-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  more: '<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  up: '<path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
};

export function icon(name, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  s.innerHTML = P[name] || '';
  return s;
}

export function clock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function plural(n, one, many) {
  return n + ' ' + (n > 1 ? many : one);
}
