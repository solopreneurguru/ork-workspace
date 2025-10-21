Run the ORK final report generation:

Execute `.\scripts\ork-report.ps1` to generate a consolidated execution report.

The report includes:
- Git commits (SHAs and messages)
- Diff statistics (files changed, lines added/removed)
- Test results (unit/integration/UI)
- Screenshot references
- Cost breakdown by agent
- Timeline of all phases
- Definition of Done checklist

Report saved to `artifacts/reports/report-<timestamp>.md`

After completion, display report summary and file path.
