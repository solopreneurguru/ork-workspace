/**
 * loader.ts
 *
 * Provider adapter loader with automatic fallback to simulators
 * Ensures backends compile and run even when API keys are missing
 *
 * Features:
 * - Loads config/providers.yaml
 * - Checks for required credentials
 * - Falls back to simulator if credentials missing
 * - Singleton pattern for adapter instances
 * - Type-safe adapter access
 *
 * Usage:
 *   const payments = await AdapterLoader.getPaymentAdapter();
 *   const data = await AdapterLoader.getDataAdapter();
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { DataSimulator } from './data/unusual-options/sim';
import { StripeWebAdapter } from './payments/stripe-web';
import { IAPSimulator } from './payments/iap-bridge';

export interface ProviderConfig {
  name: string;
  type: string;
  enabled: boolean;
  fallback?: string;
  credentials?: Record<string, string>;
  options?: Record<string, any>;
}

export interface ProvidersConfig {
  database?: Record<string, ProviderConfig>;
  auth?: Record<string, ProviderConfig>;
  payments?: Record<string, ProviderConfig>;
  email?: Record<string, ProviderConfig>;
  storage?: Record<string, ProviderConfig>;
  search?: Record<string, ProviderConfig>;
  analytics?: Record<string, ProviderConfig>;
  selection?: {
    fallbackOnMissingCredentials?: boolean;
    development?: {
      preferSimulators?: boolean;
      requireCredentials?: boolean;
    };
    production?: {
      preferSimulators?: boolean;
      requireCredentials?: boolean;
    };
  };
}

export class AdapterLoader {
  private static instance: AdapterLoader;
  private config: ProvidersConfig | null = null;
  private adapters: Map<string, any> = new Map();
  private isDevelopment: boolean = process.env.NODE_ENV !== 'production';

  private constructor() {}

  static getInstance(): AdapterLoader {
    if (!AdapterLoader.instance) {
      AdapterLoader.instance = new AdapterLoader();
    }
    return AdapterLoader.instance;
  }

  /**
   * Load providers configuration
   */
  loadConfig(configPath?: string): ProvidersConfig {
    if (this.config) return this.config;

    const defaultPath = path.join(process.cwd(), 'config', 'providers.yaml');
    const actualPath = configPath || defaultPath;

    if (!fs.existsSync(actualPath)) {
      console.warn(`Providers config not found: ${actualPath}. Using defaults.`);
      this.config = this.getDefaultConfig();
      return this.config;
    }

    try {
      const content = fs.readFileSync(actualPath, 'utf-8');
      this.config = yaml.parse(content);
      return this.config!;
    } catch (error: any) {
      console.error(`Failed to load providers config: ${error.message}`);
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * Get default configuration (all simulators)
   */
  private getDefaultConfig(): ProvidersConfig {
    return {
      database: {
        simulator: {
          name: 'simulator',
          type: 'database',
          enabled: true,
          credentials: {},
          options: {},
        },
      },
      payments: {
        simulator: {
          name: 'payment-simulator',
          type: 'payment',
          enabled: true,
          credentials: {},
          options: {},
        },
      },
      selection: {
        fallbackOnMissingCredentials: true,
        development: {
          preferSimulators: true,
          requireCredentials: false,
        },
      },
    };
  }

  /**
   * Check if credentials are available in environment
   */
  private hasCredentials(credentials?: Record<string, string>): boolean {
    if (!credentials || Object.keys(credentials).length === 0) {
      return true; // No credentials required
    }

    for (const [key, value] of Object.entries(credentials)) {
      // Check if value is a template like ${VAR_NAME}
      const envVarMatch = value.match(/\$\{([A-Z_]+)(?::-(.*))?\}/);
      if (envVarMatch) {
        const envVar = envVarMatch[1];
        const defaultValue = envVarMatch[2];

        // Check if env var exists
        if (!process.env[envVar] && !defaultValue) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Resolve environment variable templates
   */
  private resolveCredentials(credentials?: Record<string, string>): Record<string, string> {
    if (!credentials) return {};

    const resolved: Record<string, string> = {};

    for (const [key, value] of Object.entries(credentials)) {
      // Replace ${VAR_NAME} or ${VAR_NAME:-default}
      const envVarMatch = value.match(/\$\{([A-Z_]+)(?::-(.*))?\}/);
      if (envVarMatch) {
        const envVar = envVarMatch[1];
        const defaultValue = envVarMatch[2] || '';
        resolved[key] = process.env[envVar] || defaultValue;
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Get provider configuration by category and name
   */
  private getProviderConfig(category: keyof ProvidersConfig, name: string): ProviderConfig | null {
    const config = this.loadConfig();
    const categoryConfig = config[category] as Record<string, ProviderConfig> | undefined;

    if (!categoryConfig) return null;
    return categoryConfig[name] || null;
  }

  /**
   * Get active provider from category (with fallback logic)
   */
  private getActiveProvider(category: keyof ProvidersConfig, preferredName?: string): ProviderConfig | null {
    const config = this.loadConfig();
    const categoryConfig = config[category] as Record<string, ProviderConfig> | undefined;

    if (!categoryConfig) return null;

    // If preferred provider specified, try that first
    if (preferredName) {
      const provider = categoryConfig[preferredName];
      if (provider && provider.enabled) {
        // Check credentials
        if (this.hasCredentials(provider.credentials)) {
          return provider;
        }

        // Fallback to specified fallback provider
        if (provider.fallback && config.selection?.fallbackOnMissingCredentials) {
          console.warn(`${category}.${preferredName}: Missing credentials, using fallback: ${provider.fallback}`);
          return this.getActiveProvider(category, provider.fallback);
        }
      }
    }

    // Try to find first enabled provider with credentials
    for (const provider of Object.values(categoryConfig)) {
      if (provider.enabled && this.hasCredentials(provider.credentials)) {
        return provider;
      }
    }

    // Last resort: return simulator if available
    const simulator = categoryConfig.simulator;
    if (simulator && simulator.enabled) {
      return simulator;
    }

    return null;
  }

  /**
   * Get payment adapter (Stripe or simulator)
   */
  async getPaymentAdapter(platform: 'web' | 'mobile' = 'web'): Promise<any> {
    const cacheKey = `payment-${platform}`;
    if (this.adapters.has(cacheKey)) {
      return this.adapters.get(cacheKey);
    }

    let adapter: any;

    if (platform === 'web') {
      // Try Stripe
      const stripeConfig = this.getActiveProvider('payments', 'stripe');
      if (stripeConfig && stripeConfig.name === 'stripe') {
        const credentials = this.resolveCredentials(stripeConfig.credentials);
        if (credentials.apiKey && credentials.publishableKey) {
          adapter = new StripeWebAdapter({
            apiKey: credentials.apiKey,
            publishableKey: credentials.publishableKey,
            webhookSecret: credentials.webhookSecret,
          });
          console.log('[AdapterLoader] Using Stripe payment adapter');
        }
      }
    } else if (platform === 'mobile') {
      // Mobile would use IAP, but fallback to simulator
      const iapConfig = this.getActiveProvider('payments', 'iap');
      if (iapConfig && iapConfig.name === 'iap') {
        // IAPBridge requires mobile environment, use simulator in Node.js
        console.warn('[AdapterLoader] IAP only available in mobile apps, using simulator');
      }
    }

    // Fallback to simulator
    if (!adapter) {
      console.log('[AdapterLoader] Using payment simulator (no credentials)');
      adapter = {
        async createCheckoutSession() {
          console.log('[Payment Simulator] Mock checkout session created');
          return {
            id: 'sim_checkout_' + Date.now(),
            url: 'http://localhost:3000/checkout-simulator',
            status: 'complete',
          };
        },
        async getSubscription() {
          return {
            id: 'sim_sub_' + Date.now(),
            status: 'active',
            currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
          };
        },
        getPublishableKey() {
          return 'pk_test_simulator';
        },
      };
    }

    this.adapters.set(cacheKey, adapter);
    return adapter;
  }

  /**
   * Get data adapter (database or simulator)
   */
  async getDataAdapter(name?: string): Promise<any> {
    const cacheKey = `data-${name || 'default'}`;
    if (this.adapters.has(cacheKey)) {
      return this.adapters.get(cacheKey);
    }

    let adapter: any;

    // Try to get configured provider
    const providerConfig = this.getActiveProvider('database', name);

    if (providerConfig && providerConfig.name !== 'simulator') {
      // Real provider - would instantiate actual database adapter
      console.log(`[AdapterLoader] Using ${providerConfig.name} data adapter`);
      // TODO: Instantiate actual provider based on providerConfig.name
      // For now, fall through to simulator
    }

    // Fallback to simulator
    if (!adapter) {
      console.log('[AdapterLoader] Using data simulator (no database configured)');
      adapter = new DataSimulator({
        fixturesPath: providerConfig?.options?.fixturesPath || './fixtures',
        replayDelay: providerConfig?.options?.replayDelay || 100,
      });
    }

    this.adapters.set(cacheKey, adapter);
    return adapter;
  }

  /**
   * Check if running in development mode
   */
  isDevelopmentMode(): boolean {
    return this.isDevelopment;
  }

  /**
   * Get all adapter instances (for cleanup)
   */
  getAllAdapters(): Map<string, any> {
    return this.adapters;
  }

  /**
   * Clear adapter cache
   */
  clearCache(): void {
    this.adapters.clear();
  }

  /**
   * Static helper methods
   */
  static async getPaymentAdapter(platform: 'web' | 'mobile' = 'web'): Promise<any> {
    return AdapterLoader.getInstance().getPaymentAdapter(platform);
  }

  static async getDataAdapter(name?: string): Promise<any> {
    return AdapterLoader.getInstance().getDataAdapter(name);
  }

  static loadConfig(configPath?: string): ProvidersConfig {
    return AdapterLoader.getInstance().loadConfig(configPath);
  }
}

/**
 * Example usage in backend:
 *
 * // app.ts
 * import { AdapterLoader } from './adapters/loader';
 *
 * async function main() {
 *   // Load config on startup
 *   AdapterLoader.loadConfig();
 *
 *   // Get payment adapter
 *   const payments = await AdapterLoader.getPaymentAdapter('web');
 *   const session = await payments.createCheckoutSession({
 *     priceId: 'price_xxx',
 *     successUrl: 'https://example.com/success',
 *     cancelUrl: 'https://example.com/cancel',
 *   });
 *
 *   // Get data adapter
 *   const data = await AdapterLoader.getDataAdapter();
 *   await data.load('users.json');
 *   data.on('data', (record) => console.log(record));
 * }
 *
 * // Backend compiles and runs even if STRIPE_SECRET_KEY is missing!
 * // It automatically falls back to simulators.
 */
