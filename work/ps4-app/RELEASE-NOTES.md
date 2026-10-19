Avant l’usine — PS4 — prototype natif 0.1.0-test1

- Catalogue public de 118 morceaux répartis sur 8 volumes.
- Lecture MP3 native, pause, arrêt et déplacement de dix secondes.
- Navigation à la manette ; indications des touches masquables dans Réglages, choix conservé.
- Bibliothèque Local et copie de fichiers depuis une clé USB vers le stockage de l’application.
- Aucun navigateur Internet ni WebView.

Version expérimentale à essayer sur une PS4 disposant d’un environnement homebrew fonctionnel. La compilation et les tests automatisés ne constituent pas une validation sur une console physique, notamment en 13.50/13.52. Aucune compatibilité PS5 n’est annoncée.

Ce prototype ne reprend pas encore toutes les fonctionnalités du site et des autres applications : comptes, fonctions sociales, paroles, pochettes, sauvegardes complètes et téléchargement/extraction des albums ZIP restent à porter. La lecture distante nécessite Internet et charge le morceau avant lecture. MP3 uniquement, maximum 64 Mo et 12 minutes dans ce prototype.

Installation et commandes : consulter README.md. Ce paquet indépendant utilise l’identifiant ALUS00001 et ne met à jour aucune application Windows, Android ou iPhone.

Sources du prototype : work/ps4-app sur la branche console/ps4-test du dépôt public. Le code lié au moteur graphique OpenOrbis est distribué sous GPL-3.0 ; les mentions de licence des autres dépendances sont conservées dans vendor/.
