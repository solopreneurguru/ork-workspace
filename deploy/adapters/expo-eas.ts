/**
 * expo-eas.ts
 *
 * Expo EAS (Expo Application Services) deployment adapter
 * Deploys mobile apps to Expo EAS Build
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import { DeployAdapter, DeployOptions, DeployResult } from './base';

export interface ExpoEASOptions extends DeployOptions {
  platform?: 'ios' | 'android' | 'all';
  profile?: string; // EAS build profile (preview, production, etc.)
}

export class ExpoEASAdapter extends DeployAdapter {
  constructor() {
    super({
      platform: 'expo-eas',
      description: 'Deploy mobile apps to Expo EAS',
      secretsRequired: ['EXPO_TOKEN'],
    });
  }

  checkSecrets(): { available: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.hasEnvSecret('EXPO_TOKEN')) {
      missing.push('EXPO_TOKEN');
    }

    return {
      available: missing.length === 0,
      missing,
    };
  }

  async deploy(options: ExpoEASOptions): Promise<DeployResult> {
    const {
      appDir,
      projectName,
      platform = 'all',
      profile = 'preview',
    } = options;

    this.log(`Deploying to Expo EAS: ${projectName}`, 'info');
    this.log(`App directory: ${appDir}`, 'info');
    this.log(`Platform: ${platform}`, 'info');
    this.log(`Build profile: ${profile}`, 'info');

    // Check secrets
    const secretsCheck = this.checkSecrets();
    if (!secretsCheck.available) {
      return {
        success: false,
        message: `Missing required secrets: ${secretsCheck.missing.join(', ')}. Add EXPO_TOKEN to .env file.`,
      };
    }

    // Verify app directory exists
    if (!fs.existsSync(appDir)) {
      return {
        success: false,
        message: `App directory not found: ${appDir}`,
      };
    }

    // Verify eas.json exists
    const easConfigPath = `${appDir}/eas.json`;
    if (!fs.existsSync(easConfigPath)) {
      this.log('eas.json not found - EAS Build requires configuration', 'warn');
      return {
        success: false,
        message: 'eas.json not found. Run: eas build:configure',
      };
    }

    try {
      // Check if EAS CLI is installed
      try {
        execSync('eas --version', { stdio: 'pipe' });
      } catch {
        this.log('EAS CLI not installed', 'error');
        return {
          success: false,
          message: 'EAS CLI not found. Install with: npm install -g eas-cli',
        };
      }

      // Step 1: Build with EAS
      this.log(`Building with EAS (platform: ${platform}, profile: ${profile})...`, 'info');

      const buildArgs = [
        'eas',
        'build',
        '--platform', platform,
        '--profile', profile,
        '--non-interactive',
      ];

      // Note: This is a scaffold - actual EAS builds can take 15-30 minutes
      // In production, you'd typically run this asynchronously and poll for status
      this.log('Submitting build to EAS...', 'info');

      const buildOutput = execSync(buildArgs.join(' '), {
        cwd: appDir,
        encoding: 'utf-8',
        env: { ...process.env },
      });

      // Extract build ID from output (EAS typically shows "Build ID: abc123")
      const buildIdMatch = buildOutput.match(/Build ID[:\s]+([a-f0-9-]+)/i);
      const buildId = buildIdMatch ? buildIdMatch[1] : null;

      this.log('Build submitted successfully', 'success');

      if (buildId) {
        this.log(`Build ID: ${buildId}`, 'info');
        this.log(`Track build: https://expo.dev/accounts/[account]/projects/${projectName}/builds/${buildId}`, 'info');
      }

      return {
        success: true,
        message: `EAS build submitted for ${platform}`,
        metadata: {
          buildId,
          platform,
          profile,
          note: 'Build is processing on EAS servers. Check Expo dashboard for status.',
        },
      };

    } catch (error: any) {
      // EAS builds can fail for various reasons (config, quota, network)
      return {
        success: false,
        message: `EAS build failed: ${error.message || error}`,
      };
    }
  }

  /**
   * Check build status (helper for async build monitoring)
   */
  async checkBuildStatus(buildId: string, appDir: string): Promise<string> {
    try {
      const statusOutput = execSync(`eas build:view ${buildId}`, {
        cwd: appDir,
        encoding: 'utf-8',
      });

      // Parse status from output
      const statusMatch = statusOutput.match(/Status[:\s]+(\w+)/i);
      return statusMatch ? statusMatch[1] : 'unknown';
    } catch {
      return 'error';
    }
  }
}
