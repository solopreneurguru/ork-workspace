/**
 * deploy-auto.ts
 *
 * Automatic deployment switcher
 * Reads BuildSpec and deploys to appropriate platforms based on targets
 *
 * Usage:
 *   npx tsx scripts/deploy-auto.ts
 *   npx tsx scripts/deploy-auto.ts --production
 *   npx tsx scripts/deploy-auto.ts --target web
 */

import * as fs from 'fs';
import * as path from 'path';
import { VercelAdapter } from '../deploy/adapters/vercel';
import { ExpoEASAdapter } from '../deploy/adapters/expo-eas';
import { FlyIoAdapter } from '../deploy/adapters/fly-io';
import { DeployAdapter, DeployResult } from '../deploy/adapters/base';

interface BuildSpec {
  name: string;
  targets: string[];
  deploy?: {
    web?: string;
    backend?: string;
    mobile?: string;
  };
}

interface DeployAutoOptions {
  production: boolean;
  targetFilter?: string; // Deploy only specific target
  skipBuild: boolean;
  skipVerify: boolean;
}

class DeployAuto {
  private spec: BuildSpec;
  private options: DeployAutoOptions;
  private results: Map<string, DeployResult> = new Map();

  constructor(spec: BuildSpec, options: DeployAutoOptions) {
    this.spec = spec;
    this.options = options;
  }

  private log(message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    const colors = {
      info: '\x1b[36m[INFO]\x1b[0m',
      success: '\x1b[32m[OK]\x1b[0m',
      warn: '\x1b[33m[WARN]\x1b[0m',
      error: '\x1b[31m[ERR]\x1b[0m',
    };
    console.log(`${colors[level]} ${message}`);
  }

  private getAdapterForTarget(target: string): DeployAdapter | null {
    const deployConfig = this.spec.deploy || {};

    switch (target) {
      case 'web':
        // Web defaults to Vercel
        const webPlatform = deployConfig.web || 'vercel';
        if (webPlatform === 'vercel') {
          return new VercelAdapter();
        }
        this.log(`Unknown web platform: ${webPlatform}`, 'error');
        return null;

      case 'backend':
        // Backend defaults to Fly.io
        const backendPlatform = deployConfig.backend || 'fly-io';
        if (backendPlatform === 'fly-io') {
          return new FlyIoAdapter();
        }
        this.log(`Unknown backend platform: ${backendPlatform}`, 'error');
        return null;

      case 'mobile':
        // Mobile defaults to Expo EAS
        const mobilePlatform = deployConfig.mobile || 'expo-eas';
        if (mobilePlatform === 'expo-eas') {
          return new ExpoEASAdapter();
        }
        this.log(`Unknown mobile platform: ${mobilePlatform}`, 'error');
        return null;

      default:
        this.log(`Unknown target: ${target}`, 'warn');
        return null;
    }
  }

  private getAppDirForTarget(target: string): string {
    const appsDir = path.join(process.cwd(), 'apps');

    switch (target) {
      case 'web':
        return path.join(appsDir, 'web');
      case 'backend':
        return path.join(appsDir, 'backend');
      case 'mobile':
        return path.join(appsDir, 'mobile');
      default:
        return appsDir;
    }
  }

  private async deployTarget(target: string): Promise<boolean> {
    // Skip if target filter is set and doesn't match
    if (this.options.targetFilter && this.options.targetFilter !== target) {
      this.log(`Skipping ${target} (filter: ${this.options.targetFilter})`, 'info');
      return true;
    }

    this.log(``, 'info');
    this.log(`=== ${target.toUpperCase()} DEPLOYMENT ===`, 'info');
    this.log(``, 'info');

    const adapter = this.getAdapterForTarget(target);
    if (!adapter) {
      this.log(`No adapter available for target: ${target}`, 'error');
      this.results.set(target, {
        success: false,
        message: 'No adapter available',
      });
      return false;
    }

    // Check secrets
    const secretsCheck = adapter.checkSecrets();
    if (!secretsCheck.available) {
      const adapterInfo = adapter.getInfo();
      this.log(`Missing secrets for ${adapterInfo.platform}: ${secretsCheck.missing.join(', ')}`, 'warn');
      this.log(``, 'info');
      this.log(`TODO: Add the following to .env file:`, 'warn');
      secretsCheck.missing.forEach(secret => {
        this.log(`  ${secret}=<your-token>`, 'warn');
      });
      this.log(``, 'info');

      this.results.set(target, {
        success: false,
        message: `Missing secrets: ${secretsCheck.missing.join(', ')}`,
      });
      return false;
    }

    // Deploy
    const appDir = this.getAppDirForTarget(target);
    const result = await adapter.deploy({
      appDir,
      projectName: this.spec.name,
      production: this.options.production,
      skipBuild: this.options.skipBuild,
      skipVerify: this.options.skipVerify,
    });

    this.results.set(target, result);

    if (result.success) {
      this.log(`${target} deployment: SUCCESS`, 'success');
      if (result.url) {
        this.log(`URL: ${result.url}`, 'info');
      }
    } else {
      this.log(`${target} deployment: FAILED`, 'error');
      this.log(`Reason: ${result.message}`, 'error');
    }

    return result.success;
  }

  async run(): Promise<void> {
    this.log(`ORK Automatic Deployment`, 'info');
    this.log(``, 'info');
    this.log(`Project: ${this.spec.name}`, 'info');
    this.log(`Targets: ${this.spec.targets.join(', ')}`, 'info');
    this.log(`Environment: ${this.options.production ? 'PRODUCTION' : 'PREVIEW'}`, 'info');
    this.log(``, 'info');

    const deployResults: boolean[] = [];

    // Deploy each target
    for (const target of this.spec.targets) {
      const success = await this.deployTarget(target);
      deployResults.push(success);
    }

    // Print summary
    this.log(``, 'info');
    this.log(`=== DEPLOYMENT SUMMARY ===`, 'info');

    for (const [target, result] of this.results.entries()) {
      const status = result.success ? '\x1b[32mSUCCESS\x1b[0m' : '\x1b[31mFAILED\x1b[0m';
      this.log(`${target.toUpperCase()}: ${status}`, 'info');

      if (!result.success) {
        this.log(`  Reason: ${result.message}`, 'warn');
      } else if (result.url) {
        this.log(`  URL: ${result.url}`, 'info');
      }
    }

    this.log(``, 'info');

    const allSucceeded = deployResults.every(r => r);
    if (allSucceeded) {
      this.log(`All deployments completed successfully`, 'success');
      process.exit(0);
    } else {
      this.log(`Some deployments failed`, 'error');
      process.exit(1);
    }
  }
}

// Parse command-line arguments
function parseArgs(): DeployAutoOptions {
  const args = process.argv.slice(2);

  const options: DeployAutoOptions = {
    production: false,
    skipBuild: false,
    skipVerify: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--production' || arg === '--prod') {
      options.production = true;
    } else if (arg === '--skip-build') {
      options.skipBuild = true;
    } else if (arg === '--skip-verify') {
      options.skipVerify = true;
    } else if (arg === '--target' && i + 1 < args.length) {
      options.targetFilter = args[i + 1];
      i++;
    }
  }

  return options;
}

// Main
async function main() {
  // Load BuildSpec
  const specPath = path.join(process.cwd(), 'workspace', 'spec.json');
  if (!fs.existsSync(specPath)) {
    console.error('\x1b[31m[ERR]\x1b[0m BuildSpec not found: workspace/spec.json');
    console.error('\x1b[33m[WARN]\x1b[0m Run: .\\ork.ps1 new <ProjectName>');
    process.exit(1);
  }

  const spec: BuildSpec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

  // Load .env file if it exists
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) {
        process.env[match[1]] = match[2].trim();
      }
    });
  }

  const options = parseArgs();
  const deployer = new DeployAuto(spec, options);

  await deployer.run();
}

main().catch(error => {
  console.error('\x1b[31m[ERR]\x1b[0m Deployment failed:', error);
  process.exit(1);
});
