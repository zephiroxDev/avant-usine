# Version 26.1 — prochaine mise à jour du site (demandes d'Iloan)

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

## À ajouter aussi en 26.1
- Point médian « · » jamais en début de ligne (règle dans `v26/js/core/dom.js`, fonction fr() : remplacer « ␠· » par «  · »), puis `bash work/refonte-26/version.sh`.
- Tester avec Iloan, connecté : profil, messages, contributions, Mon année, actions modifiantes du Studio.
- Applis : vérifier le surlignage estimé des morceaux importés.
- Notes de version 26.1 (Nouveautés) et affiche promo de la version.

## Corrigé le 16 novembre 2026 (pas encore en ligne, en attente d'autres retours d'Iloan)
- Surlignage des paroles synchronisées : la courbe compte en lettres (0 → longueur de la ligne), elle était lue comme un pourcentage, donc la ligne s'arrêtait à mi-chemin. Corrigé dans `v26/js/core/lyrics.js`.
- Erreur « Cannot access 'notesPromise' before initialization » sur la page d'un morceau (Paroles/Explications) : `v26/js/pages/track.js`.
- Pochettes rognées sur téléphone (attribut height=300 + largeur 100 %) : `.cover{height:auto}`.
- Éventail de 3 pochettes de l'Accueil supprimé (PC + mobile).
- Chœurs entre parenthèses affichés sous la ligne principale, en plus petit, comme sur l'ancien site (lecteur + page du morceau ; `splitBacks()` dans `v26/js/core/lyrics.js`). Le surlignage lettre par lettre les suit dans l'ordre chanté.
- Surlignage du lecteur : plus de rouge. Les lettres se remplissent en BLANC progressivement, avec un dégradé doux d'une lettre qui avance au rythme du chant (`fillLine` dans `v26/js/ui/shell.js`, jetons `--ly-on`/`--ly-off` dans app.css ; en mode clair le remplissage est foncé pour rester lisible).
- Mode clair SUPPRIMÉ (Iloan n'en veut pas) : plus de choix « Thème » dans Réglages, site toujours sombre même si un ancien réglage « clair » est enregistré ; texte du Guide mis à jour. Les applis de musiques importées : sombre uniquement aussi.
- Étiquette de version 202611161750 appliquée.

## Nouvelle direction des applis (décision d'Iloan, 16 novembre 2026)
- **Appli Windows** = le site v26 tel quel, en appli, avec en plus la conservation **indéfinie** des musiques importées.
- **Applis iPhone/iPad et Android** = **uniquement l'espace des musiques importées** (rien d'autre du site), **plus le Blind Test avec les musiques importées**.
- **Paroles dans les applis de musiques importées** (iPhone/iPad + Android) : mêmes règles que le site v26 — surlignage jusqu'au bout de chaque ligne, remplissage BLANC progressif avec un dégradé d'1 lettre (foncé en mode clair), chœurs entre parenthèses sous la ligne en plus petit (séparés par « · »), aucune espace laissée devant « , » ou « . », et surlignage estimé pour les morceaux non synchronisés. Réutiliser `lineLetters()`/`splitBacks()`/`locate()` de `v26/js/core/lyrics.js` et `fillLine` de `v26/js/ui/shell.js`.
- **Atelier dans les applis de musiques importées** (Windows, iPhone/iPad, Android) : pouvoir synchroniser les paroles de ses musiques importées (même geste que l'Atelier du site), et leur mettre une pochette classique ou animée. Tout reste sur l'appareil.
- **Android ROUVRE** (consigne d'Iloan, 16 novembre 2026) : même contenu que l'appli iPhone, musiques importées uniquement + Blind Test avec elles. PS4 reste en pause.
- Message du site (26.1) : sur PC, proposer l'appli Windows ; sur téléphone, l'écran d'accueil (plus tard aussi l'appli de musiques importées).
