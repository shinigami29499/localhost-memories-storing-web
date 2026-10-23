# Database initialization script for ShinigaCim (PostgreSQL)
param(
    [string]$DbName = "shinigacim_db",
    [string]$Host = "localhost",
    [int]$Port = 5432,
    [string]$DbUser = "postgres",
    [string]$PsqlPath = "",   # optional explicit path to psql.exe, e.g. E:\DB\PostgreSQL\18\bin\psql.exe
    [switch]$SkipDatabaseCreate
)

$ErrorActionPreference = "Stop"

Write-Host "Initializing ShinigaCim Database (PostgreSQL)..." -ForegroundColor Cyan

# Locate psql
$psql = $PsqlPath
if ([string]::IsNullOrWhiteSpace($psql)) {
    $psql = "psql"
}

if (-NOT $SkipDatabaseCreate) {
    Write-Host "Creating database '$DbName' (ignored if it already exists)..." -ForegroundColor Yellow
    $env:PGPASSWORD = $env:PGPASSWORD ?? (Read-Host -Prompt "PostgreSQL password for $DbUser")
    & $psql -U $DbUser -h $Host -p $Port -d postgres -c "CREATE DATABASE $DbName;" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Database may already exist (or psql is not on PATH). Continuing with migrations." -ForegroundColor Yellow
    }
}

Push-Location (Join-Path $PSScriptRoot "..")

try {
    Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
    dotnet restore

    Write-Host "Applying EF Core migrations..." -ForegroundColor Yellow
    dotnet ef database update --project ShinigaCim.Data --startup-project ShinigaCim.Api

    Write-Host "Database initialized. Migrations applied. Admin seeding happens on API startup (Seed section of appsettings.json)." -ForegroundColor Green
}
finally {
    Pop-Location
}
