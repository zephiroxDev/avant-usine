# Livraison 17V02 — 6 octobre 2026

- Site publié : https://zephiroxdev.github.io/avant-usine/
- Commit : f4ebbdf0a0deb7bf6774b2051d9134ca9bce6b03. Pages : run 37464929294, succès.
- Windows 0.3.2 publique et latest confirmé : https://github.com/zephiroxDev/avant-usine/releases/tag/v0.3.2
- Installateur : https://github.com/zephiroxDev/avant-usine/releases/download/v0.3.2/Avant-Usine-Installation-0.3.2.exe
- Run Windows 37464930923 terminé avec succès ; 45 assets vérifiés par taille et SHA256 avant publication.

## Changements

Immersion : le point d’entrée affiche exactement « Le mode immersion est temporairement indisponible le temps de sa réparation. ». Aucun nouveau correctif appliqué au mode existant ; code conservé pour sa réparation future.

Blind Test : quatre choix distincts tirés du catalogue disponible, un seul correct, ordre aléatoire, pochettes animées via le moteur existant et titres. Choix révélés après l’extrait ; chronomètre à la révélation ; réécoute sans remise à zéro. Correction immédiate et statistiques conservées, double clic ignoré. Quatre colonnes PC, deux mobile. Moins de quatre morceaux disponibles : message explicite, aucune fausse réponse dupliquée.

Voile animé : seulement sur les éléments dont le style calculé montre un cadre ou un fond visible ; liens et textes seuls sans voile. Effet et options de réduction des animations conservés.

Niveaux : marquage des nouvelles commandes réservées et masquage renforcé en Niveau 1 Public, dont Espace modérateur, outils créateur, espace équipe et permissions. Les droits serveur restent inchangés.

Patch Notes séparées Web PC, mobile et Windows 0.3.2 ; guide complété dans Lire le reste, mots de l’indice et fonctionnement de l’Easter egg conservés. Publieur Windows désormais indépendant du numéro de patch pour le paquet Web et les notes.

## Validation

Tests des 276 mesures et catégories existantes, isolation des comptes, choix QCM uniques, chronomètre après extrait, réécoute, bonnes/mauvaises réponses, double clic, records et progression : succès. Onze tests Windows : succès local et compilation GitHub.

Navigateur : message d’immersion réel confirmé ; partie réelle à un morceau terminée avec quatre propositions, bonne réponse et bilan. Fixture utilisant le vrai contrôleur de niveaux et les styles : le niveau Public masque les outils réservés et conserve les actions publiques. Fixture utilisant le vrai module QCM et les styles : quatre cartes lisibles PC et 390×844, pochettes locales animées, aucun débordement horizontal ni erreur JavaScript de la fixture.

La fixture visuelle utilise un audio synthétique court et des titres de test ; elle ne constitue pas une vérification mobile complète d’un compte connecté. Les erreurs sandbox des intégrations tierces Genius observées sur la page réelle préexistaient au patch ; aucune modification de leur sandbox.

Preuve visuelle : outputs/qcm-17v02-mobile.png. Fixtures temporaires supprimées et serveur local arrêté. Ne pas relancer implement-17v02.py ou test-17v02-prep.py : transformations ponctuelles non idempotentes.
