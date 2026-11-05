

## Correction du téléchargement privé
Le refus « Informations du paquet invalides » intervient dans IOSUpdates avant téléchargement : le nom 22-1 manque un troisième groupe numérique. La ligne privée 42e6d3ce-c854-4209-93ce-75b473e14adb expose désormais betatesting-22-1-0-test-1.ipa. Parties Storage, octets et empreinte inchangés. Serveur prêt confirmé ; téléchargement réel iPhone à refaire. Demande supplémentaire : repère rose pour les bêtas, icône ou interface en attente de précision.


## Retours appareil — deuxième bêta en préparation, build 43
La première bêta n'est pas validée : catalogue en pause à la sortie, navigation annulée au doigt, métadonnées Local absentes, artefacts persistants, paroles en avance après seek, sélection perdue, paysage à désactiver, audio découpe non chargé, diff demandé et espacement IA/cœur/+. Correctifs sources préparés ; aucun n'est encore validé sur l'iPhone utilisateur. Tour rose intégré aux cartes des bêtas dans le paquet déjà nécessaire, sans compilation dédiée.


## ARRÊT explicite demandé par l’utilisateur — quota
Travail interrompu avant livraison de la deuxième bêta. Pas de nouvelle publication publique.
Build43 natif lancé sur commit383160eabdf4c6a97db5e848d77354c82f971235, run40591010654 ; dernier état : simulation native en cours. Branche privée finale distante connue9431ecfe57abaeeda216afba094dac34227ece87. Des modifications PLUS RÉCENTES existent EN LOCAL : repère violet (contour et BÊTA22.1·43), source prepare-experience.cjs, release-22-1.js, release-22.css. Elles devront être sauvegardées sur la branche avant la prochaine compilation ou repack documenté.
Retours utilisateur en cours :10 corrections préparées, toujours à confirmer sur appareil. Tests :26 Node passés ;5 scénarios navigateur passés ; annotations existantes passées. Nouveau test sélection de la deuxième phrase répétée passé. Préécoute WAV réelle : test initial placé hors dialogue intercepté par le dock, fixture corrigée dans real-preview-check.cjs (dialogue modal), résultat final à lire avant d’affirmer le succès.
Service privé beta-builds v9 déployé, autorise uniquement build43 /betatesting-22-1-0-test-2.ipa en plus des anciens tuples ; accès anonymes GET403 POST401 vérifiés. Nouvelle bêta NON téléversée. Uploader outputs/release-22.1/upload-private-beta-test2.py et packager prepare-final-beta-test2.py prêts mais non exécutés. L’ancienne bêta42 reste disponible.
Le téléphone doit être en portrait ; verrouillage natif plist préparé, site mobile utilise message si navigateur ne peut verrouiller. Artefacts : nouveau flou limité aux glyphes, aucune validation physique. Catalogue : intention conservée malgré pause système ; Local métadonnées natives ; arrêt des paroles découplé de l’arrêt audio. Découpe : durée native indépendante de loadedmetadata.
Tous les fichiers restent dans Bureau/Avant-l-usine. Prochaine action après demande de reprise : lire cet état, vérifier run40591010654, terminer tests préécoute/identification violette, intégrer dernier source, compiler/vérifier et livrer en privé uniquement.


## Reprise : manettes demandées
L’utilisateur demande navigation et musique complètes sur toutes les plateformes actives compatibles, puis choix manuel auto/PS4/PS5/XboxOne/SeriesX-S, option symboles des vrais raccourcis et aperçu flottant déplaçable en direct. Il insiste sur les symboles dessinés ✕○□△, L1/L2/R1/R2/L3/R3 et quatre flèches. Module partagé gamepad-22-1.js ajouté, test virtuel en cours. Le choix manuel adapte les glyphes, ne force pas une API inaccessible. Pas de réactivation Android/PS4.
La compilation native43 run40591010654 est terminée avec succès ; artefact12774309681 à récupérer/vérifier. Le paquet final doit inclure le nouveau module gamepad et les dernières ressources violettes. Rien de nouveau téléversé au service privé pour l’instant.


## Deuxième bêta privée LIVRÉE — build43, violette
IPA : outputs/release-22.1/betatesting-22-1-0-test-2.ipa
Serveur prêt confirmé : 2c7d6fd8-5866-4966-9d5c-5cfcdf2c3775 ; 22738323 octets ; SHA256 8d10469d3ecefe8e83b9089e0bae66e66b0eb51f83872c75a964b970b26bffa0. Notes de téléchargement contiennent14 vérifications physiques complètes.
Sources web : c1372139dcca6044c16cafb7020d00b2aadc9e6e (branche ios/22.1-private). Exécutables natifs compilés/validés au run40591010654, source383160eabdf4c6a97db5e848d77354c82f971235, conservés bit à bit ; ressources web remplacées et module gamepad ajouté explicitement après tests. Portrait et extension dans IPA vérifiés.
Tests :26 Node réussis ;5 scénarios correctifs navigateur réussis ; sélection répétée réussie ; vraie préécoute WAV coupée à1.201s et arrêtée ;12 groupes de tests virtuels manette réussis. Pas de validation physique iPhone ou manette.
Manettes : navigation croix et DEUX sticks identiques, validation unique, retour modal, curseurs, lecture/pause/précédent/suivant, choix auto/PS4/PS5/XboxOne/SeriesX-S, vrais glyphes, aperçu flottant déplaçable avec sticks et pressions en direct. Réglages conservés localement. API indisponible : réglages et aperçu neutre restent accessibles, pas de simulation de connexion réelle.
Repère bêta : contour violet et libellé BÊTA22.1·43 dans en-tête. État public inchangé, main vérifié d2fe4ad784a6ad4a3a9ea91b94b68b0ba72e5dd2. Android/PS4 en pause. Attendre les essais et le GO explicite avant publication publique.
