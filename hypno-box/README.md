# Hypno Box — sources

- `base.html` : socle publié (menu, musique, options, vidéo) sans jeu.
- `g01-alchimie.js`… : un jeu par fichier, via `HB.game({...})`.
- `python3 build.py` produit `index.html` (insère les jeux avant le script « App shell »).
- `node test.cjs <id> <secondes>` / `node test2.cjs alchimie` : essais Playwright.
