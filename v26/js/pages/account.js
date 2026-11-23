import { h, icon } from '../core/dom.js?v=202611231900';
import { on } from '../core/bus.js?v=202611231900';
import * as acc from '../core/account.js?v=202611231900';
import { toast, confirm } from '../ui/overlay.js?v=202611231900';
import { go } from '../router.js?v=202611231900';

export default function accountPage(page, { section }) {
  if (section) return import('./settings.js?v=202611231900').then((m) => m.default(page, section));
  const body = h('div.wrap');
  page.append(body);
  paint();
  const offs = [on('account', paint), on('password-recovery', () => paintRecovery())];
  return () => offs.forEach((f) => f());

  function paint() {
    const me = acc.account();
    document.title = (me ? 'Mon compte' : 'Se connecter') + ' · Avant l’usine';
    if (!acc.isReady()) { body.replaceChildren(h('div.loading', h('div.spin', { role: 'status', 'aria-label': 'Chargement' }))); return; }
    if (!me) return paintSignIn();
    const roles = [me.roles.creator && 'Créateur', me.roles.moderator && 'Modérateur', me.roles.supporter && !me.roles.creator && 'Soutien'].filter(Boolean);
    body.replaceChildren(
      h('header.page-head',
        h('h1.title', { text: 'Mon compte' }),
        h('p.lede', { text: 'Connecté en tant que ' + me.name + '.' }),
        roles.length ? h('p', roles.map((r) => h('span.badge.badge-accent', { style: { marginRight: '6px' }, text: r }))) : null,
        me.confirmed ? null : h('p.note', { style: { color: 'var(--warn)' }, text: 'Confirme ton adresse e-mail grâce au lien reçu pour accéder aux fonctions de la communauté.' })),
      h('div.tiles',
        link('Profil', 'Pseudo, avatar, bannière et présentation.', '/compte/profil'),
        link('Réglages', 'Écoute, affichage, manettes et notifications.', '/compte/reglages'),
        link('Sauvegarde', 'Exporter ou restaurer tes favoris et tes playlists.', '/compte/sauvegarde'),
        link('Applications', 'Avant l’usine sur iPhone, iPad et Windows.', '/a-propos/applications'),
        me.roles.creator || me.roles.moderator ? link('Studio', 'Outils du créateur et de la modération.', '/compte/studio') : null),
      h('div.row-actions', { style: { marginTop: '32px' } },
        h('button.btn.btn-line', { type: 'button', onclick: async () => { try { await acc.signOut(); toast('Tu es déconnecté.'); } catch (e) { toast(e.message); } } }, h('span', { text: 'Se déconnecter' })),
        h('a.btn.btn-line', { href: '#/compte/confidentialite', text: 'Données et suppression du compte' })));
  }

  function link(title, text, to) {
    return h('a.tile', { href: '#' + to }, h('h3', { text: title }), h('p', { text }));
  }

  function paintSignIn(mode = 'in') {
    const email = h('input.input', { type: 'email', autocomplete: 'email', inputmode: 'email', spellcheck: 'false', required: true });
    const pass = h('input.input', { type: 'password', autocomplete: mode === 'up' ? 'new-password' : 'current-password', minlength: '8', required: mode !== 'reset' });
    const msg = h('p.note', { role: 'status', 'aria-live': 'polite' });
    const submit = h('button.btn.btn-main', { type: 'submit', text: mode === 'up' ? 'Créer mon compte' : mode === 'reset' ? 'Recevoir le lien' : 'Se connecter' });
    const form = h('form', { style: { display: 'grid', gap: '16px', maxWidth: '420px' }, onsubmit: async (e) => {
      e.preventDefault();
      submit.disabled = true; msg.textContent = '';
      try {
        if (mode === 'in') { await acc.signIn(email.value.trim(), pass.value); toast('Bon retour parmi nous.'); }
        else if (mode === 'up') { await acc.signUp(email.value.trim(), pass.value); msg.textContent = 'Compte créé. Ouvre le lien reçu par e-mail pour le confirmer.'; }
        else { await acc.resetPassword(email.value.trim()); msg.textContent = 'Si un compte existe avec cette adresse, un lien de réinitialisation vient d’être envoyé.'; }
      } catch (err) { msg.textContent = err.message; msg.style.color = 'var(--danger)'; }
      submit.disabled = false;
    } },
      h('label.field', h('span', { text: 'Adresse e-mail' }), email),
      mode === 'reset' ? null : h('label.field', h('span', { text: 'Mot de passe' }), pass),
      h('div.row-actions', submit),
      msg);
    body.replaceChildren(
      h('header.page-head',
        h('h1.title', { text: mode === 'up' ? 'Créer un compte' : mode === 'reset' ? 'Mot de passe oublié' : 'Se connecter' }),
        h('p.lede', { text: mode === 'reset' ? 'Indique ton adresse : tu recevras un lien pour choisir un nouveau mot de passe.' : 'Retrouve tes favoris et tes playlists sur tous tes appareils, et participe à la communauté. L’écoute reste libre sans compte.' })),
      form,
      h('div.row-actions', { style: { marginTop: '24px' } },
        mode !== 'in' ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'J’ai déjà un compte', onclick: () => paintSignIn('in') }) : null,
        mode !== 'up' ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Créer un compte', onclick: () => paintSignIn('up') }) : null,
        mode !== 'reset' ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Mot de passe oublié', onclick: () => paintSignIn('reset') }) : null),
      h('p.note', { style: { marginTop: '24px' } }, 'Ton adresse e-mail reste privée. ', h('a', { href: '#/a-propos/confidentialite', style: { textDecoration: 'underline' }, text: 'Confidentialité' })));
  }

  function paintRecovery() {
    const pass = h('input.input', { type: 'password', autocomplete: 'new-password', minlength: '8', required: true });
    body.replaceChildren(h('header.page-head', h('h1.title', { text: 'Nouveau mot de passe' })),
      h('form', { style: { display: 'grid', gap: '16px', maxWidth: '420px' }, onsubmit: async (e) => { e.preventDefault(); try { await acc.updatePassword(pass.value); toast('Mot de passe modifié.'); paint(); } catch (err) { toast(err.message); } } },
        h('label.field', h('span', { text: 'Choisis un mot de passe (8 caractères minimum)' }), pass),
        h('div.row-actions', h('button.btn.btn-main', { type: 'submit', text: 'Enregistrer' }))));
  }
}
