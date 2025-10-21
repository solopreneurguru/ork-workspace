import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

interface Agent {
  name: string;
  type: string;
  session_id: string;
  cwd: string;
  tools?: string[];
  budgets?: {
    max_steps?: number;
    max_tokens?: number;
    timeout_seconds?: number;
  };
  created_at: string;
  last_active: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private persistPath = path.join(process.cwd(), '../../workspace/registry.json');

  constructor() {
    this.load();
  }

  createAgent(
    type: string,
    name: string,
    cwd: string = './workspace',
    tools?: string[],
    budgets?: Agent['budgets']
  ): Agent {
    const agent: Agent = {
      name,
      type,
      session_id: randomUUID(),
      cwd,
      tools,
      budgets,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      status: 'idle',
    };

    this.agents.set(name, agent);
    this.save();
    return agent;
  }

  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  deleteAgent(name: string): boolean {
    const deleted = this.agents.delete(name);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  updateStatus(name: string, status: Agent['status']): void {
    const agent = this.agents.get(name);
    if (agent) {
      agent.status = status;
      agent.last_active = new Date().toISOString();
      this.save();
    }
  }

  private save(): void {
    const data = JSON.stringify(Array.from(this.agents.entries()), null, 2);
    const dir = path.dirname(this.persistPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.persistPath, data, 'utf-8');
  }

  private load(): void {
    if (fs.existsSync(this.persistPath)) {
      const data = fs.readFileSync(this.persistPath, 'utf-8');
      const entries = JSON.parse(data);
      this.agents = new Map(entries);
    }
  }
}
