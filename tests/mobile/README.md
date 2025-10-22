# Mobile Testing with Maestro

## Overview

ORK uses [Maestro](https://maestro.mobile.dev/) for mobile UI testing. Maestro provides a simple YAML-based syntax for writing end-to-end tests for React Native and native mobile apps.

## Setup

### Install Maestro

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows
# Download from https://maestro.mobile.dev/getting-started/installing-maestro
```

### Start Emulator/Simulator

```bash
# iOS Simulator
open -a Simulator

# Android Emulator
emulator -avd <avd-name>
```

## Running Tests

### Local

```bash
# Run smoke test
maestro test tests/mobile/smoke.yaml

# Run all tests
maestro test tests/mobile/
```

### CI (GitHub Actions)

```yaml
- name: Run Maestro tests
  uses: mobile-dev-inc/action-maestro-cloud@v1
  with:
    api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
    app-file: app.apk
    flows: tests/mobile/
```

## Test Structure

```yaml
appId: com.yourcompany.yourapp

---

# Test steps
- launchApp
- assertVisible: "Welcome"
- tapOn: "Login"
- inputText: "email@example.com"
- tapOn: "Submit"
- assertVisible: "Dashboard"
```

## Common Actions

- `launchApp` - Launch the app
- `tapOn: "Button Text"` - Tap on element
- `inputText: "text"` - Enter text
- `assertVisible: "Text"` - Assert element is visible
- `assertNotVisible: "Text"` - Assert element is not visible
- `swipe: up` - Swipe gesture
- `scroll: down` - Scroll
- `back` - Go back
- `clearState` - Clear app state

## Test Files

- `smoke.yaml` - Basic smoke test (launch, navigate, interact)
- Add more test files for specific features

## Skipping in ORK

By default, mobile verification is skipped locally and only runs in CI:

```typescript
if (process.env.CI !== 'true') {
  skip('Mobile verification requires CI or emulator');
}
```

To force local run:

```bash
CI=true node scripts/verify-auto.ts
```
