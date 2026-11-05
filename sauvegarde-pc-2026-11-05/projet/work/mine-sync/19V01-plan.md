# 19V01 — Maintenance des fonctionnalités

Demande confirmée : fermer tout l’Atelier pour réparation, sauf le compte Créateur. Ajouter un panneau privé permettant de fermer réellement toutes les fonctionnalités, séparément ou globalement, avec une raison personnalisée. Le Créateur conserve son accès.

## Contrat

- Réglages persistants partagés entre site, Windows, Android et iOS.
- Fermeture globale et fermeture indépendante de chaque page et fonction, y compris sous-fonctions et accès directs.
- Les fonctions publiques restent visibles avec une explication quand elles sont fermées.
- L’Atelier démarre fermé : « L’Atelier de synchronisation est temporairement fermé pour réparation. »
- Aucun brouillon, fichier ni contenu publié n’est supprimé.
- Le contrôle Créateur repose sur le rôle serveur existant, pas sur une donnée du fichier ou du navigateur.
- Le panneau de gestion et la déconnexion restent accessibles au Créateur même pendant une fermeture globale.
- Les Patch Notes et l’affiche publique ne présentent pas le panneau privé Créateur.

## Livraison à réaliser

1. Inventorier toutes les pages, commandes, sous-fonctions, lecteurs et RPC.
2. Implémenter registre explicite + contrôles UI + état serveur et barrières RPC.
3. Tester public/modérateur/Créateur, accès directs, fermeture en cours d’utilisation, réouverture et messages.
4. Notes 19V01, astuces, affiche animée Gestion promo, copies communes et versions natives.
5. Publier indépendamment chaque plateforme prête et vérifier les distributions.

État : livraison terminée. Site 19V01, Windows 0.5.2, Android 0.2.1 et iOS 1.1.2 publics. Backend actif ; Atelier fermé sauf Créateur. Contrôles de permissions, 12 rendus, Gestion promo, signature Android, manifest Windows et fichiers embarqués des distributions vérifiés. Rapports : outputs/19v01/delivery-complete.json.
