## Sources actives — livraison publique du 27 octobre 2026 (22.0)

- Sites PC/mobile22.0 : work/experience-integration. Windows0.8.1 : work/desktop-app. iPhone/iPad2.2.0 build41 : work/experience-ios. Android et PS4 restent en pause.
- Détails et preuves : outputs/release-22/ETAT-22.0.md, live-report.json, dialog-report.json, estimated-report.json et downloads-report.json.
- Main de livraison : b9c014b6c40a99d8d28fef83c5e548d3ff0a55f3. Validation iOS sourcef3c8e2f67e533f1e53635444d0539ab9600b664d run40427617867 ; promotion40430060069 réussie. Windows source0bdda24a34d6ab4d0f34acd34188f8a08edbec7e run40428200049 ; promotion40428624456 réussie.
- Windows0.8.0 a précédé0.8.1, qui nettoie les notes publiques et corrige l’autorisation des notifications de la fenêtre locale. Ne jamais écraser des paquets déjà publics.
- Mails Brevo désactivés en attendant connexion/expéditeur. Notifications locales + mails consentis acceptés par l’utilisateur ; aucun push distant promis pour IPA SideStore fermée. Campagne publique22.0 programmée ; pas de campagne de test conservée.
- TikTok22.0 confirmé publié : https://tiktok.com/@avant.l.usine/video/7701138435133803808. Première affiche envoyée avant nettoyage d’un libellé privé ; affiche corrigée disponible dans Gestion promo. Aucun renvoi en doublon.
- La compilation et les essais simulateur ont réussi ; les artefacts noirs, le chargement audio et le choix d’icône restent à confirmer sur iPhone réel. Ne pas les annoncer comme physiquement testés.
- Les états historiques ci-dessous sont remplacés par cette livraison. Les fichiers source communs sont toujours work/experience-integration, pas les dossiers site générés.

## Sources actives — livraison publique du 26 octobre 2026

- Promo automatique corrigée le 26 octobre : Edge `promo-tiktok` v4 ; 21.0 confirmée publiée https://tiktok.com/@avant.l.usine/video/7701088240643673377. Voir work/promo-auto/README.md. Produire les nouvelles vidéos à 24 ou 30 fps constants, puis contrôler leurs tables MP4 avec video-check.mjs avant publication. Ne jamais renvoyer une soumission incertaine sans réconciliation Buffer.

- Sites PC/mobile 21.0 : work/experience-integration, publiés à la racine GitHub Pages.
- iPhone/iPad 2.1.0 build40 : work/experience-ios ; Windows 0.7.0 réouvert : work/desktop-app. Android et PS4 restent en pause.
- Commit public 7f82e4a2505627ff9175eacd25ae65946c232e09 ; source validée 1d0b5ca0c07fc71f20b001d5efa727e054edfea1.
- Promoteurs iOS 40326994683 et Windows 40326994847 réussis ; Pages 40326994734 réussi. Versions publiques ios-v2.1.0 et v0.7.0.
- Contrôles détaillés dans outputs/release-21/ETAT-21.0.md et live-report.json. Un succès CI ne constitue pas un essai physique sur iPhone.
- Dépendance médiabunny à plat : conserver la compatibilité du validateur de mise à jour des anciennes installations Windows. Ne pas déplacer les modules dans un sous-dossier sans migration du lanceur.
- Gestion promo contient 21.0 (affiche et animation). Publication TikTok non confirmée : contrôle Buffer en échec. Ne pas la déclarer publiée.
- Les instructions historiques de pause Windows ci-dessous sont remplacées par cette réouverture explicitement autorisée.

## Sources actives — livraison publique du 24 octobre 2026

- Les sites PC/mobile 20.0.5.2 utilisent désormais `work/experience-integration`, publié à la racine du dépôt GitHub Pages. Ne pas repartir de l’ancienne interface de `work/github-sync-import` pour une nouvelle modification publique.
- iPhone/iPad 2.0.6 build39 utilise `work/experience-ios` et les mêmes sources web préparées par `scripts/prepare-experience.cjs`, canal stable. Conserver identifiants et données locales.
- Compilation/vérification isolée : branche `ios/experience-beta`, workflow `ios-experience-beta.yml`. Promotion publique sans recompilation : workflow `ios-promote-experience.yml`, métadonnées `work/experience-ios/verified-release.json` et script `scripts/promote-experience.py`.
- Windows/Android/PS4 restent suspendus ; aucune mise à jour ni réactivation implicite.
- L’éditeur privé publie des documents de présentation par destination via RPC `au_site_editor_24`. Il ne compile pas un nouveau moteur natif. Brouillons nommés : enregistrement explicite uniquement.
- État détaillé et preuves : `outputs/creator-editor-beta-4/ETAT-20.0.5.md`. Les dossiers `site` et les aperçus générés ne sont pas la source principale.

# Livraison Avant l’Usine

- Pendant un travail en cours, un nouveau message de l’utilisateur est une précision : y répondre brièvement, intégrer la consigne puis reprendre automatiquement le travail dans le même tour. Ne pas terminer le tour après la seule réponse ; arrêter uniquement sur demande explicite ou blocage réel nécessitant une réponse.

Instruction utilisateur actualisée : les Patch Notes sont indépendantes. Publier chaque plateforme dès qu’elle est prête ; ne pas attendre l’autre plateforme pour publier la première.

- Un petit correctif conserve le numéro du patch actuel et ajoute `.2` pour sa deuxième version (exemple : `18V08.2`), au lieu de passer au numéro de patch suivant. Les versions techniques des applications restent indépendantes.

- Code Web de référence : `work/github-sync-import` ; application Windows : `work/desktop-app`.
- Préparer et tester les modifications communes à partir du même état des sources. Le site peut être publié avant l’application lorsque sa validation est terminée, même si la compilation Windows est encore en cours ou échoue.
- Actualiser les Patch Notes et les notes Windows, ainsi que `work/desktop-app/release.json` et la version du package.
- Le script `work/desktop-app/scripts/release.ps1` prépare les paquets Windows, le paquet Web et leurs empreintes avant publication.
- Annoncer la livraison avant publication. L’utilisateur a autorisé la publication autonome. À partir de la base 0.2.0, les mises à jour des fichiers du produit passent par le manifest GitHub et l’acceptation Installer. Les versions 0.1.x nécessitent une migration initiale ; un changement du moteur Electron est distinct des mises à jour de fichiers.
- Publier tous les fichiers update-assets et le manifest dans la release avant de rendre la version publique. Le bouton du site consulte automatiquement les releases : ne pas remplacer un lien versionné à chaque sortie.
- Publier séparément les distributions dès qu’elles sont prêtes, avec leurs versions et leurs historiques propres.
- À chaque patch, vérifier et actualiser « Infos, fonctionnalités & astuces ». Les ajouts doivent aller dans « Lire le reste », sauf participation explicite à la phrase cachée ; conserver la zone initiale de l’indice et le fonctionnement existant de l’Easter egg.
- Les Patch Notes publiques et les affiches promotionnelles présentent uniquement les fonctionnalités destinées au public, jamais les outils Créateur privés.
- À chaque patch, créer une seule affiche regroupant toutes les notes publiques et les plateformes/versions concernées. Varier sa composition tout en conservant l’identité Avant l’usine. Ajouter son original au catalogue Gestion promo et vérifier sa présence avant publication. Ne pas afficher les nouvelles affiches dans la conversation : prévenir de leur disponibilité dans Gestion promo.
- Les affiches de patch animées doivent montrer immédiatement une animation de lumière franche et perceptible dans l’image ; un léger halo de bordure est insuffisant. Ajouter aussi aux textes un léger mouvement et une variation douce de couleur, en conservant leur netteté et leur lisibilité.

## Plateformes actives — 21 octobre 2026

Instruction prioritaire utilisateur : seuls les sites PC/mobile et iPhone/iPad restent actifs. Windows, Android et PS4 sont en pause, y compris leur utilisation en ligne. Ne pas les compiler, publier ni réactiver sans nouvelle instruction. Les serveurs communs Supabase doivent rester actifs pour les sites et iOS.

Commit de fermeture63bd5b1411c4c87fb8b39846ce92ce6cea650bee ; workflow39612474269 réussi :73releases rendues brouillons sans supprimer les assets,5workflows Windows/Android/PS4 désactivés. Le workflow pause-platforms doit être retiré ou adapté avant toute réouverture.

Migration pause_windows_android_ps4_preserve_web_ios : contrôles DataAPI par origines/agent connus, maintenance explicative. Tests HTTP réels : Windows/Android/PS4 catalogue503, web+iOS200. Cela ne désactive pas un exécutable hors ligne, un accès Archive.org direct ou tous les autres produits Supabase. Ne pas prétendre avoir éteint à distance les applications installées. Les données et comptes sont conservés.

Dynamic Island toujours non validée physiquement : bêta31 encore figée ; essai3/build34 en CI39609681732. Voir ETAT-20.0.4.md. Diagnostics centralisés et dépôt privé Créateur demandés pour un prochain patch des sites+iPhone seulement.
