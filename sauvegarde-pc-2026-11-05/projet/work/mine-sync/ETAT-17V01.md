# Avant l’usine — état de livraison 17V01

Dernière consigne : terminer et publier sans attendre l’utilisateur. Site et Windows sortent indépendamment dès validation.

## État au 6 octobre 2026

- Sources Web actives : app-17v01.js, huit modules, styles-17v01.css, index.html, sw.js.
- Windows : package/release 0.3.1, historiques propres à jour, notes neutres.
- Supabase : trois migrations 17V01 appliquées (statistiques/résumés/trophées, comparaisons, validation des mesures).
- Tests réussis : règles Paris/minuit/DST/six mois/2026 privée, écoute réelle et complétion par lecture, 276 calculs, rendu 19 catégories/276 mesures, partie Blind Test complète, permissions individuelles et révocation, immutabilité, dédoublonnage entre appareils et contenu privé.
- Onze tests Windows réussis sur GitHub ; compilation et livraison terminées.
- Site 17V01 publié et Pages confirmé : run 37389333017, succès. index.html : 28 121 octets ; 16 références locales présentes dans le dépôt.
- Sources finales : cbfa0c5ae5057a109c0b441ee97acdb120bf07c3 ; correctif du publieur : c0b040b9923e9b7b9dee56da2ead84e733a5892e.
- Windows 0.3.1 publique : release 404171214, tag v0.3.1, 45 assets vérifiés par taille et SHA256 avant publication ; endpoint latest confirmé v0.3.1. Run Windows 37389334446 terminé avec succès.
- Installateur : https://github.com/zephiroxDev/avant-usine/releases/download/v0.3.1/Avant-Usine-Installation-0.3.1.exe
- Ne pas utiliser les anciens paquets locaux 0.3.1 : la livraison GitHub a été reconstruite depuis les sources finales, après les dernières corrections.
- Envoi préparé dans outputs/publication-17v01/files.json. Les binaires Web inchangés doivent réutiliser les blobs Git existants.
- Publication Windows effectuée par .github/workflows/windows-release.yml et scripts/publish-ci.ps1 : brouillon, envoi et vérification de tous les SHA256, puis passage public. Recherche des brouillons par la liste des releases pour éviter le 404 avant création du tag public.
- Le navigateur intégré fournit l’inventaire/AX, mais les actualisations et nouvelles navigations expirent. Les tests de rendu réalisés sont des tests du code des écrans, pas une validation visuelle finale du navigateur.

## Vigilance

Ne pas relancer prepare-17v01.py (écraserait les raccordements finaux). Les scripts finish/polish/complete sont des transformations ponctuelles, pas des scripts idempotents.
Le résume 2026 reste privé ; trophées 2026 jamais exposables. 2027+ déverrouillé automatiquement selon l’année du résumé. Contenu accessible seulement au propriétaire et aux autorisations individuelles, sans exception créateur.
Une donnée absente doit afficher exactement 0 (indisponible). Historiques non enregistrés non reconstitués fictivement.
Mettre cet état à jour avec les identifiants des commits, des déploiements Pages et de la release une fois vérifiés.
