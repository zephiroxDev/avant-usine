#!/usr/bin/env bash
# Étiquette de version sur tous les fichiers de la v26, à lancer avant chaque publication.
# Ajoute (ou remplace) « ?v=<version> » sur chaque import JavaScript et sur les liens de index.html,
# pour que les navigateurs ne mélangent jamais d'anciens et de nouveaux fichiers après une mise à jour.
set -euo pipefail
cd "$(dirname "$0")/../../v26"
V="${1:-$(date +%Y%m%d%H%M)}"
# Imports statiques et dynamiques : from './x.js' / import('./x.js') / import('../../x.mjs')
find js -name '*.js' -print0 | xargs -0 sed -i -E \
  "s#((from|import\(|import) *['\"])(\.{1,2}/[^'\"?]+\.m?js)(\?v=[0-9A-Za-z]+)?(['\"])#\1\3?v=${V}\5#g"
# Page d'entrée : feuille de style et script principal.
sed -i -E "s#(href=\"css/app\.css)(\?v=[0-9A-Za-z]+)?\"#\1?v=${V}\"#; s#(src=\"js/main\.js)(\?v=[0-9A-Za-z]+)?\"#\1?v=${V}\"#" index.html
echo "Version ${V} appliquée."
