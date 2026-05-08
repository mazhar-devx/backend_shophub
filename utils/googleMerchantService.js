const { ProductsServiceClient } = require('@google-shopping/products');
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
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    if (!fs.existsSync(this.keyFilePath)) {
      console.warn(`[GoogleMerchant] Key file not found at ${this.keyFilePath}. Integration will be disabled.`);
      return false;
    }

    try {
      const auth = new GoogleAuth({
        keyFile: this.keyFilePath,
        scopes: 'https://www.googleapis.com/auth/content',
      });

      this.client = new ProductsServiceClient({ auth });
      this.dsClient = new DataSourcesServiceClient({ auth });
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[GoogleMerchant] Initialization error:', error);
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
            // For API ingestion, we can leave these flexible or specify
            channel: 'ONLINE',
            contentLanguage: 'en',
            feedLabel: 'PK'
          }
        }
      });

      return newDs.name;
    } catch (error) {
      console.error('[GoogleMerchant] Error ensuring data source:', error);
      return null;
    }
  }

  /**
   * Sync a single product to Google Merchant Center
   */
  async syncProduct(product) {
    if (!await this.init()) return { status: 'error', message: 'Not initialized' };

    const siteUrl = process.env.SITE_URL || 'https://shophub.mazhar.dev'; // Fallback
    const productUrl = `${siteUrl}/product/${product.slug}`;
    
    // Format product for Google
    const googleProduct = {
      offerId: product._id.toString(),
      title: product.name,
      description: product.description,
      imageLink: this._formatImageUrl(product.image),
      link: productUrl,
      brand: product.brand,
      contentLanguage: 'en',
      feedLabel: 'PK', // Assuming Pakistan based on common PKR usage in this project
      channel: 'online',
      price: {
        value: product.price.toString(),
        currency: product.currency || 'PKR'
      },
      availability: product.stock > 0 ? 'in stock' : 'out of stock',
      condition: 'new'
    };

    try {
      const parent = `accounts/${this.merchantId}`;
      const [response] = await this.client.insertProduct({
        parent,
        product: googleProduct,
        // If we want to associate with a specific data source name (optional for Content API)
        // dataSource: await this.ensureDataSource() 
      });

      console.log(`[GoogleMerchant] Product synced: ${product.name} (${response.name})`);
      
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
    if (image.startsWith('http')) return image;
    const backendUrl = process.env.BACKEND_URL || 'https://backendshophub-production.up.railway.app';
    return `${backendUrl}/img/products/${image}`;
  }
}

module.exports = new GoogleMerchantService();
