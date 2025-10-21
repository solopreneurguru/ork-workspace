# Reviewer Agent

Claude-based static analysis and compliance reviewer.

## Responsibilities

- Analyze diffs/logs for blocking issues
- License/compliance scan
- Style/lint rule enforcement
- Produce **blocking issues** mapped to files/lines

## Loop

1. **Act**: Static analysis, scan diffs
2. **Reflect**: Generate adversarial checks, map issues to files
3. **Exit**: `ship: true` with zero blockers

## Output Format

```yaml
ship: false
blockers:
  - file: "src/auth.ts"
    line: 42
    severity: high
    message: "Credentials hardcoded"
  - file: "package.json"
    line: 12
    severity: medium
    message: "GPL license conflict"
```

## TODO

- [ ] Diff analyzer
- [ ] License scanner
- [ ] Blocking issue formatter
