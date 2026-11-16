// Publications anonymes de la communauté : histoires (story), recherches d'archives (wanted) et réponses (contribution).
import { h } from '../../core/dom.js?v=202611161845';
import { rpc } from '../../core/api.js?v=202611161845';
import { visitorToken } from '../../core/visitor.js?v=202611161845';
import { account } from '../../core/account.js?v=202611161845';
import * as cat from '../../core/catalog.js?v=202611161845';
import { sheet, toast, confirm } from '../../ui/overlay.js?v=202611161845';

const dateFr = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };

export function postCard(p, { onReply, onDelete } = {}) {
  const t = p.track_key ? cat.track(p.track_key) : null;
  return h('article.tile', { style: { gap: '10px' } },
    t ? h('a.eyebrow', { href: '#/morceau/' + t.key, text: t.title }) : null,
    h('h3', { text: p.title }),
    h('p', { style: { color: 'var(--ink)', whiteSpace: 'pre-line' }, text: p.body }),
    p.source_url ? h('p', h('a', { href: p.source_url, target: '_blank', rel: 'noopener noreferrer nofollow', style: { color: 'var(--accent)', textDecoration: 'underline', overflowWrap: 'anywhere' }, text: 'Voir la source' })) : null,
    h('p.note', { text: (p.author_name || 'Anonyme') + ' · ' + dateFr(p.created_at) }),
    (onReply || (p.mine && onDelete)) ? h('div.row-actions',
      onReply ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'J’ai une piste', onclick: () => onReply(p) }) : null,
      p.mine && onDelete ? h('button.btn.btn-soft.btn-sm', { type: 'button', text: 'Supprimer', onclick: () => onDelete(p) }) : null) : null);
}

export async function listPosts(kind, offset = 0) {
  return rpc('au_discovery_posts_list', { p_kind: kind, p_token: visitorToken(), p_offset: offset });
}

export async function deletePost(p, after) {
  if (!(await confirm('Supprimer cette publication ?', 'Elle disparaîtra pour tout le monde. Cette action est définitive.', { ok: 'Supprimer', danger: true }))) return;
  try { await rpc('au_discovery_post_delete', { p_token: visitorToken(), p_post_id: p.id }); toast('Publication supprimée.'); after?.(); }
  catch (e) { toast(e.message); }
}

/** Formulaire de publication. kind : story | wanted | contribution | report */
export function composer({ kind, title, parent = null, after, withTrack = true, withSource = false }) {
  sheet(title, (body, s) => {
    const pseudo = h('input.input', { maxlength: '24', autocomplete: 'nickname', spellcheck: 'false', value: account()?.name || '' });
    const subject = h('input.input', { maxlength: '120', spellcheck: 'true' });
    const text = h('textarea.input', { maxlength: '2000', spellcheck: 'true' });
    const source = h('input.input', { type: 'url', inputmode: 'url', placeholder: 'https://…', spellcheck: 'false' });
    const trackSel = h('select.input', h('option', { value: '', text: 'Aucun morceau en particulier' }),
      cat.available().map((v) => h('optgroup', { label: v.label }, v.tracks.map((t) => h('option', { value: t.key, text: t.title })))));
    const msg = h('p.note', { role: 'status' });
    const send = h('button.btn.btn-main', { type: 'submit', text: 'Publier' });
    body.append(h('form', { style: { display: 'grid', gap: '14px' }, onsubmit: async (e) => {
      e.preventDefault();
      send.disabled = true; msg.textContent = '';
      try {
        await rpc('au_discovery_post_add', { p_token: visitorToken(), p_kind: kind, p_track_key: trackSel.value || null, p_parent_id: parent, p_title: subject.value.trim(), p_body: text.value.trim(), p_author_name: pseudo.value.trim(), p_source_url: source.value.trim() });
        s.close(); toast('Merci, c’est publié.'); after?.();
      } catch (err) { msg.textContent = err.message; msg.style.color = 'var(--danger)'; send.disabled = false; }
    } },
      h('label.field', h('span', { text: 'Pseudo (2 à 24 caractères)' }), pseudo),
      withTrack ? h('label.field', h('span', { text: 'Morceau concerné' }), trackSel) : null,
      h('label.field', h('span', { text: 'Titre' }), subject),
      h('label.field', h('span', { text: 'Ton texte (10 à 2 000 caractères)' }), text),
      withSource ? h('label.field', h('span', { text: 'Lien vers une source (facultatif)' }), source) : null,
      h('p.note', { text: 'Pas de données personnelles, pas de liens de téléchargement illégal. Les publications peuvent être modérées.' }),
      h('div.row-actions', send), msg));
  });
}
