# Publication automatique TikTok — 15 octobre 2026

Autorisation utilisateur : publier automatiquement les vidéos animées des futurs
patchs sur @avant.l.usine. Pas de publication rétroactive ni vidéo de test.
La demande de suspension des patchs applicatifs reste respectée.

## Actif

- Compte Buffer vérifié par API : avant.l.usine, TikTok, connecté, non verrouillé.
- Canal : 6ad0edf5778b240e2f19fa52.
- Edge Function Supabase promo-tiktok, version 1, ACTIVE.
- Cron au-promo-tiktok : toutes les 5 minutes.
- Clé Buffer et jeton cron dans Vault, hors du dépôt/public.
- 14 patchs existants exclus ; aucune publication envoyée pendant la configuration.
- Journal privé au_private.promo_automation ; verrou avant envoi, reprises sans
  relance aveugle, confirmation sent+sentAt avant statut Publiée.
- Statut confirmé synchronisé vers au_promo_status, visible dans Gestion promo.
- Échec détecté : notification au créateur dans au_member_notifications.

## Preuves

- 16 tests Node du worker passent : panne du journal, timeout, récupération après
  timeout, destination, doublons, exclusion, état en attente, média absent.
- API Buffer réelle : canal et 10 posts lus, schéma CreatePostInput vérifié,
  aucune mutation de publication exécutée.
- Tests SQL transactionnels annulés : exclusion concurrente, synchro Publiée,
  notification d'erreur ; aucune donnée de test restante.
- anon et authenticated ne peuvent exécuter le RPC ni lire la table privée.
- Fonction HTTP sans autorisation : 401. Appel autorisé : 200 idle, errors vide.
- Appel via pg_net, comme le planificateur : 200 idle, aucune erreur/timeout.
- Audit sécurité : seul nouveau signal INFO concerne RLS sans policy sur une
  table privée volontairement fermée ; droits anon/authenticated révoqués.

Le premier envoi réel de bout en bout sera vérifié au prochain patch : aucun
post réel n'a été créé pour ce test. Ne pas promettre une publication TikTok
déjà constatée. Le service publie les MP4 déjà produits, sans générer les affiches.

Sources et arrêt/reprise : work/promo-auto/README.md.
Aucune version du site, de Windows, Android ou iPhone n'a été augmentée.
