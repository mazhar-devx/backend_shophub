const { ProductsServiceClient } = require('@google-shopping/products');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

async function debug() {
  const keyFile = path.join(__dirname, 'config/google-merchant-key.json');
  if (!fs.existsSync(keyFile)) {
    console.error('Key file not found');
    return;
  }

  const auth = new GoogleAuth({
    keyFile,
    scopes: 'https://www.googleapis.com/auth/content',
  });

  const client = new ProductsServiceClient({ auth });
  
  console.log('Available methods on ProductsServiceClient:');
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(client));
  console.log(methods.filter(m => !m.startsWith('_')));
}

debug();
