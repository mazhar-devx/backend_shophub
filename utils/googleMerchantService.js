const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * Service to handle Google Merchant API integration using the stable Content API v2.1
 */
class GoogleMerchantService {
  constructor() {
    this.merchantId = process.env.GOOGLE_MERCHANT_ID || '5781936707';
    this.keyFilePath = path.join(__dirname, '../config/google-merchant-key.json');
    this.dataSourceName = 'Content API';
    this.content = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return true;

    try {
      let auth;
      const scopes = ['https://www.googleapis.com/auth/content'];

      // 1. Try environment variable first (Best for production like Railway)
      const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (envKey) {
        console.log('[GoogleMerchant] Using credentials from environment variable.');
        const credentials = JSON.parse(envKey);
        auth = new google.auth.JWT(
          credentials.client_email,
          null,
          credentials.private_key,
          scopes
        );
      } 
      // 2. Fallback to key file (Local development)
      else if (fs.existsSync(this.keyFilePath)) {
        console.log('[GoogleMerchant] Using credentials from key file:', this.keyFilePath);
        auth = new google.auth.GoogleAuth({
          keyFile: this.keyFilePath,
          scopes: scopes,
        });
      } 
      else {
        console.warn(`[GoogleMerchant] No credentials found. Integration disabled.`);
        return false;
      }

      this.content = google.content({
        version: 'v2.1',
        auth: auth
      });

      this.initialized = true;
      console.log('[GoogleMerchant] Content API successfully initialized.');
      return true;
    } catch (error) {
      console.error('[GoogleMerchant] Initialization error:', error.message);
      return false;
    }
  }

  /**
   * Sync a single product to Google Merchant Center
   */
  async syncProduct(product) {
    if (!await this.init()) return { status: 'error', message: 'Not initialized' };

    const siteUrl = process.env.SITE_URL || 'https://www.shophub.pro';
    const productUrl = `${siteUrl}/product/${product.slug || product._id}`;
    
    // Format product for Content API v2.1
    const googleProduct = {
      offerId: product._id.toString(),
      title: product.name,
      description: product.description,
      imageLink: this._formatImageUrl(product.image || (product.images && product.images[0])),
      link: productUrl,
      brand: product.brand || 'ShopHub',
      contentLanguage: 'en',
      targetCountry: 'PK',
      feedLabel: 'PK',
      channel: 'online',
      price: {
        value: product.price.toString(),
        currency: product.currency || 'PKR'
      },
      availability: product.stock > 0 ? 'in stock' : 'out of stock',
      condition: 'new'
    };

    try {
      const res = await this.content.products.insert({
        merchantId: this.merchantId,
        requestBody: googleProduct
      });

      console.log(`[GoogleMerchant] Product synced via Content API: ${product.name}`);
      
      product.googleMerchantId = res.data.id;
      product.googleMerchantSyncStatus = 'synced';
      product.googleMerchantLastError = null;
      await product.save({ validateBeforeSave: false });

      return { status: 'success', data: res.data };
    } catch (error) {
      console.error(`[GoogleMerchant] Content API Sync error for ${product.name}:`, error.message);
      
      product.googleMerchantSyncStatus = 'error';
      product.googleMerchantLastError = error.message;
      await product.save({ validateBeforeSave: false });

      return { status: 'error', message: error.message };
    }
  }

  // Helper method for bulk sync controller
  async ensureDataSource() {
    // For Content API, the data source is created automatically on the first insert
    return 'Content API';
  }

  _formatImageUrl(image) {
    if (!image) return 'https://www.shophub.pro/placeholder.svg';
    if (image.startsWith('http')) return image;
    const backendUrl = process.env.BACKEND_URL || 'https://backendshophub-production.up.railway.app';
    return `${backendUrl}/img/products/${image}`;
  }
}

module.exports = new GoogleMerchantService();
