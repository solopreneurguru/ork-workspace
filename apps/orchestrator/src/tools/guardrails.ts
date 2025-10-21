export interface GuardrailViolation {
  rule: string;
  severity: 'block' | 'warn';
  message: string;
  files?: string[];
}

export class Guardrails {
  private blockedPatterns = ['.env', 'secrets', 'credentials', '.pem', '.key'];
  private maxFilesWithoutConfirm = 10;

  /**
   * Check if file modifications violate guardrails
   */
  checkFileModifications(files: string[]): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];

    // Rule 1: Block .env and secrets files
    const blockedFiles = files.filter((file) =>
      this.blockedPatterns.some((pattern) => file.includes(pattern))
    );

    if (blockedFiles.length > 0) {
      violations.push({
        rule: 'block_secrets',
        severity: 'block',
        message: 'Cannot modify .env or secrets files',
        files: blockedFiles,
      });
    }

    // Rule 2: Warn on large change sets
    if (files.length > this.maxFilesWithoutConfirm) {
      violations.push({
        rule: 'large_changeset',
        severity: 'warn',
        message: `Modifying ${files.length} files requires confirmation (limit: ${this.maxFilesWithoutConfirm})`,
        files,
      });
    }

    return violations;
  }

  /**
   * Check if patch size exceeds threshold
   */
  checkPatchSize(patchContent: string, maxLines: number = 500): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    const lines = patchContent.split('\n').length;

    if (lines > maxLines) {
      violations.push({
        rule: 'large_patch',
        severity: 'warn',
        message: `Patch size (${lines} lines) exceeds threshold (${maxLines} lines). Consider smaller incremental changes.`,
      });
    }

    return violations;
  }

  /**
   * Detect hardcoded secrets in code
   */
  detectHardcodedSecrets(content: string): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    const secretPatterns = [
      /api[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
      /password\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
      /token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        violations.push({
          rule: 'hardcoded_secret',
          severity: 'block',
          message: 'Detected potential hardcoded secret in code',
        });
        break; // Only report once per file
      }
    }

    return violations;
  }

  /**
   * Check if modifications are safe to proceed
   */
  isSafeToModify(
    files: string[],
    patchContent?: string,
    fileContents?: string[]
  ): {
    safe: boolean;
    violations: GuardrailViolation[];
  } {
    const violations: GuardrailViolation[] = [];

    violations.push(...this.checkFileModifications(files));

    if (patchContent) {
      violations.push(...this.checkPatchSize(patchContent));
    }

    if (fileContents) {
      for (const content of fileContents) {
        violations.push(...this.detectHardcodedSecrets(content));
      }
    }

    const blockers = violations.filter((v) => v.severity === 'block');

    return {
      safe: blockers.length === 0,
      violations,
    };
  }
}
