# Build script for the ShinigaCim backend solution (Api, Data, Domain, ShinigaCim.Infrastructure, Tests)
param(
    [switch]$SkipRestore
)

$ErrorActionPreference = "Stop"
Push-Location (Join-Path $PSScriptRoot "..")

try {
    Write-Host "Building ShinigaCim backend solution..." -ForegroundColor Cyan

    if (-NOT $SkipRestore) {
        Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
        dotnet restore
    }

    dotnet build --no-restore
    if ($LASTEXITCODE -ne 0) { throw "Build failed." }

    Write-Host "Build succeeded." -ForegroundColor Green
}
finally {
    Pop-Location
}
