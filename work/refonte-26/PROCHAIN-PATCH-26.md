# Prochain patch de la v26 — demandes d'Iloan

## Musiques importées sur le site (« Sur cet appareil »)
Décision du 16 novembre 2026. Permettre l'import de ses propres musiques sur le site (stockage du navigateur, demande de protection `navigator.storage.persist()`, paroles avec le surlignage estimé), avec un message clair selon l'appareil :

- **Site sur ordinateur** : message invitant à installer l'application Windows, sinon les musiques importées risquent de disparaître (le navigateur peut vider son stockage). Lien vers Applications.
- **Site sur téléphone** : même avertissement, mais en invitant à **ajouter le site à l'écran d'accueil**, avec un **tutoriel écrit** :
  - **iPhone / iPad (Safari)** : bouton Partager → « Sur l'écran d'accueil » → Ajouter. (Sans cela, Safari efface les données d'un site non visité depuis 7 jours.)
  - **Android (Chrome)** : menu ⋮ → « Ajouter à l'écran d'accueil » ou « Installer l'application » → Ajouter.
- Prévoir un manifeste et une icône pour que l'ajout à l'écran d'accueil donne une vraie appli (plein écran, nom « Avant l'usine »).

## Studio
- Tester chaque outil bouton par bouton avec Iloan (compte créateur), corriger ce qui ne va pas.
- Atelier de synchronisation : remplacer les fenêtres du navigateur (prompt/confirm) par des fenêtres du site.

## Manquants repérés pendant le test du Studio (16 novembre 2026)
- **Manettes** (ancien gamepad-22-1.js) : navigation et lecture à la manette, choix PS4/PS5/Xbox, symboles, aperçu flottant. Pas encore dans la v26 alors que la carte Réglages les mentionne.
- **Effets au rythme des basses** (ancien beat-reactivity.js) et **mode Immersion** (applis) : à reporter.
- **Serveur** : `au_private.release22_api` action `campaigns` en erreur (« c.* » ambigu avec la variable `c`) → correction d'une ligne à faire avec l'accord d'Iloan. `campaign_save` crée toujours une nouvelle campagne (pas de modification).
- Prévisualisation complète d'un fichier de synchronisation avant publication (`au_sync_moderation` publish_file) : encore dans l'ancien Studio (ancien.html).
