// Jeton anonyme de la communauté (votes, histoires, explications). Même format et même clé que l'ancien site.
let token = '';
export function visitorToken() {
  if (token) return token;
  let t = '';
  try { t = localStorage.getItem('au-community-visitor') || ''; } catch { /* rien */ }
  if (!/^[a-f0-9]{64}$/.test(t)) {
    t = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem('au-community-visitor', t); } catch { /* rien */ }
  }
  return (token = t);
}
