# Avant l’usine 26 — état de la refonte (15 novembre 2026)

> **16 novembre 2026 au soir : version 26.0 sortie partout** (site v26, Windows 0.11.0, iPhone/iPad 2.5.0, Android 0.4.0, affiche dans Gestion promo). État détaillé et reste à faire : `PROCHAIN-PATCH-26.1.md`. Prochaine séance (demande d'Iloan) : corriger les derniers bugs, puis passer à autre chose.

Nouveau site PC + mobile reconstruit de zéro dans `depot/v26/` (publication prévue à `…/avant-usine/v26/`, adresse de test). Rien n’est publié ni commité. Les applis iPhone/Windows restent sur l’ancien code (`work/experience-integration`). Android et PS4 restent « en pause ».

Aperçu local : `powershell -File work/refonte-26/serveur-local.ps1` puis http://localhost:8126/v26/ (racine = dossier depot, les pochettes et le catalogue sont partagés avec l’ancien site via `../`).

Décisions : identité A « Nuit de vinyle » (Fraunces + Inter, accent #e5483b, jetons dans `v26/css/app.css`), plan du site validé (`work/refonte-26/plan/index.html`) : onglets Accueil · Volumes · Recherche · Ma musique · Communauté ; compte via avatar ; page par morceau ; Studio pour le créateur.

## Architecture
- `js/main.js` démarrage + routes ; `js/router.js` une seule page vivante (DOM libéré à chaque navigation).
- `js/core/` : `dom.js` (h(), icônes, fr() = espaces insécables fines avant ? ! : ;), `api.js` (Supabase, même clé de session `au-auth-session`), `catalog.js` (au_catalog_read + repli `collection-13v08.js`, ZIP complétés depuis le fichier), `library.js` (format identique : `au-library-v1` / `au-library-user:<id>`, au_account_library_get/save avec révision), `player.js`, `lyrics.js` (au_sync published/source, lignes non chantées retirées, surlignage par courbe ou estimé), `account.js`, `visitor.js` (`au-community-visitor`, 64 hex), `stats.js` (au_stats_record_17v01).
- `js/ui/` : `shell.js` (en-tête, onglets, mini-lecteur, lecteur plein écran Pochette/Paroles/File), `overlay.js` (feuilles, toasts avec Annuler, confirm), `track.js`.

## Fait et vérifié dans le navigateur
Accueil, Volumes, page volume (ZIP, pochette animée), page morceau (Paroles avec passages expliqués, Explications, Commentaires, Infos/date), lecture + paroles synchronisées lettre par lettre (vérifié sur 2:1), recherche sans accents.

## Écrit, pas encore testé
Ma musique (favoris, playlists, suppression avec Annuler), compte (connexion, inscription, mot de passe oublié), Communauté : fil, archives, pépites, Blind Test, membres, messages, chronologie, contribuer (paroles au_lyrics_v12 submit {track, body}, explications au_add_annotation, fichiers au_sync_files_api start/chunk/finish).

## Reste à faire
1. `pages/community/studio.js` ÉCRIT (non testé en vrai) : geste maintenir/glisser, Espace au clavier, voix, vitesse, aperçu, brouillon `au26-studio:*`, envoi au_sync 'submit'. À améliorer : remplacer window.prompt/confirm par de vraies fenêtres du site ; tester un envoi complet avec Iloan (une proposition reste en attente tant qu'elle n'est pas approuvée).
2. Pages provisoires à remplacer : `settings.js` (réglages écoute/affichage/manettes/notifications + profil au_social me/profile_save + sauvegarde backup), `my-year.js` (au_stats_view_17v01, résumés, trophées), `device.js` (Sur cet appareil : import/export local, mediabunny, surlignage estimé obligatoire), `about.js` (Guide avec la phrase cachée de l’easter egg à conserver, Nouveautés, Soutenir Ko-fi, Confidentialité tutoyée, Applications/Téléchargements + Android/PS4 en pause), `notfound.js`.
3. Studio créateur (route `/compte/studio`) : ~20 outils (voir plan, section 4) ; fonctions serveur listées dans la conversation : au_catalog_admin/save, au_audio_audit, au_moderation_v12, au_sync_moderation, au_lyrics_v12 queue/approve, au_maintenance_19, au_activation, au_promo_*, au_site_editor_24, au_test_feedback_25, au_release22…
4. Respect des fermetures (au_maintenance_19 'read').
5. Contrôles automatiques (accents/interligne, signes seuls, textes coupés, chevauchements) en 375/768/1366 px, puis vérification visuelle avec Iloan avant toute publication.

## Retours d'Iloan (16 novembre 2026)
- Corrigé : Blind Test, cocher un volume entier refermait le panneau de sélection.
- Corrigé : pochette légèrement coupée en haut dans le lecteur (écrans peu hauts : pochette à côté du titre).
- Outils créateur de l'ancien site : boutons sans effet ou menant au mauvais endroit. Dans la v26, chaque outil du Studio appelle directement sa fonction serveur. À TESTER bouton par bouton avec Iloan (compte créateur) sur l'adresse de test en ligne avant la bascule.

## Avancement du 16 novembre 2026
Toutes les pages sont construites (plus aucune page provisoire) :
- Compte : profil (avatar/bannière WebP comme l'exige le serveur), réglages (minuteur de sommeil, thème clair/sombre, animations, notifications au_release22 settings/save_settings), sauvegarde (export/restauration JSON + preuve de rôle au_backup_role_18v06), données et suppression (au_moderation_v12 delete_self).
- Mon année : moteur `statistics-engine-17v01.js` et libellés `metrics-17v01.js` de l'ancien site réutilisés tels quels ; rubriques construites à l'ouverture ; résumés et trophées.
- Sur cet appareil : export d'un volume en ZIP via `album-download-21.mjs` (+ local-storage-18v07, local-18v00, audio-edits-19v06).
- À propos : Guide (phrase cachée « Appuie 7 fois sur le bouton Mon compte… » conservée mot pour mot, 7 appuis rapides sur l'avatar → candidature modérateur au_social 'apply'), Nouveautés (histories-17v01.js), Applications (releases GitHub ; versions de test affichées seulement si plus récentes que la version publique), Soutenir, Confidentialité (tutoiement).
- Pied de page commun (réseaux officiels, compteur au_visit_count_22_1 → {total}).
- Studio : tableau de bord « à traiter » + 16 outils (`v26/js/pages/studio/`).
- Paroles pour les visiteurs : au_release22 'lyrics' → catalogue → au_sync 'source' (réservé aux comptes confirmés, message dédié).
- Bandeau de fermeture générale (au_maintenance_19 'read').
- Contrôle automatique `work/refonte-26/qa.js` : 0 défaut sur 25 pages en 375, 768 et 1366 px (titres jamais coupés par « … », nombres collés à leur mot, espaces insécables).

PUBLIÉ le 16 novembre 2026 (commit 6de5490) : l'adresse principale redirige vers /v26/ (anciennes routes et ?share= traduits), ancien site à ancien.html. Demandes pour la suite : work/refonte-26/PROCHAIN-PATCH-26.md.

Reste (ancienne note) : publication sur l'adresse de test /v26/ (feu vert d'Iloan + connexion GitHub par Iloan), puis tests connectés avec Iloan (compte, messages, contributions, Studio bouton par bouton), puis bascule.

## Serveur — 16 novembre 2026
- Migration `fix_release22_campaigns_ambiguous_alias` (accord d'Iloan) : alias `c` → `rc` dans la liste des campagnes de `au_private.release22_api`. Les Campagnes s'affichent de nouveau (aussi dans l'ancien site).
- Studio testé en ligne avec le compte créateur : 16 outils sur 16 s'ouvrent. Aucune action modifiante n'a été lancée pendant le test.
