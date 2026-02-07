const API_URL = 'http://localhost:5000/api/v1';

const fs = require('fs');

function log(msg) {
    fs.appendFileSync('verify_output.txt', msg + '\n');
    console.log(msg); // Keep console for tool output in case
}

async function verifyFlow() {
    try {
        fs.writeFileSync('verify_output.txt', 'Starting verification...\n');
        log('1. Logging in...');

        let token;

        // Use a unique email to avoid "duplicate key" limit if running multiple times
        const email = `test${Date.now()}@test.com`;

        // Skip login try, just signup new user
        log(`Creating user: ${email}`);
        const signupRes = await fetch(`${API_URL}/users/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: email,
                password: 'password123',
                passwordConfirm: 'password123'
            })
        });

        let data = await signupRes.json();
        if (!signupRes.ok) {
            log('Signup failed: ' + JSON.stringify(data));
            return;
        }
        token = data.token;
        const userId = data.data.user._id;
        log(`Signup successful. Token acquired. User ID: ${userId}`);

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        log('2. Creating Order...');

        const prodRes = await fetch(`${API_URL}/products`);
        const prodData = await prodRes.json();
        const product = prodData.data.products[0];

        if (!product) {
            log('No products found to order.');
            return;
        }
        log(`Ordering product: ${product.name} (${product._id})`);

        const orderData = {
            items: [{
                product: product._id,
                quantity: 1
            }],
            shippingAddress: {
                address: "123 Test St",
                city: "Test City",
                postalCode: "12345",
                country: "Testland",
                phone: "1234567890"
            },
            paymentMethod: "cash_on_delivery"
        };

        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });

        const orderResData = await orderRes.json();

        if (!orderRes.ok) {
            log('Order creation failed: ' + JSON.stringify(orderResData));
            return;
        }

        const newOrderId = orderResData.data.order._id;
        log(`Order created. ID: ${newOrderId}`);

        log('3. Fetching My Orders...');

        const myOrdersRes = await fetch(`${API_URL}/orders/myorders`, {
            headers: headers
        });

        const myOrdersData = await myOrdersRes.json();

        if (!myOrdersRes.ok || !myOrdersData.data) {
            log('Get My Orders FAILED. Response: ' + JSON.stringify(myOrdersData));
            return;
        }

        log(`My Orders Count: ${myOrdersData.results}`);

        const foundOrder = myOrdersData.data.orders.find(o => o._id === newOrderId);

        if (foundOrder) {
            log('SUCCESS: foundOrder match! The flow works perfectly.');
        } else {
            log('FAILURE: Created order NOT found in My Orders.');
            log('Orders IDs found: ' + JSON.stringify(myOrdersData.data.orders.map(o => o._id)));
        }

    } catch (err) {
        log('Error in verifyFlow: ' + err.message);
        if (err.cause) log('Cause: ' + err.cause);
    }
}

verifyFlow();

verifyFlow();
