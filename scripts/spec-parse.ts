#!/usr/bin/env node
/**
 * spec-parse.ts
 *
 * ORK BuildSpec Parser & Generator
 *
 * Usage:
 *   node scripts/spec-parse.ts -spec specs/my-app.yaml
 *   node scripts/spec-parse.ts -idea "Build a SaaS for habit tracking"
 *
 * Outputs:
 *   - workspace/spec.json (normalized spec for agents)
 *   - specs/<slug>.yaml (when using -idea)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

interface BuildSpec {
  name: string;
  targets: ('web' | 'mobile' | 'backend')[];
  style?: string[];
  monetization?: {
    type: 'free' | 'subscriptions' | 'one-time' | 'freemium';
    price_usd?: number;
  };
  auth?: {
    provider: 'email' | 'google' | 'github' | 'magic-link' | 'none';
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
  repository?: string;
}

interface SpecParseArgs {
  spec?: string;
  idea?: string;
}

// Parse CLI arguments
function parseArgs(): SpecParseArgs {
  const args = process.argv.slice(2);
  const result: SpecParseArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-spec' && args[i + 1]) {
      result.spec = args[i + 1];
      i++;
    } else if (args[i] === '-idea' && args[i + 1]) {
      result.idea = args[i + 1];
      i++;
    }
  }

  return result;
}

// Slugify project name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Generate BuildSpec from prose idea using AI
async function generateSpecFromIdea(idea: string): Promise<{ spec: BuildSpec; specPath: string }> {
  console.log('[INFO] Generating BuildSpec from idea...');

  // Use Anthropic API to draft BuildSpec
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment. Cannot generate spec from idea.');
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a BuildSpec generator for ORK orchestrator. Given a prose idea, output ONLY valid YAML matching this schema:

name: ProjectName (alphanumeric, dashes, underscores only)
targets: [web|mobile|backend]  # at least one
style: ["keyword1", "keyword2"]  # optional brand vibes
monetization:  # optional
  type: free|subscriptions|one-time|freemium
  price_usd: 5  # if applicable
auth:  # optional
  provider: email|google|github|magic-link|none
deploy:  # optional
  web: vercel|netlify|cloudflare-pages
  mobile: expo-eas|app-store|play-store
  backend: fly-io|railway|render|aws
quality_gates: [ui_smoke_web, api_smoke, mobile_smoke]  # optional
features: ["feature1", "feature2"]  # optional
stack:  # optional
  web: nextjs|react|vue|svelte|astro
  backend: express|fastify|nestjs|go|python-fastapi
  database: postgres|mysql|mongodb|sqlite|none
description: "Human readable description"  # optional

User idea: "${idea}"

Output ONLY the YAML, no explanations. Infer sensible defaults.`;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  const yamlText = content.text.trim();
  console.log('[INFO] AI-generated spec:\n', yamlText);

  // Parse and validate
  const spec = yaml.parse(yamlText) as BuildSpec;
  const slug = slugify(spec.name);
  const specPath = path.join(process.cwd(), 'specs', `${slug}.yaml`);

  // Ensure specs directory exists
  const specsDir = path.join(process.cwd(), 'specs');
  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }

  // Write spec file
  fs.writeFileSync(specPath, yamlText, 'utf-8');
  console.log(`[OK] Generated spec saved to: ${specPath}`);

  return { spec, specPath };
}

// Load and parse spec from file
function loadSpecFromFile(specPath: string): BuildSpec {
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }

  const yamlText = fs.readFileSync(specPath, 'utf-8');
  const spec = yaml.parse(yamlText) as BuildSpec;

  return spec;
}

// Validate spec against JSON schema
function validateSpec(spec: BuildSpec): void {
  const schemaPath = path.join(process.cwd(), 'schemas', 'buildspec.schema.json');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema not found: ${schemaPath}`);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(spec);

  if (!valid) {
    console.error('[ERR] BuildSpec validation failed:');
    validate.errors?.forEach((err) => {
      console.error(`  - ${err.instancePath} ${err.message}`);
    });
    throw new Error('Invalid BuildSpec');
  }

  console.log('[OK] BuildSpec validation passed');
}

// Normalize and write to workspace/spec.json
function writeNormalizedSpec(spec: BuildSpec): void {
  const workspaceDir = path.join(process.cwd(), 'workspace');

  // Ensure workspace directory exists
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  const outputPath = path.join(workspaceDir, 'spec.json');

  // Apply defaults
  const normalized: BuildSpec = {
    name: spec.name,
    targets: spec.targets,
    style: spec.style || [],
    monetization: spec.monetization || { type: 'free' },
    auth: spec.auth || { provider: 'none' },
    deploy: spec.deploy || {},
    quality_gates: spec.quality_gates || [],
    features: spec.features || [],
    stack: spec.stack || {},
    description: spec.description,
    repository: spec.repository
  };

  fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2), 'utf-8');
  console.log(`[OK] Normalized spec written to: ${outputPath}`);
  console.log('\n' + JSON.stringify(normalized, null, 2));
}

// Main execution
async function main() {
  try {
    const args = parseArgs();

    if (!args.spec && !args.idea) {
      console.error('[ERR] Usage: node spec-parse.ts -spec <path> OR -idea "<prose>"');
      process.exit(1);
    }

    let spec: BuildSpec;
    let specPath: string;

    if (args.idea) {
      // AI-powered spec generation
      const result = await generateSpecFromIdea(args.idea);
      spec = result.spec;
      specPath = result.specPath;
    } else if (args.spec) {
      // Load from file
      specPath = path.resolve(args.spec);
      console.log(`[INFO] Loading BuildSpec from: ${specPath}`);
      spec = loadSpecFromFile(specPath);
    } else {
      throw new Error('No spec or idea provided');
    }

    // Validate against schema
    validateSpec(spec);

    // Write normalized JSON
    writeNormalizedSpec(spec);

    console.log('\n[OK] BuildSpec parsing complete');
    process.exit(0);

  } catch (error) {
    console.error('[ERR]', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
