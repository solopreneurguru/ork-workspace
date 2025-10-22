/**
 * sim.ts - Data Simulator Adapter
 *
 * Replays JSON data and emits events for testing without real API dependencies.
 * This allows backends to compile and run even when provider API keys are missing.
 *
 * Features:
 * - Loads JSON fixtures from data directory
 * - Emits events to simulate real-time data
 * - Configurable delay for realistic timing
 * - Event-driven architecture for pub/sub patterns
 *
 * Usage:
 *   const sim = new DataSimulator({ fixturesPath: './fixtures' });
 *   await sim.load('users.json');
 *   sim.on('data', (record) => console.log(record));
 *   await sim.replay();
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface SimulatorConfig {
  fixturesPath?: string;
  replayDelay?: number; // ms between records
  loop?: boolean; // Loop replay indefinitely
}

export interface DataRecord {
  id: string;
  type: string;
  data: any;
  timestamp?: number;
}

export class DataSimulator extends EventEmitter {
  private config: SimulatorConfig;
  private records: DataRecord[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;

  constructor(config: SimulatorConfig = {}) {
    super();
    this.config = {
      fixturesPath: config.fixturesPath || path.join(process.cwd(), 'fixtures'),
      replayDelay: config.replayDelay || 100,
      loop: config.loop || false,
    };
  }

  /**
   * Load JSON fixture file
   */
  async load(filename: string): Promise<void> {
    const fixturePath = path.join(this.config.fixturesPath!, filename);

    if (!fs.existsSync(fixturePath)) {
      this.emit('error', new Error(`Fixture not found: ${fixturePath}`));
      return;
    }

    try {
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const data = JSON.parse(content);

      // Normalize data to DataRecord format
      if (Array.isArray(data)) {
        this.records = data.map((item, index) => this.normalizeRecord(item, index));
      } else {
        this.records = [this.normalizeRecord(data, 0)];
      }

      this.emit('loaded', { filename, count: this.records.length });
    } catch (error: any) {
      this.emit('error', new Error(`Failed to load fixture: ${error.message}`));
    }
  }

  /**
   * Load records directly from array
   */
  loadRecords(records: any[]): void {
    this.records = records.map((item, index) => this.normalizeRecord(item, index));
    this.emit('loaded', { count: this.records.length });
  }

  /**
   * Normalize data to DataRecord format
   */
  private normalizeRecord(item: any, index: number): DataRecord {
    if (this.isDataRecord(item)) {
      return item;
    }

    return {
      id: item.id || `record-${index}`,
      type: item.type || 'unknown',
      data: item,
      timestamp: item.timestamp || Date.now(),
    };
  }

  private isDataRecord(item: any): item is DataRecord {
    return item && typeof item === 'object' && 'id' in item && 'type' in item && 'data' in item;
  }

  /**
   * Replay loaded records with configurable delay
   */
  async replay(): Promise<void> {
    if (this.records.length === 0) {
      this.emit('error', new Error('No records loaded. Call load() first.'));
      return;
    }

    this.isPlaying = true;
    this.currentIndex = 0;
    this.emit('start', { count: this.records.length });

    do {
      for (let i = 0; i < this.records.length && this.isPlaying; i++) {
        const record = this.records[i];
        this.currentIndex = i;

        this.emit('data', record);

        // Delay before next record
        if (i < this.records.length - 1 || this.config.loop) {
          await this.sleep(this.config.replayDelay!);
        }
      }
    } while (this.config.loop && this.isPlaying);

    if (this.isPlaying) {
      this.isPlaying = false;
      this.emit('end', { count: this.records.length });
    }
  }

  /**
   * Stop replay
   */
  stop(): void {
    this.isPlaying = false;
    this.emit('stopped', { currentIndex: this.currentIndex });
  }

  /**
   * Get current record
   */
  getCurrentRecord(): DataRecord | null {
    return this.records[this.currentIndex] || null;
  }

  /**
   * Get all records
   */
  getAllRecords(): DataRecord[] {
    return [...this.records];
  }

  /**
   * Get records by type
   */
  getRecordsByType(type: string): DataRecord[] {
    return this.records.filter(r => r.type === type);
  }

  /**
   * Query records with filter function
   */
  query(filter: (record: DataRecord) => boolean): DataRecord[] {
    return this.records.filter(filter);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create sample fixture for testing
   */
  static createSampleFixture(outputPath: string): void {
    const sampleData = [
      {
        id: 'user-1',
        type: 'user',
        data: { name: 'Alice', email: 'alice@example.com', role: 'admin' },
        timestamp: Date.now(),
      },
      {
        id: 'user-2',
        type: 'user',
        data: { name: 'Bob', email: 'bob@example.com', role: 'user' },
        timestamp: Date.now() + 1000,
      },
      {
        id: 'event-1',
        type: 'event',
        data: { action: 'login', userId: 'user-1', success: true },
        timestamp: Date.now() + 2000,
      },
    ];

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(sampleData, null, 2), 'utf-8');
  }
}

/**
 * Example usage:
 *
 * const simulator = new DataSimulator({ replayDelay: 500 });
 *
 * simulator.on('loaded', ({ count }) => {
 *   console.log(`Loaded ${count} records`);
 * });
 *
 * simulator.on('data', (record) => {
 *   console.log('Received:', record);
 * });
 *
 * simulator.on('end', () => {
 *   console.log('Replay complete');
 * });
 *
 * await simulator.load('sample-data.json');
 * await simulator.replay();
 */
