# PS4 — portage natif de l’interface complète

## Point de départ confirmé

Le 20 octobre 2026, l’utilisateur confirme le démarrage de 0.1.0-test4 sur sa PS4. Cela ne valide pas toutes ses fonctions. Le paquet conservé dans `outputs/ps4/v4` n’est pas remplacé par les travaux ci-dessous.

## Choix retenus

- Application native : aucun navigateur, WebView, moteur HTML ou lancement du site.
- Interface issue de `work/github-sync-import` : vrais titres et pochettes, Inter, palette design-20, accueil, collection, lecteur permanent, puis les autres fonctions réelles.
- Moteur graphique LVGL 9.3.0 sous licence MIT, archive vérifiée par SHA-256 avant extraction. Les aperçus utilisent exactement les mêmes composants C++ que l’application ; ce ne sont pas des maquettes HTML.
- Les deux threads audio conservent la pile native de 2 Mio et les corrections validées du test4.
- Navigation à la manette, avec indication des boutons activable/désactivable à conserver lors du raccordement des réglages.
- Mises à jour : Plus tard, Sauter cette version, Installer. Une confirmation de l’installateur PS4 reste permise. Aucune désinstallation préalable de l’application et aucune suppression des données Local.

## État réel du développement

| Élément | État |
| --- | --- |
| Test4 | Démarrage confirmé par l’utilisateur, paquet préservé |
| Accueil, collection, album, lecteur | Composants C++ compilés ; premières captures natives vérifiées |
| Raccordement au lecteur natif existant | Exécutable de développement lié et converti en SELF ; pas encore testé sur console |
| Navigation à la manette | Adaptateur compilé ; validation physique nécessaire |
| Version suivante, report, version ignorée persistante | Tests ASan/UBSan réussis sur hôte |
| Boîte de choix de mise à jour | Rendu vérifié et test de restauration du focus réussi |
| Recherche HTTPS, téléchargement vérifié, installation PS4 | Cache transactionnel et SHA-256 testés ; client HTTPS écrit, sélection de release et installateur à raccorder |
| Local complet, albums, métadonnées, ZIP et sauvegardes | À porter ; le lecteur Local du prototype ne suffit pas |
| Paroles synchronisées, immersion et Atelier | À porter depuis les vraies données et minutages |
| Compte, rôles, communauté, annotations, commentaires, messages | À porter avec authentification et règles backend réelles |
| Playlists, Blind Test, statistiques, trophées, récapitulatif | À porter ; ne pas simuler leur fonctionnement |
| Publication officielle | Bloquée jusqu’à validation des fonctions promises |

Les builds de développement ne portent pas le marqueur de publication et ne modifient pas les distributions des autres plateformes. L’interface de développement n’est pas encore la première version officielle complète.

## Mise à jour : conditions de livraison

1. Consulter une source PS4 dédiée, exclure les brouillons et préversions de test.
2. Comparer numériquement les versions et respecter le choix ignoré après redémarrage.
3. Téléchargement HTTPS dans un fichier provisoire hors bibliothèque Local ; contrôle de taille, SHA-256 et identité du paquet ALUS00001 avant installation.
4. Garder l’application installée intacte en cas de réseau interrompu ou de paquet invalide.
5. Passer à l’installateur système sans contourner ses confirmations. Tester le cas particulier de la mise à jour de sa propre application en cours d’exécution ; ne jamais le supposer à partir d’un installateur d’autres titres.
6. Vérifier sur console le retour dans l’application et la conservation des musiques, préférences et données.

## Sources et licences

- LVGL 9.3 : https://docs.lvgl.io/9.3/ et https://github.com/lvgl/lvgl/tree/v9.3.0 — licence MIT dans l’archive épinglée.
- Inter : https://github.com/google/fonts/tree/main/ofl/inter — licence OFL jointe dans `ui/assets/Inter-OFL.txt`. Police reçue SHA-256 `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031`.
- Pochettes : conversions PNG des huit fichiers WebP existants du projet, sans remplacement de l’illustration.
- Documentation du système d’installation examinée : OpenOrbis (AppInstUtil/Bgft), flatz/ps4_remote_pkg_installer, apexlions16/OrbisShelf. Aucun code d’installation d’une source tierce incorporé à ce stade.


## Connexion PS4 retenue

L’utilisateur a choisi les deux méthodes : identifiants à la manette et QR code avec le téléphone. Ne pas présenter une simple ouverture du site comme une connexion native. Ne jamais transférer les rôles depuis une déclaration locale ni embarquer de clé service_role. Le choix du QR code autorise sa préparation, pas l’affaiblissement des autorisations du compte.

Le guide Supabase a été consulté, puis son changelog et sa documentation d’authentification. La notice officielle du 12 octobre 2026 annonce le retrait de quatre suites TLS 1.2 CBC à partir du 10 novembre. Tester les suites modernes de la PS4 avant de livrer l’authentification : https://supabase.com/changelog/cbc-tls-ciphers-deprecated . Ne jamais désactiver la validation TLS pour contourner un problème de connexion.

Inventaire statique partiel des RPC réutilisables : backend-port-inventory.json. Cet inventaire ne constitue pas une vérification du schéma en production ; aucune donnée personnelle ni aucun jeton de session n’a été récupéré, aucune modification Supabase effectuée.


Mise � jour du 20 octobre : le fonctionnement demand� du compteur est d�crit pr�cis�ment dans MISES-A-JOUR-PS4.md. Ne pas promettre une fermeture sans �cran d�erreur PS4. Le code ne ferme l�application qu�apr�s acceptation de la t�che d�installation ; aucune faute m�moire volontaire n�est ajout�e.
