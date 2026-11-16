// Candidature de modérateur (révélée par la phrase cachée du Guide : 7 appuis sur « Mon compte »).
import { h } from '../core/dom.js?v=202611161905';
import { act } from '../core/api.js?v=202611161905';
import { account } from '../core/account.js?v=202611161905';
import { sheet, toast } from './overlay.js?v=202611161905';
import { go } from '../router.js?v=202611161905';

export function openApplication() {
  if (!account()) { toast('Connecte-toi d’abord pour envoyer ta candidature.'); go('/compte'); return; }
  sheet('Devenir modérateur', (body, s) => {
    const letter = h('textarea.input', { minlength: '80', maxlength: '5000', required: true, spellcheck: 'true', style: { minHeight: '200px' } });
    const count = h('p.note', { text: '0 / 80 caractères minimum' });
    letter.addEventListener('input', () => { count.textContent = letter.value.trim().length + ' / 80 caractères minimum'; });
    const send = h('button.btn.btn-main', { type: 'submit', text: 'Envoyer ma candidature' });
    body.append(
      h('p', { text: 'Tu as trouvé la phrase cachée. Pourquoi souhaites-tu devenir modérateur ? Présente tes motivations, ton expérience éventuelle et ce que tu veux apporter à la communauté.' }),
      h('form', { style: { display: 'grid', gap: '12px' }, onsubmit: async (e) => {
        e.preventDefault();
        if (letter.value.trim().length < 80) { toast('Ta lettre doit faire au moins 80 caractères.'); letter.focus(); return; }
        send.disabled = true;
        try { await act('au_social', 'apply', { body: letter.value.trim() }); s.close(); toast('Ta candidature a été envoyée au créateur.'); }
        catch (err) { toast(err.message); send.disabled = false; }
      } }, h('label.field', h('span', { text: 'Ta lettre de motivation' }), letter), count,
        h('p.note', { text: 'Ta candidature sera visible uniquement par le créateur.' }),
        h('div.row-actions', send)));
  });
}
