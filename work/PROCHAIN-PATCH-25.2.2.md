# Prochain patch — 25.2.2 (liste de travail)

Base : livraison 25.2.1 du 14 novembre 2026. Rien de cette liste n'est encore corrigé.
Chaque bug doit être vérifié sur les 4 plateformes : site PC, site mobile, appli iPhone, appli Windows.

## Restes de 25.2.1
1. « Réglages d'écoute » ouvert depuis le lecteur : commence par les explications au lieu des réglages.
2. Recherche : résultats renumérotés 01, 02… au lieu du numéro de piste.
3. Site mobile en paysage et tablette : menu sur 2 lignes, lecteur mal cadré.
4. Site mobile : pied de page, bouton « ‹ Réglages » minuscule, bouton rond dans « Textes expliqués ».
5. iPhone, « Ton compte » : « Supprimer mon compte » mal placé ; la croix de fermeture passe sous le titre.
6. Téléchargements : cadre « Le site est encore en développement », cartes des versions de test, versions périmées affichées (données serveur).

## Trouvés le 15 novembre 2026 (test de l'Atelier sur le site PC, navigateur piloté)
7. Atelier de synchronisation : l'en-tête Genius « [Paroles de "Titre"] » apparaît comme première phrase à synchroniser (constaté sur « Marre de tout », 91 phrases au lieu de 90). Il devrait être retiré automatiquement comme les autres indications non chantées.
8. Atelier de synchronisation : la molette de la souris (et le défilement automatique vers un élément) ne fait pas défiler la fenêtre de l'Atelier ; seul un défilement forcé par code fonctionne. À confirmer avec une vraie souris sur PC et dans l'appli Windows avant de corriger.

## Chasse aux bugs du 15 novembre 2026 (site en ligne 25.2.1, navigateur piloté, PC 1366×800 puis largeur 634)

### Priorité haute
10. **Gels de la page de plus d'une minute et demie.** Mesurés : 107 s puis 142 s en ouvrant Communauté, 115 s en ouvrant Statistiques après un Blind Test. Une page fraîche reste à ~1 s. Cause : `interface-layout.js`, fonction `spacing()`. Un MutationObserver sur tout `body` (childList+subtree) la relance à chaque image dès qu'un nœud change (chrono, paroles, listes). Elle parcourt alors TOUS les boutons du document et appelle `getComputedStyle(parent)` puis `classList.add`, ce qui force un recalcul de style à chaque bouton. Le DOM grossit au fil des visites (5 600 → 25 700 éléments, 1 308 boutons) : un passage seul coûte ~0,44 s, et l'enchaînement fige l'onglet. Correctif proposé : ne traiter que les nœuds ajoutés (mutation.addedNodes), marquer les parents déjà traités, lire tous les styles avant d'écrire les classes.
11. Tous les changements d'onglet prennent 0,6 à 2 s sur une page fraîche, avec plusieurs tâches longues de 200 à 970 ms. Même origine probable (observers en cascade : interface-layout.js, app-17v01.js `decorate`/`tag`). À remesurer après le n° 10.
12. `promo-manifest.json` est téléchargé une quinzaine de fois à chaque chargement de page : mettre la promesse en cache.

### Affichage et textes
13. Textes expliqués : pendant le chargement, la page affiche « Les paroles ne sont pas encore disponibles » alors que les paroles arrivent une seconde plus tard. Afficher « Chargement… ». Le texte commence aussi par « [Paroles de "Marre de tout"] » (même cause que le n° 7).
14. Collection : le titre dit « Les trois volumes » alors que le site annonce ailleurs « 8 volumes » (avec les sorties à venir). À confirmer avec Iloan.
15. Blind Test : après « Lancer la partie », la page reste en bas des réponses au lieu de remonter sur le chrono et « Écouter l'extrait ».
16. Blind Test : le chrono affiche « 00:00.0 » avant l'extrait puis passe au format « 6.6 s » ; uniformiser.
17. Blind Test, largeur 634 : après une réponse, « Morceau suivant » passe à la ligne sous « Skipper dû à un bug » et laisse un trou à gauche.
18. Lecteur : si la fenêtre du lecteur a été défilée avant d'ouvrir « Paroles », elle garde cette position et la zone des paroles est écrasée (2 lignes visibles, ligne en cours hors champ) ; remettre la fenêtre en haut à l'ouverture des paroles.

### À décider avec Iloan
19. Blind Test : la bonne réponse se lit dans le code de la page et dans le nom du fichier audio (ex. `01 - Marre de tout.mp3`, visible avec F12). Sans importance sans classement ; sinon servir les extraits et vérifier les réponses côté serveur (Supabase).

## Chasse aux bugs n° 2 du 15 novembre 2026 (site en ligne 25.2.1, format téléphone 375 px)

### Fonctionnement
20. Statistiques construit d'un coup ses 19 rubriques repliées (12 767 éléments, 276 indicateurs, 3 271 paires dt/dd) : c'est la plus grosse source du gonflement de la page et des gels du n° 10. Construire chaque rubrique à son ouverture.
21. L'en-tête de page est recopié dans chaque fenêtre : 27 boutons « ⌕ Rechercher » cachés dans le DOM. Contribue au gonflement.
22. Téléphone : aucun bouton Rechercher visible dans l'en-tête ; la recherche n'est accessible que par le lien « Chercher un morceau » de l'Accueil.
23. Playlist : « Supprimer la playlist » supprime immédiatement, sans confirmation ni annulation.
24. Playlists : au premier passage, la liste est vide (« Les meilleurs exclus » n'apparaît qu'au passage suivant) et aucun indicateur de chargement n'est affiché.
25. Playlist → « Ajouter des morceaux » ouvre la Recherche avec l'ancienne requête encore remplie (« Aucun morceau trouvé »).
26. Playlist → « Ajouter des morceaux » → « + » redemande la playlist de destination alors qu'on vient de la playlist.
27. Pied de page « Réseaux officiels & shop » ouvre Découvrir en haut ; les liens sont dans le bloc replié « Autres façons d'explorer » dont le titre ne parle ni de réseaux ni de boutique. Ouvrir le bloc et y descendre.
28. Pied de page « Archives & signalements » ouvre Communauté en haut sans sélectionner l'onglet Archives.
29. Nouveautés : après le choix d'une plateforme, l'historique s'affiche hors écran sans défilement automatique.
30. Téléchargements : l'introduction promet « chaque volume en une seule archive ZIP » mais la page ne propose aucun ZIP de volume.
31. Changer d'adresse (#route) pendant que le lecteur plein écran est ouvert renvoie à l'Accueil au lieu de la page demandée (cas rare).

### Textes
32. Infos & astuces, passages périmés : « Dans le menu du morceau, Exporter… » (menu ⋯ supprimé en 25.1) ; « aléatoire et répétition » (absents du lecteur) ; « Dans Écoute » (l'onglet s'appelle Écouter) ; « choisis un morceau » répété. NE PAS toucher aux phrases hors sujet qui forment probablement la phrase cachée (easter egg) sans l'accord d'Iloan.
33. Confidentialité vouvoie (« Vous pouvez… ») alors que tout le site tutoie ; le chemin « Compte → Notifications et communications » ne correspond plus (Compte › Réglages › Notifications).
34. Soutenir : « L'accès Ko-fi reste disponible ici, sans occuper la navigation d'écoute » est une phrase technique, pas pour le public.
35. Réglages : la carte s'appelle « Affichage » mais la page ouverte s'intitule « Apparence ».
36. Points finaux des titres incohérents : « Téléchargements. », « Nouveautés. », « Répertoire. » avec point ; « Rechercher », « Playlists », « Réglages », « Confidentialité », « Soutenir Avant l'usine » sans.
37. Nom de l'artiste : « Jul » sur les cartes d'album, « JuL » partout ailleurs.
38. Recherche sans résultat : « 0 morceau trouvé » puis « Aucun morceau trouvé » (redondant).
39. Statistiques : « 33 061,81 s » (centièmes de seconde) et même valeur affichée deux fois (« Temps d'écoute total » et « Secondes »).
40. Titre caché `#homeTitle` « Entre dans<span>l'usine.</span> » sans espace : lu « Entre dansl'usine. » par les lecteurs d'écran.

### Visuel (au pixel)
41. Accueil : titre en interligne 0,90 : les accents de « DÉJÀ » touchent le bas de « ALBUMS. » (vérifié agrandi ×3,5).
42. Tous les autres grands titres en interligne 1,0 : les accents de 2e ligne (À, É) passent à 1–2 px de la ligne du dessus (ex. « À RETROUVER, / À TA FAÇON. »). Prévoir ~1,06–1,08 pour les titres en majuscules accentuées.
43. Espaces avant « ? ! : ; » » : 164 espaces ordinaires, 0 insécable ; le signe peut tomber seul en début de ligne (constaté : « …sur le site / ? » dans la FAQ Téléchargements). Remplacer par des espaces insécables fines sur tout le site.
44. Téléphone : le point de « Téléchargements. » passe seul à la ligne (ressemble à un trait blanc).
45. Recherche : la page s'ouvre déjà défilée, le titre « RECHERCHER » est coupé sous l'en-tête.
46. Recherche : correcteur orthographique du navigateur (soulignement rouge) actif dans le champ ; ajouter spellcheck=false.
47. Recherche sans résultat : « mot. » seul sur la dernière ligne du message.
48. Nouvelle playlist (téléphone) : libellé et champ côte à côte, champ trop étroit ; à empiler. Aucun onglet surligné sur cette page.
49. Fiche playlist : dans « ÉCOUTER LA SÉLECTION ▸ » la flèche passe seule à la ligne ; « Renommer » et « Supprimer la playlist » en texte simple mal alignés.
50. Fiche playlist : ligne de morceau écrasée (titre sur 2 lignes) par 5 boutons ; ↑ ↓ affichés même avec un seul morceau.
51. Fenêtre « Ajouter à une playlist » : texte d'aide « Nom de la nouvelle playlist » coupé.
52. Barre d'onglets du haut (téléphone) : onglets coupés au bord (« …UE ») sans fondu indiquant le défilement.
53. Lecteur plein écran : « À L'ÉCOUTE. » centré à 20 px, croix à 36 px (16 px de décalage). « Texte expliqué » a un contour ambre permanent (à confirmer : voulu ?).
54. Fenêtre Commentaires : titre coupé en « MARRE DE TOUT / · COMMENTAIRES. » (le « · » commence la ligne) ; « Aucun commentaire pour le moment. » collé au bouton (0 px).
55. Fenêtre Partager : « … 2026 À / 22:57:21 » (heure seule sur sa ligne, secondes inutiles) ; alignements mélangés (centré / gauche / centré).
56. Sauvegarde : « Aucun fichier choisi » coupé (« Aucun fi…er choisi »).
57. Communauté (téléphone) : onglets (Coups de cœur, Histoires, Archives, Signaler) mélangés avec des actions (Les membres, Partager une archive) dans un même paquet de boutons hors cadre.

### Vérifié sans problème
- Détection automatique en 375 px sur 21 pages : aucun texte coupé ni chevauchement réel (les seuls signalements sont des textes cachés exprès pour l'accessibilité).
- Compte, Réglages (Manettes, Affichage), Profil, Sauvegarde, Messages (liste), Histoires, Coups de cœur, Archives, Recherche (y compris sans accent), création/ajout/suppression de playlist (playlist « Test Claude » créée puis supprimée), Local, Téléchargements, Infos, Soutenir (lien Ko-fi correct), Confidentialité, Nouveautés.
- Aucune erreur JavaScript, aucune image cassée, aucun texte « undefined/NaN », aucun débordement horizontal sur les 21 onglets en 1366×800.
- Atelier (glisser + clavier), Blind Test (« Je ne sais pas » affiche la bonne réponse), lecteur et paroles surlignées, pied de page complet, Ma musique, Découvrir.
- Non testé dans ce passage : appli iPhone, appli Windows, vrai téléphone, envoi de messages ou de formulaires.

## Décision à prendre avec Iloan
9. Deux gabarits de fenêtres différents (outils créateur / autres) : garder les deux ou unifier.

## À faire vérifier par Iloan sur appareil réel
- Barre de l'Atelier au doigt, feuille de partage iOS, fenêtre de mise à jour iOS, paroles en mode clair.
