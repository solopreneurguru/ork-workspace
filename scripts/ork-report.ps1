param(
  [string]$ObserverUrlBase = "http://localhost:3002"
)
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $PSCommandPath
$root = Split-Path -Parent $scriptDir
$reportsDir = Join-Path $root "artifacts\reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$ts = Get-Date -Format "yyyyMMdd-HHmmss"

# Locate latest screenshots folder
$uiRoot = Join-Path $root "artifacts\ui"
$latestUI = Get-ChildItem $uiRoot -Directory -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | Select-Object -First 1
$screenshotsDir = $null; $screenshotsUrl = $null
if ($latestUI) {
  $screenshotsDir = $latestUI.FullName
  $screenshotsUrl = "$ObserverUrlBase/ui/$($latestUI.Name)/"
}

# Parse result.json if present
$status = "UNKNOWN"; $passCount = 0; $total = 0
if ($screenshotsDir) {
  $resultPath = Join-Path $screenshotsDir "result.json"
  if (Test-Path $resultPath) {
    $json = Get-Content $resultPath -Raw | ConvertFrom-Json
    if ($json) {
      if ($json.success -eq $true) { $status = "PASS" } else { $status = "FAIL" }
      if ($json.checkpointsPassed) { $passCount = [int]$json.checkpointsPassed }
      if ($json.checkpointsTotal) { $total = [int]$json.checkpointsTotal }
    }
  }
}

# Latest plan and review
$planDir = Join-Path $root "plans"
$latestPlan = Get-ChildItem $planDir -File -Filter "plan-*.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
$reviewPath = Join-Path $root "artifacts\reports\review-latest.yaml"

# Git SHA (best-effort)
$sha = ""
try { $sha = (git rev-parse --short HEAD) 2>$null } catch {}

# Build markdown
$reportPath = Join-Path $reportsDir "report-$ts.md"
$L = @()
$L += "# ORK Execution Report"
$L += ""
$L += "**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$L += ""
$L += "## Summary"
$L += "- **Status:** $status"
if ($total -gt 0) { $L += "- **Checks:** $passCount / $total passed" }
$L += ""
if ($latestPlan) { $L += "## Plan"; $L += "- $($latestPlan.Name)"; $L += "" }
if (Test-Path $reviewPath) { $L += "## Review"; $L += "- See ``artifacts/reports/review-latest.yaml``"; $L += "" }
if ($screenshotsDir) {
  $rel = $screenshotsDir.Substring($root.Length + 1).Replace('\','/')
  $L += "## Artifacts"
  $L += "- Screenshots: ``$rel``"
  if ($screenshotsUrl) { $L += "- Observer: $screenshotsUrl" }
  $L += ""
}
if ($sha) { $L += "## Git"; $L += "- HEAD: $sha"; $L += "" }

$L | Set-Content -Encoding UTF8 $reportPath

Write-Host ("SUCCESS - Report generated: " + $reportPath) -ForegroundColor Green
if ($screenshotsUrl) { Write-Host ("Observer URL: " + $screenshotsUrl) -ForegroundColor Yellow }
exit 0
