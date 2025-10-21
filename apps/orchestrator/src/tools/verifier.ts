import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface ChecklistAction {
  type:
    | 'navigate'
    | 'click'
    | 'type'
    | 'select'
    | 'wait_for'
    | 'assert_text'
    | 'assert_url'
    | 'screenshot';
  url?: string;
  selector?: string;
  text?: string;
  value?: string;
  contains?: string;
  timeout?: number;
  name?: string;
}

export interface Checkpoint {
  id: string;
  description: string;
  actions: ChecklistAction[];
}

export interface Checklist {
  name: string;
  description: string;
  base_url: string;
  checkpoints: Checkpoint[];
}

export interface VerificationResult {
  success: boolean;
  checkpointsPassed: number;
  checkpointsTotal: number;
  failures: Array<{
    checkpoint: string;
    action: string;
    error: string;
  }>;
  screenshotDir?: string;
}

export class BrowserVerifier {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private screenshotDir: string;

  constructor(screenshotDir: string = '../../artifacts/ui') {
    this.screenshotDir = screenshotDir;
  }

  /**
   * Parse YAML checklist file
   */
  parseChecklist(checklistPath: string): Checklist {
    const content = fs.readFileSync(checklistPath, 'utf-8');
    const checklist = yaml.load(content) as Checklist;

    // Validate schema
    if (!checklist.name || !checklist.base_url || !checklist.checkpoints) {
      throw new Error('Invalid checklist schema: missing required fields');
    }

    return checklist;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: ChecklistAction,
    baseUrl: string,
    sessionDir: string
  ): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        switch (action.type) {
          case 'navigate':
            await this.page.goto(baseUrl + (action.url || ''), {
              waitUntil: 'networkidle',
            });
            break;

          case 'click':
            if (!action.selector) throw new Error('Click requires selector');
            await this.page.click(action.selector, {
              timeout: action.timeout || 5000,
            });
            break;

          case 'type':
            if (!action.selector || !action.text)
              throw new Error('Type requires selector and text');
            await this.page.fill(action.selector, action.text, {
              timeout: action.timeout || 5000,
            });
            break;

          case 'select':
            if (!action.selector || !action.value)
              throw new Error('Select requires selector and value');
            await this.page.selectOption(action.selector, action.value);
            break;

          case 'wait_for':
            if (!action.selector) throw new Error('Wait_for requires selector');
            await this.page.waitForSelector(action.selector, {
              timeout: action.timeout || 10000,
            });
            break;

          case 'assert_text': {
            if (!action.selector || !action.text)
              throw new Error('Assert_text requires selector and text');
            const textContent = await this.page.textContent(action.selector);
            if (!textContent?.includes(action.text)) {
              throw new Error(`Expected text "${action.text}" not found. Got: "${textContent}"`);
            }
            break;
          }

          case 'assert_url': {
            const currentUrl = this.page.url();
            if (action.contains && !currentUrl.includes(action.contains)) {
              throw new Error(`Expected URL to contain "${action.contains}". Got: "${currentUrl}"`);
            }
            break;
          }

          case 'screenshot': {
            if (!action.name) throw new Error('Screenshot requires name');
            const screenshotPath = path.join(sessionDir, `${action.name}.png`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            break;
          }

          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        // Success - exit retry loop
        break;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          throw error; // Exhausted retries
        }
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  /**
   * Execute a checkpoint
   */
  private async executeCheckpoint(
    checkpoint: Checkpoint,
    baseUrl: string,
    sessionDir: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      for (const action of checkpoint.actions) {
        await this.executeAction(action, baseUrl, sessionDir);
      }
      return { success: true };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * Run full checklist verification
   */
  async verify(checklistPath: string): Promise<VerificationResult> {
    const checklist = this.parseChecklist(checklistPath);

    // Create timestamped session directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionDir = path.join(this.screenshotDir, timestamp);

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const result: VerificationResult = {
      success: true,
      checkpointsPassed: 0,
      checkpointsTotal: checklist.checkpoints.length,
      failures: [],
      screenshotDir: sessionDir,
    };

    try {
      // Launch browser
      this.browser = await chromium.launch({ headless: true });
      this.page = await this.browser.newPage();

      // Execute each checkpoint
      for (const checkpoint of checklist.checkpoints) {
        const checkpointResult = await this.executeCheckpoint(
          checkpoint,
          checklist.base_url,
          sessionDir
        );

        if (checkpointResult.success) {
          result.checkpointsPassed++;
        } else {
          result.success = false;
          result.failures.push({
            checkpoint: checkpoint.id,
            action: checkpoint.description,
            error: checkpointResult.error || 'Unknown error',
          });
        }
      }
    } finally {
      // Cleanup
      if (this.page) await this.page.close();
      if (this.browser) await this.browser.close();
    }

    return result;
  }

  /**
   * Generate Playwright test file from checklist
   */
  generatePlaywrightTest(checklistPath: string, outputPath: string): void {
    const checklist = this.parseChecklist(checklistPath);

    const testContent = `
import { test, expect } from '@playwright/test';

test.describe('${checklist.name}', () => {
  test('${checklist.description}', async ({ page }) => {
${checklist.checkpoints
  .map((cp) => {
    const actions = cp.actions
      .map((action) => {
        switch (action.type) {
          case 'navigate':
            return `    await page.goto('${checklist.base_url}${action.url || ''}');`;
          case 'click':
            return `    await page.click('${action.selector}');`;
          case 'type':
            return `    await page.fill('${action.selector}', '${action.text}');`;
          case 'wait_for':
            return `    await page.waitForSelector('${action.selector}');`;
          case 'assert_text':
            return `    await expect(page.locator('${action.selector}')).toContainText('${action.text}');`;
          case 'assert_url':
            return `    expect(page.url()).toContain('${action.contains}');`;
          case 'screenshot':
            return `    await page.screenshot({ path: 'screenshots/${action.name}.png' });`;
          default:
            return '';
        }
      })
      .join('\n');

    return `    // ${cp.description}\n${actions}`;
  })
  .join('\n\n')}
  });
});
`;

    fs.writeFileSync(outputPath, testContent.trim(), 'utf-8');
  }
}
