/**
 * iap-bridge.ts
 *
 * In-App Purchase (IAP) bridge for mobile apps (iOS + Android)
 * Handles App Store and Google Play purchases via Expo IAP or react-native-iap
 *
 * Features:
 * - Purchase product/subscription
 * - Restore purchases
 * - Receipt verification (server-side)
 * - Subscription status checking
 * - Transaction handling
 *
 * Platform Support:
 * - iOS: StoreKit via App Store Connect
 * - Android: Google Play Billing API
 *
 * Setup Requirements:
 * 1. Configure products in App Store Connect and Google Play Console
 * 2. Add billing permissions to app.json (Expo) or AndroidManifest.xml
 * 3. Set up server-side receipt verification endpoints
 *
 * Usage (Client):
 *   const iap = new IAPBridge({ platform: 'ios' });
 *   await iap.initialize();
 *   const products = await iap.getProducts(['com.app.premium']);
 *   await iap.purchaseProduct('com.app.premium');
 *
 * Usage (Server):
 *   const verifier = new IAPVerifier({
 *     appleSharedSecret: process.env.APPLE_SHARED_SECRET,
 *     googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
 *   });
 *   const isValid = await verifier.verifyReceipt(receipt, platform);
 */

import { EventEmitter } from 'events';

export type Platform = 'ios' | 'android';

export interface IAPConfig {
  platform: Platform;
  autoFinishTransactions?: boolean;
}

export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  type: 'consumable' | 'non-consumable' | 'subscription';
  subscriptionPeriod?: 'P1M' | 'P3M' | 'P6M' | 'P1Y'; // ISO 8601 duration
}

export interface PurchaseResult {
  transactionId: string;
  productId: string;
  purchaseToken: string;
  receipt: string;
  platform: Platform;
  timestamp: number;
}

export interface SubscriptionStatus {
  isActive: boolean;
  productId: string;
  expirationDate?: number;
  autoRenewing?: boolean;
  isInTrialPeriod?: boolean;
  isInGracePeriod?: boolean;
}

/**
 * Client-side IAP bridge (for React Native/Expo apps)
 */
export class IAPBridge extends EventEmitter {
  private config: IAPConfig;
  private isInitialized: boolean = false;
  private iapModule: any = null;

  constructor(config: IAPConfig) {
    super();
    this.config = {
      autoFinishTransactions: true,
      ...config,
    };
  }

  /**
   * Initialize IAP module
   *
   * NOTE: This requires react-native-iap or expo-in-app-purchases
   * Install with: npx expo install expo-in-app-purchases
   * or: npm install react-native-iap
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try Expo IAP first
      try {
        this.iapModule = require('expo-in-app-purchases');
        await this.iapModule.connectAsync();
      } catch {
        // Fallback to react-native-iap
        this.iapModule = require('react-native-iap');
        await this.iapModule.initConnection();
      }

      this.isInitialized = true;
      this.emit('initialized', { platform: this.config.platform });

      // Listen for purchase updates
      if (this.iapModule.setPurchaseListener) {
        this.iapModule.setPurchaseListener(this.handlePurchaseUpdate.bind(this));
      }
    } catch (error: any) {
      this.emit('error', new Error('IAP module not installed. See setup instructions.'));
      throw error;
    }
  }

  /**
   * Get available products
   */
  async getProducts(productIds: string[]): Promise<Product[]> {
    await this.ensureInitialized();

    try {
      const products = await this.iapModule.getProductsAsync(productIds);

      return products.map((p: any) => ({
        productId: p.productId,
        title: p.title,
        description: p.description,
        price: p.price,
        priceAmount: p.priceAmount || parseFloat(p.price.replace(/[^0-9.]/g, '')),
        currency: p.currency || 'USD',
        type: p.type || 'non-consumable',
        subscriptionPeriod: p.subscriptionPeriod,
      }));
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Purchase product
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    await this.ensureInitialized();

    try {
      const purchase = await this.iapModule.purchaseItemAsync(productId);

      const result: PurchaseResult = {
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken || purchase.transactionReceipt,
        receipt: purchase.transactionReceipt,
        platform: this.config.platform,
        timestamp: purchase.purchaseTime || Date.now(),
      };

      this.emit('purchase', result);

      // Auto-finish transaction if enabled
      if (this.config.autoFinishTransactions) {
        await this.finishTransaction(purchase);
      }

      return result;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        this.emit('purchase.cancelled', { productId });
      } else {
        this.emit('purchase.failed', { productId, error });
      }
      throw error;
    }
  }

  /**
   * Restore purchases (required by Apple)
   */
  async restorePurchases(): Promise<PurchaseResult[]> {
    await this.ensureInitialized();

    try {
      const purchases = await this.iapModule.getPurchaseHistoryAsync();

      const results = purchases.map((p: any) => ({
        transactionId: p.transactionId,
        productId: p.productId,
        purchaseToken: p.purchaseToken || p.transactionReceipt,
        receipt: p.transactionReceipt,
        platform: this.config.platform,
        timestamp: p.purchaseTime || Date.now(),
      }));

      this.emit('restore', results);
      return results;
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Finish transaction (acknowledge purchase)
   */
  async finishTransaction(purchase: any): Promise<void> {
    try {
      if (this.iapModule.finishTransactionAsync) {
        await this.iapModule.finishTransactionAsync(purchase, true);
      } else if (this.iapModule.finishTransaction) {
        await this.iapModule.finishTransaction(purchase);
      }
      this.emit('transaction.finished', { transactionId: purchase.transactionId });
    } catch (error: any) {
      this.emit('error', error);
    }
  }

  /**
   * Handle purchase updates
   */
  private handlePurchaseUpdate(purchase: any): void {
    this.emit('purchase.update', purchase);
  }

  /**
   * Disconnect IAP module
   */
  async disconnect(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.iapModule.disconnectAsync) {
        await this.iapModule.disconnectAsync();
      } else if (this.iapModule.endConnection) {
        await this.iapModule.endConnection();
      }

      this.isInitialized = false;
      this.emit('disconnected');
    } catch (error: any) {
      this.emit('error', error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

/**
 * Server-side receipt verification
 */
export interface VerifierConfig {
  appleSharedSecret?: string;
  googleServiceAccountKey?: string;
  sandbox?: boolean;
}

export class IAPVerifier {
  private config: VerifierConfig;

  constructor(config: VerifierConfig) {
    this.config = {
      sandbox: process.env.NODE_ENV !== 'production',
      ...config,
    };
  }

  /**
   * Verify receipt with Apple or Google
   *
   * NOTE: This is a placeholder implementation.
   * For production, use libraries like:
   * - node-apple-receipt-verify
   * - google-play-billing-validator
   */
  async verifyReceipt(receipt: string, platform: Platform): Promise<boolean> {
    if (platform === 'ios') {
      return this.verifyAppleReceipt(receipt);
    } else {
      return this.verifyGoogleReceipt(receipt);
    }
  }

  private async verifyAppleReceipt(receipt: string): Promise<boolean> {
    if (!this.config.appleSharedSecret) {
      console.warn('Apple shared secret not configured. Skipping receipt verification.');
      return false;
    }

    // TODO: Implement Apple receipt verification
    // Use: node-apple-receipt-verify or call Apple's verifyReceipt API directly
    // https://developer.apple.com/documentation/appstorereceipts/verifyreceipt

    console.log('Apple receipt verification not implemented. Install: npm install node-apple-receipt-verify');
    return false;
  }

  private async verifyGoogleReceipt(receipt: string): Promise<boolean> {
    if (!this.config.googleServiceAccountKey) {
      console.warn('Google service account key not configured. Skipping receipt verification.');
      return false;
    }

    // TODO: Implement Google Play receipt verification
    // Use: google-play-billing-validator or Google Play Developer API
    // https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get

    console.log('Google receipt verification not implemented. Install: npm install google-play-billing-validator');
    return false;
  }

  /**
   * Get subscription status
   *
   * NOTE: Placeholder - implement with actual API calls
   */
  async getSubscriptionStatus(receiptOrToken: string, platform: Platform): Promise<SubscriptionStatus> {
    // TODO: Query Apple/Google APIs for subscription status
    return {
      isActive: false,
      productId: 'unknown',
    };
  }
}

/**
 * IAP Simulator for testing without real purchases
 */
export class IAPSimulator extends EventEmitter {
  private products: Map<string, Product> = new Map();

  constructor() {
    super();
    this.setupDefaultProducts();
  }

  private setupDefaultProducts(): void {
    const defaultProducts: Product[] = [
      {
        productId: 'com.app.premium.monthly',
        title: 'Premium Monthly',
        description: 'Premium subscription - monthly',
        price: '$9.99',
        priceAmount: 9.99,
        currency: 'USD',
        type: 'subscription',
        subscriptionPeriod: 'P1M',
      },
      {
        productId: 'com.app.premium.yearly',
        title: 'Premium Yearly',
        description: 'Premium subscription - yearly (save 20%)',
        price: '$99.99',
        priceAmount: 99.99,
        currency: 'USD',
        type: 'subscription',
        subscriptionPeriod: 'P1Y',
      },
    ];

    defaultProducts.forEach(p => this.products.set(p.productId, p));
  }

  async initialize(): Promise<void> {
    console.log('[IAP Simulator] Initialized');
  }

  async getProducts(productIds: string[]): Promise<Product[]> {
    return productIds
      .map(id => this.products.get(id))
      .filter(Boolean) as Product[];
  }

  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const result: PurchaseResult = {
      transactionId: `sim-${Date.now()}`,
      productId,
      purchaseToken: `token-${Date.now()}`,
      receipt: `receipt-${Date.now()}`,
      platform: 'ios',
      timestamp: Date.now(),
    };

    console.log('[IAP Simulator] Purchase successful:', result);
    return result;
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    console.log('[IAP Simulator] No purchases to restore');
    return [];
  }
}

/**
 * Usage documentation:
 *
 * ## Setup (Expo)
 *
 * 1. Install package:
 *    npx expo install expo-in-app-purchases
 *
 * 2. Configure products in:
 *    - App Store Connect (iOS)
 *    - Google Play Console (Android)
 *
 * 3. Add to app.json:
 *    {
 *      "expo": {
 *        "ios": {
 *          "infoPlist": {
 *            "SKAdNetworkItems": [...]
 *          }
 *        },
 *        "android": {
 *          "permissions": ["com.android.vending.BILLING"]
 *        }
 *      }
 *    }
 *
 * 4. Server-side verification:
 *    - Set APPLE_SHARED_SECRET in .env
 *    - Set GOOGLE_SERVICE_ACCOUNT_KEY in .env
 *
 * ## Testing
 *
 * Use IAPSimulator for local development without real purchases.
 */
