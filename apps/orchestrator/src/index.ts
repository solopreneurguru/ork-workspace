import express from 'express';
import { AgentRegistry } from './registry';
import { QualityTools } from './tools/quality';
import { Guardrails } from './tools/guardrails';
import { BrowserVerifier } from './tools/verifier';
import { Reviewer } from './tools/reviewer';
import { Reporter } from './tools/reporter';

const app = express();
const registry = new AgentRegistry();
const quality = new QualityTools();
const guardrails = new Guardrails();
const verifier = new BrowserVerifier();
const reviewer = new Reviewer();
const reporter = new Reporter();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List all agents
app.get('/agents', (_req, res) => {
  const agents = registry.listAgents();
  res.json({ agents });
});

// Create agent
app.post('/agents', (req, res) => {
  const { type, name, cwd, tools, budgets } = req.body;

  if (!type || !name) {
    return res.status(400).json({ error: 'type and name required' });
  }

  const agent = registry.createAgent(type, name, cwd, tools, budgets);
  res.status(201).json({ agent });
});

// Command agent
app.post('/agents/:name/command', (req, res) => {
  const { name } = req.params;
  const { prompt } = req.body;

  const agent = registry.getAgent(name);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // TODO: Dispatch to actual agent implementation
  res.json({ message: 'Command queued', agent: name, prompt });
});

// Get agent result
app.get('/agents/:name/result', (req, res) => {
  const { name } = req.params;

  const agent = registry.getAgent(name);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // TODO: Retrieve from operator files
  res.json({ agent: name, result: 'pending' });
});

// Delete agent
app.delete('/agents/:name', (req, res) => {
  const { name } = req.params;

  const deleted = registry.deleteAgent(name);
  if (!deleted) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json({ message: 'Agent deleted', name });
});

// Cost report
app.get('/costs', (_req, res) => {
  // TODO: Aggregate from cost telemetry
  res.json({ total_tokens: 0, total_cost_usd: 0, by_agent: {} });
});

// Quality tools
app.post('/quality/format', async (req, res) => {
  const { files } = req.body;
  const result = await quality.format(files);
  res.json(result);
});

app.post('/quality/lint', async (req, res) => {
  const { files } = req.body;
  const result = await quality.lint(files);
  res.json(result);
});

app.post('/quality/typecheck', async (_req, res) => {
  const result = await quality.typecheck();
  res.json(result);
});

app.post('/quality/test', async (req, res) => {
  const { pattern } = req.body;
  const result = await quality.runTests(pattern);
  res.json(result);
});

app.post('/quality/loop', async (_req, res) => {
  const result = await quality.runQualityLoop();
  res.json(result);
});

// Guardrails
app.post('/guardrails/check', (req, res) => {
  const { files, patchContent, fileContents } = req.body;
  const result = guardrails.isSafeToModify(files, patchContent, fileContents);
  res.json(result);
});

// Browser Verification
app.post('/verify', async (req, res) => {
  const { checklistPath } = req.body;

  if (!checklistPath) {
    return res.status(400).json({ error: 'checklistPath required' });
  }

  try {
    const result = await verifier.verify(checklistPath);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

app.post('/verify/generate-test', (req, res) => {
  const { checklistPath, outputPath } = req.body;

  if (!checklistPath || !outputPath) {
    return res.status(400).json({ error: 'checklistPath and outputPath required' });
  }

  try {
    verifier.generatePlaywrightTest(checklistPath, outputPath);
    res.json({ message: 'Playwright test generated', outputPath });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Code Review
app.post('/review', async (req, res) => {
  const { files } = req.body;

  try {
    const result = await reviewer.review(files);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

app.post('/review/diff', async (req, res) => {
  const { baseBranch } = req.body;

  try {
    const issues = await reviewer.analyzeDiff(baseBranch || 'HEAD');
    res.json({ issues, count: issues.length });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Report Generation
app.post('/report', (req, res) => {
  const { planFile, reviewFile, baseDir } = req.body;

  try {
    const report = reporter.generateReport({ planFile, reviewFile, baseDir });
    res.json({ report, format: 'markdown' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.ORCHESTRATOR_PORT || 3001;

app.listen(PORT, () => {
  console.log(`ORK Orchestrator listening on port ${PORT}`);
});
