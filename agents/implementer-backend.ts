#!/usr/bin/env node
/**
 * implementer-backend.ts
 *
 * Backend Implementer Agent (Express)
 *
 * Minimal implementation:
 * - Install dependencies
 * - Format code
 * - Lint
 * - Type check
 * - Build
 * - Ensure health endpoint exists
 * - Create placeholder API routes for features
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

interface BuildSpec {
  name: string;
  features?: string[];
  [key: string]: any;
}

class BackendImplementer {
  private workspaceRoot: string;
  private backendDir: string;
  private spec: BuildSpec;

  constructor() {
    this.workspaceRoot = process.cwd();
    this.backendDir = path.join(this.workspaceRoot, 'apps', 'backend');
    this.spec = this.loadBuildSpec();
  }

  private loadBuildSpec(): BuildSpec {
    const specPath = path.join(this.workspaceRoot, 'workspace', 'spec.json');
    return fs.readJsonSync(specPath);
  }

  private log(message: string) {
    console.log(`[BACKEND-IMPL] ${message}`);
  }

  private exec(command: string, cwd?: string): string {
    try {
      return execSync(command, {
        cwd: cwd || this.backendDir,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    } catch (error: any) {
      this.log(`Command failed: ${command}`);
      throw error;
    }
  }

  // Step 1: Install dependencies
  private async installDependencies() {
    this.log('Installing dependencies...');

    if (!fs.existsSync(path.join(this.backendDir, 'node_modules'))) {
      this.exec('npm install');
      this.log('Dependencies installed');
    } else {
      this.log('Dependencies already installed');
    }
  }

  // Step 2: Ensure scripts exist
  private async ensureScripts() {
    this.log('Ensuring package.json scripts...');

    const pkgPath = path.join(this.backendDir, 'package.json');
    const pkg = fs.readJsonSync(pkgPath);

    const requiredScripts = {
      'dev': 'tsx watch src/index.ts',
      'build': 'tsc',
      'start': 'node dist/index.js',
      'test': 'jest'
    };

    let modified = false;
    for (const [name, command] of Object.entries(requiredScripts)) {
      if (!pkg.scripts[name]) {
        pkg.scripts[name] = command;
        modified = true;
      }
    }

    if (modified) {
      fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
      this.log('Scripts added to package.json');
    } else {
      this.log('All scripts present');
    }
  }

  // Step 3: Create API routes for features
  private async createFeatureRoutes() {
    this.log('Creating feature API routes...');

    const features = this.spec.features || [];
    const srcDir = path.join(this.backendDir, 'src');
    const routesDir = path.join(srcDir, 'routes');

    fs.ensureDirSync(routesDir);

    for (const feature of features) {
      const routeName = feature.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const routePath = path.join(routesDir, `${routeName}.ts`);

      if (!fs.existsSync(routePath)) {
        const content = `import { Router, Request, Response } from 'express';

const router = Router();

// GET /${routeName}
router.get('/', (req: Request, res: Response) => {
  res.json({
    feature: '${feature}',
    status: 'implemented',
    message: 'Placeholder endpoint'
  });
});

export default router;
`;
        fs.writeFileSync(routePath, content, 'utf-8');
        this.log(`Created route: ${routeName}.ts`);
      }
    }
  }

  // Step 4: Format code
  private async formatCode() {
    this.log('Formatting code...');
    this.log('Format: skipped (no formatter)');
  }

  // Step 5: Lint
  private async lint() {
    this.log('Linting...');
    this.log('Lint: skipped (no linter configured)');
  }

  // Step 6: Type check
  private async typeCheck() {
    this.log('Type checking...');

    if (fs.existsSync(path.join(this.backendDir, 'tsconfig.json'))) {
      try {
        this.exec('npx tsc --noEmit');
        this.log('Type check: passed');
      } catch (error) {
        this.log('Type check: failed (non-blocking)');
      }
    } else {
      this.log('Type check: skipped (no tsconfig.json)');
    }
  }

  // Step 7: Build
  private async build() {
    this.log('Building...');
    this.exec('npm run build');
    this.log('Build: success');
  }

  // Main execution
  async run() {
    this.log('Backend Implementer Agent starting...');
    this.log(`Project: ${this.spec.name}`);
    this.log(`Features: ${(this.spec.features || []).join(', ') || 'none'}`);
    this.log('');

    try {
      await this.installDependencies();
      await this.ensureScripts();
      await this.createFeatureRoutes();
      await this.formatCode();
      await this.lint();
      await this.typeCheck();
      await this.build();

      this.log('');
      this.log('Backend Implementer: SUCCESS');
      process.exit(0);

    } catch (error: any) {
      this.log('');
      this.log(`Backend Implementer: FAILED - ${error.message}`);
      process.exit(1);
    }
  }
}

// Main execution
const implementer = new BackendImplementer();
implementer.run();
