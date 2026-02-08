async function testOrderCreation() {
    const API_URL = 'http://localhost:5000/api/v1';

    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful. Token:', token.substring(0, 20) + '...');

        // 1.5 Get a valid product
        console.log('Fetching products...');
        const productsRes = await fetch(`${API_URL}/products`);
        const productsData = await productsRes.json();
        const product = productsData.data.products[0];

        if (!product) {
            console.error('No products found to order!');
            return;
        }
        console.log('Found product:', product._id, product.name);

        // 2. Create Order
        console.log('Attempting to create order...');
        const orderData = {
            items: [
                {
                    product: product._id,
                    quantity: 1
                }
            ],
            shippingAddress: {
                fullName: "Test User",
                address: "123 Test St",
                city: "Test City",
                postalCode: "12345",
                country: "Test Country",
                phone: "1234567890"
            },
            paymentMethod: "cash_on_delivery",
            totalPrice: 100
        };

        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        if (!orderRes.ok) {
            const errText = await orderRes.text();
            throw new Error(`Order creation failed: ${orderRes.status} ${orderRes.statusText} - ${errText}`);
        }

        const orderJson = await orderRes.json();
        console.log('Order created successfully:', orderJson.status);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

testOrderCreation();
