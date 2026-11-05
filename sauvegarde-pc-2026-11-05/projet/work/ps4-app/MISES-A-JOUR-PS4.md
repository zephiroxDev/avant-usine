# Mise à jour native PS4 — développement

Ce système est raccordé à l’exécutable de développement `ui-development`, pas au paquet test4 déjà fourni. Aucune version officielle complète n’est publiée par ces changements.

## Parcours implémenté

- Recherche en arrière-plan au démarrage et toutes les six heures ; recherche manuelle dans Réglages.
- Releases GitHub du seul dépôt `zephiroxDev/avant-usine`, tags numériques `ps4-v0.xx` ou `ps4-vX.Y.Z`, hors brouillons ; les préversions numériques 0.xx sont acceptées à partir de 0.24. Parcours paginé ; erreur explicite si la limite empêche de garantir la sélection.
- Comparaison numérique des versions et fenêtre Plus tard / Sauter / Installer. Le choix Sauter est enregistré atomiquement ; un échec d’écriture est signalé.
- Après Installer, téléchargement par le worker natif avec pile vérifiée de 2 Mio. La musique et la navigation restent utilisables. Progression affichée sous l’en-tête.
- Vérification taille/SHA-256/magie PKG, puis vérification native du Title ID ALUS00001. Aucun remplacement de l’installation courante par du code du programme ; aucune désinstallation ou option de remplacement forcé.
- Si le paquet complet du cache correspond encore à la taille et au SHA-256, réutilisation après report. Les fichiers incomplets ou corrompus ne sont pas réutilisés.
- Préparation d’une tâche BGFT sans démarrer l’installation. Les modules privilégiés sont chargés à la demande, pas au démarrage de l’application.
- Seulement après cette préparation : « L’application va se fermer dans 10 secondes », avec Plus tard et Fermer maintenant. Le chronomètre utilise le temps monotone, pas le nombre d’images affichées.
- Plus tard annule la tâche préparée, garde le fichier vérifié et repropose la décision ultérieurement ; il ne déclenche jamais une fermeture différée sans nouvel accord.
- À l’échéance ou après Fermer maintenant : enregistrement durable de la session (piste, position, volume), puis transmission de la tâche à l’installateur. Le volume est relu au prochain lancement. La reprise automatique de la musique n’est pas ajoutée par ce changement.
- L’application quitte sa boucle uniquement après acceptation du lancement de la tâche native. Refus système ou échec de sauvegarde : message d’erreur et maintien de l’application ouverte. Les confirmations imposées par la PS4 ne sont pas désactivées.

## Limite à ne pas masquer

La compilation et les tests hôte ne prouvent pas que BGFT accepte de remplacer sa propre application sur PS4 13.52. La fin du processus peut se traduire par un écran d’erreur PS4 : aucune promesse de fermeture sans erreur. Le code n’introduit pas de faute mémoire ou de crash artificiel pour forcer cette fin.

Un essai physique est indispensable pour vérifier la préparation, le report, le transfert de la tâche, sa survie à la fin de l’application et la version réellement installée au relancement. Ne pas annoncer que ce parcours est opérationnel sur console avant cet essai. Si le système refuse une mise à jour de son propre titre en cours d’exécution, conserver l’erreur et concevoir un relais adapté ; ne pas contourner cela en supprimant l’installation existante.

## Publication d’une future version stable

`scripts/generate_update_manifest.py` produit `ps4-update.json` à partir du vrai PKG, avec son nom, sa taille, son SHA-256, sa version et son identité PS4. La création d’un manifeste stable exige `deviceTested: true` après vérification physique réelle. Les versions numériques 0.xx produisent un manifeste indiquant leur canal de développement et la valeur réelle de deviceTested. Les suffixes historiques restent exclus.

Le PKG et ce manifeste doivent être joints à la même release stable `ps4-vX.Y.Z` avant sa publication. Le workflow actuel de prototypes conserve ses releases en préversion ; il n’est pas transformé en publication officielle par ce travail. Le site et les autres applications ne sont pas modifiés.

Références primaires examinées : en-têtes OpenOrbis AppInstUtil/Bgft et sources flatz/ps4_remote_pkg_installer, apexlions16/OrbisShelf. Ces sources montrent le fonctionnement des services d’installation, sans constituer une validation de notre propre remplacement de titre.
