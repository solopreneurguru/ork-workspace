/**
 * provider.template.ts
 *
 * Template for creating new data provider adapters.
 * Copy this file and implement the DataProvider interface for your specific provider.
 *
 * Providers supported (examples):
 * - Database: PostgreSQL, MongoDB, Firebase, Supabase
 * - APIs: REST, GraphQL, gRPC
 * - Message queues: RabbitMQ, Redis, Kafka
 * - Search: Elasticsearch, Algolia, Typesense
 * - Storage: S3, Azure Blob, Google Cloud Storage
 *
 * Usage:
 *   1. Copy this file: cp provider.template.ts my-provider.ts
 *   2. Implement the DataProvider interface
 *   3. Add configuration to config/providers.yaml
 *   4. Use in your application
 */

import { EventEmitter } from 'events';

/**
 * Base configuration for all providers
 */
export interface ProviderConfig {
  name: string;
  type: 'database' | 'api' | 'queue' | 'search' | 'storage' | 'other';
  enabled: boolean;
  credentials?: {
    apiKey?: string;
    secretKey?: string;
    connectionString?: string;
    [key: string]: any;
  };
  options?: Record<string, any>;
}

/**
 * Connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Query options
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: Record<string, any>;
}

/**
 * Query result
 */
export interface QueryResult<T = any> {
  data: T[];
  total?: number;
  hasMore?: boolean;
  cursor?: string;
}

/**
 * Base DataProvider interface
 * All provider adapters should implement this interface
 */
export abstract class DataProvider<TConfig extends ProviderConfig = ProviderConfig> extends EventEmitter {
  protected config: TConfig;
  protected status: ConnectionStatus = 'disconnected';

  constructor(config: TConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to the provider
   * Should emit 'connected' event on success
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the provider
   * Should emit 'disconnected' event on success
   */
  abstract disconnect(): Promise<void>;

  /**
   * Check if provider is connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get provider configuration
   */
  getConfig(): TConfig {
    return this.config;
  }

  /**
   * Health check - verify provider is accessible
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Query data from provider
   */
  abstract query<T = any>(collection: string, options?: QueryOptions): Promise<QueryResult<T>>;

  /**
   * Get single record by ID
   */
  abstract get<T = any>(collection: string, id: string): Promise<T | null>;

  /**
   * Create new record
   */
  abstract create<T = any>(collection: string, data: Partial<T>): Promise<T>;

  /**
   * Update existing record
   */
  abstract update<T = any>(collection: string, id: string, data: Partial<T>): Promise<T>;

  /**
   * Delete record
   */
  abstract delete(collection: string, id: string): Promise<boolean>;

  /**
   * Batch operations (optional - can throw NotImplementedError)
   */
  async batchCreate<T = any>(collection: string, records: Partial<T>[]): Promise<T[]> {
    throw new Error('batchCreate not implemented');
  }

  async batchUpdate<T = any>(collection: string, updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    throw new Error('batchUpdate not implemented');
  }

  async batchDelete(collection: string, ids: string[]): Promise<number> {
    throw new Error('batchDelete not implemented');
  }

  /**
   * Subscribe to real-time updates (optional - for providers that support it)
   */
  async subscribe(collection: string, callback: (event: any) => void): Promise<() => void> {
    throw new Error('subscribe not implemented for this provider');
  }
}

/**
 * Example implementation template
 */
export class ExampleProvider extends DataProvider {
  private client: any = null;

  async connect(): Promise<void> {
    this.status = 'connecting';
    this.emit('connecting');

    try {
      // TODO: Initialize your provider client
      // Example: this.client = new YourProviderClient(this.config.credentials);
      // await this.client.connect();

      this.status = 'connected';
      this.emit('connected');
    } catch (error: any) {
      this.status = 'error';
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // TODO: Disconnect from provider
      // Example: await this.client.disconnect();

      this.client = null;
      this.status = 'disconnected';
      this.emit('disconnected');
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // TODO: Implement health check
      // Example: await this.client.ping();
      return this.isConnected();
    } catch {
      return false;
    }
  }

  async query<T = any>(collection: string, options?: QueryOptions): Promise<QueryResult<T>> {
    // TODO: Implement query logic
    // Example:
    // const result = await this.client.find(collection, {
    //   limit: options?.limit || 100,
    //   skip: options?.offset || 0,
    //   filter: options?.filter || {},
    // });
    //
    // return {
    //   data: result.data,
    //   total: result.total,
    //   hasMore: result.hasMore,
    // };

    throw new Error('query not implemented');
  }

  async get<T = any>(collection: string, id: string): Promise<T | null> {
    // TODO: Implement get by ID
    // Example: return await this.client.findById(collection, id);
    throw new Error('get not implemented');
  }

  async create<T = any>(collection: string, data: Partial<T>): Promise<T> {
    // TODO: Implement create
    // Example: return await this.client.insert(collection, data);
    throw new Error('create not implemented');
  }

  async update<T = any>(collection: string, id: string, data: Partial<T>): Promise<T> {
    // TODO: Implement update
    // Example: return await this.client.update(collection, id, data);
    throw new Error('update not implemented');
  }

  async delete(collection: string, id: string): Promise<boolean> {
    // TODO: Implement delete
    // Example: return await this.client.delete(collection, id);
    throw new Error('delete not implemented');
  }
}

/**
 * Provider factory - creates provider instances based on configuration
 */
export class ProviderFactory {
  private static providers = new Map<string, typeof DataProvider>();

  /**
   * Register a provider class
   */
  static register(name: string, providerClass: typeof DataProvider): void {
    this.providers.set(name, providerClass);
  }

  /**
   * Create provider instance from config
   */
  static create<T extends DataProvider>(config: ProviderConfig): T {
    const ProviderClass = this.providers.get(config.name);
    if (!ProviderClass) {
      throw new Error(`Provider not registered: ${config.name}`);
    }

    return new ProviderClass(config) as T;
  }

  /**
   * List registered providers
   */
  static list(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Example usage:
 *
 * // 1. Create your provider class
 * class PostgresProvider extends DataProvider {
 *   // ... implement methods
 * }
 *
 * // 2. Register it
 * ProviderFactory.register('postgres', PostgresProvider);
 *
 * // 3. Create instance from config
 * const provider = ProviderFactory.create({
 *   name: 'postgres',
 *   type: 'database',
 *   enabled: true,
 *   credentials: {
 *     connectionString: process.env.DATABASE_URL || 'postgresql://localhost/mydb'
 *   }
 * });
 *
 * // 4. Use it
 * await provider.connect();
 * const users = await provider.query('users', { limit: 10 });
 * await provider.disconnect();
 */
