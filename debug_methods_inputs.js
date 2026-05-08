const { ProductInputsServiceClient } = require('@google-shopping/products');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

async function debug() {
  const keyFile = path.join(__dirname, 'config/google-merchant-key.json');
  const auth = new GoogleAuth({
    keyFile,
    scopes: 'https://www.googleapis.com/auth/content',
  });

  const client = new ProductInputsServiceClient({ auth });
  
  console.log('Available methods on ProductInputsServiceClient:');
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(client));
  console.log(methods.filter(m => !m.startsWith('_')));
}

debug();
