const https = require('https');

function testUrl(hostname) {
    return new Promise((resolve, reject) => {
        console.log(`Testing connection to ${hostname}...`);
        const req = https.get(`https://${hostname}`, (res) => {
            console.log(`✅ ${hostname} responded with ${res.statusCode}`);
            res.resume();
            resolve(true);
        });

        req.on('error', (e) => {
            console.error(`❌ ${hostname} Error: ${e.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error(`❌ ${hostname} Timeout`);
            resolve(false);
        });

        req.setTimeout(5000);
    });
}

async function runTests() {
    await testUrl('www.google.com');
    await testUrl('api.groq.com');
}

runTests();
