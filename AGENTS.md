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

