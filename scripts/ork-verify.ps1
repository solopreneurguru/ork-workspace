# ORK Verify - Browser verification with UI checklist
param(
    [Parameter(Mandatory=$false)]
    [string]$Checklist = ".\checklists\auth.yaml",
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = ""
)

$ErrorActionPreference = "Stop"

Write-Host "ORK UI Verification" -ForegroundColor Cyan
Write-Host "Checklist: $Checklist" -ForegroundColor Gray

# Resolve absolute path for checklist
$ChecklistPath = (Resolve-Path $Checklist -ErrorAction Stop).Path

# Convert Windows path to Docker /workspace path
# Get the project root (where ork.ps1 is)
$OrkRoot = Split-Path -Parent $PSScriptRoot
# Make path relative to project root
$relativePath = $ChecklistPath.Replace($OrkRoot, '').TrimStart('\')
# Convert to Unix path and prepend /workspace
$WorkspacePath = "/workspace/" + ($relativePath -replace '\\', '/')

Write-Host "Running Playwright verification..." -ForegroundColor Yellow

# Build the command
$dockerCmd = "docker exec ork-verifier sh -c `"node /app/ui-runner-cli.js $WorkspacePath"
if ($BaseUrl) {
    $dockerCmd += " $BaseUrl"
}
$dockerCmd += "`""

# Execute via Invoke-Expression to handle complex quoting
$output = Invoke-Expression $dockerCmd 2>&1
$exitCode = $LASTEXITCODE

# Display output
$output | ForEach-Object { Write-Host $_ }

if ($exitCode -eq 0) {
    Write-Host "`n✅ Verification PASSED" -ForegroundColor Green
} else {
    Write-Host "`n❌ Verification FAILED (check logs above)" -ForegroundColor Red
}

# Find the latest screenshot directory
$latestDir = Get-ChildItem ".\artifacts\ui" -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}T' } |
    Sort-Object Name -Descending |
    Select-Object -First 1

if ($latestDir) {
    Write-Host "`n📁 Screenshots: $($latestDir.FullName)" -ForegroundColor Cyan
    Write-Host "📊 Observer URL: http://localhost:3002/ui/$($latestDir.Name)/" -ForegroundColor Cyan
}

exit $exitCode
