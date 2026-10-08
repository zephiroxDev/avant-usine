# Avant l’usine — Windows 0.4.1 · 18V00

Albums, playlists, pochettes, paroles et exports personnels sur l’appareil.

- Nouvel onglet Local séparé du catalogue public : fichiers personnels stockés sur l’appareil via IndexedDB, sans compte ni transfert aux serveurs. Message explicatif à chaque ouverture et rappel de sauvegarde.
- Import de fichiers ou dossiers audio, choix morceaux séparés ou album lors d’un import multiple ; titres et métadonnées intégrées MP3/FLAC détectés lorsque disponibles.
- Albums et playlists personnalisés : sélection des morceaux, ordre avec flèches, ajouts, retraits, renommage et suppression à tout moment. Numérotation recalculée sans modifier les titres. Favoris locaux indépendants du compte.
- Pochettes classiques et animées choisies dans les fichiers de l’appareil. Vérification des dimensions, confirmation pour les formats non carrés et redimensionnement sans recadrage. Pochette d’album ou individuelle et application à tous les morceaux.
- Paroles locales simples et synchronisées : import LRC/JSON, choix simple ou Highlight détaillé, lecture synchronisée et Atelier sans contribution publique, vitesses 0,50×/0,75×/1×/2× et brouillons sur l’appareil.
- Export ZIP des albums dans l’ordre : copies audio, pochettes et métadonnées, avec aucun fichier de paroles, LRC, JSON ou les deux. Tags MP3, WAV et FLAC réécrits dans les copies ; autres formats conservés avec métadonnées JSON. Originaux intacts.
- Infos, fonctionnalités & astuces complété dans Lire le reste ; indice initial et phrase cachée conservés.

La bibliothèque Local reste sur cet appareil. Exporter les albums pour sauvegarder ses fichiers. Mise à jour des fichiers via Installer à partir de 0.2.0 ; migration initiale requise pour 0.1.x.

Compatibilité : le nom des albums importés se saisit dans le panneau Local, sans fenêtre prompt(). Toutes les nouveautés Local de 0.4.0 sont incluses.
