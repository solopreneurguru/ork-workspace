# Browser Verifier Agent

Gemini 2.5 + Playwright UI verification with action schema.

## Responsibilities

- Parse UI checklist (YAML)
- Generate action JSON (click/type/wait/assert)
- Execute with Playwright; screenshot every step
- Store artifacts in `artifacts/ui/<timestamp>/`

## Loop

1. **Act**: Execute actions from checklist
2. **Observe**: Compare against assertions; retry on transient failures
3. **Reflect**: Harden selectors (`data-testid`), add waits
4. **Exit**: All checkpoints pass with stored screenshots

## Action Schema

```json
{
  "actions": [
    {"type": "click", "selector": "button#signup"},
    {"type": "type", "selector": "#email", "text": "test@ork.dev"},
    {"type": "assert_url", "contains": "/dashboard"}
  ]
}
```

## TODO

- [ ] Gemini API integration
- [ ] Playwright runner
- [ ] Checklist parser
- [ ] Screenshot storage
