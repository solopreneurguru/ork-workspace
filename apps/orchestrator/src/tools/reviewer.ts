import * as fs from 'fs';
import * as path from 'path';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BlockingIssue {
  file: string;
  line?: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  rule: string;
}

export interface ReviewResult {
  ship: boolean;
  blockers: BlockingIssue[];
  warnings: BlockingIssue[];
  compliance: {
    license: string;
    conflicts: string[];
  };
  style: {
    score: number;
    issues: string[];
  };
  summary: string;
}

export class Reviewer {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Analyze git diff for problematic patterns
   */
  async analyzeDiff(baseBranch: string = 'HEAD'): Promise<BlockingIssue[]> {
    const issues: BlockingIssue[] = [];

    try {
      // Get diff
      const { stdout } = await execAsync(`git diff ${baseBranch}`, { cwd: this.cwd });

      // Parse diff for issues
      const lines = stdout.split('\n');
      let currentFile = '';
      let lineNumber = 0;

      for (const line of lines) {
        // Track file
        if (line.startsWith('+++')) {
          currentFile = line.substring(6).trim();
        }

        // Track line number
        if (line.startsWith('@@')) {
          const match = line.match(/\+(\d+)/);
          if (match) {
            lineNumber = parseInt(match[1], 10);
          }
        }

        // Check for hardcoded secrets
        if (line.startsWith('+')) {
          lineNumber++;

          // API keys
          if (/api[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/.test(line)) {
            issues.push({
              file: currentFile,
              line: lineNumber,
              severity: 'high',
              message: 'Potential hardcoded API key detected',
              rule: 'no-hardcoded-secrets',
            });
          }

          // Passwords
          if (/password\s*=\s*['"][^'"]+['"]/.test(line) && !line.includes('placeholder')) {
            issues.push({
              file: currentFile,
              line: lineNumber,
              severity: 'high',
              message: 'Potential hardcoded password detected',
              rule: 'no-hardcoded-secrets',
            });
          }

          // Tokens
          if (/token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/.test(line)) {
            issues.push({
              file: currentFile,
              line: lineNumber,
              severity: 'high',
              message: 'Potential hardcoded token detected',
              rule: 'no-hardcoded-secrets',
            });
          }

          // TODO density check
          if (line.includes('TODO') || line.includes('FIXME')) {
            issues.push({
              file: currentFile,
              line: lineNumber,
              severity: 'low',
              message: 'TODO/FIXME comment added',
              rule: 'todo-tracking',
            });
          }

          // Console.log in production code
          if (
            line.includes('console.log') &&
            !currentFile.includes('test') &&
            !currentFile.includes('demo')
          ) {
            issues.push({
              file: currentFile,
              line: lineNumber,
              severity: 'medium',
              message: 'console.log statement in production code',
              rule: 'no-console-log',
            });
          }
        }
      }
    } catch (error) {
      // No git repo or no diff - non-fatal
    }

    return issues;
  }

  /**
   * Scan package.json for license conflicts
   */
  async scanLicenses(): Promise<{ license: string; conflicts: string[] }> {
    const packageJsonPath = path.join(this.cwd, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return { license: 'unknown', conflicts: [] };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const license = packageJson.license || 'unknown';

    // Check for GPL conflicts (if project is MIT, GPL dependencies are problematic)
    const conflicts: string[] = [];

    if (license === 'MIT') {
      // In real implementation, would scan node_modules or use license-checker
      // For now, just placeholder
    }

    return { license, conflicts };
  }

  /**
   * Analyze code style and quality
   */
  analyzeStyle(files: string[]): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Check file length
      if (lines.length > 500) {
        issues.push(`${file}: File too long (${lines.length} lines, max 500)`);
        score -= 5;
      }

      // Check line length
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > 120) {
          issues.push(`${file}:${i + 1}: Line too long (${lines[i].length} chars, max 120)`);
          score -= 1;
        }
      }

      // Check for commented code blocks
      const commentedCodePattern = /^\s*\/\/\s*(const|let|var|function|class|if|for|while)/;
      const commentedCodeLines = lines.filter((line) => commentedCodePattern.test(line));
      if (commentedCodeLines.length > 5) {
        issues.push(`${file}: Excessive commented code (${commentedCodeLines.length} lines)`);
        score -= 10;
      }
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Detect large changesets
   */
  async detectLargeChangeset(): Promise<BlockingIssue[]> {
    const issues: BlockingIssue[] = [];

    try {
      const { stdout } = await execAsync('git diff --stat', { cwd: this.cwd });

      // Parse stats
      const statsMatch = stdout.match(/(\d+) files? changed/);
      if (statsMatch) {
        const filesChanged = parseInt(statsMatch[1], 10);

        if (filesChanged > 20) {
          issues.push({
            file: '<multiple>',
            severity: 'medium',
            message: `Large changeset: ${filesChanged} files modified (consider smaller PRs)`,
            rule: 'changeset-size',
          });
        }
      }

      // Check for large additions
      const linesMatch = stdout.match(/(\d+) insertions?/);
      if (linesMatch) {
        const linesAdded = parseInt(linesMatch[1], 10);

        if (linesAdded > 1000) {
          issues.push({
            file: '<multiple>',
            severity: 'medium',
            message: `Large diff: ${linesAdded} lines added (consider incremental changes)`,
            rule: 'diff-size',
          });
        }
      }
    } catch (error) {
      // No git or no diff
    }

    return issues;
  }

  /**
   * Run full review
   */
  async review(files?: string[]): Promise<ReviewResult> {
    // Analyze diff
    const diffIssues = await this.analyzeDiff();

    // Scan licenses
    const compliance = await this.scanLicenses();

    // Analyze style
    const filesToAnalyze = files || this.getChangedFiles();
    const style = this.analyzeStyle(filesToAnalyze);

    // Detect large changeset
    const changesetIssues = await this.detectLargeChangeset();

    // Aggregate issues
    const allIssues = [...diffIssues, ...changesetIssues];
    const blockers = allIssues.filter((i) => i.severity === 'high');
    const warnings = allIssues.filter((i) => i.severity !== 'high');

    // Determine ship status
    const ship = blockers.length === 0 && compliance.conflicts.length === 0;

    // Generate summary
    const summary = ship
      ? `✓ Ready to ship: ${warnings.length} warnings, 0 blockers`
      : `✗ Blocked: ${blockers.length} blocker(s) must be resolved`;

    return {
      ship,
      blockers,
      warnings,
      compliance,
      style,
      summary,
    };
  }

  /**
   * Get list of changed files from git
   */
  private getChangedFiles(): string[] {
    try {
      const stdout = execSync('git diff --name-only HEAD', {
        cwd: this.cwd,
        encoding: 'utf-8',
      }) as string;

      return stdout.split('\n').filter((f) => f.trim().length > 0);
    } catch (error) {
      return [];
    }
  }
}
