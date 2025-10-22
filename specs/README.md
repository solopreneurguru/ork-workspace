# BuildSpec - Universal Project Specification

## Overview

BuildSpec is ORK's universal input format that transforms prose prompts into structured YAML contracts consumed by all agents. Instead of parsing free-form ideas repeatedly, you define your project once in a BuildSpec and ORK orchestrates the entire build pipeline.

## What is a BuildSpec?

A BuildSpec is a YAML file that defines:
- **What** you're building (name, targets, features)
- **How** it should look (style, brand vibes)
- **Where** it deploys (web, mobile, backend platforms)
- **Who** can use it (auth providers, monetization)
- **Quality** requirements (smoke tests, checklists)

## Core Fields

### Required Fields

```yaml
name: MyApp
targets: [web, mobile, backend]  # Choose any subset
```

### Optional Fields

```yaml
# Brand & Style
style: ["thinkorswim", "wallstreet"]  # Brand vibes (optional)

# Monetization
monetization:
  type: subscriptions  # Options: free, subscriptions, one-time, freemium
  price_usd: 5        # Monthly price (if applicable)

# Authentication
auth:
  provider: email     # Options: email, google, github, magic-link, none

# Deployment Targets
deploy:
  web: vercel        # Options: vercel, netlify, cloudflare-pages
  mobile: expo-eas   # Options: expo-eas, app-store, play-store
  backend: fly-io    # Options: fly-io, railway, render, aws

# Quality Gates
quality_gates:
  - ui_smoke_web     # Run web UI smoke tests
  - api_smoke        # Run API smoke tests
  - mobile_smoke     # Run mobile smoke tests

# Features (optional)
features:
  - user-dashboard
  - payment-integration
  - analytics
  - notifications

# Tech Stack Hints (optional)
stack:
  web: nextjs        # Options: nextjs, react, vue, svelte
  backend: express   # Options: express, fastify, nestjs, go
  database: postgres # Options: postgres, mysql, mongodb, sqlite
```

## Usage

### Method 1: From a Spec File

Create a spec file in `specs/` directory:

```bash
.\ork.ps1 new -Spec .\specs\my-app.yaml
```

### Method 2: From a Prose Idea (AI-Powered)

Let ORK's AI Planner draft a BuildSpec from your prose:

```bash
.\ork.ps1 new -Idea "Build a SaaS app for tracking habits with Stripe subscriptions"
```

This will:
1. Call the Planner agent to draft a BuildSpec
2. Save it to `specs/<slug>.yaml`
3. Validate and normalize to `workspace/spec.json`
4. Proceed to PLAN phase

## How Agents Use BuildSpec

Once parsed, the BuildSpec becomes `workspace/spec.json` which all agents read:

- **Planner**: Creates implementation plan based on targets and features
- **Web Agent**: Scaffolds web app with specified stack and style
- **Mobile Agent**: Sets up mobile project with auth and deployment
- **Backend Agent**: Creates API with database and auth provider
- **Deploy Agent**: Deploys to specified platforms
- **Verifier**: Runs quality gates defined in spec

## Example: LeadGen SaaS

```yaml
name: LeadGenLite
targets: [web]
style: ["minimal", "professional"]
monetization:
  type: subscriptions
  price_usd: 29
auth:
  provider: email
deploy:
  web: vercel
quality_gates:
  - ui_smoke_web
features:
  - lead-capture-form
  - csv-export
  - email-notifications
stack:
  web: nextjs
  database: postgres
```

## Example: Mobile + Backend

```yaml
name: TaskMaster
targets: [mobile, backend]
monetization:
  type: freemium
auth:
  provider: google
deploy:
  mobile: expo-eas
  backend: fly-io
quality_gates:
  - mobile_smoke
  - api_smoke
features:
  - task-management
  - sync-across-devices
  - push-notifications
stack:
  backend: express
  database: mongodb
```

## Schema Validation

All BuildSpecs are validated against `schemas/buildspec.schema.json`. Invalid specs will fail early with clear error messages.

## Benefits

1. **Single Source of Truth**: Define your project once
2. **Agent Consistency**: All agents read the same spec
3. **Validation**: Catch errors early before execution
4. **Iteration**: Update spec and re-run to iterate
5. **Templates**: Copy and modify existing specs
6. **AI-Assisted**: Let AI draft specs from prose
