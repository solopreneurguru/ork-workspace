#!/usr/bin/env node
/**
 * verify-auto.ts
 *
 * Automatic verification suite selector
 *
 * Reads workspace/spec.json and runs appropriate test suites:
 * - web → Playwright UI smoke tests
 * - backend → Supertest API smoke tests
 * - mobile → Maestro YAML stubs (CI only)
 *
 * Usage:
 *   node scripts/verify-auto.ts [base-url]
 *   node scripts/verify-auto.ts --web-url http://localhost:3000 --api-url http://localhost:3001
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

interface BuildSpec {
  name: string;
  targets: string[];
  quality_gates?: string[];
  deploy?: {
    web?: string;
    mobile?: string;
    backend?: string;
  };
}

interface VerifyOptions {
  webUrl?: string;
  apiUrl?: string;
  skipMobile?: boolean;
}

class VerifyAuto {
  private workspaceRoot: string;
  private spec: BuildSpec;
  private options: VerifyOptions;
  private results: Map<string, boolean> = new Map();

  constructor(options: VerifyOptions = {}) {
    this.workspaceRoot = process.cwd();
    this.spec = this.loadBuildSpec();
    this.options = options;
  }

  private loadBuildSpec(): BuildSpec {
    const specPath = path.join(this.workspaceRoot, 'workspace', 'spec.json');
    if (!fs.existsSync(specPath)) {
      throw new Error('workspace/spec.json not found');
    }
    return fs.readJsonSync(specPath);
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const colors: Record<string, string> = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warn: '\x1b[33m',
    };
    const reset = '\x1b[0m';
    const prefix = type === 'info' ? '[INFO]' : type === 'success' ? '[OK]' : type === 'error' ? '[ERR]' : '[WARN]';
    console.log(`${colors[type]}${prefix}${reset} ${message}`);
  }

  private exec(command: string, options: { silent?: boolean } = {}): { success: boolean; output: string } {
    try {
      const output = execSync(command, {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
        stdio: options.silent ? 'pipe' : 'inherit'
      });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.stdout || error.stderr || error.message };
    }
  }

  // Verify web target with Playwright
  private async verifyWeb(): Promise<boolean> {
    this.log('', 'info');
    this.log('=== WEB VERIFICATION (Playwright) ===', 'info');
    this.log('', 'info');

    const webUrl = this.options.webUrl || 'http://localhost:3000';
    const checklistsDir = path.join(this.workspaceRoot, 'checklists');

    // Find web checklist (prefer auth.yaml, fallback to web-smoke.yaml)
    let checklist = 'auth.yaml';
    if (!fs.existsSync(path.join(checklistsDir, checklist))) {
      checklist = 'web-smoke.yaml';
    }

    if (!fs.existsSync(path.join(checklistsDir, checklist))) {
      this.log('No web checklist found, skipping web verification', 'warn');
      return true; // Non-blocking
    }

    const checklistPath = path.join('checklists', checklist);
    this.log(`Running Playwright: ${checklist}`, 'info');
    this.log(`Base URL: ${webUrl}`, 'info');

    const result = this.exec(`node tools/ui-runner-cli.js ${checklistPath} ${webUrl}`);

    if (result.success) {
      this.log('Web verification: PASSED', 'success');
      return true;
    } else {
      this.log('Web verification: FAILED', 'error');
      return false;
    }
  }

  // Verify backend target with API smoke tests
  private async verifyBackend(): Promise<boolean> {
    this.log('', 'info');
    this.log('=== BACKEND VERIFICATION (API Smoke) ===', 'info');
    this.log('', 'info');

    const apiUrl = this.options.apiUrl || 'http://localhost:3000';

    // Check if backend smoke test exists
    const apiTestPath = path.join(this.workspaceRoot, 'tests', 'api-smoke.test.ts');

    if (!fs.existsSync(apiTestPath)) {
      this.log('No API smoke test found, skipping backend verification', 'warn');
      return true; // Non-blocking
    }

    this.log(`Running API smoke tests`, 'info');
    this.log(`Base URL: ${apiUrl}`, 'info');

    const result = this.exec(`API_BASE_URL=${apiUrl} npx jest tests/api-smoke.test.ts`);

    if (result.success) {
      this.log('Backend verification: PASSED', 'success');
      return true;
    } else {
      this.log('Backend verification: FAILED', 'error');
      return false;
    }
  }

  // Verify mobile target with Maestro (CI only)
  private async verifyMobile(): Promise<boolean> {
    this.log('', 'info');
    this.log('=== MOBILE VERIFICATION (Maestro) ===', 'info');
    this.log('', 'info');

    if (this.options.skipMobile || process.env.CI !== 'true') {
      this.log('Mobile verification skipped (requires CI or emulator)', 'warn');
      return true; // Non-blocking
    }

    const maestroPath = path.join(this.workspaceRoot, 'tests', 'mobile', 'smoke.yaml');

    if (!fs.existsSync(maestroPath)) {
      this.log('No Maestro test found, skipping mobile verification', 'warn');
      return true;
    }

    this.log('Running Maestro tests', 'info');

    const result = this.exec(`maestro test ${maestroPath}`);

    if (result.success) {
      this.log('Mobile verification: PASSED', 'success');
      return true;
    } else {
      this.log('Mobile verification: FAILED', 'error');
      return false;
    }
  }

  // Main execution
  async run(): Promise<void> {
    this.log('ORK Automatic Verification', 'info');
    this.log('', 'info');
    this.log(`Project: ${this.spec.name}`, 'info');
    this.log(`Targets: ${this.spec.targets.join(', ')}`, 'info');
    this.log(`Quality Gates: ${(this.spec.quality_gates || []).join(', ') || 'none'}`, 'info');
    this.log('', 'info');

    let allPassed = true;

    // Run verification for each target
    for (const target of this.spec.targets) {
      let passed = false;

      switch (target) {
        case 'web':
          passed = await this.verifyWeb();
          this.results.set('web', passed);
          break;

        case 'backend':
          passed = await this.verifyBackend();
          this.results.set('backend', passed);
          break;

        case 'mobile':
          passed = await this.verifyMobile();
          this.results.set('mobile', passed);
          break;

        default:
          this.log(`Unknown target: ${target}`, 'warn');
          break;
      }

      if (!passed) {
        allPassed = false;
      }
    }

    // Summary
    this.log('', 'info');
    this.log('=== VERIFICATION SUMMARY ===', 'info');
    for (const [target, passed] of this.results.entries()) {
      const status = passed ? 'PASSED' : 'FAILED';
      const type = passed ? 'success' : 'error';
      this.log(`${target.toUpperCase()}: ${status}`, type);
    }

    this.log('', 'info');

    if (allPassed) {
      this.log('All verifications PASSED', 'success');
      process.exit(0);
    } else {
      this.log('Some verifications FAILED', 'error');
      process.exit(1);
    }
  }
}

// Parse command line arguments
function parseArgs(): VerifyOptions {
  const args = process.argv.slice(2);
  const options: VerifyOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--web-url' && args[i + 1]) {
      options.webUrl = args[i + 1];
      i++;
    } else if (args[i] === '--api-url' && args[i + 1]) {
      options.apiUrl = args[i + 1];
      i++;
    } else if (args[i] === '--skip-mobile') {
      options.skipMobile = true;
    } else if (!args[i].startsWith('--')) {
      // First non-flag argument is web URL
      options.webUrl = args[i];
    }
  }

  return options;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const verifier = new VerifyAuto(options);
    await verifier.run();
  } catch (error: any) {
    console.error('[ERR]', error.message);
    process.exit(1);
  }
}

main();
