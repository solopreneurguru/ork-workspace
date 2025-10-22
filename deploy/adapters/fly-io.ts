/**
 * fly-io.ts
 *
 * Fly.io deployment adapter
 * Deploys backend Node.js applications to Fly.io
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { DeployAdapter, DeployOptions, DeployResult } from './base';

export class FlyIoAdapter extends DeployAdapter {
  constructor() {
    super({
      platform: 'fly-io',
      description: 'Deploy backend apps to Fly.io',
      secretsRequired: ['FLY_API_TOKEN'],
    });
  }

  checkSecrets(): { available: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.hasEnvSecret('FLY_API_TOKEN')) {
      missing.push('FLY_API_TOKEN');
    }

    return {
      available: missing.length === 0,
      missing,
    };
  }

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const { appDir, projectName, production = false } = options;

    this.log(`Deploying to Fly.io: ${projectName}`, 'info');
    this.log(`App directory: ${appDir}`, 'info');

    // Check secrets
    const secretsCheck = this.checkSecrets();
    if (!secretsCheck.available) {
      return {
        success: false,
        message: `Missing required secrets: ${secretsCheck.missing.join(', ')}. Add FLY_API_TOKEN to .env file.`,
      };
    }

    // Verify app directory exists
    if (!fs.existsSync(appDir)) {
      return {
        success: false,
        message: `App directory not found: ${appDir}`,
      };
    }

    // Check if flyctl is installed
    try {
      execSync('flyctl version', { stdio: 'pipe' });
    } catch {
      this.log('Fly CLI not installed', 'error');
      return {
        success: false,
        message: 'flyctl not found. Install from: https://fly.io/docs/hands-on/install-flyctl/',
      };
    }

    // Check if fly.toml exists
    const flyConfigPath = path.join(appDir, 'fly.toml');
    if (!fs.existsSync(flyConfigPath)) {
      this.log('fly.toml not found - app needs to be initialized', 'warn');
      return {
        success: false,
        message: 'fly.toml not found. Run: flyctl launch',
      };
    }

    try {
      // Step 1: Deploy to Fly.io
      this.log('Deploying to Fly.io...', 'info');

      const deployArgs = [
        'flyctl',
        'deploy',
        '--remote-only', // Build on Fly.io servers (no local Docker needed)
      ];

      // Fly.io detects Dockerfile or uses buildpacks automatically
      const deployOutput = execSync(deployArgs.join(' '), {
        cwd: appDir,
        encoding: 'utf-8',
        env: { ...process.env },
      });

      // Extract app URL from output
      // Fly.io typically shows: "Visit your newly deployed app at https://app-name.fly.dev"
      const urlMatch = deployOutput.match(/(https:\/\/[^\s]+\.fly\.dev)/);
      const deployUrl = urlMatch ? urlMatch[1] : null;

      if (!deployUrl) {
        // Fallback: construct URL from app name
        const appNameMatch = deployOutput.match(/app[:\s]+([a-z0-9-]+)/i);
        const appName = appNameMatch ? appNameMatch[1] : projectName.toLowerCase();
        const fallbackUrl = `https://${appName}.fly.dev`;

        this.log(`Deploy completed. Estimated URL: ${fallbackUrl}`, 'success');

        return {
          success: true,
          url: fallbackUrl,
          message: 'Deployed successfully to Fly.io',
          metadata: {
            appName,
            note: 'URL estimated from app name. Verify in Fly.io dashboard.',
          },
        };
      }

      this.log(`Deploy successful: ${deployUrl}`, 'success');

      // Save deploy URL to workspace
      const workspaceDir = path.join(process.cwd(), 'workspace');
      if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }

      const urlFile = path.join(workspaceDir, 'deploy-url-backend.txt');
      fs.writeFileSync(urlFile, deployUrl, 'utf-8');

      return {
        success: true,
        url: deployUrl,
        message: 'Deployed successfully to Fly.io',
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Deployment failed: ${error.message || error}`,
      };
    }
  }

  /**
   * Get app status (helper)
   */
  async getStatus(appName: string): Promise<string> {
    try {
      const statusOutput = execSync(`flyctl status --app ${appName}`, {
        encoding: 'utf-8',
      });
      return statusOutput;
    } catch {
      return 'Unable to get status';
    }
  }
}
