# Plan-001: ORK Orchestrator Foundation

**Generated:** 2025-10-20T00:00:00Z
**Task:** Build minimal viable ORK orchestrator with agent lifecycle, quality gates, and UI verification
**Planner Agent:** v1.1 (Claude)
**Status:** APPROVED

---

## Executive Summary

Implement the core ORK orchestrator following the v1.1 blueprint:
1. **Orchestrator API** with agent lifecycle management
2. **Quality MCP** integration (format/lint/typecheck/test)
3. **Browser Verifier** with Playwright + action schema
4. **Review & Deploy** loops with rollback capability

---

## Milestones

### M1: Orchestrator API & Registry ✓ COMPLETED

**Goal:** Functional REST API with agent lifecycle management

**Tasks:**
- [x] Express server with TypeScript
- [x] Agent registry with JSON persistence
- [x] Health endpoint
- [x] CRUD endpoints for agents (`/agents`, `/agents/:name/command`, etc.)
- [x] Cost telemetry stub (`/costs`)

**Acceptance:**
- **Unit Tests:**
  - `test_health_endpoint_returns_200`
  - `test_create_agent_validates_required_fields`
  - `test_registry_persists_to_json`
  - `test_agent_status_transitions`
- **Integration Tests:**
  - `test_e2e_agent_lifecycle` (create → command → result → delete)
  - `test_concurrent_agent_operations`
- **UI Tests:**
  - N/A (API-only)

**Exit Criteria:**
- All unit tests green
- Integration tests pass
- TypeScript compiles with no errors
- Coverage ≥ 80%

---

### M2: Quality MCP Integration

**Goal:** Add format/lint/typecheck/test runners with closed-loop validation

**Tasks:**
- [ ] Implement `format` tool (Prettier integration)
- [ ] Implement `lint` tool (ESLint with exit codes)
- [ ] Implement `typecheck` tool (tsc --noEmit)
- [ ] Implement `run_tests` tool (Jest/Vitest with JUnit output)
- [ ] Builder agent loop: Act → Observe → Reflect
- [ ] Guardrails: block `.env` edits, >10 file changes require confirmation

**Acceptance:**
- **Unit Tests:**
  - `test_format_tool_runs_prettier`
  - `test_lint_tool_reports_violations`
  - `test_typecheck_detects_errors`
  - `test_run_tests_parses_junit_xml`
  - `test_guardrail_blocks_env_edits`
  - `test_guardrail_confirms_large_changes`
- **Integration Tests:**
  - `test_quality_loop_fixes_lint_errors`
  - `test_quality_loop_retries_on_test_failure`
  - `test_quality_loop_exits_when_green`
- **UI Tests:**
  - N/A

**Exit Criteria:**
- Quality loop runs end-to-end
- Guardrails enforce safety policies
- Coverage ≥ 85%

---

### M3: Browser Verifier (Playwright)

**Goal:** UI verification with action schema and screenshot artifacts

**Tasks:**
- [ ] Parse YAML checklists (checklist schema validator)
- [ ] Generate Playwright test from action schema
- [ ] Implement action types: `click`, `type`, `select`, `wait_for`, `assert_text`, `assert_url`, `screenshot`
- [ ] Screenshot storage in `artifacts/ui/<timestamp>/`
- [ ] Retry logic for transient failures (max 3 retries with backoff)
- [ ] Selector hardening: prefer `data-testid` attributes

**Acceptance:**
- **Unit Tests:**
  - `test_parse_yaml_checklist`
  - `test_validate_action_schema`
  - `test_generate_playwright_test_from_actions`
  - `test_screenshot_saved_to_artifacts`
- **Integration Tests:**
  - `test_execute_checklist_against_localhost`
  - `test_retry_on_transient_selector_failure`
- **UI Tests:**
  - `verify_auth_checklist_passes` (using `checklists/auth.yaml`)
  - `verify_screenshots_captured_per_step`

**Exit Criteria:**
- `checklists/auth.yaml` passes all 5 checkpoints
- Screenshots stored in `artifacts/ui/<timestamp>/01-signup-form.png`, etc.
- Coverage ≥ 80%

---

### M4: Reviewer & Deployer

**Goal:** Static analysis with blocking issues + Vercel deploy with post-verify

**Tasks:**
- [ ] Reviewer: diff analyzer (detect large patches, modified files)
- [ ] Reviewer: license scanner (check package.json licenses)
- [ ] Reviewer: style enforcer (no hardcoded secrets, TODO density)
- [ ] Reviewer: output blocking issues in YAML format
- [ ] Deployer: Vercel CLI integration
- [ ] Deployer: capture deployment URL
- [ ] Deployer: trigger post-verify checklist
- [ ] Deployer: rollback on post-verify failure

**Acceptance:**
- **Unit Tests:**
  - `test_reviewer_detects_hardcoded_secrets`
  - `test_reviewer_flags_gpl_license_conflict`
  - `test_reviewer_emits_ship_true_when_clean`
  - `test_deployer_calls_vercel_cli`
  - `test_deployer_rollback_on_failure`
- **Integration Tests:**
  - `test_review_blocks_commit_with_secrets`
  - `test_deploy_and_postverify_e2e`
- **UI Tests:**
  - `verify_deployed_url_passes_checklist` (post-verify on production URL)

**Exit Criteria:**
- Reviewer blocks commits with secrets/license issues
- Vercel deploy succeeds with captured URL
- Post-verify runs and triggers rollback on failure
- Coverage ≥ 80%

---

## Test Coverage Map

| Milestone | Unit Tests | Integration Tests | UI Tests | Total |
|-----------|-----------|-------------------|----------|-------|
| M1        | 4         | 2                 | 0        | 6     |
| M2        | 6         | 3                 | 0        | 9     |
| M3        | 4         | 2                 | 2        | 8     |
| M4        | 5         | 2                 | 1        | 8     |
| **Total** | **19**    | **9**             | **3**    | **31** |

**Overall Coverage Target:** ≥ 85%

---

## Dependencies & Risks

### Dependencies
- **APIs:** Anthropic (Claude), Google (Gemini), OpenAI (Realtime)
- **Platform:** Vercel CLI, Playwright
- **Tools:** ESLint, Prettier, TypeScript, Jest/Vitest

### Risks
1. **API Rate Limits:** Mitigate with retry backoff and budget guards
2. **Flaky UI Tests:** Use deterministic selectors (`data-testid`), stable test data
3. **Vercel Deploy Failures:** Implement rollback logic, dry-run mode
4. **License Compliance:** Automated scanning may have false positives → manual review gate

---

## Definition of Done (Plan-001)

- [x] M1: Orchestrator API functional with tests passing
- [ ] M2: Quality MCP loop closes with green tests
- [ ] M3: Browser verifier passes `checklists/auth.yaml` with screenshots
- [ ] M4: Reviewer approves (ship: true) and deploy succeeds with post-verify
- [ ] All 31 tests passing
- [ ] Coverage ≥ 85%
- [ ] Final report generated with costs, SHAs, diffs, screenshots

---

## Schema Validation

**✓ PASSED**

- All milestones map to ≥1 test
- Unit/Integration/UI coverage defined for each milestone
- Exit criteria explicit and measurable
- No orphaned tasks without acceptance tests

---

## Next Steps

1. Run `/ork/build -Milestone 2` to implement Quality MCP
2. Format → Lint → Typecheck → Test loop until green
3. Commit with minimal diffs
4. Proceed to M3 (Browser Verifier)

---

**Plan approved by:** Planner Agent v1.1
**Self-check status:** ✓ Schema valid, coverage complete
**Reflection notes:** No gaps detected; ready for BUILD phase
