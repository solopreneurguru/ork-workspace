Run the ORK build phase with quality gates:

Execute `.\scripts\ork-build.ps1 -Milestone 1` (or specified milestone number).

The build loop follows: Act → Observe → Reflect
- Apply patches with minimal diffs
- Run format → lint → typecheck → test
- Capture diffs and test results
- Only exit when tests are GREEN

Guardrails enforce:
- No .env or secrets file modifications
- Confirm for >10 file changes
- No hardcoded secrets

After completion, report test results and quality check status.
