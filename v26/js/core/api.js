// Accès au serveur Supabase existant (mêmes comptes et mêmes données que l'ancien site).
const CONFIG = {
  url: 'https://djjfzymrkncwhrocpxjo.supabase.co',
  key: 'sb_publishable_hR4vWksXYg3TUofHVQMtLQ_q5JIHXdX',
};
// Même clé de session que l'ancien site : un membre connecté le reste en changeant de version.
const STORAGE_KEY = 'au-auth-session';

let clientPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('script'));
    document.head.append(s);
  });
}

export function client() {
  if (!clientPromise) {
    clientPromise = (async () => {
      if (!window.supabase?.createClient) await loadScript('../supabase-auth-client.js');
      return window.supabase.createClient(CONFIG.url, CONFIG.key, {
        auth: { storageKey: STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
    })();
    clientPromise.catch(() => { clientPromise = null; });
  }
  return clientPromise;
}

/** Message lisible pour une erreur serveur. Les erreurs métier (P0001) sont déjà rédigées en français côté serveur. */
export function friendly(error) {
  if (!error) return 'Une erreur est survenue.';
  if (error.code === 'P0001' && error.message) return error.message;
  if (/fetch|network|Failed/i.test(error.message || '')) return 'Connexion impossible. Vérifie ta connexion internet puis réessaie.';
  return 'Le service n’a pas pu répondre. Réessaie dans un instant.';
}

/** Appel d'une fonction serveur. Lève une Error au message prêt à afficher. */
export async function rpc(name, args) {
  const c = await client();
  const { data, error } = await c.rpc(name, args);
  if (error) { const e = new Error(friendly(error)); e.cause = error; throw e; }
  return data;
}

/** Fonctions à action : rpc('au_sync', 'published', {track}) */
export function act(name, action, p = {}) {
  return rpc(name, { p_action: action, p });
}
