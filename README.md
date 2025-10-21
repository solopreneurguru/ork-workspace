# ORK Orchestrator v1.1

![CI](https://github.com/solopreneurguru/ork-workspace/actions/workflows/ci.yml/badge.svg)

> Multi-agent orchestration system with closed-loop verification, cost tracking, and governance.

## Architecture

See [docs/ORK-Orchestrator-v1.1.md](./docs/ORK-Orchestrator-v1.1.md) for the full blueprint.

**State Machine:** `INTAKE → PLAN → BUILD → TEST → VERIFY_UI → REVIEW → DEPLOY → POSTVERIFY → DONE`

## Quick Start

### 1. Bootstrap

```powershell
# Clone and setup
git clone <repo>
cd ork
copy .env.example .env
# Edit .env with your API keys
```

### 2. Start Orchestrator

```powershell
cd apps/orchestrator
npm install
npm run dev
```

### 3. Run Workflows

```powershell
# Plan
.\scripts\ork-plan.ps1

# Build (Milestone 1)
.\scripts\ork-build.ps1 -Milestone 1

# Verify UI
.\scripts\ork-verify.ps1 -Checklist .\checklists\auth.yaml

# Review
.\scripts\ork-review.ps1

# Deploy
.\scripts\ork-deploy.ps1 -Target vercel -Confirm

# Generate Report
.\scripts\ork-report.ps1
```

## Directory Structure

```
apps/orchestrator/       # API server (Express + TypeScript)
agents/                  # Agent stubs (planner, builder, verifier, reviewer, deployer)
checklists/             # UI verification checklists (YAML)
artifacts/              # Screenshots, diffs, reports
scripts/                # PowerShell CLI wrappers (safe mode)
plans/                  # Generated plans with milestones
workspace/              # Agent session storage
```

## Safety & Governance

- All destructive operations require explicit confirmation
- `.env` and secrets are immutable
- Budget guards per agent/state
- PR-style diff review before commits
- Post-deploy verification with auto-rollback

## Development

```powershell
# Run orchestrator tests
cd apps/orchestrator
npm test

# Lint all
npm run lint

# Type check
npm run typecheck
```

## License

MIT
