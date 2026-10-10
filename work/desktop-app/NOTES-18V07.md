# 18V07 · Windows 0.4.9

10 octobre 2026

- Ordre de chargement des animations fiabilisé pour éviter une erreur de démarrage lorsque le catalogue répond très vite ou hors ligne.
- Les imports Local conservent une copie autonome du contenu audio, des pochettes fixes et animées, avec vérification de leur intégrité. Ils ne dépendent plus du fichier temporaire fourni par le sélecteur.
- Les anciens fichiers encore lisibles sont convertis automatiquement. Albums, playlists et leur ordre, métadonnées, favoris, paroles, synchronisations et brouillons sont conservés.
- Un ancien audio déjà inaccessible peut être rattaché depuis sa fiche, en conservant les informations du morceau. La lecture et les exports signalent les fichiers manquants ; aucun ZIP incomplet n’est présenté comme réussi.
- La sauvegarde et la restauration protégées utilisent également ce stockage pour conserver les fichiers après fermeture et réouverture de l’application.
