# Avant l’usine — prototype PS4 natif

Application de test indépendante : graphismes, manette, HTTPS, décodage MP3 et sortie audio natifs. Aucun navigateur, WebView, HTML ou lancement du site. Le catalogue public est inclus comme instantané ; l’audio est récupéré à ses adresses HTTPS existantes. Aucun compte ni identifiant n’est inclus.

Ce premier prototype concerne le catalogue et la lecture. Il ne prétend pas contenir toutes les fonctions sociales, l’Atelier ou les sauvegardes des applications mobiles. La musique se charge avant lecture. Une PS4 avec homebrew actif et une connexion Internet sont nécessaires. La compatibilité physique en 13.52 reste à confirmer ; la PS5 n’est pas validée.

Commandes : haut/bas sélectionnent un morceau, L1/R1 changent de volume, croix lance ou met en pause, gauche/droite déplacent la lecture de dix secondes, carré arrête, Options ouvre les réglages. Dans les réglages, croix active/désactive les indications de la manette ; rond ferme le panneau. Le choix est enregistré dans /data/avant-usine-ps4/settings.ini, sans changer les commandes. Si l’enregistrement échoue, un message le signale. Rond, hors réglages, quitte le prototype.

Ne pas désinstaller d’autres applications pour essayer ce paquet. L’identifiant de ce prototype est ALUS00001. Aucun patch du système ni exploit n’est exécuté par cette application.

Construction : OpenOrbis v0.5.4, sources tierces épinglées dans dependencies.json. La compilation produit un exécutable PS4 armé pour un paquet d’essai, un PKG et leurs empreintes. Les contrôles de compilation ne remplacent pas un essai sur console. Publication du téléchargement sur le site uniquement, sans mise à jour ni annonce dans les autres applications.
