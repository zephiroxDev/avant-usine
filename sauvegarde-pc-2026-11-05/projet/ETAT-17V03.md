# 17V03 — livraison du 6 octobre 2026

- Sources publiées : b543aa58570a89422bfd600382e5a68e7b4033fb ; arbre d79d6458c7c08f943da95f1915bdd2633aefff59.
- Site 17V03 : déploiement Pages 37482746391, build et déploiement réussis.
- Windows 0.3.3 : workflow 37482747584, job 112334865022 réussi. Release v0.3.3 publique et latest, 46 assets avec SHA256 ; publisher compare toutes les tailles et empreintes avant sortie du draft.
- Installation : https://github.com/zephiroxDev/avant-usine/releases/download/v0.3.3/Avant-Usine-Installation-0.3.3.exe
- Site : https://zephiroxdev.github.io/avant-usine/

## Modifications

- Animation nettement renforcée sur les wrappers de pochettes : zoom, déplacement, inclinaison et reflet. Seulement visible/onglet actif. Effets réduits, arrêt et prefers-reduced-motion respectés ; le changement de préférence système ne réactive pas une pause choisie.
- Blind Test : Skipper dû à un bug, même avant toute lecture ou pendant son chargement. Évaluation exclue ; bilan séparé avec titres ; événement function / blind_bug_skip conserve morceau, partie, difficulté et numéro de manche. Protection des opérations asynchrones périmées.
- catalog-audit-17v03.js : outil Créateur et Modérateur ; contrôle de tout COLLECTION avec les mêmes URL que les lecteurs et le Blind Test ; API Archive regroupée, lectures MP3 de 32 KiB maximum, titres ID3, noms, numérotation, empreintes dupliquées et candidats. Aucune correction automatique. Sans balise titre exploitable, identité à confirmer ; une balise cohérente ne certifie pas sémantiquement le son.
- Doublons : même panneau, progression, arrêt, bilan, export JSON ; analyse sonore sur trois extraits préservée. Cache conditionné à l’empreinte/métadonnées ; ressemblances signalées à vérifier, aucune suppression.
- Niveau Public masque les deux nouveaux contrôles. Guide actualisé dans Lire le reste ; zone initiale et Easter egg conservés. Historiques indépendants mis à jour.

## Validation et limites

- Tests partagés, UI Blind Test et statistiques, moteur de contrôle (liens corrects, titres et numéros incorrects, absence, incertitude, streaming borné, ID3, concurrence, bilans des deux outils et accès Public) : réussite locale et en CI.
- 11 tests Windows : réussite locale et en CI, compilation installation et portable réussie.
- Supabase : test transactionnel du diagnostic function / blind_bug_skip via le compte Créateur, détails conservés ; ROLLBACK effectué. Aucun changement de schéma/permissions.
- Navigateur : mouvement et transform effectif contrôlés sur la vraie CSS, panneau/progression initiale observés avec le vrai module et un jeu de quatre cas de test. Le navigateur intégré s’est ensuite bloqué ; capture et dernier bilan visuel non obtenus. Les bilans ont été vérifiés par tests DOM du vrai module.
- L’outil Web renvoie Internal Error sur la page publique, sans erreur de poids ; ce n’est pas utilisé comme preuve du fonctionnement interactif.
- Vérification HTTP des ressources et manifeste réussie : outputs/verification-live-17v03.json. Index : 28 171 octets ; ressources référencées et huit pochettes/vidéos accessibles sans 404 ; six fichiers partagés et index identiques aux sources ; manifeste et 40 fichiers de mise à jour conformes aux 46 assets vérifiés.
- Objectif 10 secondes conditionnel au réseau. L’identité réelle d’un enregistrement ne peut être certifiée sans référence audio fiable ; les cas non confirmés restent explicitement signalés.

## Suite évoquée par l’utilisateur

Synchronisation automatique des paroles non synchronisées avec surlignage progressif et message de synchronisation automatique. Faisabilité expliquée : service d’alignement audio/paroles nécessaire ; idée conservée pour le prochain patch, pas implémentée dans 17V03.

Ne pas relancer implement-17v03.py ou refine-17v03.py : scripts ponctuels non idempotents. Ne pas réinitialiser Git local (base ancienne et changements conservés). Publication effectuée par GitHub MCP et CI.
