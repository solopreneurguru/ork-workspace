# ORK Orchestrator v1.1 - Implementation Summary & Usage Guide

**Version:** 1.1.0
**Status:** ✅ BOOTSTRAP COMPLETE
**Last Updated:** 2025-10-21

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [CLI Reference](#cli-reference)
4. [Docker Services](#docker-services)
5. [Workflows](#workflows)
6. [Safety & Governance](#safety--governance)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Usage](#advanced-usage)

---

## Quick Start

### Prerequisites

- **Git** (any version)
- **Node.js** >= 18
- **Docker Desktop** (running)
- **PowerShell** 5.1+ (Windows) or PowerShell Core (cross-platform)

### Initial Setup (3 steps)

```powershell
# 1. Check system dependencies
.\ork.ps1 doctor

# 2. Configure API keys (interactive prompt)
.\ork.ps1 keys

# 3. Start Docker services
.\ork.ps1 up
```

**That's it!** You're ready to orchestrate.

---

## System Architecture

### Services

```
┌─────────────────────────────────────────────────────────┐
│  ork.ps1 CLI (PowerShell)                               │
│  - doctor, keys, up, down, new, plan, build, verify... │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┬──────────────┬───────────────┐
        │                 │              │               │
   ┌────▼─────┐     ┌────▼────┐    ┌────▼─────┐   ┌────▼──────┐
   │Orchestr. │     │Verifier │    │ Observer │   │ Workspace │
   │ (3001)   │────▶│ (3003)  │    │  (3002)  │   │  (shared) │
   └──────────┘     └─────────┘    └──────────┘   └───────────┘
        │                 │              │               │
        │    ork-net (Docker network)    │               │
        └────────────────┬────────────────┘               │
                         │                                │
                    ┌────▼────────────────────────────────▼─┐
                    │  Artifacts & Logs                     │
                    │  - screenshots, reports, diffs, ...   │
                    └───────────────────────────────────────┘
```

### Orchestrator (Port 3001)
- **Purpose:** Central API and agent lifecycle management
- **Tech:** Express + TypeScript
- **Endpoints:** `/health`, `/agents`, `/quality`, `/verify`, `/review`, `/report`

### Verifier (Port 3003)
- **Purpose:** Browser UI testing with Playwright
- **Tech:** Playwright + Chromium (headless)
- **Input:** YAML checklists
- **Output:** Screenshots + test results

### Observer (Port 3002)
- **Purpose:** Web dashboard for artifacts and logs
- **Tech:** Express + Static HTML
- **Features:** Real-time status, cost viewer, artifact browser

---

## CLI Reference

### ork.ps1 Commands

#### System Management

##### `doctor`
**Check system dependencies**

```powershell
.\ork.ps1 doctor
```

Validates:
- ✓ Git installed
- ✓ Node.js >= 18
- ✓ Docker installed and running
- ✓ Playwright browsers installed
- ✓ .env configured

##### `keys`
**Configure API keys interactively**

```powershell
.\ork.ps1 keys
```

Prompts for:
- `ANTHROPIC_API_KEY` (Claude)
- `OPENAI_API_KEY` (GPT/Realtime)
- `GOOGLE_GENAI_API_KEY` (Gemini)
- `VERCEL_TOKEN` (optional, for deployments)

Keys are masked in output and saved to `.env`.

##### `up` / `down`
**Start/stop Docker services**

```powershell
# Start all services
.\ork.ps1 up

# Stop all services
.\ork.ps1 down
```

Services:
- Orchestrator (3001)
- Verifier (3003)
- Observer (3002)

---

#### Workflow Commands

##### `new`
**Create new project with full orchestration loop**

```powershell
.\ork.ps1 new "TaskApp" -Idea "A task manager with auth and real-time sync"
```

Runs complete loop:
1. PLAN → Generate milestones
2. BUILD → Implement M1 with quality gates
3. VERIFY → Run UI checklist
4. REVIEW → Static analysis
5. DEPLOY → (optional) Deploy to platform
6. REPORT → Generate final report

**Session created** in `workspace/sessions/<id>/`

##### `plan`
**Generate structured plan**

```powershell
.\ork.ps1 plan
```

Output: `plans/plan-<id>.md`
- Milestones with acceptance criteria
- Test coverage map (unit/integration/UI)
- Definition of Done

##### `build`
**Implement milestone with quality gates**

```powershell
# Build milestone 1
.\ork.ps1 build -Milestone 1

# Build in unsafe mode (allow risky operations)
.\ork.ps1 build -Milestone 2 -Safe:$false
```

Quality loop:
1. Apply patches
2. Format (Prettier)
3. Lint (ESLint)
4. Typecheck (tsc)
5. Test (npm test)

Exits only when **all checks GREEN**.

##### `verify`
**Run browser UI verification**

```powershell
# Use default checklist (auth.yaml)
.\ork.ps1 verify

# Use custom checklist
.\ork.ps1 verify -Checklist .\checklists\custom.yaml
```

Output:
- Screenshots: `artifacts/ui/<timestamp>/`
- Results: Pass/fail with error details

##### `review`
**Run code review and static analysis**

```powershell
.\ork.ps1 review
```

Checks:
- Hardcoded secrets (API keys, passwords, tokens)
- License compatibility
- Style violations
- Changeset size

Output: `artifacts/reports/review-latest.{json,yaml}`

##### `deploy`
**Deploy to platform (REQUIRES -Confirm)**

```powershell
# Deploy to Vercel
.\ork.ps1 deploy -Target vercel -Confirm

# Deploy to AWS
.\ork.ps1 deploy -Target aws -Confirm
```

⚠️ **Safety:** `-Confirm` flag required to prevent accidental deployments.

Post-deploy verification:
- Runs checklist against production URL
- Auto-rollback on failure

##### `report`
**Generate final consolidated report**

```powershell
.\ork.ps1 report
```

Report includes:
- Commits (SHAs, messages)
- Diffs (files changed, lines added/removed)
- Tests (unit/integration/UI results)
- Screenshots
- Costs (estimated by agent)
- Timeline

Output: `artifacts/reports/report-<timestamp>.md`

---

## Docker Services

### Starting Services

```powershell
.\ork.ps1 up
```

Builds and starts:
1. **orchestrator** - Compiles TypeScript, starts API on 3001
2. **verifier** - Installs Playwright browsers, starts service on 3003
3. **observer** - Starts web UI on 3002

### Logs

```powershell
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f orchestrator
docker compose logs -f verifier
docker compose logs -f observer
```

### Restart Single Service

```powershell
docker compose restart orchestrator
```

### Rebuild After Code Changes

```powershell
docker compose up --build -d
```

---

## Workflows

### Workflow 1: Full Automated Project Creation

```powershell
# One command creates entire project
.\ork.ps1 new "MyApp" -Idea "Blog platform with comments and auth"
```

**What happens:**
1. Session created with unique ID
2. Plan generated with milestones
3. M1 implemented with tests
4. UI verification runs
5. Code review runs
6. (Optional) Deploy prompt
7. Final report generated

**Duration:** ~5-15 minutes depending on project complexity

---

### Workflow 2: Step-by-Step Manual Control

```powershell
# 1. Plan
.\ork.ps1 plan

# Review plan in plans/plan-<id>.md
# Make adjustments if needed

# 2. Build M1
.\ork.ps1 build -Milestone 1

# Review code changes
# Run additional tests if needed

# 3. Verify UI
.\ork.ps1 verify

# Check screenshots in artifacts/ui/
# Fix any failing checkpoints

# 4. Review
.\ork.ps1 review

# Address any blockers
# Re-run if needed

# 5. Deploy (when ready)
.\ork.ps1 deploy -Target vercel -Confirm

# 6. Final report
.\ork.ps1 report
```

---

### Workflow 3: Iterative Development

```powershell
# Build multiple milestones iteratively
.\ork.ps1 build -Milestone 1
.\ork.ps1 verify
.\ork.ps1 review

.\ork.ps1 build -Milestone 2
.\ork.ps1 verify
.\ork.ps1 review

.\ork.ps1 build -Milestone 3
.\ork.ps1 verify
.\ork.ps1 review

# Final deploy
.\ork.ps1 deploy -Target vercel -Confirm
.\ork.ps1 report
```

---

## Safety & Governance

### Guardrails

ORK enforces strict safety policies:

#### 1. Immutable Files
- `.env` files **CANNOT** be modified
- `secrets/` directory **CANNOT** be modified
- API keys **CANNOT** be hardcoded

**Violation:** Build fails with blocking error

#### 2. Confirmation Required

Destructive operations require `-Confirm`:
- `git push`
- `rm -rf`
- `docker system prune`
- `deploy` commands
- Cloud CLI operations (AWS, Azure, GCP)

**Without `-Confirm`:** Operation rejected with error

#### 3. Changeset Size Warnings

- **>10 files:** Confirmation prompt
- **>20 files:** Warning issued
- **>1000 lines:** Warning issued

Encourages **small, incremental changes**.

#### 4. Secret Detection

Automatic scanning for:
- API keys (`api_key = "..."`)
- Passwords (`password = "..."`)
- Tokens (`token = "..."`)
- Private keys (`.pem`, `.key`)

**Detection:** Build fails, file flagged in review

#### 5. License Compliance

- Checks `package.json` license
- Flags GPL conflicts (if project is MIT)
- Reports in review phase

---

## Troubleshooting

### Docker not running

```
Error: Cannot connect to Docker daemon
```

**Fix:** Start Docker Desktop

```powershell
# Check Docker status
docker ps

# If fails, start Docker Desktop manually
```

---

### Playwright browsers missing

```
Error: Executable doesn't exist at ... chromium
```

**Fix:** Install Playwright browsers

```powershell
cd apps/orchestrator
npx playwright install chromium
```

Or run `.\ork.ps1 doctor` which auto-installs.

---

### API keys not configured

```
Error: ANTHROPIC_API_KEY not set
```

**Fix:** Configure keys

```powershell
.\ork.ps1 keys
```

---

### Port already in use

```
Error: Port 3001 already in use
```

**Fix:** Stop conflicting process or change port

```powershell
# Option 1: Stop ORK services
.\ork.ps1 down

# Option 2: Find and kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Option 3: Change port in .env
# ORCHESTRATOR_PORT=3011
```

---

### Build fails - tests not passing

```
Error: Tests failed, cannot proceed
```

**Fix:** Check test output

```powershell
# Run tests manually
cd apps/orchestrator
npm test

# View logs
docker compose logs orchestrator

# Fix failing tests
# Re-run build
.\ork.ps1 build -Milestone 1
```

---

### Verification timeout

```
Error: Selector timeout exceeded
```

**Fix:** Check selectors and increase timeout

1. Open `checklists/auth.yaml`
2. Add/increase `timeout` on failing action:

```yaml
- type: wait_for
  selector: "#slow-element"
  timeout: 15000  # 15 seconds
```

3. Re-run verification

```powershell
.\ork.ps1 verify
```

---

## Advanced Usage

### Custom Checklists

Create custom UI verification checklists:

```yaml
# checklists/my-feature.yaml
name: "My Feature Test"
description: "Test my custom feature"
base_url: "http://localhost:3000"

checkpoints:
  - id: feature_load
    description: "Feature page loads"
    actions:
      - type: navigate
        url: "/feature"
      - type: wait_for
        selector: "[data-testid='feature-container']"
      - type: screenshot
        name: "01-feature-load"

  - id: feature_interaction
    description: "User can interact with feature"
    actions:
      - type: click
        selector: "button#activate"
      - type: assert_text
        selector: ".status"
        text: "Active"
      - type: screenshot
        name: "02-feature-active"
```

Run:

```powershell
.\ork.ps1 verify -Checklist .\checklists\my-feature.yaml
```

---

### Environment Variables

Customize behavior via `.env`:

```bash
# Orchestrator
ORCHESTRATOR_PORT=3001
NODE_ENV=development

# Budgets & Policies
MAX_STEPS_PER_AGENT=100
MAX_TOKENS_PER_AGENT=100000
TIMEOUT_SECONDS=3600

# Safety
ALLOW_DESTRUCTIVE_OPS=false  # Never set to true in production
REQUIRE_CONFIRMATION=true
```

---

### Viewing Live Logs

```powershell
# Observer UI (web dashboard)
# Open http://localhost:3002

# Or view Docker logs
docker compose logs -f orchestrator
```

---

### Session Management

Sessions are stored in `workspace/sessions/<id>/`:

```
workspace/sessions/abc123/
├── plan.md
├── artifacts/
│   ├── screenshots/
│   ├── diffs/
│   └── reports/
└── logs/
    ├── planner.log
    ├── builder.log
    └── verifier.log
```

**Resume session:**

```powershell
# TODO: Implement resume functionality
# .\ork.ps1 resume -Session abc123
```

---

### Cost Tracking

View estimated costs:

```powershell
# Check Observer UI
# http://localhost:3002

# Or read final report
Get-Content .\artifacts\reports\report-latest.md | Select-String "Cost"
```

Costs are **estimated** based on typical token usage per agent.

---

## Claude Commands

Use `/ork/<command>` shortcuts in Claude Code:

```
/ork/plan        → Generate plan
/ork/build       → Build with quality gates
/ork/verify-ui   → Run browser verification
/ork/review      → Code review
/ork/deploy      → Deploy (requires confirm)
/ork/report      → Generate report
```

These map to the same PowerShell scripts but provide integrated execution within Claude.

---

## What's Next?

### Extend the System

1. **Add Custom Agents**
   - Create new agent in `agents/<name>/`
   - Implement closed-loop pattern
   - Register in orchestrator

2. **Add More Platforms**
   - Extend deployer for AWS, Azure
   - Add platform-specific checklists
   - Configure platform secrets

3. **Integrate Real AI APIs**
   - Connect Claude API for planner/builder/reviewer
   - Connect Gemini API for verifier
   - Connect OpenAI Realtime for voice

4. **Add Real Tests**
   - Replace test stubs in `apps/orchestrator`
   - Add Jest/Vitest with actual test cases
   - Configure coverage thresholds

---

## Support

**Issues:** https://github.com/your-org/ork/issues
**Docs:** `docs/ORK-Orchestrator-v1.1.md`
**Blueprint:** See main documentation for architecture details

---

*ORK Orchestrator v1.1 - Automate your entire development loop with confidence.*
