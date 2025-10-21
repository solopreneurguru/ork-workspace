# Builder Agent

Claude Code-based builder with quality gates.

## Responsibilities

- Apply patches with minimal diffs
- Run `format → lint → typecheck → test` loop
- Detect flaky tests, capture coverage
- **Guardrails**: refuse `.env` edits, >N files without confirmation

## Loop

1. **Act**: Apply patch
2. **Observe**: Parse test results (JUnit/JSON)
3. **Reflect**: Remediate failures with minimal changes
4. **Exit**: Only when tests **green** and thresholds pass

## TODO

- [ ] Patch applicator
- [ ] Quality MCP integration (lint/test/typecheck)
- [ ] Coverage parser
- [ ] Guardrail validator
