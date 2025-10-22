#!/usr/bin/env node
/**
 * implementer-web.ts
 *
 * Web Implementer Agent (Next.js)
 *
 * Minimal implementation:
 * - Install dependencies
 * - Format code
 * - Lint
 * - Type check
 * - Build
 * - Ensure scripts exist
 * - Create placeholder routes for features
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

interface BuildSpec {
  name: string;
  features?: string[];
  [key: string]: any;
}

class WebImplementer {
  private workspaceRoot: string;
  private webDir: string;
  private spec: BuildSpec;

  constructor() {
    this.workspaceRoot = process.cwd();
    this.webDir = path.join(this.workspaceRoot, 'apps', 'web');
    this.spec = this.loadBuildSpec();
  }

  private loadBuildSpec(): BuildSpec {
    const specPath = path.join(this.workspaceRoot, 'workspace', 'spec.json');
    return fs.readJsonSync(specPath);
  }

  private log(message: string) {
    console.log(`[WEB-IMPL] ${message}`);
  }

  private exec(command: string, cwd?: string): string {
    try {
      return execSync(command, {
        cwd: cwd || this.webDir,
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

    if (!fs.existsSync(path.join(this.webDir, 'node_modules'))) {
      this.exec('npm install');
      this.log('Dependencies installed');
    } else {
      this.log('Dependencies already installed');
    }
  }

  // Step 2: Ensure scripts exist in package.json
  private async ensureScripts() {
    this.log('Ensuring package.json scripts...');

    const pkgPath = path.join(this.webDir, 'package.json');
    const pkg = fs.readJsonSync(pkgPath);

    const requiredScripts = {
      'dev': 'next dev',
      'build': 'next build',
      'start': 'next start',
      'lint': 'next lint'
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

  // Step 3: Create placeholder routes for features
  private async createFeatureRoutes() {
    this.log('Creating feature routes...');

    const features = this.spec.features || [];
    const pagesDir = path.join(this.webDir, 'pages');

    for (const feature of features) {
      const routeName = feature.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const routePath = path.join(pagesDir, `${routeName}.tsx`);

      if (!fs.existsSync(routePath)) {
        const content = `export default function ${this.toPascalCase(routeName)}() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">${this.toTitleCase(feature)}</h1>
        <p className="text-gray-600">Feature implementation placeholder</p>
      </div>
    </div>
  );
}
`;
        fs.writeFileSync(routePath, content, 'utf-8');
        this.log(`Created route: ${routeName}.tsx`);
      }
    }
  }

  // Step 4: Format code
  private async formatCode() {
    this.log('Formatting code...');
    // Skip if no formatter configured
    this.log('Format: skipped (no formatter)');
  }

  // Step 5: Lint
  private async lint() {
    this.log('Linting...');
    try {
      this.exec('npm run lint');
      this.log('Lint: passed');
    } catch (error) {
      this.log('Lint: skipped or failed (non-blocking)');
    }
  }

  // Step 6: Type check
  private async typeCheck() {
    this.log('Type checking...');

    // Check if tsconfig.json exists
    if (fs.existsSync(path.join(this.webDir, 'tsconfig.json'))) {
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

  // Utility: Convert to PascalCase
  private toPascalCase(str: string): string {
    return str.replace(/(^\w|-\w)/g, (match) =>
      match.replace(/-/, '').toUpperCase()
    );
  }

  // Utility: Convert to Title Case
  private toTitleCase(str: string): string {
    return str.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Main execution
  async run() {
    this.log('Web Implementer Agent starting...');
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
      this.log('Web Implementer: SUCCESS');
      process.exit(0);

    } catch (error: any) {
      this.log('');
      this.log(`Web Implementer: FAILED - ${error.message}`);
      process.exit(1);
    }
  }
}

// Main execution
const implementer = new WebImplementer();
implementer.run();
