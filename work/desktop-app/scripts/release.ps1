param([string]$Python='python')
$ErrorActionPreference='Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    & $Python scripts/make-icon.py
    if ($LASTEXITCODE -ne 0) { throw 'Préparation du logo interrompue.' }
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Installation des outils interrompue.' }
    pnpm run prepare:site
    if ($LASTEXITCODE -ne 0) { throw "Préparation de l’interface interrompue." }
    & $Python scripts/prepare-update.py
    if ($LASTEXITCODE -ne 0) { throw 'Préparation des fichiers de mise à jour interrompue.' }
    pnpm test
    if ($LASTEXITCODE -ne 0) { throw "Tests Windows interrompus : ne pas publier l’application. Le site suit sa validation indépendante." }
    pnpm run build:win
    if ($LASTEXITCODE -ne 0) { throw "Compilation interrompue : ne pas publier l’application. Le site prêt peut sortir indépendamment." }
    & $Python scripts/package-release.py
    if ($LASTEXITCODE -ne 0) { throw 'Livraison incomplète : ne publier aucune version.' }
    & $Python scripts/package-sources.py
    if ($LASTEXITCODE -ne 0) { throw 'Sources de livraison incomplètes.' }
    Write-Host "Paquets Windows vérifiés et prêts. Chaque plateforme est publiée dès qu’elle est prête, avec son historique indépendant."
} finally { Pop-Location }
