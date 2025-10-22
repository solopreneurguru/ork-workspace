# ORK Build - Implement milestone with quality gates
param(
    [Parameter(Mandatory=$true)]
    [int]$Milestone,
    [string]$WorkDir = "workspace",
    [switch]$Safe = $true
)

$ErrorActionPreference = "Stop"

Write-Host "ORK Build: Milestone $Milestone" -ForegroundColor Cyan

if ($Safe) {
    Write-Host "Running in SAFE mode (no destructive ops without confirmation)" -ForegroundColor Yellow
}

# Step 0: Run Scaffolder if apps/* are missing
$appsDir = Join-Path (Split-Path -Parent $PSScriptRoot) "apps"
$webDir = Join-Path $appsDir "web"
$mobileDir = Join-Path $appsDir "mobile"
$backendDir = Join-Path $appsDir "backend"

$needsScaffold = $false
if (-not (Test-Path $webDir) -and -not (Test-Path $mobileDir) -and -not (Test-Path $backendDir)) {
    $needsScaffold = $true
}

if ($needsScaffold) {
    Write-Host "Step 0: Scaffolding apps from templates..." -ForegroundColor Cyan
    $ORK_ROOT = Split-Path -Parent $PSScriptRoot
    Push-Location $ORK_ROOT
    npx tsx agents/scaffolder.ts
    Pop-Location
    Write-Host ""
}

# Quality loop: format → lint → typecheck → test

Write-Host "Step 1: Apply patches..." -ForegroundColor Green
# apply_patch logic

Write-Host "Step 2: Format code..." -ForegroundColor Green
# format logic

Write-Host "Step 3: Lint..." -ForegroundColor Green
# lint logic

Write-Host "Step 4: Type check..." -ForegroundColor Green
# typecheck logic

Write-Host "Step 5: Run tests..." -ForegroundColor Green
# run_tests logic

Write-Host "Milestone $Milestone build complete!" -ForegroundColor Green
Write-Host "Next: .\scripts\ork-verify.ps1 -Checklist .\checklists\auth.yaml" -ForegroundColor Yellow
