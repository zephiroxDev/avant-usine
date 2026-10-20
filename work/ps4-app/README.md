# Avant l’usine — prototype PS4 natif

V4 (0.1.0-test4 / APP_VER 01.01) : taille de pile explicite de 2 Mo pour les threads du lecteur et buffers de lecture réduits. Correction d'un dépassement potentiel du défaut de 64 Ko identifié dans test3. Le lancement sur la console reste à confirmer ; ce paquet n'est pas annoncé comme validé physiquement. Rapport automatisé de pile : build/stack-validation.json.

Application de test indépendante : graphismes, manette, HTTPS, décodage MP3 et sortie audio natifs. Aucun navigateur, WebView, HTML ou lancement du site. Le catalogue public est inclus comme instantané ; l’audio est récupéré à ses adresses HTTPS existantes. Aucun compte ni identifiant n’est inclus.

Ce premier prototype concerne le catalogue, la lecture et l’import de fichiers locaux depuis USB. Il ne prétend pas contenir toutes les fonctions sociales, l’Atelier ou les sauvegardes des applications mobiles. La musique se charge avant lecture. Une PS4 avec homebrew actif et une connexion Internet sont nécessaires pour le catalogue distant. La compatibilité physique en 13.52 reste à confirmer ; la PS5 n’est pas validée.

Local : Triangle ouvre la bibliothèque ; R1 ouvre /mnt/usb0, L1 /mnt/usb1. Croix ouvre un dossier ou lit un MP3, carré copie le fichier sélectionné dans /data/avant-usine-ps4/local. Rond remonte ou revient à la bibliothèque. Le fichier est copié avec son nom original et ne dépend plus de la clé USB après une copie réussie. Les fichiers associés peuvent être copiés et conservés, mais l’affichage des pochettes, paroles, métadonnées et albums organisés n’est pas encore implémenté dans ce prototype. Aucune suppression de fichiers utilisateur n’est effectuée.

Téléchargement d’albums ZIP : prévu depuis les nouvelles adresses Archive.org fournies par le créateur. Pas encore disponible dans ce prototype ; aucun ancien lien Mega n’est présenté comme un téléchargement direct. Les sauvegardes complètes et toutes les données associées restent des objectifs du portage, non des fonctionnalités déjà validées.

Commandes : haut/bas sélectionnent un morceau, L1/R1 changent de volume, croix lance ou met en pause, gauche/droite déplacent la lecture de dix secondes, carré arrête, Options ouvre les réglages. Dans les réglages, croix active/désactive les indications de la manette ; rond ferme le panneau. Le choix est enregistré dans /data/avant-usine-ps4/settings.ini, sans changer les commandes. Si l’enregistrement échoue, un message le signale. Rond, hors réglages, quitte le prototype.

Ne pas désinstaller d’autres applications pour essayer ce paquet. L’identifiant de ce prototype est ALUS00001. Aucun patch du système ni exploit n’est exécuté par cette application.

Construction : OpenOrbis v0.5.4, sources tierces épinglées dans dependencies.json. La compilation produit un exécutable PS4 armé pour un paquet d’essai, un PKG et leurs empreintes. Les contrôles de compilation ne remplacent pas un essai sur console. Publication du téléchargement sur le site uniquement, sans mise à jour ni annonce dans les autres applications.
