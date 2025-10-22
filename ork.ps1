# ORK Orchestrator CLI v1.1
# Usage: .\ork.ps1 <command> [options]

param(
    [Parameter(Position=0)]
    [ValidateSet("doctor", "keys", "up", "down", "new", "plan", "build", "verify", "review", "deploy", "report", "help")]
    [string]$Command = "help",

    [Parameter(Position=1)]
    [string]$Project,

    [string]$Idea,
    [string]$Spec,
    [string]$Checklist,
    [string]$Suite,
    [string]$Target,
    [string]$BaseUrl,
    [int]$Milestone,
    [switch]$Confirm,
    [switch]$Safe = $true
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ORK_ROOT = $PSScriptRoot
$WORKSPACE = Join-Path $ORK_ROOT "workspace"
$SESSION_FILE = Join-Path $WORKSPACE "current-session.json"

# Helper: Print colored output
function Write-ORK {
    param([string]$Message, [string]$Type = "info")

    switch ($Type) {
        "success" { Write-Host "[OK] $Message" -ForegroundColor Green }
        "error"   { Write-Host "[ERR] $Message" -ForegroundColor Red }
        "warn"    { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
        "info"    { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
        default   { Write-Host "[INFO] $Message" }
    }
}

# Helper: Check if command exists
function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

# Helper: Get current session
function Get-CurrentSession {
    $currentFile = Join-Path $WORKSPACE "current.json"
    if (Test-Path $currentFile) {
        return Get-Content $currentFile -Raw | ConvertFrom-Json
    }
    return $null
}

# Helper: Set current session
function Set-CurrentSession {
    param($Session)

    # Ensure workspace exists
    if (-not (Test-Path $WORKSPACE)) {
        New-Item -ItemType Directory -Path $WORKSPACE -Force | Out-Null
    }

    # Write to current.json (active session pointer)
    $currentFile = Join-Path $WORKSPACE "current.json"
    $Session | ConvertTo-Json -Depth 6 | Set-Content $currentFile -Encoding utf8

    # Write to session-specific file
    if ($Session.id) {
        $sessionDir = Join-Path $WORKSPACE "sessions\$($Session.id)"
        if (-not (Test-Path $sessionDir)) {
            New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null
        }
        $sessionFile = Join-Path $sessionDir "session.json"
        $Session | ConvertTo-Json -Depth 6 | Set-Content $sessionFile -Encoding utf8
    }
}

# Command: doctor
function Invoke-Doctor {
    Write-ORK "Running system diagnostics..." "info"
    Write-Host ""

    $allPassed = $true

    # Check Git
    if (Test-Command "git") {
        $gitVersion = git --version
        Write-ORK "Git: $gitVersion" "success"
    } else {
        Write-ORK "Git: NOT FOUND - Install from https://git-scm.com" "error"
        $allPassed = $false
    }

    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = node --version
        $versionNum = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNum -ge 18) {
            Write-ORK "Node.js: $nodeVersion (>= 18)" "success"
        } else {
            Write-ORK "Node.js: $nodeVersion (< 18 required)" "error"
            $allPassed = $false
        }
    } else {
        Write-ORK "Node.js: NOT FOUND - Install from https://nodejs.org" "error"
        $allPassed = $false
    }

    # Check Docker
    if (Test-Command "docker") {
        try {
            $dockerVersion = docker --version
            $dockerRunning = docker ps 2>$null
            if ($?) {
                Write-ORK "Docker: $dockerVersion (running)" "success"
            } else {
                Write-ORK "Docker: installed but NOT RUNNING - Start Docker Desktop" "warn"
                $allPassed = $false
            }
        } catch {
            Write-ORK "Docker: installed but NOT RUNNING" "error"
            $allPassed = $false
        }
    } else {
        Write-ORK "Docker: NOT FOUND - Install from https://docker.com" "error"
        $allPassed = $false
    }

    # Check Playwright
    $playwrightPath = Join-Path $ORK_ROOT "apps\orchestrator\node_modules\playwright"
    if (Test-Path $playwrightPath) {
        Write-ORK "Playwright: Installed" "success"
    } else {
        Write-ORK "Playwright: NOT FOUND - Run 'npm install' in apps/orchestrator" "warn"
        Write-Host "   Installing now..." -ForegroundColor Yellow
        Push-Location (Join-Path $ORK_ROOT "apps\orchestrator")
        npm install
        npx playwright install chromium
        Pop-Location
        Write-ORK "Playwright: Installed" "success"
    }

    # Check .env
    $envPath = Join-Path $ORK_ROOT ".env"
    if (Test-Path $envPath) {
        $env = Get-Content $envPath
        $hasAnthropic = $env -match "ANTHROPIC_API_KEY=.+"
        $hasOpenAI = $env -match "OPENAI_API_KEY=.+"
        $hasGoogle = $env -match "GOOGLE_GENAI_API_KEY=.+"

        if ($hasAnthropic -and $hasOpenAI -and $hasGoogle) {
            Write-ORK ".env: All API keys configured" "success"
        } else {
            Write-ORK ".env: Missing some API keys - Run '.\ork.ps1 keys'" "warn"
        }
    } else {
        Write-ORK ".env: NOT FOUND - Run '.\ork.ps1 keys' to configure" "warn"
    }

    Write-Host ""
    if ($allPassed) {
        Write-ORK "All checks passed! Ready to orchestrate." "success"
    } else {
        Write-ORK "Some checks failed. Fix issues above before continuing." "error"
        exit 1
    }
}

# Command: keys
function Invoke-Keys {
    Write-ORK "Configuring API keys..." "info"
    Write-Host ""

    $envPath = Join-Path $ORK_ROOT ".env"

    # Read existing .env if present
    $existingEnv = @{}
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            if ($_ -match "^([^=]+)=(.*)$") {
                $existingEnv[$matches[1]] = $matches[2]
            }
        }
    }

    # Prompt for keys
    Write-Host "Enter API keys (press Enter to skip/keep existing):" -ForegroundColor Cyan
    Write-Host ""

    $anthropicKey = Read-Host "ANTHROPIC_API_KEY"
    if (-not $anthropicKey -and $existingEnv["ANTHROPIC_API_KEY"]) {
        $anthropicKey = $existingEnv["ANTHROPIC_API_KEY"]
    }

    $openaiKey = Read-Host "OPENAI_API_KEY"
    if (-not $openaiKey -and $existingEnv["OPENAI_API_KEY"]) {
        $openaiKey = $existingEnv["OPENAI_API_KEY"]
    }

    $googleKey = Read-Host "GOOGLE_GENAI_API_KEY"
    if (-not $googleKey -and $existingEnv["GOOGLE_GENAI_API_KEY"]) {
        $googleKey = $existingEnv["GOOGLE_GENAI_API_KEY"]
    }

    $vercelToken = Read-Host "VERCEL_TOKEN (optional)"
    if (-not $vercelToken -and $existingEnv["VERCEL_TOKEN"]) {
        $vercelToken = $existingEnv["VERCEL_TOKEN"]
    }

    # Write .env
    $envContent = @"
# ORK Orchestrator API Keys
ANTHROPIC_API_KEY=$anthropicKey
OPENAI_API_KEY=$openaiKey
GOOGLE_GENAI_API_KEY=$googleKey
VERCEL_TOKEN=$vercelToken

# Orchestrator Config
ORCHESTRATOR_PORT=3001
NODE_ENV=development

# Safety & Budgets
ALLOW_DESTRUCTIVE_OPS=false
REQUIRE_CONFIRMATION=true
MAX_STEPS_PER_AGENT=100
MAX_TOKENS_PER_AGENT=100000
TIMEOUT_SECONDS=3600
"@

    Set-Content -Path $envPath -Value $envContent

    Write-Host ""
    Write-ORK ".env file created successfully" "success"
    Write-Host "Keys saved (masked):" -ForegroundColor Green
    Write-Host "  ANTHROPIC_API_KEY=$($anthropicKey.Substring(0, [Math]::Min(10, $anthropicKey.Length)))***" -ForegroundColor Gray
    Write-Host "  OPENAI_API_KEY=$($openaiKey.Substring(0, [Math]::Min(10, $openaiKey.Length)))***" -ForegroundColor Gray
    Write-Host "  GOOGLE_GENAI_API_KEY=$($googleKey.Substring(0, [Math]::Min(10, $googleKey.Length)))***" -ForegroundColor Gray
}

# Command: up
function Invoke-Up {
    Write-ORK "Starting ORK orchestrator services..." "info"

    Push-Location $ORK_ROOT

    # Build TypeScript
    Write-ORK "Building orchestrator..." "info"
    Push-Location "apps\orchestrator"
    npm run build
    Pop-Location

    # Start Docker Compose
    docker compose up -d

    Write-Host ""
    Write-ORK "Services started!" "success"
    Write-Host ""
    Write-Host "  Orchestrator API: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  Observer UI:      http://localhost:3002" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Run '.\ork.ps1 down' to stop services" -ForegroundColor Gray

    Pop-Location
}

# Command: down
function Invoke-Down {
    Write-ORK "Stopping ORK orchestrator services..." "info"

    Push-Location $ORK_ROOT
    docker compose down
    Pop-Location

    Write-ORK "Services stopped" "success"
}

# Command: new
function Invoke-New {
    param([string]$Project, [string]$Idea, [string]$Spec)

    # Must have either -Spec or -Idea
    if (-not $Spec -and -not $Idea) {
        Write-ORK "Spec or Idea required: use -Spec <path> or -Idea '<prose>'" "error"
        exit 1
    }

    # If using -Spec, Project name is derived from spec
    # If using -Idea, Project name is optional (derived from AI-generated spec)

    # STEP 1: Parse BuildSpec (from file or AI-generated from idea)
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  ORK ORCHESTRATOR - BUILDSPEC PARSING" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""

    if ($Spec) {
        Write-ORK "Parsing BuildSpec from: $Spec" "info"
        $specParseCmd = "npx tsx scripts/spec-parse.ts -spec `"$Spec`""
    } elseif ($Idea) {
        Write-ORK "Generating BuildSpec from idea..." "info"
        $specParseCmd = "npx tsx scripts/spec-parse.ts -idea `"$Idea`""
    }

    # Run spec-parse.ts
    $specOutput = Invoke-Expression $specParseCmd 2>&1
    $specExitCode = $LASTEXITCODE

    # Print output
    $specOutput | ForEach-Object { Write-Host $_ }

    if ($specExitCode -ne 0) {
        Write-ORK "BuildSpec parsing failed" "error"
        exit 1
    }

    # Load normalized spec
    $specJsonPath = Join-Path $ORK_ROOT "workspace\spec.json"
    if (-not (Test-Path $specJsonPath)) {
        Write-ORK "workspace/spec.json not found after parsing" "error"
        exit 1
    }

    $buildSpec = Get-Content $specJsonPath -Raw | ConvertFrom-Json

    # Use project name from spec if not provided
    if (-not $Project) {
        $Project = $buildSpec.name
        Write-ORK "Using project name from BuildSpec: $Project" "info"
    }

    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
    Write-Host ""

    # STEP 2: Create session
    # Generate session ID
    $sessionId = (New-Guid).Guid.Substring(0, 8)
    $timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"

    # Setup paths
    $ORK_ROOT = Split-Path -Parent $PSCommandPath
    $sessionDir = Join-Path $ORK_ROOT "workspace\sessions\$sessionId"
    $logFile = Join-Path $ORK_ROOT "artifacts\logs\new-$timestamp.txt"

    # Create directories
    if (-not (Test-Path $sessionDir)) {
        New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null
    }

    $logsDir = Join-Path $ORK_ROOT "artifacts\logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }

    # Create session object
    $session = @{
        id = $sessionId
        project = $Project
        idea = if ($Idea) { $Idea } else { "BuildSpec: $Spec" }
        spec = $buildSpec
        created_at = (Get-Date).ToString('s')
        status = 'PLAN'
        artifacts_dir = (Join-Path $ORK_ROOT 'artifacts')
        log_file = $logFile
    }

    # Save session
    Set-CurrentSession $session

    # Start logging
    "=== ORK NEW Pipeline - $timestamp ===" | Out-File -FilePath $logFile -Encoding utf8
    "Session: $sessionId" | Out-File -FilePath $logFile -Append -Encoding utf8
    "Project: $Project" | Out-File -FilePath $logFile -Append -Encoding utf8
    "Spec: $Idea" | Out-File -FilePath $logFile -Append -Encoding utf8
    "" | Out-File -FilePath $logFile -Append -Encoding utf8

    # Print header
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  ORK ORCHESTRATOR - NEW PROJECT PIPELINE" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-ORK "Project: $Project" "info"
    Write-ORK "Spec: $Idea" "info"
    Write-ORK "Session: $sessionId" "info"
    Write-Host ""
    Write-ORK "Session directory: $sessionDir" "success"
    Write-ORK "Log file: $logFile" "info"
    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Gray

    try {
        # PLAN
        Write-Host ""
        Write-Host ">> STEP 1/5: PLAN" -ForegroundColor Cyan
        "STEP 1: PLAN - $(Get-Date -Format 'HH:mm:ss')" | Out-File -FilePath $logFile -Append -Encoding utf8
        Invoke-Plan
        "PLAN completed" | Out-File -FilePath $logFile -Append -Encoding utf8

        # BUILD
        Write-Host ""
        Write-Host ">> STEP 2/5: BUILD" -ForegroundColor Cyan
        "STEP 2: BUILD - $(Get-Date -Format 'HH:mm:ss')" | Out-File -FilePath $logFile -Append -Encoding utf8
        Invoke-Build -Milestone 1
        "BUILD completed" | Out-File -FilePath $logFile -Append -Encoding utf8

        # VERIFY
        Write-Host ""
        Write-Host ">> STEP 3/5: VERIFY" -ForegroundColor Cyan
        "STEP 3: VERIFY - $(Get-Date -Format 'HH:mm:ss')" | Out-File -FilePath $logFile -Append -Encoding utf8
        Invoke-Verify -Checklist (Join-Path $ORK_ROOT "checklists\auth.yaml") -BaseUrl "http://ork-demo-web:3000"
        "VERIFY completed" | Out-File -FilePath $logFile -Append -Encoding utf8

        # REVIEW
        Write-Host ""
        Write-Host ">> STEP 4/5: REVIEW" -ForegroundColor Cyan
        "STEP 4: REVIEW - $(Get-Date -Format 'HH:mm:ss')" | Out-File -FilePath $logFile -Append -Encoding utf8
        Invoke-Review
        "REVIEW completed" | Out-File -FilePath $logFile -Append -Encoding utf8

        # Optional DEPLOY - skip if "skip deploy" in idea
        if ($Idea -notmatch 'skip deploy') {
            Write-Host ""
            Write-Host ">> STEP 5/5: DEPLOY (optional)" -ForegroundColor Cyan
            $deployChoice = Read-Host "Deploy to production? (y/N)"
            if ($deployChoice -eq "y") {
                "DEPLOY - User chose YES - $(Get-Date -Format 'HH:mm:ss')" | Out-File -FilePath $logFile -Append -Encoding utf8
                Invoke-Deploy -Target "vercel" -Confirm
                "DEPLOY completed" | Out-File -FilePath $logFile -Append -Encoding utf8
            } else {
                "DEPLOY - User chose NO - skipped" | Out-File -FilePath $logFile -Append -Encoding utf8
                Write-ORK "Deploy skipped" "info"
            }
        } else {
            Write-Host ""
            Write-Host ">> STEP 5/5: DEPLOY (skipped per spec)" -ForegroundColor Yellow
            "DEPLOY - Skipped per project spec" | Out-File -FilePath $logFile -Append -Encoding utf8
        }

        # REPORT
        Write-Host ""
        Write-Host ">> FINAL: REPORT" -ForegroundColor Cyan
        "REPORT - $(Get-Date -Format 'HH:mm:ss')" | Out-File -FilePath $logFile -Append -Encoding utf8
        Invoke-Report
        "REPORT completed" | Out-File -FilePath $logFile -Append -Encoding utf8

        Write-Host ""
        Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host "  SUCCESS - PROJECT COMPLETE!" -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host ""
        Write-ORK "Project: $Project" "success"
        Write-ORK "Session: $sessionId" "info"
        Write-ORK "Log: $logFile" "info"

        "Pipeline completed successfully - $(Get-Date -Format 'HH:mm:ss')" | Out-File -FilePath $logFile -Append -Encoding utf8
    }
    catch {
        "ERROR: $($_.Exception.Message)" | Out-File -FilePath $logFile -Append -Encoding utf8
        Write-ORK "Pipeline failed: $($_.Exception.Message)" "error"
        throw
    }
}

# Command: plan
function Invoke-Plan {
    $session = Get-CurrentSession
    if (-not $session) {
        Write-ORK "No active session. Run '.\ork.ps1 new <project> -Idea <spec>' first" "error"
        exit 1
    }

    Write-ORK "PLAN: Generating milestones..." "info"

    Push-Location (Join-Path $ORK_ROOT "scripts")
    .\ork-plan.ps1
    Pop-Location

    $session.status = "BUILD"
    Set-CurrentSession $session

    Write-ORK "Plan complete" "success"
}

# Command: build
function Invoke-Build {
    param([int]$Milestone = 1)

    $session = Get-CurrentSession
    if (-not $session) {
        Write-ORK "No active session" "error"
        exit 1
    }

    Write-ORK "BUILD: Implementing Milestone $Milestone..." "info"

    Push-Location (Join-Path $ORK_ROOT "scripts")
    .\ork-build.ps1 -Milestone $Milestone -Safe:$Safe
    Pop-Location

    $session.status = "VERIFY_UI"
    Set-CurrentSession $session

    Write-ORK "Build complete" "success"
}

# Command: verify
function Invoke-Verify {
    param([string]$Checklist, [string]$Suite, [string]$BaseUrl)

    # Auto suite: run appropriate tests based on BuildSpec targets
    if ($Suite -eq "auto") {
        Write-ORK "VERIFY: Running auto verification suite..." "info"

        Push-Location $ORK_ROOT
        if ($BaseUrl) {
            npx tsx scripts/verify-auto.ts --web-url $BaseUrl
        } else {
            npx tsx scripts/verify-auto.ts
        }
        Pop-Location

        # Update session if one exists
        $session = Get-CurrentSession
        if ($session) {
            $session.status = "REVIEW"
            Set-CurrentSession $session
        }

        Write-ORK "Auto verification complete" "success"
        return
    }

    # Manual checklist mode
    if (-not $Checklist) {
        $Checklist = Join-Path $ORK_ROOT "checklists\auth.yaml"
    }

    Write-ORK "VERIFY_UI: Running browser verification..." "info"

    Push-Location $ORK_ROOT
    if ($BaseUrl) {
        .\scripts\ork-verify.ps1 -Checklist $Checklist -BaseUrl $BaseUrl
    } else {
        .\scripts\ork-verify.ps1 -Checklist $Checklist
    }
    Pop-Location

    # Update session if one exists
    $session = Get-CurrentSession
    if ($session) {
        $session.status = "REVIEW"
        Set-CurrentSession $session
    }

    Write-ORK "Verification complete" "success"
}

# Command: review
function Invoke-Review {
    $session = Get-CurrentSession
    if (-not $session) {
        Write-ORK "No active session" "error"
        exit 1
    }

    Write-ORK "REVIEW: Analyzing code..." "info"

    Push-Location (Join-Path $ORK_ROOT "scripts")
    .\ork-review.ps1
    Pop-Location

    $session.status = "DEPLOY"
    Set-CurrentSession $session

    Write-ORK "Review complete" "success"
}

# Command: deploy
function Invoke-Deploy {
    param(
        [string]$Target = "vercel",
        [switch]$Confirm,
        [switch]$Prod = $false
    )

    if (-not $Confirm) {
        Write-ORK "Deploy requires -Confirm flag for safety" "error"
        exit 1
    }

    $session = Get-CurrentSession
    if (-not $session) {
        Write-ORK "No active session" "error"
        exit 1
    }

    # Auto mode: deploy based on BuildSpec targets
    if ($Target -eq "auto") {
        Write-ORK "DEPLOY: Running auto deployment..." "info"

        Push-Location $ORK_ROOT
        if ($Prod) {
            npx tsx scripts/deploy-auto.ts --production
        } else {
            npx tsx scripts/deploy-auto.ts
        }
        Pop-Location

        # Update session
        $session.status = "REPORT"
        Set-CurrentSession $session

        Write-ORK "Auto deployment complete" "success"
        return
    }

    # Manual target mode (original behavior)
    Write-ORK "DEPLOY: Deploying to $Target..." "info"

    Push-Location (Join-Path $ORK_ROOT "scripts")
    if ($Prod) {
        .\ork-deploy.ps1 -Target $Target -Confirm -Prod
    } else {
        .\ork-deploy.ps1 -Target $Target -Confirm
    }
    Pop-Location

    $session.status = "REPORT"
    Set-CurrentSession $session

    Write-ORK "Deploy complete" "success"
}

# Command: report
function Invoke-Report {
    $session = Get-CurrentSession
    if (-not $session) {
        Write-ORK "No active session" "error"
        exit 1
    }

    Write-ORK "REPORT: Generating final report..." "info"

    Push-Location (Join-Path $ORK_ROOT "scripts")
    .\ork-report.ps1
    Pop-Location

    $session.status = "DONE"
    Set-CurrentSession $session

    Write-ORK "Report generated" "success"
}

# Helper: Print viewer URL at end of command
function Show-ViewerURL {
    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "[INFO] Log Viewer: http://localhost:3002/_viewer/" -ForegroundColor Cyan
    Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
}

# Command: help
function Invoke-Help {
    Write-Host @"

ORK Orchestrator CLI v1.1
========================

USAGE:
  .\ork.ps1 <command> [options]

COMMANDS:
  doctor              Check system dependencies (Git, Node, Docker, Playwright)
  keys                Configure API keys (ANTHROPIC, OPENAI, GOOGLE_GENAI, VERCEL)
  up                  Start Docker services (orchestrator, verifier, observer)
  down                Stop Docker services
  new <project>       Create new project session with full orchestration loop
    -Idea "<spec>"      Project specification/requirements
  plan                Generate milestones and acceptance tests
  build               Implement milestone with quality gates
    -Milestone <n>      Milestone number (default: 1)
  verify              Run browser UI verification
    -Checklist <path>   Path to YAML checklist (default: checklists/auth.yaml)
  review              Run code review and static analysis
  deploy              Deploy to platform
    -Target <platform>  Platform: vercel, aws, azure (default: vercel)
    -Confirm            Required flag for safety
  report              Generate final consolidated report
  help                Show this help

EXAMPLES:
  # Initial setup
  .\ork.ps1 doctor
  .\ork.ps1 keys
  .\ork.ps1 up

  # Create new project (full loop)
  .\ork.ps1 new "TaskApp" -Idea "A task manager with auth and real-time sync"

  # Manual step-by-step
  .\ork.ps1 plan
  .\ork.ps1 build -Milestone 1
  .\ork.ps1 verify -Checklist .\checklists\auth.yaml
  .\ork.ps1 review
  .\ork.ps1 deploy -Target vercel -Confirm
  .\ork.ps1 report

  # Cleanup
  .\ork.ps1 down

SAFETY:
  - Destructive commands (git push, rm -rf, etc.) require -Confirm
  - .env and secrets files are immutable
  - All operations run in safe mode by default

MORE INFO:
  See IMPLEMENTATION-SUMMARY.md for detailed usage guide

"@ -ForegroundColor Cyan
}

# Main dispatcher
switch ($Command) {
    "doctor" { Invoke-Doctor; Show-ViewerURL }
    "keys"   { Invoke-Keys; Show-ViewerURL }
    "up"     { Invoke-Up; Show-ViewerURL }
    "down"   { Invoke-Down; Show-ViewerURL }
    "new"    { Invoke-New -Project $Project -Idea $Idea -Spec $Spec; Show-ViewerURL }
    "plan"   { Invoke-Plan; Show-ViewerURL }
    "build"  { Invoke-Build -Milestone $Milestone; Show-ViewerURL }
    "verify" { Invoke-Verify -Checklist $Checklist -Suite $Suite -BaseUrl $BaseUrl; Show-ViewerURL }
    "review" { Invoke-Review; Show-ViewerURL }
    "deploy" { Invoke-Deploy -Target $Target -Confirm:$Confirm; Show-ViewerURL }
    "report" { Invoke-Report; Show-ViewerURL }
    "help"   { Invoke-Help; Show-ViewerURL }
    default  { Invoke-Help; Show-ViewerURL }
}
