# Deployer Agent

Vercel/AWS/Azure deployment with post-verify and rollback.

## Responsibilities

- Provision/deploy to target platform
- Capture deployment URL and logs
- Run **prod checklist** via Browser Verifier
- Auto-rollback on post-verify failure

## Loop

1. **Act**: Deploy to platform (Vercel/AWS/Azure)
2. **Post-verify**: Run production UI checklist
3. **Rollback**: On failure, revert to last known good

## TODO

- [ ] Vercel integration
- [ ] AWS/Azure adapters
- [ ] Post-verify trigger
- [ ] Rollback logic
