# Planner Agent

Claude-based planner implementing Plan→Self-check→Reflect loop.

## Responsibilities

- Generate milestones with acceptance criteria (unit/integration/UI behaviors)
- Schema validation: ensure each milestone maps to ≥1 test
- Emit `plans/plan-<id>.md` with structured milestones

## Loop

1. **Plan**: Decompose task into milestones
2. **Self-check**: Validate schema, coverage
3. **Reflect**: Add missing tests, re-plan if gaps

## Output Format

```yaml
milestones:
  - id: M1
    title: "Core API endpoints"
    acceptance:
      unit: ["test_health_endpoint", "test_auth_flow"]
      integration: ["test_e2e_signup"]
      ui: ["verify_signup_form", "verify_dashboard_load"]
```

## TODO

- [ ] Claude API integration
- [ ] Schema validator
- [ ] Operator file writer
