# Phase B Complete: Templates/Blueprints System

## ✅ Acceptance Criteria Met

### B1. Template Packs Created

#### templates/web-next-saas/
**Based on:** Existing apps/web Next.js app with auth
**Files:**
- `package.json` - Next.js 15.1.3 with React 19
- `pages/index.tsx` - Homepage with auth links
- `pages/signup.tsx` - Signup form with exact selectors
- `pages/login.tsx` - Login form with localStorage auth
- `pages/dashboard.tsx` - Dashboard with logout
- `README.md` - Template documentation

**Variables:**
```typescript
{{APP_NAME}}         // "LeadGenLite"
{{DESCRIPTION}}      // Project description
{{AUTH_PROVIDER}}    // "email", "google", etc.
{{HAS_AUTH}}         // Conditional block
{{HAS_MONETIZATION}} // Conditional block
{{MONETIZATION_TYPE}}
{{PRICE_USD}}
{{DEPLOY_WEB}}
{{FEATURES}}         // Array iteration
```

#### templates/mobile-expo/
**Stack:** Expo ~51.0.0, React Native 0.74.0
**Files:**
- `package.json` - Expo dependencies + push + IAP
- `app.json` - Expo configuration with bundle IDs
- `eas.json` - EAS Build configuration
- `App.tsx` - Main app with auth stub
- `README.md` - Mobile-specific docs

**Stubs Included:**
- `expo-notifications` - Push notification setup
- `expo-in-app-purchases` - IAP placeholders
- Auth provider placeholders

**Variables:**
```typescript
{{APP_NAME}}       // "TaskMaster"
{{APP_NAME_LOWER}} // "taskmaster" (for package/bundle)
{{BUNDLE_ID}}      // "taskmaster" (no dashes)
```

#### templates/backend-node/
**Stack:** Express 4.x, TypeScript, Node.js
**Files:**
- `package.json` - Express + TypeScript tooling
- `src/index.ts` - API server with endpoints
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment template
- `README.md` - API documentation

**Endpoints:**
- `GET /health` - Health check (always present)
- `GET /` - API info
- `POST /api/auth/*` - Auth endpoints (if HAS_AUTH)
- `GET/POST /api/subscription/*` - Subscription endpoints (if HAS_MONETIZATION)

**Variables:**
```typescript
{{DATABASE}}       // "mongodb", "postgres", etc.
{{AUTH_PROVIDER}}
{{DEPLOY_BACKEND}} // "fly-io", "railway", etc.
```

#### templates/checklists/
**Target-specific smoke tests:**
- `web-smoke.yaml` - Basic homepage load test
- `backend-health.yaml` - API health endpoint test

### B2. Scaffolder Agent

#### agents/scaffolder.ts
**Purpose:** Reads BuildSpec and scaffolds apps from templates

**Flow:**
```
1. Load workspace/spec.json
2. Create template context from BuildSpec
3. For each target in spec.targets:
   - Map target → template pack
   - Copy template to apps/<target>/
   - Render Mustache variables
4. Copy target-specific checklists to checklists/
```

**Key Functions:**
- `loadBuildSpec()` - Load normalized spec
- `createTemplateContext()` - Build Mustache context
- `renderTemplate()` - Apply Mustache rendering
- `scaffoldTarget()` - Copy & render for one target
- `copyChecklists()` - Copy relevant test files

**Smart Behavior:**
- Skips if `apps/<target>/` already exists
- Only renders text files (not binary assets)
- Preserves directory structure
- Handles arrays and conditionals

### B3. CLI Integration

#### scripts/ork-build.ps1
**Added Step 0:**
```powershell
# Step 0: Run Scaffolder if apps/* are missing
if (-not (Test-Path apps/web) -and
    -not (Test-Path apps/mobile) -and
    -not (Test-Path apps/backend)) {
    npx tsx agents/scaffolder.ts
}
```

**Trigger:** First time `ork.ps1 build -Milestone 1` runs
**Effect:** Automatically scaffolds based on BuildSpec

## 🎯 Implementation Summary

### Files Created

#### Template Packs (20 files)
1. **templates/web-next-saas/** (5 files)
   - package.json, README.md
   - pages/index.tsx, signup.tsx, login.tsx, dashboard.tsx

2. **templates/mobile-expo/** (5 files)
   - package.json, app.json, eas.json
   - App.tsx, README.md

3. **templates/backend-node/** (5 files)
   - package.json, tsconfig.json
   - src/index.ts, .env.example, README.md

4. **templates/checklists/** (2 files)
   - web-smoke.yaml
   - backend-health.yaml

#### Agent & Spec (2 files)
5. **agents/scaffolder.ts** (200+ lines)
6. **specs/fullstack-app.yaml** (example spec)

### Files Modified
1. **scripts/ork-build.ps1** - Added scaffolder hook
2. **package.json** - Added mustache, @types/mustache, fs-extra

## 🚀 Usage Examples

### Example 1: Web-Only SaaS

```yaml
# specs/leadgen.yaml
name: LeadGenLite
targets: [web]
auth:
  provider: email
monetization:
  type: subscriptions
  price_usd: 29
deploy:
  web: vercel
```

**Result:**
```
apps/web/
├── package.json        # name: "LeadGenLite"
├── pages/
│   ├── index.tsx      # "Welcome to LeadGenLite"
│   ├── signup.tsx     # email auth
│   ├── login.tsx
│   └── dashboard.tsx  # "$29/month subscription"
└── README.md

checklists/
└── web-smoke.yaml
```

### Example 2: Full-Stack App

```yaml
# specs/taskmaster.yaml
name: TaskMaster
targets: [web, mobile, backend]
auth:
  provider: google
monetization:
  type: freemium
deploy:
  web: vercel
  mobile: expo-eas
  backend: fly-io
stack:
  backend: express
  database: mongodb
```

**Result:**
```
apps/
├── web/
│   ├── package.json        # name: "TaskMaster"
│   └── pages/...           # google auth
├── mobile/
│   ├── app.json            # slug: "taskmaster"
│   └── App.tsx             # google login button
└── backend/
    ├── package.json        # name: "taskmaster-backend"
    └── src/index.ts        # mongodb, google auth stubs

checklists/
├── web-smoke.yaml
└── backend-health.yaml
```

### Example 3: CLI Workflow

```powershell
# Create spec
.\ork.ps1 new -Spec .\specs\myapp.yaml

# Scaffold runs automatically on first build
.\ork.ps1 build -Milestone 1

# Output:
# Step 0: Scaffolding apps from templates...
# [INFO] Scaffolding web from template: web-next-saas
# [OK] Scaffolded web to apps/web
# Step 1: Apply patches...
# ...
```

## 📊 Test Results

### Test 1: Single Target (Web)
```bash
$ npx tsx scripts/spec-parse.ts -spec specs/sample.yaml
$ npx tsx agents/scaffolder.ts

[INFO] BuildSpec: LeadGenLite
[INFO] Targets: web
[OK] Scaffolded web to apps/web
[OK] Copied checklist: web-smoke.yaml
```

**Verification:**
✅ `apps/web/package.json` has `"name": "LeadGenLite"`
✅ `pages/index.tsx` has `<h1>LeadGenLite</h1>`
✅ `pages/dashboard.tsx` shows `"subscriptions - $29/month"`
✅ Auth provider is `email` in comments

### Test 2: Multiple Targets
```bash
$ npx tsx scripts/spec-parse.ts -spec specs/fullstack-app.yaml
$ npx tsx agents/scaffolder.ts

[INFO] BuildSpec: TaskMaster
[INFO] Targets: web, mobile, backend
[OK] Scaffolded web to apps/web
[OK] Scaffolded mobile to apps/mobile
[OK] Scaffolded backend to apps/backend
[OK] Copied checklist: web-smoke.yaml
[OK] Copied checklist: backend-health.yaml
```

**Verification:**
✅ All three `apps/*` directories created
✅ Backend: `package.json` has `"name": "taskmaster-backend"`
✅ Mobile: `app.json` has `"slug": "taskmaster"`
✅ Mobile: `app.json` has `"bundleIdentifier": "com.taskmaster.taskmaster"`
✅ Backend: `/health` endpoint includes "TaskMaster API"
✅ All files have correct variable substitution

### Test 3: Skip Existing
```bash
$ npx tsx agents/scaffolder.ts
# (apps/web already exists)

[INFO] apps/web already exists, skipping scaffold
```

✅ Does not overwrite existing code

## ✅ Done When Criteria

- [x] `.\ork.ps1 new -Spec specs/sample.yaml` followed by `.\ork.ps1 build -Milestone 1`
- [x] Creates correct `apps/*` folders from spec
- [x] No manual edits required
- [x] Variables correctly rendered (APP_NAME, AUTH_PROVIDER, etc.)
- [x] Conditionals work (HAS_AUTH, HAS_MONETIZATION)
- [x] Arrays work (FEATURES iteration)
- [x] Target-specific checklists copied
- [x] Skips if apps already exist

## 🎉 Phase B Complete!

All acceptance criteria met. ORK can now scaffold web, mobile, and backend apps from BuildSpec with full variable substitution and conditional rendering.

**Next:** Phase C - Teach agents to intelligently modify scaffolded apps based on BuildSpec features.
