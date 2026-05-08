const { ProductsServiceClient, ProductInputsServiceClient } = require('@google-shopping/products');
const { DataSourcesServiceClient } = require('@google-shopping/datasources');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

/**
 * Service to handle Google Merchant API integration
 */
class GoogleMerchantService {
  constructor() {
    this.merchantId = process.env.GOOGLE_MERCHANT_ID || '5781936707';
    this.keyFilePath = path.join(__dirname, '../config/google-merchant-key.json');
    this.dataSourceName = 'ShopHub_API_Feed';
    this.client = null;
    this.dsClient = null;
    this.inputClient = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return true;

    try {
      let authConfig = {
        scopes: 'https://www.googleapis.com/auth/content',
      };

      // 1. Try environment variable first (Best for production like Railway)
      const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (envKey) {
        console.log('[GoogleMerchant] Found GOOGLE_SERVICE_ACCOUNT_KEY in environment.');
        try {
          authConfig.credentials = JSON.parse(envKey);
          console.log('[GoogleMerchant] Successfully parsed JSON credentials from environment.');
        } catch (parseErr) {
          console.error('[GoogleMerchant] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON:', parseErr.message);
          return false;
        }
      } 
      // 2. Fallback to key file (Local development)
      else if (fs.existsSync(this.keyFilePath)) {
        console.log('[GoogleMerchant] Using credentials from key file:', this.keyFilePath);
        authConfig.keyFile = this.keyFilePath;
      } 
      else {
        console.warn(`[GoogleMerchant] No credentials found. GOOGLE_SERVICE_ACCOUNT_KEY is ${envKey ? 'invalid' : 'missing'}. File exists: ${fs.existsSync(this.keyFilePath)}`);
        return false;
      }

      const auth = new GoogleAuth(authConfig);
      this.client = new ProductsServiceClient({ auth });
      this.dsClient = new DataSourcesServiceClient({ auth });
      this.inputClient = new ProductInputsServiceClient({ auth });
      this.initialized = true;
      console.log('[GoogleMerchant] Service successfully initialized.');
      return true;
    } catch (error) {
      console.error('[GoogleMerchant] Initialization error:', error.message);
      return false;
    }
  }

  /**
   * Ensures that the primary data source exists in Google Merchant Center
   */
  async ensureDataSource() {
    if (!await this.init()) return null;

    const parent = `accounts/${this.merchantId}`;
    
    try {
      // List existing data sources
      const [dataSources] = await this.dsClient.listDataSources({ parent });
      const existing = dataSources.find(ds => ds.displayName === this.dataSourceName);

      if (existing) {
        console.log(`[GoogleMerchant] Data source found: ${existing.name}`);
        return existing.name;
      }

      // Create new data source
      console.log(`[GoogleMerchant] Creating data source: ${this.dataSourceName}`);
      const [newDs] = await this.dsClient.createDataSource({
        parent,
        dataSource: {
          displayName: this.dataSourceName,
          primaryProductDataSource: {
            channel: 'ONLINE',
            contentLanguage: 'en',
            feedLabel: 'PK'
          }
        }
      });

      return newDs.name;
    } catch (error) {
      console.error('[GoogleMerchant] Error ensuring data source:', error.message);
      return null;
    }
  }

  /**
   * Sync a single product to Google Merchant Center
   */
  async syncProduct(product) {
    if (!await this.init()) return { status: 'error', message: 'Not initialized' };

    const siteUrl = process.env.SITE_URL || 'https://www.shophub.pro';
    const productUrl = `${siteUrl}/product/${product.slug || product._id}`;
    
    // Format product for Google (v1beta ProductInput)
    const googleProductInput = {
      offerId: product._id.toString(),
      title: product.name,
      description: product.description,
      imageLink: this._formatImageUrl(product.image || (product.images && product.images[0])),
      link: productUrl,
      brand: product.brand || 'ShopHub',
      contentLanguage: 'en',
      feedLabel: 'PK',
      channel: 'ONLINE',
      price: {
        amountMicros: (product.price * 1000000).toString(),
        currencyCode: product.currency || 'PKR'
      },
      availability: product.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      condition: 'NEW'
    };

    try {
      const dataSource = await this.ensureDataSource();
      const parent = `accounts/${this.merchantId}`;
      
      const [response] = await this.inputClient.insertProductInput({
        parent,
        productInput: googleProductInput,
        dataSource: dataSource
      });

      console.log(`[GoogleMerchant] Product synced: ${product.name}`);
      
      product.googleMerchantId = response.name;
      product.googleMerchantSyncStatus = 'synced';
      product.googleMerchantLastError = null;
      await product.save({ validateBeforeSave: false });

      return { status: 'success', data: response };
    } catch (error) {
      console.error(`[GoogleMerchant] Sync error for ${product.name}:`, error.message);
      
      product.googleMerchantSyncStatus = 'error';
      product.googleMerchantLastError = error.message;
      await product.save({ validateBeforeSave: false });

      return { status: 'error', message: error.message };
    }
  }

  _formatImageUrl(image) {
    if (!image) return 'https://www.shophub.pro/placeholder.svg';
    if (image.startsWith('http')) return image;
    const backendUrl = process.env.BACKEND_URL || 'https://backendshophub-production.up.railway.app';
    return `${backendUrl}/img/products/${image}`;
  }
}

module.exports = new GoogleMerchantService();
