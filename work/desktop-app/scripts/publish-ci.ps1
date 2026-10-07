$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskPackage=Get-Content (Join-Path $PSScriptRoot '../package.json') -Raw | ConvertFrom-Json
$taskVersion=$taskPackage.version
$taskReleaseId=(Get-Content (Join-Path $PSScriptRoot '../release.json') -Raw | ConvertFrom-Json).releaseId
$taskTag="v$taskVersion"
$taskNotesPath=Join-Path $PSScriptRoot "../NOTES-$taskReleaseId.md"
if (-not (Test-Path -LiteralPath $taskNotesPath -PathType Leaf)) { throw "Release notes missing: $taskNotesPath" }
$taskReleaseOutput=Join-Path $taskRoot 'outputs/application-windows'
$taskUpdateOutput=Join-Path $taskRoot "outputs/application-windows-$taskVersion/update-assets"
$taskManifestPath=Join-Path $taskUpdateOutput "Avant-Usine-Mise-a-jour-$taskVersion.json"
$taskManifest=Get-Content $taskManifestPath -Raw | ConvertFrom-Json
if ($taskManifest.version -ne $taskVersion) { throw 'Manifest version mismatch' }
$taskFiles=@(Get-ChildItem -LiteralPath $taskUpdateOutput -File)
$taskNames=@("Avant-Usine-Installation-$taskVersion.exe","Avant-Usine-Portable-$taskVersion.exe","Avant-Usine-Site-$taskReleaseId.zip","Avant-Usine-Sources-Windows-$taskVersion.zip",'livraison.json')
foreach ($taskName in $taskNames) {
    $taskFile=Get-Item -LiteralPath (Join-Path $taskReleaseOutput $taskName)
    $taskFiles+= $taskFile
}
$taskExpected=@{}
foreach ($taskFile in $taskFiles) {
    $taskExpected[$taskFile.Name]=@{bytes=$taskFile.Length;sha256=(Get-FileHash -LiteralPath $taskFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
}
foreach ($taskEntry in $taskManifest.files) {
    $taskName=[System.IO.Path]::GetFileName(([uri]$taskEntry.url).AbsolutePath)
    if (-not $taskExpected.ContainsKey($taskName) -or $taskExpected[$taskName].bytes -ne $taskEntry.bytes -or $taskExpected[$taskName].sha256 -ne $taskEntry.sha256) { throw "Invalid update asset: $taskName" }
}
$taskExisting=gh release view $taskTag --json isDraft 2>$null
if ($LASTEXITCODE -eq 0) {
    $taskExistingRelease=$taskExisting | ConvertFrom-Json
    if (-not $taskExistingRelease.isDraft) { throw 'This version is already public; do not overwrite it' }
} else {
    gh release create $taskTag --draft --target $env:RELEASE_COMMIT --title "Avant l’usine — Windows $taskVersion · $taskReleaseId" --notes-file $taskNotesPath
    if ($LASTEXITCODE -ne 0) { throw 'Draft creation failed' }
}
$taskPaths=@($taskFiles | ForEach-Object { $_.FullName })
gh release upload $taskTag @taskPaths --clobber
if ($LASTEXITCODE -ne 0) { throw 'Upload failed; release remains private' }
$taskReleaseList=gh api "repos/${env:GH_REPO}/releases?per_page=100" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Release listing failed' }
$taskRemote=@($taskReleaseList | Where-Object { $_.tag_name -eq $taskTag }) | Select-Object -First 1
if ($LASTEXITCODE -ne 0 -or -not $taskRemote.draft) { throw 'Draft verification failed' }
if ($taskRemote.assets.Count -ne $taskExpected.Count) { throw 'Incomplete or unexpected release assets' }
foreach ($taskAsset in $taskRemote.assets) {
    if (-not $taskExpected.ContainsKey($taskAsset.name)) { throw "Unexpected asset $($taskAsset.name)" }
    $taskCheck=$taskExpected[$taskAsset.name]
    if ($taskAsset.size -ne $taskCheck.bytes -or $taskAsset.digest -ne "sha256:$($taskCheck.sha256)") { throw "Remote integrity mismatch: $($taskAsset.name)" }
}
gh release edit $taskTag --draft=false --latest
if ($LASTEXITCODE -ne 0) { throw 'Publication failed' }
$taskPublic=gh release view $taskTag --json isDraft,url | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $taskPublic.isDraft) { throw 'Public release not confirmed' }
Write-Host "Published verified release: $($taskPublic.url)"
