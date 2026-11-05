# 19V03 — suivi de livraison

Emplacement unique : C:/Users/User/Desktop/Avant-l-usine. Projet : sous-dossier projet. Lire AGENTS.md dans le dossier parent ; cette règle prime sur les anciens chemins.

## Fonctionnement

- Atelier Highlight : barre glissante sous une phrase horizontale, progression enregistrée avec audio.currentTime et positions Unicode. Passage automatique, maintien du pointeur entre deux phrases avec retour à gauche, capture partielle conservée, reprise et annulation, bouton Refaire cette phrase. Les pistes et chevauchements restent indépendants.
- Classique : repères de début et fin, passage à la suivante, fins indépendantes pour les phrases chevauchées. Le mode initial, l’aperçu, l’envoi Web et l’enregistrement Local restent cohérents avec la sélection.
- Lecture publique : lettres réellement masquées jusqu’à leur révélation Highlight ; backs et phrases chevauchées pris en charge. Classique : masque vertical avec fondu qui révèle le texte sur sa durée ; estimation jusqu’au prochain départ si aucune fin explicite. Les données de timing ne sont pas transformées artificiellement en Highlight.
- Maintenance de l’Atelier conservée : le public le voit fermé pour réparation, le Créateur garde son accès. Les notes publiques et l’affiche ne présentent que les deux changements du lecteur.

## Sources et vérifications

Module ajouté : work/github-sync-import/sync-slider-19v03.js. Modèle, Atelier, rendu app-17v01.js et Local adaptés. Module inclus dans le cache Web et les préparations natives.

Tests du modèle : 11 réussis. Tests du parcours au navigateur local : largeurs 320, 393 et 1440 ; slider, phrase suivante, reprise partielle, classiques initiaux et après changement, exports, aperçus, backs chevauchés, aucun débordement. Tests Windows, Android, iOS et contrôles de régression sync/partage/UI réussis. Rapports : outputs/19v03.

## Versions finales

Site 19V03 ; Windows 0.5.5 ; Android 0.2.4 code 15 ; iOS 1.1.5 build 18. Des premières compilations techniques ont été remplacées après correction du lien entre mode sélectionné et format enregistré. Le numéro du patch reste 19V03, son contenu public n’a pas changé.

Source finale : a935434bb9980e7e35a3a0a381e46de3dd56def0. Affiche finale : commit 1f344cc320c5137ee3d94212ec23166730feca62. Un seul élément 19v03-all dans Gestion promo ; original, aperçu animé et MP4, lumières et textes animés. Ne pas montrer l’affiche dans le chat.

Toutes les plateformes sont publiées et vérifiées. Android 0.2.4 téléchargé depuis la release publique : 63596024 octets ; SHA256 e793ad78343d35b0cae46af9d5220331f7aa983e6b16aedcea95cf5cf430f5f3 ; signature originale et sources embarquées vérifiées. Windows et IPA également contrôlés. Dernier commit : ffd92cc85e5d9d0670c8a3b53eb599859ebe6936.

Clés privées : dossier cles-android dans l’espace du Bureau, hors du projet et du payload GitHub. Ne pas publier le ZIP des clés ni les secrets. Outils de signature : outils-android au même niveau. Identité Android SHA256 : c56f1a5c2043a653b57729f8ad8cb7346c95fae2917c79307c4c699398a751b3.
