/**
 * vercel.ts
 *
 * Vercel deployment adapter
 * Deploys web applications to Vercel platform
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { DeployAdapter, DeployOptions, DeployResult } from './base';

export class VercelAdapter extends DeployAdapter {
  constructor() {
    super({
      platform: 'vercel',
      description: 'Deploy web apps to Vercel',
      secretsRequired: ['VERCEL_TOKEN'],
    });
  }

  checkSecrets(): { available: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.hasEnvSecret('VERCEL_TOKEN')) {
      missing.push('VERCEL_TOKEN');
    }

    return {
      available: missing.length === 0,
      missing,
    };
  }

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const { appDir, projectName, production = false, skipBuild = false } = options;

    this.log(`Deploying to Vercel: ${projectName}`, 'info');
    this.log(`App directory: ${appDir}`, 'info');
    this.log(`Environment: ${production ? 'PRODUCTION' : 'PREVIEW'}`, 'info');

    // Check secrets
    const secretsCheck = this.checkSecrets();
    if (!secretsCheck.available) {
      return {
        success: false,
        message: `Missing required secrets: ${secretsCheck.missing.join(', ')}`,
      };
    }

    // Verify app directory exists
    if (!fs.existsSync(appDir)) {
      return {
        success: false,
        message: `App directory not found: ${appDir}`,
      };
    }

    try {
      // Step 1: Build (if not skipped)
      if (!skipBuild) {
        this.log('Building application...', 'info');
        try {
          execSync('npm run build', {
            cwd: appDir,
            stdio: 'inherit',
          });
          this.log('Build successful', 'success');
        } catch (error) {
          return {
            success: false,
            message: `Build failed: ${error}`,
          };
        }
      } else {
        this.log('Build skipped', 'warn');
      }

      // Step 2: Deploy to Vercel
      this.log('Deploying to Vercel...', 'info');

      const deployArgs = [
        'vercel',
        'deploy',
        '--name', projectName,
        '--yes',
      ];

      if (production) {
        deployArgs.push('--prod');
      }

      const deployOutput = execSync(deployArgs.join(' '), {
        cwd: appDir,
        encoding: 'utf-8',
        env: { ...process.env },
      });

      // Extract URL from output
      const urlMatch = deployOutput.match(/(https:\/\/[^\s]+\.vercel\.app)/);
      const deployUrl = urlMatch ? urlMatch[1] : null;

      if (!deployUrl) {
        return {
          success: false,
          message: 'Could not extract deploy URL from Vercel output',
        };
      }

      this.log(`Deploy successful: ${deployUrl}`, 'success');

      // Save deploy URL to workspace
      const workspaceDir = path.join(process.cwd(), 'workspace');
      if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }

      const urlFile = path.join(workspaceDir, 'deploy-url.txt');
      fs.writeFileSync(urlFile, deployUrl, 'utf-8');

      // Extract project info if available
      const vercelDir = path.join(appDir, '.vercel');
      const projectJsonPath = path.join(vercelDir, 'project.json');
      let metadata: Record<string, any> = {};

      if (fs.existsSync(projectJsonPath)) {
        const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
        metadata = {
          projectId: projectJson.projectId,
          orgId: projectJson.orgId,
        };
        this.log(`Project ID: ${projectJson.projectId}`, 'info');
      }

      return {
        success: true,
        url: deployUrl,
        message: `Deployed successfully to ${production ? 'production' : 'preview'}`,
        metadata,
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Deployment failed: ${error.message || error}`,
      };
    }
  }
}
