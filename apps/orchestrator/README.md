# ORK Orchestrator API

Express + TypeScript server providing agent lifecycle management, registry, and event bus.

## Features

- **Agent Registry**: Track sessions, budgets, status
- **Lifecycle API**: `create_agent`, `list_agents`, `command_agent`, `delete_agent`, `resume_agent`
- **Event Bus**: Stream tool calls, diffs, screenshots
- **Cost Telemetry**: Per-agent usage tracking
- **Safety Gates**: Confirm destructive ops

## Run Locally

```bash
npm install
npm run dev
```

Server starts on `http://localhost:3001` (configurable via `ORCHESTRATOR_PORT`).

## Endpoints

### `GET /health`
Health check

### `GET /agents`
List all agent sessions

### `POST /agents`
Create new agent
```json
{
  "type": "planner",
  "name": "p1",
  "cwd": "./workspace",
  "tools": ["read_file", "write_file"],
  "budgets": { "max_steps": 50, "max_tokens": 50000 }
}
```

### `POST /agents/:name/command`
Send command to agent
```json
{
  "prompt": "Generate plan for auth feature"
}
```

### `GET /agents/:name/result`
Retrieve agent outputs/artifacts

### `DELETE /agents/:name`
Delete agent session

### `GET /costs`
Aggregate cost report across all agents

## Environment

See `.env.example` in repo root.

## Development

```bash
npm run build    # Compile TypeScript
npm run lint     # ESLint
npm run typecheck # tsc --noEmit
npm test         # Run tests
```
