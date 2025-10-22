#!/usr/bin/env node
/**
 * scaffolder.ts
 *
 * ORK Scaffolder Agent
 *
 * Reads workspace/spec.json and scaffolds apps/ from templates/
 *
 * Usage:
 *   node agents/scaffolder.ts
 *
 * Flow:
 *   1. Read workspace/spec.json
 *   2. For each target in spec.targets:
 *      - Choose template pack
 *      - Copy template to apps/<target>/
 *      - Render Mustache variables
 *   3. Copy target-specific checklists to checklists/
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import Mustache from 'mustache';

interface BuildSpec {
  name: string;
  targets: string[];
  style?: string[];
  monetization?: {
    type: string;
    price_usd?: number;
  };
  auth?: {
    provider: string;
  };
  deploy?: {
    web?: string;
    mobile?: string;
    backend?: string;
  };
  quality_gates?: string[];
  features?: string[];
  stack?: {
    web?: string;
    backend?: string;
    database?: string;
  };
  description?: string;
}

interface TemplateContext {
  APP_NAME: string;
  APP_NAME_LOWER: string;
  BUNDLE_ID: string;
  DESCRIPTION: string;
  AUTH_PROVIDER: string;
  HAS_AUTH: boolean;
  HAS_MONETIZATION: boolean;
  MONETIZATION_TYPE: string;
  PRICE_USD: number;
  DEPLOY_WEB: string;
  DEPLOY_MOBILE: string;
  DEPLOY_BACKEND: string;
  DATABASE: string;
  FEATURES: string[];
}

// Template pack mapping
const TEMPLATE_PACKS: Record<string, string> = {
  web: 'web-next-saas',
  mobile: 'mobile-expo',
  backend: 'backend-node'
};

// Load BuildSpec from workspace/spec.json
function loadBuildSpec(): BuildSpec {
  const specPath = path.join(process.cwd(), 'workspace', 'spec.json');

  if (!fs.existsSync(specPath)) {
    throw new Error('workspace/spec.json not found. Run spec-parse first.');
  }

  return fs.readJsonSync(specPath);
}

// Create template context from BuildSpec
function createTemplateContext(spec: BuildSpec): TemplateContext {
  const appNameLower = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const bundleId = appNameLower.replace(/-/g, '');

  return {
    APP_NAME: spec.name,
    APP_NAME_LOWER: appNameLower,
    BUNDLE_ID: bundleId,
    DESCRIPTION: spec.description || `${spec.name} application`,
    AUTH_PROVIDER: spec.auth?.provider || 'none',
    HAS_AUTH: spec.auth?.provider !== 'none' && !!spec.auth?.provider,
    HAS_MONETIZATION: !!spec.monetization && spec.monetization.type !== 'free',
    MONETIZATION_TYPE: spec.monetization?.type || 'free',
    PRICE_USD: spec.monetization?.price_usd || 0,
    DEPLOY_WEB: spec.deploy?.web || 'vercel',
    DEPLOY_MOBILE: spec.deploy?.mobile || 'expo-eas',
    DEPLOY_BACKEND: spec.deploy?.backend || 'fly-io',
    DATABASE: spec.stack?.database || 'postgres',
    FEATURES: spec.features || []
  };
}

// Render template file with Mustache
function renderTemplate(content: string, context: TemplateContext): string {
  return Mustache.render(content, context);
}

// Copy and render template directory
async function scaffoldTarget(target: string, spec: BuildSpec, context: TemplateContext) {
  const templateName = TEMPLATE_PACKS[target];
  if (!templateName) {
    console.log(`[WARN] No template pack for target: ${target}`);
    return;
  }

  const templateDir = path.join(process.cwd(), 'templates', templateName);
  const outputDir = path.join(process.cwd(), 'apps', target);

  console.log(`[INFO] Scaffolding ${target} from template: ${templateName}`);

  // Check if output already exists
  if (fs.existsSync(outputDir)) {
    console.log(`[INFO] ${outputDir} already exists, skipping scaffold`);
    return;
  }

  // Ensure template exists
  if (!fs.existsSync(templateDir)) {
    console.log(`[ERR] Template not found: ${templateDir}`);
    return;
  }

  // Create output directory
  fs.ensureDirSync(outputDir);

  // Copy and render all files
  const copyAndRender = (src: string, dest: string) => {
    const items = fs.readdirSync(src);

    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        fs.ensureDirSync(destPath);
        copyAndRender(srcPath, destPath);
      } else {
        // Read file
        let content = fs.readFileSync(srcPath, 'utf-8');

        // Render Mustache templates (skip binary files)
        const ext = path.extname(item);
        const textExtensions = ['.json', '.ts', '.tsx', '.js', '.jsx', '.md', '.yaml', '.yml', '.txt', '.env'];

        if (textExtensions.includes(ext) || item.includes('.example')) {
          content = renderTemplate(content, context);
        }

        // Write file
        fs.writeFileSync(destPath, content, 'utf-8');
      }
    }
  };

  copyAndRender(templateDir, outputDir);
  console.log(`[OK] Scaffolded ${target} to ${outputDir}`);
}

// Copy target-specific checklists
async function copyChecklists(spec: BuildSpec) {
  const checklistsDir = path.join(process.cwd(), 'checklists');
  const templateChecklistsDir = path.join(process.cwd(), 'templates', 'checklists');

  if (!fs.existsSync(templateChecklistsDir)) {
    console.log('[WARN] No template checklists found');
    return;
  }

  fs.ensureDirSync(checklistsDir);

  // Copy relevant checklists based on targets
  for (const target of spec.targets) {
    const checklistFiles: string[] = [];

    if (target === 'web') {
      checklistFiles.push('web-smoke.yaml');
    } else if (target === 'backend') {
      checklistFiles.push('backend-health.yaml');
    }

    for (const file of checklistFiles) {
      const src = path.join(templateChecklistsDir, file);
      const dest = path.join(checklistsDir, file);

      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        console.log(`[OK] Copied checklist: ${file}`);
      }
    }
  }
}

// Main execution
async function main() {
  try {
    console.log('[INFO] ORK Scaffolder Agent');
    console.log('');

    // Load BuildSpec
    const spec = loadBuildSpec();
    console.log(`[INFO] BuildSpec: ${spec.name}`);
    console.log(`[INFO] Targets: ${spec.targets.join(', ')}`);
    console.log('');

    // Create template context
    const context = createTemplateContext(spec);

    // Scaffold each target
    for (const target of spec.targets) {
      await scaffoldTarget(target, spec, context);
    }

    console.log('');

    // Copy checklists
    await copyChecklists(spec);

    console.log('');
    console.log('[OK] Scaffolding complete');
    console.log('');
    console.log('Next steps:');
    for (const target of spec.targets) {
      console.log(`  - cd apps/${target} && npm install`);
    }

    process.exit(0);

  } catch (error) {
    console.error('[ERR]', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
