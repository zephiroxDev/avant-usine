Avant l’usine — PS4 — prototype natif 0.1.0-test4

Correction ciblée d'un défaut de pile des threads : le chargeur de test3 réservait plus de 80 Ko dès son entrée, avant les appels HTTPS/décodage, alors que les attributs par défaut du firmware analysé indiquent 64 Ko. Les threads natifs demandent désormais explicitement 2 Mo ; la taille configurée est vérifiée avant création. Les buffers de lecture locale et HTTPS passent de 64 Ko à 8 Ko. Un échec de création nettoie les threads déjà lancés et ferme la sortie audio.

La compilation mesure les réservations de pile et refuse une fonction du lecteur dépassant 32 Ko. Les tests couvrent aussi les échecs d'attributs, de création et de jonction. Ce correctif traite un défaut confirmé du code ; la disparition du crash au lancement sur la console reste à vérifier. Métadonnées APP_VER/VERSION 01.01 pour distinguer l'installation de la V3, identifiant ALUS00001 conservé. Aucun autre produit n'est mis à jour et aucun fichier Local n'est supprimé.

Historique du test3 :

Nouvel essai après refus de lancement des tests 1 et 2 : ajout au paquet des fichiers de support fournis avec l’exemple officiel OpenOrbis (sce_module/libc.prx, sce_module/libSceFios2.prx et sce_sys/about/right.sprx), omis dans les premiers paquets. Le build vérifie leur présence et leur empreinte, puis les inclut explicitement dans le projet PKG. Métadonnées APP_VER/VERSION alignées sur 01.00 comme l’exemple officiel, même identifiant ALUS00001. Aucun fichier Local n’est supprimé.

Le convertisseur SELF 0.5.2 et les contrôles supplémentaires de l’exécutable sont conservés. Cette version reste expérimentale : le lancement sur PS4 13.52 doit être confirmé par un essai réel. Le précédent changement de convertisseur n’a pas suffi à résoudre le rejet constaté sur cette console.

- Catalogue public de 118 morceaux répartis sur 8 volumes.
- Lecture MP3 native, pause, arrêt et déplacement de dix secondes.
- Navigation à la manette ; indications des touches masquables dans Réglages, choix conservé.
- Bibliothèque Local et copie de fichiers depuis une clé USB vers le stockage de l’application.
- Aucun navigateur Internet ni WebView.

Version expérimentale à essayer sur une PS4 disposant d’un environnement homebrew fonctionnel. La compilation et les tests automatisés ne constituent pas une validation sur une console physique, notamment en 13.50/13.52. Aucune compatibilité PS5 n’est annoncée.

Ce prototype ne reprend pas encore toutes les fonctionnalités du site et des autres applications : comptes, fonctions sociales, paroles, pochettes, sauvegardes complètes et téléchargement/extraction des albums ZIP restent à porter. La lecture distante nécessite Internet et charge le morceau avant lecture. MP3 uniquement, maximum 64 Mo et 12 minutes dans ce prototype.

Installation et commandes : consulter README.md. Ce paquet indépendant utilise l’identifiant ALUS00001 et ne met à jour aucune application Windows, Android ou iPhone.

Sources du prototype : work/ps4-app sur la branche console/ps4-test du dépôt public. Le code lié au moteur graphique OpenOrbis est distribué sous GPL-3.0 ; les mentions de licence des autres dépendances sont conservées dans vendor/.
