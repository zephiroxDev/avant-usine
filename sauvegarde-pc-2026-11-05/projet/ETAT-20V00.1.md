# Avant l’usine — 20V00.1

État de travail du 16 octobre 2026. Ne pas confondre les tests automatisés avec une validation physique sur iPhone après signature SideStore.

## Livraison

- Site PC/mobile : fichiers du correctif servis et empreintes vérifiées ; HTML 33 949 octets. Vérification en navigateur sans nouvelle erreur JavaScript ni ressource interne en erreur sur la page testée.
- Windows 0.6.1 : publié ; 97 fichiers de mise à jour contrôlés contre les tailles et empreintes des assets GitHub.
- Android 0.3.1, code 23 : publié. APK 145 362 269 octets, SHA-256 `074c04e3c9c8e6f8d919845d45ce956e72942802a4fb8b9043e3c8a0c51e716f`. Certificat original conservé.
- iPhone/iPad 2.0.1, build 28 : publié. IPA 133 155 121 octets, SHA-256 `2ba024b6e93962b643eff454db0f48f5927a1c4b9be664586942a517a9b21b0d`. La signature et le fonctionnement physique SideStore restent à confirmer par l’utilisateur.
- Promotion : original PNG, APNG 12 images et vidéo verticale H.264 1080×1920, 30 images/s disponibles dans le catalogue public après la disponibilité des quatre distributions annoncées. Les trois assets et les cinq historiques ont été contrôlés en ligne.

## Fonctions

1. Immersion : lit le cache des synchronisations déjà présentes au démarrage du module. Tests classique/Highlight, suivi et reprise sur trois plateformes simulées.
2. Volume iOS : gain maître Web Audio indépendant du gain des fondus. Test de signal réel avec volume HTML simulé non modifiable : rapport demi-volume/plein volume 0,502 ; silence effectif à zéro. Confirmation physique iOS à faire.
3. Marges mobiles : commandes recentrées avec zones sûres. Contrôles des largeurs 393 et 320 px.
4. Contribution « Posé à la place » : conserve les données modernes de studio ; empêche la préécoute avant disponibilité des données et de l’audio. Parcours testé avec une copie privée de la proposition 41. Aucune approbation réelle effectuée. Cette correction Créateur n’apparaît pas dans les notes publiques.
5. Dynamic Island : rendu en Text natif concret, sans vue Animatable personnalisée ni transition d’opacité. Largeur compacte bornée ; captures réelles du simulateur. Les deux modes classique et Highlight ont passé le contrôle natif dans l’exécution 38898712492. Deux erreurs de classification du test ont été corrigées : son cadrage excluait l’icône à gauche, puis son décompte ne reconnaissait que les lettres blanches. Le détecteur final accepte les captures réelles classiques et roses, et rejette une capsule vide, une icône seule et l’absence de capsule. La confirmation physique après signature SideStore reste à faire.
6. Réapparition des anciennes phrases : supprime la transition d’opacité de la ligne qui se superposait à la sortie lettre par lettre.
7. Découpe/fondus Créateur : poignées sur l’onde, durée conservée, deux curseurs de fondus, aperçu du passage et de sa fin ; champs précis facultatifs. Tests de sélection, erreurs de bornes, clavier, glissement hors zone et restauration. L’audio Archive.org est inchangé. Outil privé exclu des notes publiques.

## Vérifications

- Tests Windows : 27/27 ; Android : 19/19 ; iOS interface/stockage/mises à jour : 28/28.
- Tests de composition/lecteur/découpe : 1440, 393 et 320 px.
- Résultats et captures : `outputs/20v00-1/`.
- Ne jamais publier `outputs/20v00-1/submission-41.json` : copie privée servant au test.

## Publication et incidents corrigés

- Premier envoi du correctif : commit `174b039b93fb368b309c7e8ef978d2ac7c7d4a74`.
- Android : commit `c02907d28c60c7b50289dca821c7151ae8055fee`.
- Le premier job Windows a compilé et vérifié les paquets, puis échoué en créant la release (403). La publication sait désormais vérifier qu’une avance de main ne change aucun fichier du produit Windows avant de retenter sur ce commit précis. La deuxième exécution est réussie.
- Les 35 objets temporaires du transport Android ont été supprimés et leur accès contrôlé. La fonction `release-stage` est retirée et renvoie HTTP 410. Aucun secret ajouté au dépôt.
- La publication 20.0 a été marquée comme effectuée manuellement, conformément à la confirmation de l’utilisateur, pour éviter un renvoi automatique.

## Publication promotionnelle externe

- Le catalogue promotionnel et l’historique complet sont en ligne : commit `7eb6229cceeafc92e4be039379ed2038810e8078`, déploiement Pages `38900417533` réussi.
- L’envoi automatique a été déclenché après contrôle du catalogue, des trois assets et des cinq historiques. Le worker répond HTTP 502 sans confirmer de publication. Le contrôle séparé de Buffer répond HTTP 429 et a indiqué un délai de 11 879 secondes. Aucun post TikTok confirmé ; le cron existant conserve la reprise automatique. Ne pas déclarer la vidéo publiée ni la considérer comme acceptée dans une file Buffer.
- Le serveur local de test du port 8806 a été arrêté. Les exécutables, scripts et preuves restent dans ce dossier du Bureau.

## Preuves finales iOS

- Exécution de compilation/publication réussie : `38898712492` ; code source `60d1511e461351f8bd93c8549f740bc6fb9c78de`.
- Classique : 10 relevés en arrière-plan, 6 phrases distinctes, position de 29,8 à 75,7 secondes ; rendu visible dans la capture réelle.
- Highlight : 10 relevés en arrière-plan, 6 phrases distinctes, position de 14,1 à 60,7 secondes ; rendu rose visible dans la capture réelle.
- Le paquet iPhone/iPad, son extension et son empreinte ont été vérifiés avant la publication publique.
- Captures et journaux du simulateur : `outputs/20v00-1/island-final/` ; relevés structurés : `outputs/20v00-1/native-verification.json`.
