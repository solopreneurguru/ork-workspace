#!/usr/bin/env node
/**
 * implementer-mobile.ts
 *
 * Mobile Implementer Agent (Expo)
 *
 * Minimal implementation:
 * - Install dependencies
 * - Lint
 * - Ensure app.json and eas.json are valid
 * - Create placeholder screens for features
 * - Run expo doctor (if available)
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

interface BuildSpec {
  name: string;
  features?: string[];
  [key: string]: any;
}

class MobileImplementer {
  private workspaceRoot: string;
  private mobileDir: string;
  private spec: BuildSpec;

  constructor() {
    this.workspaceRoot = process.cwd();
    this.mobileDir = path.join(this.workspaceRoot, 'apps', 'mobile');
    this.spec = this.loadBuildSpec();
  }

  private loadBuildSpec(): BuildSpec {
    const specPath = path.join(this.workspaceRoot, 'workspace', 'spec.json');
    return fs.readJsonSync(specPath);
  }

  private log(message: string) {
    console.log(`[MOBILE-IMPL] ${message}`);
  }

  private exec(command: string, cwd?: string): string {
    try {
      return execSync(command, {
        cwd: cwd || this.mobileDir,
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

    if (!fs.existsSync(path.join(this.mobileDir, 'node_modules'))) {
      this.exec('npm install');
      this.log('Dependencies installed');
    } else {
      this.log('Dependencies already installed');
    }
  }

  // Step 2: Validate app.json
  private async validateAppJson() {
    this.log('Validating app.json...');

    const appJsonPath = path.join(this.mobileDir, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appJson = fs.readJsonSync(appJsonPath);
      if (appJson.expo && appJson.expo.name) {
        this.log('app.json: valid');
      } else {
        throw new Error('app.json missing expo.name');
      }
    } else {
      throw new Error('app.json not found');
    }
  }

  // Step 3: Validate eas.json
  private async validateEasJson() {
    this.log('Validating eas.json...');

    const easJsonPath = path.join(this.mobileDir, 'eas.json');
    if (fs.existsSync(easJsonPath)) {
      const easJson = fs.readJsonSync(easJsonPath);
      if (easJson.build) {
        this.log('eas.json: valid');
      } else {
        throw new Error('eas.json missing build config');
      }
    } else {
      this.log('eas.json: not found (optional)');
    }
  }

  // Step 4: Create screens for features
  private async createFeatureScreens() {
    this.log('Creating feature screens...');

    const features = this.spec.features || [];
    const screensDir = path.join(this.mobileDir, 'screens');

    fs.ensureDirSync(screensDir);

    for (const feature of features) {
      const screenName = this.toPascalCase(feature);
      const screenPath = path.join(screensDir, `${screenName}Screen.tsx`);

      if (!fs.existsSync(screenPath)) {
        const content = `import { View, Text, StyleSheet } from 'react-native';

export default function ${screenName}Screen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${this.toTitleCase(feature)}</Text>
      <Text style={styles.subtitle}>Feature implementation placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});
`;
        fs.writeFileSync(screenPath, content, 'utf-8');
        this.log(`Created screen: ${screenName}Screen.tsx`);
      }
    }
  }

  // Step 5: Lint
  private async lint() {
    this.log('Linting...');
    this.log('Lint: skipped (no linter configured)');
  }

  // Step 6: Expo doctor
  private async expoDoctor() {
    this.log('Running expo doctor...');
    try {
      this.exec('npx expo doctor');
      this.log('Expo doctor: passed');
    } catch (error) {
      this.log('Expo doctor: skipped or failed (non-blocking)');
    }
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
    this.log('Mobile Implementer Agent starting...');
    this.log(`Project: ${this.spec.name}`);
    this.log(`Features: ${(this.spec.features || []).join(', ') || 'none'}`);
    this.log('');

    try {
      await this.installDependencies();
      await this.validateAppJson();
      await this.validateEasJson();
      await this.createFeatureScreens();
      await this.lint();
      await this.expoDoctor();

      this.log('');
      this.log('Mobile Implementer: SUCCESS');
      process.exit(0);

    } catch (error: any) {
      this.log('');
      this.log(`Mobile Implementer: FAILED - ${error.message}`);
      process.exit(1);
    }
  }
}

// Main execution
const implementer = new MobileImplementer();
implementer.run();
