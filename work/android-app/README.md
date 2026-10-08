# Avant l’usine — Android

Première bêta 0.1.0 basée sur les mêmes sources que le site mobile. Le paquet embarque l’interface et ses ressources ; le catalogue distant et les comptes nécessitent une connexion. L’onglet Local reste sur l’appareil.

Préparation : installer les dépendances avec npm, lancer `npm run prepare:site`, `npx cap add android` au premier lancement puis `npx cap sync android`.

Compilation : JDK 21, SDK Android adapté à la version Capacitor verrouillée dans package-lock.json. La clé de signature et ses mots de passe restent locaux, hors Git. Conserver cette clé pour permettre les mises à jour sans désinstallation ni perte de données.

Les comportements sur appareil réel, notamment lecture en arrière-plan, écran verrouillé et gestes tactiles, ne sont pas encore validés. Cette bêta ne prétend pas les prendre en charge avant test.
