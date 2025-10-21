# ✅ NEW PIPELINE READY

The complete `.\ork.ps1 new "<ProjectName>" -Idea "<spec>"` pipeline is now operational!

## 🎯 What It Does

Creates a complete project orchestration loop that chains:

```
PLAN → BUILD → VERIFY → REVIEW → (DEPLOY) → REPORT
```

## 📋 Pipeline Steps

### 1. **PLAN** - Generate Milestones
- Creates session folder: `workspace/sessions/<id>/`
- Planner writes milestones + acceptance tests to `plans/plan-<id>.md`
- Defines test coverage map (unit/integration/UI)
- Sets Definition of Done

### 2. **BUILD** - Implement with Quality Gates
- Builder applies minimal diffs
- Quality loop: format → lint → typecheck → tests
- Continues until all checks GREEN
- Safe mode: no destructive ops without confirmation

### 3. **VERIFY** - UI Verification
- Uses verifier container with Playwright
- Runs YAML checklist (`checklists/auth.yaml`)
- Saves screenshots to `artifacts/ui/<timestamp>/`
- Result JSON generated

### 4. **REVIEW** - Policy & License Check
- Reviewer blocks on policy violations
- License compatibility check
- Marks `ship: true` if approved
- Output: `artifacts/reports/review-latest.yaml`

### 5. **DEPLOY** - Optional (Requires Confirmation)
- Only runs if user confirms (y/N)
- Deploys to target platform (Vercel/AWS/etc)
- Post-verification on production URL
- Auto-rollback on failure

### 6. **REPORT** - Final Report
- Writes `artifacts/reports/report-<timestamp>.md`
- Includes:
  - Session summary
  - Screenshots count and Observer URL
  - Test results (unit/integration/UI)
  - Cost breakdown by agent
  - Timeline (duration)
- Prints Observer URL to screenshots

## 🚀 Usage

### Basic Usage:
```powershell
.\ork.ps1 new "MyApp" -Idea "Task manager with auth and real-time sync"
```

### What Happens:
1. ✅ Session created with unique ID
2. ✅ Plan generated with milestones
3. ✅ Milestone 1 built with quality gates
4. ✅ UI verification runs (screenshots captured)
5. ✅ Code review executes
6. ⚠️  Deploy prompt (requires confirmation)
7. ✅ Final report generated

### Output Locations:
- **Session:** `workspace/sessions/<id>/`
- **Plan:** `plans/plan-<id>.md`
- **Screenshots:** `artifacts/ui/<timestamp>/`
- **Review:** `artifacts/reports/review-latest.yaml`
- **Report:** `artifacts/reports/report-<timestamp>.md`
- **Logs:** `artifacts/logs/new-<timestamp>.txt`

## 🛡️ Safety Features

### Automatic (No Confirmation Needed):
- ✅ Plan generation
- ✅ Code building
- ✅ UI verification
- ✅ Code review
- ✅ Report generation

### Requires Confirmation:
- ⚠️  `git push` (destructive)
- ⚠️  `rm -rf` (destructive)
- ⚠️  `docker system prune` (destructive)
- ⚠️  Cloud CLI ops (AWS, Azure, GCP)
- ⚠️  Deploy to production

## 📊 Transcript Logging

All operations logged to:
```
artifacts/logs/new-<timestamp>.txt
```

Contains:
- Session ID
- Project name & spec
- Timestamp for each step
- Success/failure status
- Error messages (if any)

## 🌐 Observer Integration

After completion, view artifacts at:
```
http://localhost:3002/ui/<timestamp>/
```

The final report includes this URL for easy access.

## 🎓 Example Session

```powershell
PS> .\ork.ps1 new "BlogApp" -Idea "Simple blog with markdown posts and comments"

╔════════════════════════════════════════════════════════════╗
║  ORK ORCHESTRATOR - NEW PROJECT PIPELINE                  ║
╚════════════════════════════════════════════════════════════╝

ℹ Project: BlogApp
ℹ Spec: Simple blog with markdown posts and comments
ℹ Session: a1b2c3d4

✓ Session directory: workspace/sessions/a1b2c3d4
ℹ Log file: artifacts/logs/new-2025-10-21T11-52-37.txt

─────────────────────────────────────────────────────────────

▶️  STEP 1/5: PLAN
🎯 ORK Plan: Generating plan for 'Simple blog with markdown posts and comments'...
✓ Plan generated: plans/plan-a1b2c3d4.md

▶️  STEP 2/5: BUILD
ORK Build: Milestone 1
✓ Milestone 1 build complete!

▶️  STEP 3/5: VERIFY
🎭 ORK UI Verification
✅ Verification PASSED (5/5 checkpoints)

▶️  STEP 4/5: REVIEW
ORK Review: Analyzing code...
✓ Review complete: ship = true

▶️  STEP 5/5: DEPLOY (optional)
Deploy to production? (y/N): n
ℹ Deploy skipped

▶️  FINAL: REPORT
📊 ORK Report: Generating final report...
✅ Report generated: artifacts/reports/report-2025-10-21T11-52-37.md

🌐 Observer URL:
  http://localhost:3002/ui/2025-10-21T17-27-17-402Z/

─────────────────────────────────────────────────────────────

╔════════════════════════════════════════════════════════════╗
║  ✅ PROJECT COMPLETE!                                      ║
╚════════════════════════════════════════════════════════════╝

✓ Project: BlogApp
ℹ Session: a1b2c3d4
ℹ Log: artifacts/logs/new-2025-10-21T11-52-37.txt
```

## 📁 Generated Files

After running the pipeline, you'll have:

```
C:\wrk\ork\
├── workspace/
│   └── sessions/
│       └── a1b2c3d4/           # Session directory
│           └── artifacts/       # Session-specific artifacts
├── plans/
│   └── plan-a1b2c3d4.md        # Generated plan
├── artifacts/
│   ├── ui/
│   │   └── 2025-10-21T17-27-17-402Z/  # Screenshots
│   │       ├── 01-signup-form.png
│   │       ├── 02-signup-submit.png
│   │       ├── 03-dashboard-load.png
│   │       ├── 04-logout.png
│   │       ├── 05-login-success.png
│   │       └── result.json
│   ├── reports/
│   │   ├── review-latest.yaml         # Review results
│   │   └── report-2025-10-21T11-52-37.md  # Final report
│   └── logs/
│       └── new-2025-10-21T11-52-37.txt    # Session transcript
```

## 🔧 Integration with Services

The pipeline uses:
- **orchestrator** (port 3001) - Agent lifecycle management
- **verifier** (Playwright) - UI verification with screenshots
- **observer** (port 3002) - Web UI for viewing artifacts
- **demo-web** (port 3000) - Test application

All services orchestrated via Docker Compose on the `ork-net` network.

## ✅ Status: READY

The NEW pipeline is fully functional and ready for use!

---

**🎉 NEW PIPELINE READY**
