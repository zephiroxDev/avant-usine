// Petit système d'événements partagé entre les modules.
const target = new EventTarget();
export const on = (type, fn) => { target.addEventListener(type, fn); return () => target.removeEventListener(type, fn); };
export const emit = (type, detail) => target.dispatchEvent(new CustomEvent(type, { detail }));

/** Stockage local sans jamais planter (navigation privée, quota plein…). */
export const store = {
  get(key, fallback = null) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
  del(key) { try { localStorage.removeItem(key); } catch { /* rien */ } },
};
