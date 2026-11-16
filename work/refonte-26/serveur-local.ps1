# Mini-serveur local pour prévisualiser le site (racine = dossier depot). Usage : powershell -File serveur-local.ps1 [-Port 8126]
param([int]$Port = 8126)
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.webp'='image/webp'; '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.mp4'='video/mp4'; '.woff2'='font/woff2'; '.ico'='image/x-icon' }
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serveur prêt : http://localhost:$Port/ (racine $root)"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    # Fabrication des affiches : la page dessinée dans le navigateur envoie ses images (PNG) ici.
    # Écriture autorisée seulement dans work/refonte-26/affiche/sortie, noms simples uniquement.
    if ($ctx.Request.HttpMethod -eq 'POST') {
      $out = Join-Path $root 'work\refonte-26\affiche\sortie'
      $name = [System.IO.Path]::GetFileName($rel)
      if ($rel -like 'work/refonte-26/affiche/sortie/*' -and $name -match '^[a-zA-Z0-9_.-]+\.png$') {
        New-Item -ItemType Directory -Force -Path $out | Out-Null
        $ms = [System.IO.MemoryStream]::new(); $ctx.Request.InputStream.CopyTo($ms)
        [System.IO.File]::WriteAllBytes((Join-Path $out $name), $ms.ToArray())
        $ctx.Response.StatusCode = 204
      } else { $ctx.Response.StatusCode = 403 }
      continue
    }
    if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
    $path = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $path.StartsWith($root) -or -not (Test-Path $path -PathType Leaf)) {
      $ctx.Response.StatusCode = 404
    } else {
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch { $ctx.Response.StatusCode = 500 }
  finally { $ctx.Response.Close() }
}
