# Avant l’usine — iPhone et iPad

Application Capacitor avec interface embarquée. Compilation iPhoneOS arm64 sur un runner GitHub macOS avec Xcode 26 ou ultérieur.

Le résultat est un IPA non signé, à signer et installer avec un outil compatible, par exemple ESign, et un certificat/profil valides. Ce paquet ne constitue pas une publication sur une boutique alternative officielle.

Les mises à jour sont annoncées dans l’application. Le téléchargement natif vérifie la taille et l’empreinte SHA-256 avant de proposer « Ouvrir dans ESign » via le menu natif Ouvrir dans. iOS peut demander de sélectionner ESign. Les instructions d’import manuel n’apparaissent qu’en cas d’échec d’ouverture. La signature et l’installation restent manuelles. Garder le même identifiant d’application et une signature compatible ; ne pas supprimer l’ancienne installation pour la mettre à jour.

Les données locales restent dans le conteneur de l’application. Aucun certificat ni profil de signature n’est stocké dans le dépôt.

Préparation : générer les icônes Android et Windows, puis pnpm install --frozen-lockfile et pnpm run prepare:site dans ce dossier. pnpm test vérifie le paquet Web et la logique de mises à jour. Le workflow compile et vérifie la structure de l’IPA ; ces contrôles ne remplacent pas un essai d’installation et d’usage sur appareil réel.
