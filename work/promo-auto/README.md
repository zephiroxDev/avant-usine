# Vidéos de patch → TikTok @avant.l.usine

Automatisation serveur du 15 octobre 2026, privée au créateur ; aucune nouvelle
version du site ni des applications. Ne pas la mettre dans les Patch Notes publiques.

## Architecture retenue

- Edge Function Supabase `promo-tiktok`, projet `djjfzymrkncwhrocpxjo`.
- Déclenchement pg_cron toutes les cinq minutes, avec pg_net. Le PC peut être éteint.
- Authentification dédiée par secret aléatoire du planificateur, comparé par digest.
  `verify_jwt=false` est volontaire pour ce jeton non JWT : les requêtes sans ce
  secret sont refusées. Ce n'est pas une fonction accessible librement.
- Clé Buffer chiffrée dans Vault (`au_promo_buffer_key`). Aucun secret dans les sources.
- Catalogue effectivement déployé sur GitHub Pages, vidéos MP4 existantes seulement.
- Envoi automatique immédiat via Buffer (`shareNow`, `automatic`) ; les délais
  de traitement et les indisponibilités éventuelles de TikTok restent possibles.
- Aucun envoi des 14 anciens patchs présents à l'activation ; aucune vidéo de test.
- Gestion promo existante est mise à jour côté base après confirmation `sent`
  avec `sentAt`, sans attendre une nouvelle version de l'interface.
- Notification dans le compte créateur en cas d'échec détecté ; pas d'email envoyé.

## Fiabilité

`au_private.promo_automation` conserve la configuration, l'historique et un verrou
expirant de trois minutes. L'intention est écrite AVANT la publication. Une coupure
laisse un état incertain : recherche du post dans Buffer, aucune relance aveugle.
Une inspection peut donc être nécessaire plutôt que de risquer un doublon.
Maximum deux nouvelles vidéos par passage ; les suivantes attendent.
Les fonctions RPC sont réservées à service_role et contrôlent le rôle signé.
Les états des affiches déjà vues sont conservés. La case Publiée n'est cochée
qu'après confirmation Buffer ; scheduled/sending ne suffisent pas.

## Sources et vérification

- `backend.sql` : table et RPC, appliquées par migration MCP.
- `schedule.sql` : planification, secrets résolus dans Vault lors de l'appel.
- `worker.mjs` : logique commune sans dépendance externe.
- `index.ts` : adaptateur Edge, service_role injecté uniquement côté serveur.
- `worker.test.mjs` : 16 tests de panne, reprise, doublons et destination.
- `check-api.mjs` : vérification Buffer en lecture seule, clé hors dépôt.
- `config.json` : copie de la configuration initiale ; la configuration effective
  est dans la base, ce fichier n'est pas relu par le planificateur.

Tests : `node --test work/promo-auto/worker.test.mjs`.
Inspection : config, last_run, last_error et états des items (jamais les secrets).
Arrêt : `select cron.unschedule('au-promo-tiktok')` et enabled=false dans state.config.
Ne pas effacer le journal, qui évite les doublons.

Le service publie les vidéos produites et ajoutées au catalogue lors d'une livraison.
Il ne crée pas les affiches. Le premier envoi réel de bout en bout sera vérifiable
au prochain patch ; les vérifications actuelles n'ont rien posté sur TikTok.

Documentation : https://developers.buffer.com/reference.html ;
https://supabase.com/docs/guides/functions/schedule-functions ;
https://supabase.com/docs/guides/database/vault.


## Correctif média du 20 octobre 2026

Envoi 20.0.3 confirmé sur TikTok (PS4 0.24 comprise). Buffer rejetait la vidéo depuis GitHub Pages avec InvalidInputError / Video could not be read from its URL. Le service utilise maintenant les URLs publiques du bucket au-promo-media. Avant un premier envoi, media.mjs copie automatiquement depuis GitHub Pages un MP4 dont le nom est strictement contrôlé : 10 Mio maximum, Content-Type vidéo et boîte ftyp, sans transférer de secret à GitHub. L’objet déjà présent est réutilisé et jamais écrasé par ce chemin. Les contrôles de doublons et les reçus demeurent actifs. La case Publiée n’est cochée qu’après sent et sentAt.

Publication confirmée : https://tiktok.com/@avant.l.usine/video/7698859826784390433
