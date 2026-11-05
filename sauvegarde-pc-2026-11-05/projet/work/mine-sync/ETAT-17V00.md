# Livraison 17V00 — état de reprise

## État confirmé le 5 octobre 2026

- Site 17V00 publié : commit 252729d5e68dbce6ff0c84a7e73a236ded0b5c6d, déploiement Pages 37348518403 success. Windows 0.3.0 publié le 5 octobre 2026 à 19:36 Paris, release GitHub 403967039, tag v0.3.0. Les 36 assets sont uploaded ; noms, tailles et digests SHA256 comparés aux 36 fichiers locaux avant publication, tous conformes. Manifest et 30 binaires inclus. Release latest confirmée.
- Sources Web : `work/github-sync-import/app-17v00.js`, `styles-17v00.css`, `index.html`, `sw.js`, `patch-17v00.sql`.
- Windows préparé pour 0.3.0 ; historique indépendant et identifiant 17V00. Rouage de personnalisation Windows seulement, absent des Patch Notes ; documentation dans « Lire le reste ».
- 11 tests Windows réussis. Régressions atelier, modération/prévisualisation et moteur de paroles réussies. Test du guide, métadonnées système et priorité musicale réussi.
- Migration SQL complète testée dans une transaction annulée : droits granulaires, DND, correction proposée puis approuvée par modérateur, traçabilité, vote unique, sept jours, file chronologique, retrait atomique et égalité. Résultat PASS observé dans Supabase.
- Migration 17V00 appliquée via Supabase MCP le 5 octobre 2026 après PASS du test étendu, publication directe et correction éditée incluses. Six tables RLS confirmées ; fonctions internes inaccessibles anon/authenticated ; cron avant-usine-ai-17 actif chaque minute.
- Connexion GitHub réparée : installation 168225900 sur zephiroxDev, sélection de dépôts limitée. Création des blobs, arbre, commit et mise à jour de main réussies. Supabase migration terminée.
- Le navigateur intégré demeure instable malgré un redémarrage de Codex. Ne pas contourner la permission enregistrée qui bloque le domaine public GitHub Pages.

## Opérations en cours lors de la reprise

- Session exec 16979 : release.ps1 toujours actif ; installateur 0.3.0 construit et blockmap en cours. Archive NSIS 117321820 octets observée. Ne pas relancer la compilation.
- Session exec 2640 : `git push --dry-run origin HEAD:main` avec interaction désactivée ; aucune réussite observée.
- Session exec 43061 : dernière syntaxe JS + test paramètres Windows + régression générale 17.
- Après tout redémarrage, ces identifiants peuvent devenir inconnus ; inspecter les processus et artefacts avant de relancer une compilation.

## Reste nécessaire

1. Exécuter `db-test-17.sql` après la migration à la place du COMMIT, avec remplacement par callback JS pour préserver les `$$` SQL. Observer PASS puis appliquer la vraie migration une seule fois.
2. Vérifier l’interface desktop/mobile et immersion (pochette/paroles seules au premier écran, commandes dessous). Vérifier les permissions modérateurs dans l’interface. Fournir un aperçu réel de la DA à l’utilisateur avant publication.
3. Terminer `release.ps1`, vérifier les empreintes et le manifest et sa correspondance aux fichiers. Sources Web et Windows doivent provenir du même état commun.
4. Annoncer et publier le site dès validation ; ne pas attendre Windows. Publier tous les update-assets et le manifest dans une release Windows brouillon avant publication publique.
5. Vérifier GitHub Pages et les assets disponibles, puis la release Windows et les liens dynamiques. Ne pas annoncer une livraison sans confirmation.

Ne pas rerun prepare-17.py ou integrate-17.py : ils écraseraient les corrections effectuées directement dans les sources finales.
