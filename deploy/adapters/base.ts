/**
 * base.ts
 *
 * Base deployment adapter interface and types
 */

export interface DeployResult {
  success: boolean;
  url?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface DeployOptions {
  appDir: string;
  projectName: string;
  production?: boolean;
  skipBuild?: boolean;
  skipVerify?: boolean;
}

export interface AdapterConfig {
  secretsRequired: string[];
  platform: string;
  description: string;
}

export abstract class DeployAdapter {
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  /**
   * Check if required secrets/credentials are available
   */
  abstract checkSecrets(): { available: boolean; missing: string[] };

  /**
   * Deploy the application
   */
  abstract deploy(options: DeployOptions): Promise<DeployResult>;

  /**
   * Get adapter info
   */
  getInfo(): AdapterConfig {
    return this.config;
  }

  /**
   * Helper: Log with color
   */
  protected log(message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    const colors = {
      info: '\x1b[36m[INFO]\x1b[0m',
      success: '\x1b[32m[OK]\x1b[0m',
      warn: '\x1b[33m[WARN]\x1b[0m',
      error: '\x1b[31m[ERR]\x1b[0m',
    };
    console.log(`${colors[level]} ${message}`);
  }

  /**
   * Helper: Check if secret exists in environment
   */
  protected hasEnvSecret(name: string): boolean {
    return !!process.env[name];
  }
}
