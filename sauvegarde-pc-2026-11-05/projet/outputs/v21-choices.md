# Version21 — périmètre et décisions du26octobre2026

## Choix visuels reçus après le refus du premier aperçu

Le principal problème est l'apparition soudaine des paroles. Garder le flou, l'épaisseur actuelle, le blanc net et l'alignement à gauche. Explorer une lumière plus expressive liée à la musique, une vraie page de lecture PC (pas une fenêtre encadrée), un autre en-tête, des backs plus petits et décalés. L'utilisateur souhaite trois images pour choisir la composition, puis une démonstration animée pour valider l'apparition.

Trois compositions rendues et inspectées : outputs/paroles-21-direction-1.png (Lecture continue, identité en bas), direction-2.png (Scène lumineuse, titre plus présent), direction-3.png (En-tête discret). Chaque image compare PC et téléphone. La transition n'est pas encore validée ni intégrée.

Windows : préparation de la nouvelle interface réussie ; 27 tests existants réussis. Le launcher installé n'accepte que des chemins de mise à jour plats : les imports Mediabunny ont donc été placés à la racine, pour rester compatibles avec la mise à jour sans réinstallation. Ne pas modifier ce validateur en pensant que les anciennes installations pourraient recevoir automatiquement ce changement de bootstrap. Les versions de livraison ne sont pas encore incrémentées.

## Dernière décision : premier aperçu des paroles refusé

L'utilisateur n'aime aucun des rendus du premier aperçu paroles-21-apercu.html. Ne pas intégrer lyrics-21-preview.css à la version publique. Les trois modes montraient la même composition, pas trois directions artistiques. Une nouvelle série de dix questions visuelles a été envoyée ; attendre ces réponses pour produire des directions réellement distinctes. Poursuivre les autres fonctions indépendantes.

Versions décidées : sites 21.0, iPhone/iPad 2.1.0. Windows doit rouvrir après validation ; Android et PS4 restent en pause.

Export : Local temporaire sur les sites, catalogue uniquement ; persistance dans Local sur les applications. Remplacement d'un album après confirmation, ou copie séparée au choix. Audio modifié avec découpes et fondus ; métadonnées intégrées ; numéro dans le nom de fichier seulement. Pochettes fixe et animée pour album et pistes, avec pochette fixe intégrée à l'audio quand possible. Paroles TXT ; JSON Highlight ; LRC pour classique compatible. Signaler explicitement les pistes et ressources manquantes. Décaler les horodatages une seule fois dans l'export ; conserver le référentiel original dans le lecteur du site.

Tests locaux réussis : édition directe sans sauvegarde implicite ; découpe avec lecture réelle ; audio exporté réécouté et fondus mesurés ; métadonnées AAC relues ; ZIP avec audio, texte, synchronisations et pochettes, et bilan des pistes manquantes. Sources album-download-21.mjs / album-audio-21.mjs / album-sync-21.mjs ; dépendance Mediabunny1.62.1 dans vendor, licence conservée. Tests outputs/test-album-zip-21.cjs et outputs/test-sync-export-21.mjs.

Préparateurs iOS et Windows adaptés pour les modules MJS et vendor. Windows prend désormais work/experience-integration. Rien de la version21 n'est publié et les services Windows ne sont pas encore rouverts.

## Précisions prioritaires reçues ensuite

L'éditeur doit s'activer avec la case « Modifier le site » dans Compte Créateur → Éditeur. Pour terminer, l'utilisateur revient décocher cette case. Les appuis courts naviguent ; l'appui prolongé sélectionne/déplace. Aucun enregistrement ni publication implicite. La session de brouillon reste en mémoire après désactivation.

Le premier test d'édition directe a réussi : appui prolongé, modification du titre réel, navigation normale, retour au panneau et désactivation qui restaure le rendu public, sans appel serveur save/publish. Test local : outputs/test-v21-direct.cjs. Le runtime et le contrôleur doivent encore être vérifiés sur gestes tactiles, glisser-déposer, arrêt de session et permissions.

Nouvelle neuvième fonction proposée : télécharger un album en construisant le ZIP à partir des pistes actuelles, avec ordre et métadonnées, plutôt que télécharger les anciens ZIP Archive.org. Les flux audio restent sur Archive.org. Dix questions de cadrage envoyées ; leurs réponses doivent trancher persistance dans Local, préparation temporaire sur les sites, application des découpes/fondus, doublons, numérotation, pochettes, paroles, pistes manquantes et format audio.

Actifs : sitesPC/mobile, iPhone/iPad, réouvertureWindows après vérifications. Android/PS4 restent suspendus. Ne pas publier une nouvelle direction des paroles sans en présenter l'aperçu.

Huit fonctions : navigationredistribuée ; BlindTestnonrecouvert ; présentationclassique/approximative/Highlight ; optionsdansréglages ; grandlecteurPCnoncoupé ; refontedécoupe/fondus ; éditiondirecte ; réouvertureWindows.

Réponses : navigationentièrepeutêtrerepensée ; BlindTestprincipal ; autre dispositiondesparolessurgrandécran ; plusdelignesmobiles ; optionsdéplacéesdansréglages ; découpefonctionnelleprioritaire ; nouvelleprésentationfonduslibre ; déplacementparappuiprolongé ; interrupteurModifier/Naviguertoujoursaccessible ; Windowspublicaprèsvalidation.

Préparationlocaleuniquementpourl'instant. Modifiéexperience.js/css : routeactiveidentifiable ; lecteurcompactmasquépendantBlindTest ; boîtegrandlecteurancréeà16px(8pxmobile)avecscroll ; BlindTestcinquièmeaccès ; optionsdéplacéesdansdialogueréglages.

TestEdge1280×720 : avant miniVisible=trueenBlindTest ; aprèsfalse. Grandlecteurtop16,bottom704 ; aucuneportionhorsviewport. Àélargirauxhauteurscourtesetmobile.

Windowsancienpréparateurcopieencorework/github-sync-import : migrationnécessaireverswork/experience-integrationavecensembledesdépendances ; nepasréactiverlesservicesavantvraievalidationdupaquet.

Utilisateurdemande10questionsdecadrageàchaquefois ; première série10/10répondue. Éviterquestionsrépétéesoupermissionsdéjàaccordées. GarderlesfichiersdansBureau/Avant-l-usine.
