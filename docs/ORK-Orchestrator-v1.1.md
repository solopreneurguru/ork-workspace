# ORK Orchestrator — v1.1 (Super‑Agent Enhanced Blueprint)

> **Purpose:** Upgrade the v1 blueprint to match (and exceed) the "3‑SUPER‑AGENT" model: add voice orchestrator, agent lifecycle registry, deeper closed‑loop self‑checks, cost/observability hooks, and interruption/bounce‑back flows. Keep it Docker‑first and PowerShell‑friendly, with strict governance.

---

## 0) What's New vs v1

* **Voice Orchestrator (OpenAI Realtime)** as a first‑class transport with **barge‑in** (interrupt & redirect) and **tool dispatch**.
* **Agent Lifecycle & Registry**: `create_agent`, `list_agents`, `command_agent`, `delete_agent`, `resume_agent` with **session IDs** and **operator files** per task.
* **Self‑Contained Closed Loops** for each agent (Planner, Builder, Browser Verifier, Reviewer, Deployer) with explicit Plan→Act→Observe→Reflect steps and **auto‑escalation**.
* **Cross‑Examination Loop**: Reviewer generates adversarial checks; Planner updates tests; Builder remediates; Verifier re‑drives UI; loop closes only with proofs.
* **Observability Hooks**: streaming tool events, diffs, screenshots, and **cost telemetry**; trace IDs across agents.
* **Safety & Governance Upgrades**: capability allow‑lists, high‑risk command confirmations, `.env`/secret protection, and PR‑style pre‑commit reviews.
* **Gemini 2.5 Computer Use** hardened runner (action schema, retries, deterministic fixtures) plus **UI checklist** contract.
* **Parallel Milestones** with merge gates; **snapshot/replay** for deterministic reruns.

---

## 1) High‑Level Architecture (Updated)

```
+-----------------------+      +------------------+       +-----------------------+
| PowerShell CLI / TUI  | ---> |  ORK API/Router  |  -->  |  Event Bus / Logs     |
+-----------------------+      +------------------+       +-----------------------+
          |                             |                           |
          |                             v                           v
          |                   +------------------+       +--------------------+
          |                   | Voice Orchestrator|      | Observability UI   |
          |                   | (OpenAI Realtime) |      | (timeline, costs)  |
          |                   +------------------+       +--------------------+
          |                             |
          |                             v
          |                   +------------------+       +--------------------+
          |                   |  Planner (Claude)| ----> | Repo / Artifacts   |
          |                   +------------------+       +--------------------+
          |                             |
          |                             v
          |                   +------------------+       +--------------------+
          |                   |  Builder (Claude)| ----> | Quality MCP        |
          |                   |     Code         |       | (lint/test/type)   |
          |                   +------------------+       +--------------------+
          |                             |
          |                             v
          |             +---------------------------------------------+
          |             | Browser Verifier (Gemini 2.5 + Playwright)  |
          |             | checklist→actions loop + screenshots store  |
          |             +---------------------------------------------+
          |                             |
          |                             v
          |                   +------------------+       +--------------------+
          |                   |  Reviewer        | ----> | Deployer (Vercel/  |
          |                   |  (Claude)        |       | AWS/Azure)         |
          |                   +------------------+       +--------------------+
          |                             |                         |
          v                             v                         v
+-----------------------+      +------------------+        +--------------------+
| Final Report (CLI/TUI)| <--- |   ORK Controller | <----- |  Post‑verify       |
+-----------------------+      +------------------+        +--------------------+
```

**State machine:** `INTAKE → PLAN → BUILD → TEST → VERIFY_UI → REVIEW → DEPLOY → POSTVERIFY → DONE` with **budget guards** and **interrupts**.

---

## 2) Agent Lifecycle & Registry

Each agent instance is stateless in model memory but bound to a **session** and **tool‑scope**:

* **Registry** (JSON/SQLite): `{ name, type, session_id, cwd, created_at, last_active, budgets, status }`.
* **Lifecycle tools** (exposed to orchestrator & CLI):

  * `list_agents()` → status of all sessions
  * `create_agent(type, name, cwd, tools, budgets)`
  * `command_agent(name, prompt | instruction_json)`
  * `resume_agent(name)`
  * `delete_agent(name)`
  * `check_agent_result(name, operator_file)` → gather outputs/artifacts
* **Operator files** (per task): `_ops/<agent>/<timestamp>-<task>.md` with intent, actions, diffs, outcomes.

---

## 3) Closed‑Loop Patterns (per Agent)

### 3.1 Planner (Claude)

* **Plan**: emit milestones + acceptance (unit/integration/**UI behaviours**).
* **Self‑check**: schema validate; ensure each milestone maps to ≥1 test.
* **Reflect**: if gaps → add tests first, then re‑plan.

### 3.2 Builder (Claude Code)

* **Act**: `apply_patch → format → lint → typecheck → run_tests`.
* **Observe**: parse JUnit/coverage; detect flaky tests; capture diffs.
* **Reflect**: minimal fix diffs; **guardrails**: refuse edits to `.env`, secrets, or >N files without confirmation.
* **Loop exit**: only when tests are **green** and patch size thresholds pass.

### 3.3 Browser Verifier (Gemini + Playwright)

* **Act**: generate action JSON (click/type/wait/assert…); execute; screenshot.
* **Observe**: compare against **UI checklist**; retry on transient failures.
* **Reflect**: escalate selector hardening (`data-testid`), add waits, or adjust fixtures.
* **Loop exit**: all checkpoints pass with stored screenshots.

### 3.4 Reviewer (Claude)

* **Act**: static analysis of diffs/logs; license/compliance scan; style rules.
* **Reflect**: produce **blocking issues** mapped to files/lines + acceptance items.
* **Loop exit**: `ship: true` with zero blockers.

### 3.5 Deployer

* **Act**: provision/deploy; capture URL and logs.
* **Post‑verify**: run **prod checklist** in browser loop.

---

## 4) Orchestrator (Realtime) — Interrupts & Dispatch

* **Transport**: WebRTC (voice) + WebSocket (server↔server) with **streaming tool calls**.
* **Barge‑in**: allow human to interrupt any state; orchestrator persists context and re‑routes.
* **Dispatch tools**: `list_agents`, `create_agent`, `command_agent`, `browser_use`, `open_file`, `read_file`, `report_costs`.
* **Command policy**: classify shell ops → require confirm for destructive/net‑modifying actions (`git push`, `rm -rf`, infra commands).

---

## 5) MCP Tool Surface (Expanded)

**Repo/FS/Git**

* `read_file`, `write_file`, `apply_patch`, `list_tree`, `run`, `git_branch`, `git_commit`, `git_push`

**Quality**

* `format`, `lint`, `typecheck`, `run_tests` (JUnit/JSON), `coverage`

**Browser**

* `navigate`, `execute_actions([ click | type | select | wait_for | assert_text | assert_url | screenshot ])`

**Deploy**

* `provision(stack)`, `deploy(target)`, `rollback()`

**Secrets**

* `get_secret(name)` with **per‑agent scopes** and **redacted logs**

**Orchestrator**

* `list_agents`, `create_agent`, `resume_agent`, `command_agent`, `delete_agent`, `check_agent_result`, `open_file`, `read_file`, `report_costs`

---

## 6) Budgets, Costing & Policies

* **Per‑state budgets**: `{ max_steps, max_tokens, timeout_seconds }` with live meters.
* **Cost telemetry**: capture per‑model usage; `report_costs()` tool aggregates by agent/session.
* **Retries**: capped backoff; **tool/model switch** on repeated identical errors.
* **Safety**: file glob guards; `.env`/`secrets` immutable; **PR‑style diff review** before commit.

---

## 7) Browser Verification — Action Schema & Hardening

**Action JSON**

```json
{
  "actions": [
    {"type":"click","selector":"button#signup"},
    {"type":"type","selector":"#email","text":"test@ork.dev"},
    {"type":"type","selector":"#password","text":"P@ssw0rd"},
    {"type":"click","selector":"#createAccount"},
    {"type":"assert_url","contains":"/dashboard"}
  ]
}
```

**Hardening**

* Stable routes, test users, bypass real auth; `data-testid` selectors; short retries; screenshot every step; deterministic seeds.

---

## 8) Docker Compose (delta highlights)

* Add **orchestrator** container (Realtime gateway) with WebRTC/WebSocket endpoints.
* Mount `workspace/` as shared volume across agents; `artifacts/` for screenshots/reports.
* Observability web with **event stream** and **cost meters**.

---

## 9) Agent Session Storage

* **Structure**: `workspace/agents/<type>/<session_id>/` with operator files, logs, and run manifests.
* **Resume semantics**: warm start hints (recent files, failing tests, last checklist index).

---

## 10) Parallelism & Snapshots

* Split BUILD into parallel tracks (e.g., backend/frontend); require **merge gates** (all unit tests green) before integration.
* **Snapshots**: checkpoint repo per milestone → enable **rewind/replay** of event log.

---

## 11) CLI / PowerShell Flow (safe mode)

```powershell
# bootstrap
copy .env.example .env
# fill ANTHROPIC_API_KEY, GOOGLE_API_KEY, OPENAI_API_KEY, VERCEL_TOKEN

# start stack
docker compose up --build

# create a builder and run a task (safe mode)
ork create-agent -Type Builder -Name b1 -Cwd ./workspace -Safe
ork command-agent -Name b1 -Prompt "Add health endpoint and unit tests"

# run browser verify
ork verify-ui -Url http://localhost:3000 -Checklist .\examples\checklists\auth.yaml

# review and deploy (manual ship gate)
ork review
ork deploy -Target vercel --confirm
```

---

## 12) Definition of Done (tightened)

* All acceptance tests pass locally **and** via Browser Verification; screenshots stored.
* Reviewer returns **ship**; license/compliance clean; cost summary generated.
* Deployment succeeds; **Post‑verify** passes on public URL.
* Final report includes: commit SHAs, diffs, screenshots, logs, costs, and timelines.

---

## 13) Roadmap Additions

* **Agent interruption APIs** (pause, resume, redirect) exposed to CLI and UI.
* **Policy packs** per repo (allowed tools, license rules, coding standards).
* **Canary & auto‑rollback** tied to post‑verify.
* **Multi‑tenant quotas** with per‑tenant secrets and budgets.
