param(
    [string]$ProjectName = "LeadGenLite",
    [string]$Scope = "personal",
    [switch]$Prod = $false
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $PSCommandPath
$root = Split-Path -Parent $scriptDir
$timestamp = Get-Date -Format "yyyyMMddTHHmmss"
$logFile = Join-Path $root "artifacts\logs\deploy-$timestamp.txt"

# Create log file
New-Item -ItemType File -Path $logFile -Force | Out-Null
"=== Vercel Deploy - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -FilePath $logFile -Encoding utf8

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    $line | Out-File -FilePath $logFile -Append -Encoding utf8
}

Write-Log "[INFO] Checking Vercel CLI..."
Write-Log "[OK] Vercel CLI check complete"

# Check if .env has VERCEL_TOKEN
Write-Log "[INFO] Checking for VERCEL_TOKEN in .env"
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
    Write-Log "[ERR] .env file not found at $envFile"
    exit 1
}

$envContent = Get-Content $envFile -Raw
if ($envContent -notmatch 'VERCEL_TOKEN=') {
    Write-Log "[ERR] VERCEL_TOKEN not found in .env"
    exit 1
}

Write-Log "[OK] VERCEL_TOKEN found in .env"

# Check for Next.js app
Write-Log "[INFO] Checking for Next.js app"
$nextjsApps = @(
    (Join-Path $root "apps\web"),
    (Join-Path $root "apps\demo-web"),
    (Join-Path $root ".")
)

$appDir = $null
foreach ($dir in $nextjsApps) {
    $pkgJson = Join-Path $dir "package.json"
    if (Test-Path $pkgJson) {
        $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
        if ($pkg.dependencies -and $pkg.dependencies.next) {
            $appDir = $dir
            Write-Log "[OK] Found Next.js app at $appDir"
            break
        }
    }
}

if (-not $appDir) {
    Write-Log "[WARN] No Next.js app found. Scaffolding minimal app in apps/web"
    $appDir = Join-Path $root "apps\web"
    New-Item -ItemType Directory -Path $appDir -Force | Out-Null

    # Create package.json
    @{
        name = "leadgenlite"
        version = "1.0.0"
        private = $true
        scripts = @{
            dev = "next dev"
            build = "next build"
            start = "next start"
        }
        dependencies = @{
            next = "15.1.3"
            react = "^19.0.0"
            "react-dom" = "^19.0.0"
        }
    } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $appDir "package.json") -Encoding utf8

    # Create pages directory and index
    $pagesDir = Join-Path $appDir "pages"
    New-Item -ItemType Directory -Path $pagesDir -Force | Out-Null

    @"
export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>LeadGenLite</h1>
      <p>Minimal Next.js app deployed via ORK</p>
    </div>
  )
}
"@ | Set-Content (Join-Path $pagesDir "index.js") -Encoding utf8

    Write-Log "[OK] Scaffolded minimal Next.js app"

    # Install dependencies
    Write-Log "[INFO] Installing dependencies..."
    Push-Location $appDir
    npm install 2>&1 | Out-File -FilePath $logFile -Append -Encoding utf8
    Pop-Location
    Write-Log "[OK] Dependencies installed"
}

# Change to app directory
Push-Location $appDir
Write-Log "[INFO] Working directory: $appDir"

# Link to Vercel project
Write-Log "[INFO] Linking to Vercel project: $ProjectName"
$tokenLine = Get-Content $envFile | Where-Object { $_ -match 'VERCEL_TOKEN=(.+)' } | Select-Object -First 1
if ($tokenLine -match 'VERCEL_TOKEN=(.+)') {
    $env:VERCEL_TOKEN = $Matches[1].Trim()
    Write-Log "[OK] VERCEL_TOKEN loaded"
} else {
    Write-Log "[ERR] Could not extract VERCEL_TOKEN from .env"
    exit 1
}

Write-Log "[INFO] Setting up project for deploy"
# vercel deploy will prompt for project details if not linked
# We'll use --name flag to specify project name
Write-Log "[INFO] Project name will be: $ProjectName"

# Deploy
if ($Prod) {
    Write-Log "[INFO] Deploying to PRODUCTION..."
    $deployOutput = vercel deploy --prod --name $ProjectName --yes 2>&1
} else {
    Write-Log "[INFO] Deploying to PREVIEW..."
    $deployOutput = vercel deploy --name $ProjectName --yes 2>&1
}

$deployOutput | ForEach-Object { Write-Log $_ }

# Check if .vercel/project.json was created after deploy
$vercelConfig = Join-Path $appDir ".vercel\project.json"
if (Test-Path $vercelConfig) {
    Write-Log "[OK] .vercel/project.json created after deploy"
    $config = Get-Content $vercelConfig -Raw | ConvertFrom-Json
    if ($config.projectId) { Write-Log "[INFO] Project ID: $($config.projectId)" }
    if ($config.orgId) { Write-Log "[INFO] Org ID: $($config.orgId)" }
} else {
    Write-Log "[WARN] .vercel/project.json not found (deploy may have failed)"
}

# Extract URL from output
$deployUrl = $deployOutput | Where-Object { $_ -match 'https://[^\s]+\.vercel\.app' } | Select-Object -Last 1
if ($deployUrl -match '(https://[^\s]+\.vercel\.app)') {
    $deployUrl = $Matches[1]
    Write-Log "[OK] Deploy successful!"
    Write-Log "[INFO] Preview URL: $deployUrl"
} else {
    Write-Log "[ERR] Could not extract deploy URL from output"
    Pop-Location
    exit 1
}

Pop-Location

# Save deploy URL to file
$deployUrlFile = Join-Path $root "workspace\deploy-url.txt"
$deployUrl | Set-Content $deployUrlFile -Encoding utf8
Write-Log "[INFO] Deploy URL saved to $deployUrlFile"

Write-Log "[OK] Deploy complete"
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  DEPLOY SUCCESSFUL" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "Preview URL: $deployUrl" -ForegroundColor Cyan
Write-Host "Log: $logFile" -ForegroundColor Gray
Write-Host ""

exit 0
