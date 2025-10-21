# ORK Deploy - Deploy to target platform with post-verify and rollback
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("vercel", "aws", "azure")]
    [string]$Target,
    [switch]$Confirm,
    [switch]$Prod = $false,
    [string]$Checklist = "checklists/auth.yaml",
    [string]$ProjectName = "LeadGenLite",
    [string]$AppDir = "apps/web"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $PSCommandPath
$root = Split-Path -Parent $scriptDir
$timestamp = Get-Date -Format "yyyyMMddTHHmmss"
$logFile = Join-Path $root "artifacts\logs\deploy-$timestamp.txt"

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "HH:mm:ss"
    $line = "[$ts] $Message"
    Write-Host $line
    $line | Out-File -FilePath $logFile -Append -Encoding utf8
}

# Create log file
New-Item -ItemType File -Path $logFile -Force | Out-Null
"=== ORK Deploy - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -FilePath $logFile -Encoding utf8

Write-Log "[INFO] Deploy target: $Target"

if (-not $Confirm) {
    Write-Log "[ERR] Deploy requires -Confirm flag for safety"
    exit 1
}

# Load VERCEL_TOKEN from .env
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
    Write-Log "[ERR] .env file not found"
    exit 1
}

$tokenLine = Get-Content $envFile | Where-Object { $_ -match 'VERCEL_TOKEN=(.+)' } | Select-Object -First 1
if ($tokenLine -match 'VERCEL_TOKEN=(.+)') {
    $env:VERCEL_TOKEN = $Matches[1].Trim()
    Write-Log "[OK] VERCEL_TOKEN loaded"
} else {
    Write-Log "[ERR] VERCEL_TOKEN not found in .env"
    exit 1
}

# Navigate to app directory
$appPath = Join-Path $root $AppDir
if (-not (Test-Path $appPath)) {
    Write-Log "[ERR] App directory not found: $appPath"
    exit 1
}

Push-Location $appPath
Write-Log "[INFO] Working directory: $appPath"

# Step 1: Verify or link project
Write-Log "[INFO] Step 1: Verify Vercel project linkage"
$vercelDir = Join-Path $appPath ".vercel"
if (-not (Test-Path (Join-Path $vercelDir "project.json"))) {
    Write-Log "[WARN] .vercel/project.json not found - will be created on first deploy"
}

# Step 2: Build the app
Write-Log "[INFO] Step 2: Building application"
npm run build 2>&1 | Out-File -FilePath $logFile -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) {
    Write-Log "[ERR] Build failed with exit code $LASTEXITCODE"
    Pop-Location
    exit 1
}
Write-Log "[OK] Build successful"

# Step 3: Deploy
Write-Log "[INFO] Step 3: Deploying to Vercel"
if ($Prod) {
    Write-Log "[WARN] Deploying to PRODUCTION"
    $deployOutput = vercel deploy --prod --name $ProjectName --yes 2>&1
} else {
    Write-Log "[INFO] Deploying to PREVIEW"
    $deployOutput = vercel deploy --name $ProjectName --yes 2>&1
}

$deployOutput | ForEach-Object { Write-Log $_ }

# Extract URL from deploy output
$deployUrl = $null
foreach ($line in $deployOutput) {
    if ($line -match '(https://[^\s]+\.vercel\.app)') {
        $deployUrl = $Matches[1]
    }
}

if (-not $deployUrl) {
    Write-Log "[ERR] Could not extract deploy URL from output"
    Pop-Location
    exit 1
}

Write-Log "[OK] Deploy successful"
Write-Log "[INFO] Deploy URL: $deployUrl"

# Save deploy URL
$deployUrlFile = Join-Path $root "workspace\deploy-url.txt"
$deployUrl | Set-Content $deployUrlFile -Encoding utf8

# Verify project.json was created
$projectJson = Join-Path $vercelDir "project.json"
if (Test-Path $projectJson) {
    $config = Get-Content $projectJson -Raw | ConvertFrom-Json
    if ($config.projectId) { Write-Log "[INFO] Project ID: $($config.projectId)" }
    if ($config.orgId) { Write-Log "[INFO] Org ID: $($config.orgId)" }
}

Pop-Location

# Step 4: Run post-verify checklist
Write-Log "[INFO] Step 4: Running post-verification"
$checklistPath = Join-Path $root $Checklist
if (Test-Path $checklistPath) {
    Push-Location $root
    .\scripts\ork-verify.ps1 -Checklist $checklistPath -BaseUrl $deployUrl 2>&1 | Out-File -FilePath $logFile -Append -Encoding utf8
    $verifyExitCode = $LASTEXITCODE
    Pop-Location

    if ($verifyExitCode -ne 0) {
        Write-Log "[WARN] Post-verification failed (exit code: $verifyExitCode)"
        Write-Log "[INFO] Consider rollback if production deploy"
        # TODO: Implement rollback logic
        # vercel rollback --yes
    } else {
        Write-Log "[OK] Post-verification passed"
    }
} else {
    Write-Log "[WARN] Checklist not found: $checklistPath - skipping post-verify"
}

# Print summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "Deploy URL: $deployUrl" -ForegroundColor Cyan
Write-Host "Log: $logFile" -ForegroundColor Gray
Write-Host ""

exit 0
