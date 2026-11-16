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

## Publié le 16 novembre 2026 (soir)
- Lecteur, onglet Paroles : les phrases à venir sont floues selon leur distance (la suivante nette, puis de plus en plus floues plus bas, jusqu'à 4 px), et redeviennent nettes en approchant. Flou dessiné par text-shadow (jamais de filter : bug WebKit). Défilement à la main → plus de flou.
- Paroles seules : après 5 s sans action sur l'écran Paroles, l'en-tête, les commandes et la note s'effacent doucement (1,2 s). Le premier toucher/clic les fait revenir sans rien déclencher d'autre.
- À reprendre dans les applis de musiques importées.

## Musiques importées dans la v26 (16 novembre 2026, soir)
- `v26/js/core/local.js` : même base que l'ancien site et les applis (IndexedDB `au-personal-library-18` v1, tables tracks/albums/playlists, fichiers en blocs de 1 Mo + SHA-256) → les musiques déjà importées dans les applis sont retrouvées. Lecture des infos intégrées (ID3, FLAC, WAV), regroupement par album, ordre par numéro de piste.
- `v26/js/pages/imported.js` (Ma musique › Sur cet appareil) : import, écoute, infos, paroles (surlignage estimé), Atelier (synchro enregistrée sur l'appareil), pochettes classiques ou animées (morceau ou album), suppression, Blind Test (`#/communaute/blind-test?source=appareil`). Message PC (appli Windows) / tutos écran d'accueil iPhone et Android.
- `v26/js/core/platform.js` : `data-au-app` (ajouté par les scripts de préparation des applis) ; `?au-app=android` pour simuler. Applis iOS/Android = pages autorisées seulement (router `restrictTo`).
- BUG CORRIGÉ : l'Atelier v26 envoyait les courbes en pourcentage ; le serveur (studio_validate_19) exige des lettres (0 → longueur de la phrase). Conversion dans `studioData()`.
- Musiques importées : aucune statistique ni favori envoyé au serveur.

## Mises à jour automatiques des applis déjà installées (à respecter)
- Windows : le lanceur figé (`version-store.cjs` validateManifest) n'accepte que `product.cjs` et `site/<nom-sans-dossier>`, 1000 fichiers, 32 Mo/fichier, 128 Mo au total, URL `releases/download/vX.Y.Z/au-<sha256>.bin`. `product.cjs` (servi par le protocole avantusine://local) fait partie de la mise à jour → livrer la v26 « à plat » (`v26__js__core__dom.js`) et faire reconstituer les sous-dossiers par le gestionnaire de protocole de `product.cjs`. Même origine avantusine://local → musiques importées conservées.
- iPhone : IOSUpdates.checkReleases/download (IPA) → nouvelle version de l'appli publiée par les workflows existants.
- Android : mécanisme à vérifier avant de rouvrir.

## Nouvelle direction des applis (décision d'Iloan, 16 novembre 2026)
- **Appli Windows** = le site v26 tel quel, en appli, avec en plus la conservation **indéfinie** des musiques importées.
- **Applis iPhone/iPad et Android** = **uniquement l'espace des musiques importées** (rien d'autre du site), **plus le Blind Test avec les musiques importées**.
- **Paroles dans les applis de musiques importées** (iPhone/iPad + Android) : mêmes règles que le site v26 — surlignage jusqu'au bout de chaque ligne, remplissage BLANC progressif avec un dégradé d'1 lettre (foncé en mode clair), chœurs entre parenthèses sous la ligne en plus petit (séparés par « · »), aucune espace laissée devant « , » ou « . », et surlignage estimé pour les morceaux non synchronisés. Réutiliser `lineLetters()`/`splitBacks()`/`locate()` de `v26/js/core/lyrics.js` et `fillLine` de `v26/js/ui/shell.js`.
- **Atelier dans les applis de musiques importées** (Windows, iPhone/iPad, Android) : pouvoir synchroniser les paroles de ses musiques importées (même geste que l'Atelier du site), et leur mettre une pochette classique ou animée. Tout reste sur l'appareil.
- **iPhone « Duo »** (question d'Iloan, 16 novembre 2026) : adapter l'appli iPhone à cet appareil. Pas encore fait : vérifier d'abord ce qu'est exactement l'appareil (écran pliable ? deux écrans ?) et ses tailles d'écran, puis prévoir la mise en page.
- **Android ROUVRE** (consigne d'Iloan, 16 novembre 2026) : même contenu que l'appli iPhone, musiques importées uniquement + Blind Test avec elles. PS4 reste en pause.
- Message du site (26.1) : sur PC, proposer l'appli Windows ; sur téléphone, l'écran d'accueil (plus tard aussi l'appli de musiques importées).
