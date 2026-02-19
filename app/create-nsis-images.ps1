Add-Type -AssemblyName System.Drawing

# Charger l'image source
$img = [System.Drawing.Image]::FromFile("$PSScriptRoot\public\big_logo.png")

# Créer une image BMP pour NSIS header (164x314)
$bitmap = New-Object System.Drawing.Bitmap(164, 314)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)

# Redimensionner et coller l'image
$scaledImg = New-Object System.Drawing.Bitmap($img, 164, 314)
$graphics.DrawImage($scaledImg, 0, 0)

# Sauvegarder en BMP
$bitmap.Save("$PSScriptRoot\build\installer-header.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$graphics.Dispose()
$bitmap.Dispose()
$scaledImg.Dispose()
$img.Dispose()

Write-Host "✅ BMP créé : $PSScriptRoot\build\installer-header.bmp"
