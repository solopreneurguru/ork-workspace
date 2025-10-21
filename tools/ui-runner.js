// ORK Verifier Service - Watches for verification requests and executes Playwright tests
const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const app = express();
app.use(express.json());

const WORKSPACE = process.env.WORKSPACE || '/workspace';
const CHECKLISTS_DIR = path.join(WORKSPACE, 'checklists');
const ARTIFACTS_DIR = path.join(WORKSPACE, 'artifacts', 'ui');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function executeChecklist(checklistPath, baseUrl) {
  const checklistContent = fs.readFileSync(checklistPath, 'utf-8');
  const checklist = yaml.load(checklistContent);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDir = path.join(ARTIFACTS_DIR, timestamp);
  fs.mkdirSync(sessionDir, { recursive: true });

  const result = {
    success: true,
    checkpointsPassed: 0,
    checkpointsTotal: checklist.checkpoints.length,
    failures: [],
    screenshotDir: sessionDir,
  };

  let browser;
  let page;

  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    const url = baseUrl || checklist.base_url;

    for (const checkpoint of checklist.checkpoints) {
      console.log(`Executing checkpoint: ${checkpoint.id}`);

      try {
        for (const action of checkpoint.actions) {
          await executeAction(action, page, url, sessionDir);
        }
        result.checkpointsPassed++;
      } catch (error) {
        result.success = false;
        result.failures.push({
          checkpoint: checkpoint.id,
          action: checkpoint.description,
          error: error.message,
        });
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
          await page.goto(baseUrl + (action.url || ''), { waitUntil: 'networkidle' });
          break;

        case 'click':
          await page.click(action.selector, { timeout: action.timeout || 5000 });
          break;

        case 'type':
          await page.fill(action.selector, action.text, { timeout: action.timeout || 5000 });
          break;

        case 'select':
          await page.selectOption(action.selector, action.value);
          break;

        case 'wait_for':
          await page.waitForSelector(action.selector, { timeout: action.timeout || 10000 });
          break;

        case 'assert_text':
          const textContent = await page.textContent(action.selector);
          if (!textContent || !textContent.includes(action.text)) {
            throw new Error(`Expected text "${action.text}" not found. Got: "${textContent}"`);
          }
          break;

        case 'assert_url':
          const currentUrl = page.url();
          if (action.contains && !currentUrl.includes(action.contains)) {
            throw new Error(`Expected URL to contain "${action.contains}". Got: "${currentUrl}"`);
          }
          break;

        case 'screenshot':
          const screenshotPath = path.join(sessionDir, `${action.name}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Success - exit retry loop
      return;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// API endpoint to trigger verification
app.post('/verify', async (req, res) => {
  const { checklistPath, baseUrl } = req.body;

  if (!checklistPath) {
    return res.status(400).json({ error: 'checklistPath required' });
  }

  const fullPath = path.isAbsolute(checklistPath)
    ? checklistPath
    : path.join(CHECKLISTS_DIR, checklistPath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: `Checklist not found: ${fullPath}` });
  }

  try {
    const result = await executeChecklist(fullPath, baseUrl);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'verifier' });
});

const PORT = process.env.VERIFIER_PORT || 3003;
app.listen(PORT, () => {
  console.log(`ORK Verifier Service listening on port ${PORT}`);
});
