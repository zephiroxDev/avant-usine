// Compte membre : session Supabase partagée avec l'ancien site, rôles, bibliothèque.
import { client, rpc, friendly } from './api.js?v=202611231930';
import { emit } from './bus.js?v=202611231930';
import * as lib from './library.js?v=202611231930';

let me = null;          // { id, email, name, avatar, confirmed, roles:{creator,moderator,supporter} }
let ready = false;

export const account = () => me;
export const isReady = () => ready;
export const can = (role) => !!me?.roles?.[role];

async function adopt(session) {
  const u = session?.user || null;
  if (!u) {
    me = null; lib.loadGuest(); emit('account'); return;
  }
  if (me?.id === u.id) return;
  me = {
    id: u.id,
    email: u.email || '',
    name: u.user_metadata?.nickname || u.user_metadata?.name || (u.email || '').split('@')[0],
    avatar: '',
    confirmed: !!u.email_confirmed_at,
    roles: {},
  };
  emit('account');
  lib.useAccount(u.id);
  try { me.roles = (await rpc('au_account_access')) || {}; emit('account'); } catch { /* rôles indisponibles */ }
  // Pseudo et avatar du profil public (plutôt que le début de l'adresse e-mail).
  try {
    const p = await rpc('au_social', { p_action: 'me', p: {} });
    if (me?.id === u.id && p) { me.name = p.nickname || me.name; me.avatar = p.avatar || ''; emit('account'); }
  } catch { /* profil indisponible */ }
}

export async function initAccount() {
  lib.loadGuest();
  try {
    const c = await client();
    c.auth.onAuthStateChange((event, session) => { setTimeout(() => { adopt(session); if (event === 'PASSWORD_RECOVERY') emit('password-recovery'); }, 0); });
    const { data } = await c.auth.getSession();
    await adopt(data.session);
  } catch { /* service de compte indisponible : l'écoute reste possible */ }
  ready = true;
  emit('account');
}

async function auth(fn) {
  const c = await client();
  const { data, error } = await fn(c.auth);
  if (error) {
    const m = error.message || '';
    if (/invalid login/i.test(m)) throw new Error('Adresse e-mail ou mot de passe incorrect.');
    if (/email not confirmed/i.test(m)) throw new Error('Confirme d’abord ton adresse e-mail grâce au lien reçu.');
    if (/already registered|already exists/i.test(m)) throw new Error('Un compte existe déjà avec cette adresse.');
    if (/password.*(6|short|weak)/i.test(m)) throw new Error('Choisis un mot de passe d’au moins 8 caractères.');
    if (/rate|too many/i.test(m)) throw new Error('Trop de tentatives. Patiente quelques minutes.');
    throw new Error(friendly(error));
  }
  return data;
}

const back = () => location.href.split('#')[0] + '#/compte';
export const signIn = (email, password) => auth((a) => a.signInWithPassword({ email, password }));
export const signUp = (email, password) => auth((a) => a.signUp({ email, password, options: { emailRedirectTo: back() } }));
export const resetPassword = (email) => auth((a) => a.resetPasswordForEmail(email, { redirectTo: back() }));
export const updatePassword = (password) => auth((a) => a.updateUser({ password }));
export const signOut = () => auth((a) => a.signOut());
