#!/usr/bin/env node
// ORK UI Runner - CLI version for running YAML checklists with Playwright
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WORKSPACE = process.env.WORKSPACE || '/workspace';
const ARTIFACTS_DIR = path.join(WORKSPACE, 'artifacts', 'ui');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function executeChecklist(checklistPath, baseUrl) {
  const checklistContent = fs.readFileSync(checklistPath, 'utf-8');
  const checklist = yaml.parse(checklistContent);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDir = path.join(ARTIFACTS_DIR, timestamp);
  fs.mkdirSync(sessionDir, { recursive: true });

  const result = {
    success: true,
    checkpointsPassed: 0,
    checkpointsTotal: checklist.checkpoints.length,
    failures: [],
    screenshotDir: sessionDir,
    timestamp,
  };

  let browser;
  let page;

  try {
    console.log(`🎭 Launching Playwright browser...`);
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    const url = baseUrl || checklist.base_url;
    console.log(`📋 Running checklist: ${checklist.name}`);
    console.log(`🌐 Base URL: ${url}`);
    console.log(`📁 Screenshots: ${sessionDir}\n`);

    for (const checkpoint of checklist.checkpoints) {
      console.log(`▶️  Checkpoint: ${checkpoint.id} - ${checkpoint.description}`);

      try {
        for (const action of checkpoint.actions) {
          await executeAction(action, page, url, sessionDir);
        }
        result.checkpointsPassed++;
        console.log(`✅ PASS: ${checkpoint.id}\n`);
      } catch (error) {
        result.success = false;
        result.failures.push({
          checkpoint: checkpoint.id,
          description: checkpoint.description,
          error: error.message,
        });
        console.log(`❌ FAIL: ${checkpoint.id} - ${error.message}\n`);
      }
    }
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }

  return result;
}

async function executeAction(action, page, baseUrl, sessionDir) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      switch (action.type) {
        case 'navigate':
          console.log(`  → Navigate to ${action.url || '/'}`);
          await page.goto(baseUrl + (action.url || ''), { waitUntil: 'networkidle' });
          break;

        case 'click':
          console.log(`  → Click ${action.selector}`);
          await page.click(action.selector, { timeout: action.timeout || 5000 });
          break;

        case 'type':
          console.log(`  → Type into ${action.selector}`);
          await page.fill(action.selector, action.text, { timeout: action.timeout || 5000 });
          break;

        case 'wait_for':
          console.log(`  → Wait for ${action.selector}`);
          await page.waitForSelector(action.selector, { timeout: action.timeout || 10000 });
          break;

        case 'assert_text':
          console.log(`  → Assert text in ${action.selector}: "${action.text}"`);
          const text = await page.textContent(action.selector, { timeout: action.timeout || 5000 });
          if (!text.includes(action.text)) {
            throw new Error(`Expected "${action.text}" but got "${text}"`);
          }
          break;

        case 'assert_url':
          console.log(`  → Assert URL contains "${action.contains}"`);
          const url = page.url();
          if (!url.includes(action.contains)) {
            throw new Error(`Expected URL to contain "${action.contains}" but got "${url}"`);
          }
          break;

        case 'screenshot':
          const screenshotPath = path.join(sessionDir, `${action.name}.png`);
          console.log(`  → Screenshot: ${action.name}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          break;

        case 'hover':
          console.log(`  → Hover over ${action.selector}`);
          await page.hover(action.selector, { timeout: action.timeout || 5000 });
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      return; // Success, exit retry loop
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      console.log(`  ⚠️  Retry ${attempt}/${MAX_RETRIES} after error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// CLI Entry Point
async function main() {
  const checklistArg = process.argv[2];

  if (!checklistArg) {
    console.error('Usage: node ui-runner-cli.js <checklist-path> [base-url]');
    console.error('Example: node ui-runner-cli.js /workspace/checklists/auth.yaml http://localhost:3000');
    process.exit(1);
  }

  const checklistPath = checklistArg;
  const baseUrl = process.argv[3];

  if (!fs.existsSync(checklistPath)) {
    console.error(`❌ Checklist not found: ${checklistPath}`);
    process.exit(1);
  }

  try {
    const result = await executeChecklist(checklistPath, baseUrl);

    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Checkpoints: ${result.checkpointsPassed}/${result.checkpointsTotal} passed`);
    console.log(`Screenshots: ${result.screenshotDir}`);
    console.log(`Timestamp: ${result.timestamp}`);

    if (result.failures.length > 0) {
      console.log('\n❌ Failures:');
      result.failures.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.checkpoint}: ${f.error}`);
      });
    }

    console.log('='.repeat(60) + '\n');

    // Write result JSON
    const resultPath = path.join(result.screenshotDir, 'result.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`📄 Result saved to: ${resultPath}\n`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
