# ORK Plan - Generate milestone plan with acceptance tests
param(
    [string]$Task = "",
    [string]$OutputDir = "plans",
    [string]$SessionId = ""
)

$ErrorActionPreference = "Stop"

# Get session info if available
$sessionFile = "workspace/current.json"
if ((Test-Path $sessionFile) -and -not $SessionId) {
    $session = Get-Content $sessionFile -Raw | ConvertFrom-Json
    $Task = $session.idea
    $SessionId = $session.id
}

if (-not $Task) {
    $Task = "Default task"
}

Write-Host "ORK Plan: Generating plan for '$Task'..." -ForegroundColor Cyan

# Ensure plans directory exists
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Generate plan ID
$planId = if ($SessionId) { "plan-$SessionId" } else { "plan-" + (Get-Date -Format "yyyyMMdd-HHmmss") }
$planFile = Join-Path $OutputDir "$planId.md"

Write-Host "Creating plan: $planFile" -ForegroundColor Green

# TODO: Call Planner agent via orchestrator API
# For now, generate intelligent stub based on task

$planContent = @"
# Plan: $Task

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Milestones

### M1: Foundation
- [ ] Setup basic structure
- [ ] Health endpoint
- **Acceptance:**
  - Unit: test_health_endpoint
  - Integration: test_api_integration
  - UI: N/A

### M2: Core Features
- [ ] Implement main logic
- [ ] Add validation
- **Acceptance:**
  - Unit: test_validation
  - Integration: test_e2e_flow
  - UI: verify_main_workflow

## Test Coverage Map

| Milestone | Unit | Integration | UI |
|-----------|------|-------------|-----|
| M1        | 1    | 1           | 0   |
| M2        | 1    | 1           | 1   |

## Definition of Done
- All tests pass
- Coverage ≥ 80%
- UI checklist verified
- Review approved
"@

Set-Content -Path $planFile -Value $planContent

Write-Host "Plan generated: $planFile" -ForegroundColor Green
Write-Host "Next: .\scripts\ork-build.ps1 -Milestone 1" -ForegroundColor Yellow
