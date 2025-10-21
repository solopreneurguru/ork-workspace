import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface QualityResult {
  success: boolean;
  output: string;
  exitCode: number;
  errors?: string[];
}

export class QualityTools {
  constructor(private workDir: string = process.cwd()) {}

  /**
   * Format code with Prettier
   */
  async format(files: string[] = ['.']): Promise<QualityResult> {
    try {
      const filePattern = files.join(' ');
      const { stdout } = await execAsync(`npx prettier --write ${filePattern}`, {
        cwd: this.workDir,
      });

      return {
        success: true,
        output: stdout || 'Formatted successfully',
        exitCode: 0,
      };
    } catch (error: unknown) {
      const err = error as { stdout?: string; code?: number; message: string };
      return {
        success: false,
        output: err.stdout || '',
        exitCode: err.code || 1,
        errors: [err.message],
      };
    }
  }

  /**
   * Lint code with ESLint
   */
  async lint(files: string[] = ['src']): Promise<QualityResult> {
    try {
      const filePattern = files.join(' ');
      const { stdout } = await execAsync(`npx eslint ${filePattern} --ext .ts,.js`, {
        cwd: this.workDir,
      });

      return {
        success: true,
        output: stdout || 'No lint errors',
        exitCode: 0,
      };
    } catch (error: unknown) {
      // ESLint returns exit code 1 when there are violations
      const err = error as { stdout?: string; code?: number };
      const errors = this.parseLintErrors(err.stdout || '');
      return {
        success: false,
        output: err.stdout || '',
        exitCode: err.code || 1,
        errors,
      };
    }
  }

  /**
   * Type check with TypeScript compiler
   */
  async typecheck(): Promise<QualityResult> {
    try {
      await execAsync('npx tsc --noEmit', {
        cwd: this.workDir,
      });

      return {
        success: true,
        output: 'Type check passed',
        exitCode: 0,
      };
    } catch (error: unknown) {
      const err = error as { stdout?: string; code?: number };
      const errors = this.parseTypeErrors(err.stdout || '');
      return {
        success: false,
        output: err.stdout || '',
        exitCode: err.code || 1,
        errors,
      };
    }
  }

  /**
   * Run tests with Jest/Vitest
   */
  async runTests(pattern?: string): Promise<QualityResult> {
    try {
      const testCmd = pattern ? `npm test -- ${pattern}` : 'npm test';

      const { stdout } = await execAsync(testCmd, {
        cwd: this.workDir,
      });

      return {
        success: true,
        output: stdout,
        exitCode: 0,
      };
    } catch (error: unknown) {
      const err = error as { stdout?: string; code?: number };
      const errors = this.parseTestErrors(err.stdout || '');
      return {
        success: false,
        output: err.stdout || '',
        exitCode: err.code || 1,
        errors,
      };
    }
  }

  /**
   * Run full quality loop: format → lint → typecheck → test
   */
  async runQualityLoop(): Promise<{
    format: QualityResult;
    lint: QualityResult;
    typecheck: QualityResult;
    test: QualityResult;
    allPassed: boolean;
  }> {
    const format = await this.format();
    const lint = await this.lint();
    const typecheck = await this.typecheck();
    const test = await this.runTests();

    return {
      format,
      lint,
      typecheck,
      test,
      allPassed: format.success && lint.success && typecheck.success && test.success,
    };
  }

  private parseLintErrors(output: string): string[] {
    const lines = output.split('\n');
    return lines.filter((line) => line.includes('error') || line.includes('warning')).slice(0, 10); // Limit to first 10 errors
  }

  private parseTypeErrors(output: string): string[] {
    const lines = output.split('\n');
    return lines.filter((line) => line.includes('error TS')).slice(0, 10);
  }

  private parseTestErrors(output: string): string[] {
    const lines = output.split('\n');
    return lines.filter((line) => line.includes('FAIL') || line.includes('Error:')).slice(0, 10);
  }
}
