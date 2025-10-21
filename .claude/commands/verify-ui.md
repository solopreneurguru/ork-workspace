Run the ORK browser verification phase:

Execute `.\scripts\ork-verify.ps1 -Checklist .\checklists\auth.yaml` (or specified checklist path).

The verifier will:
- Parse YAML checklist with action schema
- Execute Playwright tests (navigate, click, type, wait_for, assert, screenshot)
- Retry failed actions (3 attempts with backoff)
- Save screenshots to `artifacts/ui/<timestamp>/`

After completion, report:
- Checkpoints passed/total
- Screenshot directory path
- Any failures with details
