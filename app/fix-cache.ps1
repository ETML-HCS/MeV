$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$targetDir = "$cacheDir\winCodeSign-2.6.0"
$archivePath = "$cacheDir\winCodeSign-2.6.0.7z"
$url = "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z"
$7z = "X:\Dev\f-web\mev_evaluationModule\app\node_modules\7zip-bin\win\x64\7za.exe"

Write-Host "Nettoyage de l'ancien cache..."
if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }
New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

Write-Host "1. Téléchargement de winCodeSign..."
Invoke-WebRequest -Uri $url -OutFile $archivePath

Write-Host "2. Extraction (en ignorant le dossier macOS problématique)..."
& $7z x $archivePath -o"$targetDir" -xr!darwin -y | Out-Null

Write-Host "3. Cache préparé avec succès ! Relance du build..."
cd X:\Dev\f-web\mev_evaluationModule\app
npm run build:win
