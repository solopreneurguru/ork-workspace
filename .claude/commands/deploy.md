Run the ORK deployment phase:

**SAFETY NOTICE**: Deploy requires `-Confirm` flag.

Execute `.\scripts\ork-deploy.ps1 -Target vercel -Confirm` (or other target: aws, azure).

The deployer will:
- Provision/deploy to specified platform
- Capture deployment URL
- Run post-verify checklist on production URL
- Auto-rollback on post-verify failure

After completion, report:
- Deployment URL
- Post-verify results
- Rollback status (if applicable)
