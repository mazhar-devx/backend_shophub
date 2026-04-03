const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/userModel');

// Load environment variables
dotenv.config({ path: './config.env' });

// Connect to database
let DB = process.env.DATABASE;
if (process.env.DATABASE_PASSWORD && process.env.DATABASE_PASSWORD !== '') {
  DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
}

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected successfully!'));

// Create admin user
const createAdmin = async () => {
  try {
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      passwordConfirm: 'admin123',
      role: 'admin'
    });

    console.log('Admin user created successfully!');
    console.log('Email:', adminUser.email);
    console.log('Password: admin123');
    console.log('Role:', adminUser.role);
    
    process.exit();
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
};

// Delete admin user
const deleteAdmin = async () => {
  try {
    await User.deleteMany({ email: 'admin@example.com' });
    console.log('Admin user deleted successfully!');
    process.exit();
  } catch (err) {
    console.error('Error deleting admin user:', err);
    process.exit(1);
  }
};

if (process.argv[2] === '--delete') {
  deleteAdmin();
} else {
  createAdmin();
}