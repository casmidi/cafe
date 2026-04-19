# Script Build Frontend untuk cafe.quantum.or.id
# Jalankan dari folder: d:\taskora\resto-frontend

Write-Host "=== BUILD FRONTEND cafe.quantum.or.id ===" -ForegroundColor Cyan

# Pastikan .env.production aktif
if (!(Test-Path ".env.production")) {
    Write-Host "ERROR: File .env.production tidak ditemukan!" -ForegroundColor Red
    exit 1
}

# Install dependencies jika belum
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Build dengan mode production (otomatis pakai .env.production)
Write-Host "Building production..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "BUILD SUKSES! Folder dist/ siap diupload." -ForegroundColor Green
    Write-Host ""
    Write-Host "Langkah selanjutnya:" -ForegroundColor Cyan
    Write-Host "1. Upload ISI FOLDER dist/ ke root cafe.quantum.or.id di hosting" -ForegroundColor White
    Write-Host "   (bukan folder dist-nya, tapi ISI di dalamnya)" -ForegroundColor Gray
    Write-Host "2. Pastikan .htaccess juga ikut terupload (ada di dalam dist/)" -ForegroundColor White
}
else {
    Write-Host "BUILD GAGAL! Periksa error di atas." -ForegroundColor Red
}
