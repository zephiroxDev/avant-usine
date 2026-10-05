# Avant l’Usine — Windows

L’application 0.2.0 embarque l’interface Web 13v10. Elle ouvre `avantusine://local/`, servi depuis les fichiers installés ou une version vérifiée dans son profil. Elle ne télécharge pas la page GitHub au démarrage. Les fichiers Web originaux restent dans `../github-sync-import` et ne sont pas modifiés par la préparation de l’application.

Les MP3, comptes, catalogue publié et contributions utilisent leurs services en ligne existants. Les sessions et préférences de l’application sont conservées dans son profil Windows séparé du navigateur. Une connexion dans le navigateur ne connecte donc pas automatiquement l’application. Les liens externes s’ouvrent dans le navigateur Windows. Les confirmations de compte et la récupération de mot de passe conservent leur destination Web déjà configurée.

## Construire

Avec Node.js et pnpm installés :

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run build:win
```

Les fichiers sont générés dans `../../outputs/application-windows` : installateur et version portable 64 bits. L’installateur conserve les données du profil lors d’une désinstallation. Aucun certificat de signature n’est configuré pour cette première version de test.

## Prochaines versions

Instruction de livraison : le site et l’application doivent sortir ensemble. `scripts/release.ps1` construit et teste l’application, puis prépare l’archive du site, les fichiers de mise à jour et les empreintes ; il s’arrête avant toute publication si un paquet manque.

Mettre à jour le code Web local, ajouter les notes de version, augmenter `version` dans package.json et `release.json`, puis reconstruire. Publier dans une release `vX.Y.Z` l’installateur et tous les fichiers de `outputs/application-windows-X.Y.Z/update-assets`, y compris le manifest JSON. La release reste en brouillon tant que tous les fichiers ne sont pas reçus. Le bouton du site consulte GitHub : aucun changement de lien n’est nécessaire pour les prochaines versions.

Le lanceur 0.2.0 reste installé. Les nouvelles versions du produit et de l’interface sont téléchargées fichier par fichier, après acceptation dans l’appli. Les fichiers identiques sont réutilisés localement. SHA-256 et taille sont vérifiés avant activation atomique ; le premier démarrage est surveillé et une interruption entraîne un retour à la version précédente. Les profils et préférences ne sont jamais remplacés. Les versions 0.1.x doivent installer cette base une fois.

« Plus tard » reporte le rappel de quatre heures ; fermer la fenêtre a le même effet. « Sauter » mémorise la version et attend une version strictement postérieure. La vérification se fait au démarrage puis toutes les dix minutes. Le pop-up affiche le numéro réel et une progression pendant Installer. Le moteur Electron reste celui du lanceur installé ; un changement de moteur nécessiterait une migration de cette base, distincte des mises à jour de fichiers du produit.

Le rendu reste isolé du système : aucun accès Node.js dans la page, sandbox active, protocole local borné au répertoire de l’interface. Aucun proxy vers GitHub ni contournement des restrictions du navigateur Codex.
