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

## Applis sur le site 26 — code préparé le 16 novembre 2026 (pas encore compilé ni publié)
- Windows (`work/desktop-app`) : `product.cjs` reconstitue les dossiers (v26/js/core/dom.js → fichier `v26__js__core__dom.js`) ; `scripts/prepare-site.cjs` copie la v26 à plat, ajoute `data-au-app="desktop"`, garde l'ancien site en `ancien.html` et met la page de redirection du site web en `index.html`. Nouveau test `test/site-26.test.cjs`. Rien d'autre du lanceur ni des mises à jour n'est modifié.
- iPhone (`work/experience-ios`) : `scripts/prepare-experience.cjs` copie la v26 dans `site/v26`, ajoute `data-au-app="ios"`, `ios-26.css` (fenêtre de mise à jour seulement), les modules `local-storage-18v07.js`, `local-18v00.js`, `backup-18v06.js` (exigés par la sonde du simulateur) et `ios.js` (mises à jour de l'appli, inchangé). L'ancienne page d'accueil redirige tout de suite vers la v26 (son contenu reste intact pour les tests). Bouton « Forcer une mise à jour » en bas de Mes musiques (#accountDialog).
- Perdu pour l'instant dans l'appli iPhone : paroles en direct sur l'écran verrouillé / Dynamic Island (ios-lyrics*.js liés à l'ancien site).
- Android (`work/android-app`) : version 0.3.4, source encore `github-sync-import` ; compilation en CI (`android-build.yml`, désactivé par la pause), signature avec la clé locale (ne jamais committer), publication par `releases/livraison.json` + `android-release.yml`. Mises à jour : android.js lit les releases GitHub. Ni Node ni Python sur ce PC.
- La chaîne exige pour la version 26.0 : `NOTES-26.0.md`, notes Windows/iPhone (patch-notes.json), numéros (Windows 0.11.0, iPhone 2.5.0 build 52 proposés) et UNE affiche dans promo-manifest.json (check-promo.cjs). Attention : la promo automatique (promo-auto) peut publier l'affiche sur TikTok → accord d'Iloan avant d'ajouter l'affiche.

## Version 26.0 des applis — en cours (16 novembre 2026, soir)
- Numéros : Windows 0.11.0, iPhone/iPad 2.5.0 build 52, releaseId 26.0. Notes : `work/desktop-app/NOTES-26.0.md` + patch-notes.json des deux applis.
- Affiche « Tout neuf. » : `promo-26v00-public.png` + `.mp4` (6 s, 30 i/s constant), fabriquée par `work/refonte-26/affiche/affiche-26.html` (images enregistrées par serveur-local.ps1 en POST dans `affiche/sortie`, assemblées par ffmpeg d'`outils`). Ajoutée à `work/experience-integration/promo-manifest.json` SEULEMENT : pas encore dans le promo-manifest.json du site en ligne (la promo auto TikTok la publierait avant Android). L'ajouter au site au moment de la sortie.
- Workflows `v26-0-validation.yml` / `v26-0-promote.yml` / `.github/scripts/promote-v26-0.py` (copies de la 25.2.1, v26 ajoutée aux chemins et aux contrôles). Commit e2d9d09 + 7dc28fd (déclencheur), branche release/v26-0. Validation run 43913301152.
- Android 0.4.0 : compilé (run 43913822385, commit 6e2882a), téléchargé par Iloan, rangé dans `Avant-l-usine/android-26/` (hors dépôt), signé avec la clé d'origine (certificat c56f1a5c…, identique à 0.3.4), livré en 34 morceaux dans `work/android-app/releases` (commit 37519d7) → workflow `android-26-release.yml` (nouveau : android-release.yml est désactivé par la pause).
- Windows : 2 échecs de test corrigés (assets.test.cjs lit `ancien.html`). Validation réussie : run 43943552142 (1a48d5d). Promotion lancée par `.github/v26-0-release.json` (commit 2d02fda).
- Android 0.4.0 PUBLIÉ (release android-v0.4.0, prerelease). Serveur : migration `reopen_android_26_0` (accord d'Iloan) → `au_paused_client_20` ne bloque plus que la PS4 ; test HTTP réel : Android 200, iPhone 200, PS4 503.
- Ensuite : `.github/v26-0-release.json` {version 26.0, sourceCommit 7dc28fd…, runId 43913301152} poussé sur main → promotion.

## Nouvelle direction des applis (décision d'Iloan, 16 novembre 2026)
- **Appli Windows** = le site v26 tel quel, en appli, avec en plus la conservation **indéfinie** des musiques importées.
- **Applis iPhone/iPad et Android** = **uniquement l'espace des musiques importées** (rien d'autre du site), **plus le Blind Test avec les musiques importées**.
- **Paroles dans les applis de musiques importées** (iPhone/iPad + Android) : mêmes règles que le site v26 — surlignage jusqu'au bout de chaque ligne, remplissage BLANC progressif avec un dégradé d'1 lettre (foncé en mode clair), chœurs entre parenthèses sous la ligne en plus petit (séparés par « · »), aucune espace laissée devant « , » ou « . », et surlignage estimé pour les morceaux non synchronisés. Réutiliser `lineLetters()`/`splitBacks()`/`locate()` de `v26/js/core/lyrics.js` et `fillLine` de `v26/js/ui/shell.js`.
- **Atelier dans les applis de musiques importées** (Windows, iPhone/iPad, Android) : pouvoir synchroniser les paroles de ses musiques importées (même geste que l'Atelier du site), et leur mettre une pochette classique ou animée. Tout reste sur l'appareil.
- **iPhone « Duo »** (question d'Iloan, 16 novembre 2026) : adapter l'appli iPhone à cet appareil. Pas encore fait : vérifier d'abord ce qu'est exactement l'appareil (écran pliable ? deux écrans ?) et ses tailles d'écran, puis prévoir la mise en page.
- **Android ROUVRE** (consigne d'Iloan, 16 novembre 2026) : même contenu que l'appli iPhone, musiques importées uniquement + Blind Test avec elles. PS4 reste en pause.
- Message du site (26.1) : sur PC, proposer l'appli Windows ; sur téléphone, l'écran d'accueil (plus tard aussi l'appli de musiques importées).
