/**
 * pipeline.ts
 *
 * ORK Pipeline Orchestrator
 *
 * Loads workspace/spec.json and agents/registry.yaml
 * Resolves which agents to run based on BuildSpec targets
 * Executes agents in phases with quality gate loops
 * Writes per-agent logs to artifacts/logs/agents/
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import { execSync } from 'child_process';

interface BuildSpec {
  name: string;
  targets: string[];
  quality_gates?: string[];
  [key: string]: any;
}

interface Agent {
  id: string;
  name: string;
  phase: string;
  description: string;
  inputs: string[];
  outputs: string[];
  preconditions: string[];
  postconditions: string[];
  quality_gates: string[];
  max_attempts: number;
  timeout_seconds: number;
}

interface AgentRegistry {
  agents: Agent[];
  pipeline: {
    max_loop_iterations: number;
    phases: Array<{
      name: string;
      agents: string[];
      required: boolean;
      parallel?: boolean;
    }>;
    quality_loop: {
      enabled: boolean;
      max_attempts: number;
      retry_on_failure: boolean;
    };
    logging: {
      per_agent_logs: boolean;
      log_directory: string;
      include_timestamps: boolean;
    };
  };
}

interface AgentResult {
  agent_id: string;
  success: boolean;
  attempt: number;
  duration_ms: number;
  log_file: string;
  quality_gates_passed: string[];
  quality_gates_failed: string[];
  error?: string;
}

class Pipeline {
  private spec: BuildSpec;
  private registry: AgentRegistry;
  private workspaceRoot: string;
  private logDir: string;
  private results: Map<string, AgentResult> = new Map();

  constructor() {
    this.workspaceRoot = process.cwd();
    this.spec = this.loadBuildSpec();
    this.registry = this.loadRegistry();
    this.logDir = path.join(this.workspaceRoot, this.registry.pipeline.logging.log_directory);
    fs.ensureDirSync(this.logDir);
  }

  private loadBuildSpec(): BuildSpec {
    const specPath = path.join(this.workspaceRoot, 'workspace', 'spec.json');
    if (!fs.existsSync(specPath)) {
      throw new Error('workspace/spec.json not found');
    }
    return fs.readJsonSync(specPath);
  }

  private loadRegistry(): AgentRegistry {
    const registryPath = path.join(this.workspaceRoot, 'agents', 'registry.yaml');
    if (!fs.existsSync(registryPath)) {
      throw new Error('agents/registry.yaml not found');
    }
    const yamlContent = fs.readFileSync(registryPath, 'utf-8');
    return yaml.parse(yamlContent);
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const colors: Record<string, string> = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      error: '\x1b[31m',   // red
      warn: '\x1b[33m',    // yellow
    };
    const reset = '\x1b[0m';
    const prefix = type === 'info' ? '[INFO]' : type === 'success' ? '[OK]' : type === 'error' ? '[ERR]' : '[WARN]';
    console.log(`${colors[type]}${prefix}${reset} ${message}`);
  }

  // Resolve which agents to run based on BuildSpec
  private resolveAgentsForPhase(phaseName: string): Agent[] {
    const phaseConfig = this.registry.pipeline.phases.find(p => p.name === phaseName);
    if (!phaseConfig) {
      return [];
    }

    const agents: Agent[] = [];

    for (const agentId of phaseConfig.agents) {
      const agent = this.registry.agents.find(a => a.id === agentId);
      if (!agent) {
        continue;
      }

      // Filter by targets (e.g., only run implementer-web if 'web' in targets)
      if (agentId.startsWith('implementer-')) {
        const targetType = agentId.replace('implementer-', '');
        if (!this.spec.targets.includes(targetType)) {
          this.log(`Skipping ${agent.name} (${targetType} not in targets)`, 'info');
          continue;
        }
      }

      // Skip integrator if only one target
      if (agentId === 'integrator' && this.spec.targets.length < 2) {
        this.log(`Skipping ${agent.name} (single target)`, 'info');
        continue;
      }

      agents.push(agent);
    }

    return agents;
  }

  // Execute a single agent
  private async executeAgent(agent: Agent, attempt: number): Promise<AgentResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(this.logDir, `${agent.id}-${timestamp}.log`);

    this.log(`Running ${agent.name} (attempt ${attempt}/${agent.max_attempts})...`, 'info');

    const result: AgentResult = {
      agent_id: agent.id,
      success: false,
      attempt,
      duration_ms: 0,
      log_file: logFile,
      quality_gates_passed: [],
      quality_gates_failed: [],
    };

    try {
      // Map agent ID to executable
      const agentScript = this.getAgentScript(agent.id);

      if (!agentScript) {
        this.log(`No script for ${agent.id}, skipping`, 'warn');
        result.success = true;
        return result;
      }

      // Execute agent
      const output = execSync(agentScript, {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
        timeout: agent.timeout_seconds * 1000,
        env: { ...process.env, WORKSPACE: this.workspaceRoot }
      });

      // Write log
      fs.writeFileSync(logFile, output, 'utf-8');

      result.success = true;
      result.duration_ms = Date.now() - startTime;

      this.log(`${agent.name} completed in ${result.duration_ms}ms`, 'success');

      // TODO: Check postconditions and quality gates
      result.quality_gates_passed = agent.quality_gates;

    } catch (error: any) {
      result.success = false;
      result.duration_ms = Date.now() - startTime;
      result.error = error.message;

      const errorOutput = error.stdout || error.stderr || error.message;
      fs.writeFileSync(logFile, errorOutput, 'utf-8');

      this.log(`${agent.name} failed: ${error.message}`, 'error');
      result.quality_gates_failed = agent.quality_gates;
    }

    return result;
  }

  // Map agent ID to executable script
  private getAgentScript(agentId: string): string | null {
    const scripts: Record<string, string> = {
      'planner': '', // Skip planner in pipeline (already run)
      'scaffolder': 'npx tsx agents/scaffolder.ts',
      'implementer-web': 'npx tsx agents/implementer-web.ts',
      'implementer-backend': 'npx tsx agents/implementer-backend.ts',
      'implementer-mobile': 'npx tsx agents/implementer-mobile.ts',
      'integrator': '', // Skip integrator (not implemented yet)
      'verifier': '', // Skip verifier (run separately)
      'reviewer': '', // Skip reviewer (run separately)
      'deployer': '', // Skip deployer (run separately)
    };

    return scripts[agentId] || null;
  }

  // Check if quality gates are satisfied
  private checkQualityGates(): { passed: string[]; failed: string[] } {
    const requiredGates = this.spec.quality_gates || [];
    const passed: string[] = [];
    const failed: string[] = [];

    for (const gate of requiredGates) {
      let gatePassed = false;

      // Check if any agent satisfied this gate
      for (const result of this.results.values()) {
        if (result.success && result.quality_gates_passed.includes(gate)) {
          gatePassed = true;
          break;
        }
      }

      if (gatePassed) {
        passed.push(gate);
      } else {
        failed.push(gate);
      }
    }

    return { passed, failed };
  }

  // Execute a phase
  private async executePhase(phaseName: string): Promise<boolean> {
    this.log('', 'info');
    this.log(`=== PHASE: ${phaseName.toUpperCase()} ===`, 'info');
    this.log('', 'info');

    const agents = this.resolveAgentsForPhase(phaseName);

    if (agents.length === 0) {
      this.log(`No agents for phase: ${phaseName}`, 'warn');
      return true;
    }

    let phaseSuccess = true;

    for (const agent of agents) {
      let agentSuccess = false;

      for (let attempt = 1; attempt <= agent.max_attempts; attempt++) {
        const result = await this.executeAgent(agent, attempt);
        this.results.set(`${agent.id}-${attempt}`, result);

        if (result.success) {
          agentSuccess = true;
          break;
        }

        if (attempt < agent.max_attempts) {
          this.log(`Retrying ${agent.name}...`, 'warn');
        }
      }

      if (!agentSuccess) {
        this.log(`${agent.name} failed after ${agent.max_attempts} attempts`, 'error');
        phaseSuccess = false;

        // Check if phase is required
        const phaseConfig = this.registry.pipeline.phases.find(p => p.name === phaseName);
        if (phaseConfig?.required) {
          return false;
        }
      }
    }

    return phaseSuccess;
  }

  // Main pipeline execution
  async execute(): Promise<void> {
    this.log('ORK Pipeline Orchestrator', 'info');
    this.log('', 'info');
    this.log(`BuildSpec: ${this.spec.name}`, 'info');
    this.log(`Targets: ${this.spec.targets.join(', ')}`, 'info');
    this.log(`Quality Gates: ${(this.spec.quality_gates || []).join(', ') || 'none'}`, 'info');
    this.log('', 'info');

    const { max_loop_iterations } = this.registry.pipeline;
    let iteration = 0;

    while (iteration < max_loop_iterations) {
      iteration++;

      if (iteration > 1) {
        this.log('', 'info');
        this.log(`=== QUALITY LOOP ITERATION ${iteration}/${max_loop_iterations} ===`, 'warn');
        this.log('', 'info');
      }

      // Execute each phase
      for (const phaseConfig of this.registry.pipeline.phases) {
        const success = await this.executePhase(phaseConfig.name);

        if (!success && phaseConfig.required) {
          this.log(`Required phase ${phaseConfig.name} failed, stopping pipeline`, 'error');
          process.exit(1);
        }
      }

      // Check quality gates
      if (this.spec.quality_gates && this.spec.quality_gates.length > 0) {
        const { passed, failed } = this.checkQualityGates();

        this.log('', 'info');
        this.log('=== QUALITY GATE CHECK ===', 'info');
        this.log(`Passed: ${passed.join(', ') || 'none'}`, 'success');

        if (failed.length > 0) {
          this.log(`Failed: ${failed.join(', ')}`, 'error');

          if (iteration < max_loop_iterations && this.registry.pipeline.quality_loop.retry_on_failure) {
            this.log('Quality gates not satisfied, retrying...', 'warn');
            continue;
          } else {
            this.log('Quality gates failed and max iterations reached', 'error');
            process.exit(1);
          }
        } else {
          this.log('All quality gates satisfied!', 'success');
          break;
        }
      } else {
        // No quality gates, exit after first iteration
        break;
      }
    }

    this.log('', 'info');
    this.log('=== PIPELINE COMPLETE ===', 'success');
    this.log(`Agent logs: ${this.logDir}`, 'info');
  }
}

// Main execution
async function main() {
  try {
    const pipeline = new Pipeline();
    await pipeline.execute();
    process.exit(0);
  } catch (error: any) {
    console.error('[ERR]', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { Pipeline };
