const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

// Define Schema manually to avoid require issues if model file has extraneous deps
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Order must belong to a user']
    },
    totalPrice: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { strict: false }); // strict: false allows us to see fields even if schema doesn't match perfectly

const Order = mongoose.model('Order', orderSchema);

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log('DB connection successful!');
        debugOrders();
    })
    .catch(err => {
        console.error('DB Connection Failed:', err);
        process.exit(1);
    });

async function debugOrders() {
    try {
        const orders = await Order.find().populate('user', 'name email');
        const users = await User.find(); // Moved users query up to be available for logging

        let output = `Orders Count: ${orders.length}\n`;
        if (orders.length > 0) {
            output += `First Order ID: ${orders[0]._id}\n`;
            output += `First Order User: ${orders[0].user ? orders[0].user._id : 'NULL'}\n`;
            output += `First Order Total: ${orders[0].totalPrice}\n`;
        }
        output += `Users Count: ${users.length}\n`;
        users.forEach(u => output += `User: ${u.email} ID: ${u._id}\n`);

        fs.writeFileSync('minimal_output.txt', output);
        console.log('Output written to minimal_output.txt');

    } catch (err) {
        console.error('Error in debug function:', err);
    } finally {
        process.exit();
    }
}
