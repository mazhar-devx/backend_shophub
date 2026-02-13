const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, 'config.env');
console.log('Checking config at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('File exists.');
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.log('Dotenv error:', result.error);
    } else {
        console.log('Dotenv parsed keys:', Object.keys(result.parsed));
    }
} else {
    console.log('File does NOT exist.');
}

console.log('DATABASE from env:', process.env.DATABASE);
