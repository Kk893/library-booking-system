const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing test user
    await User.deleteOne({ email: 'test@example.com' });

    // Create test user
    const testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
      role: 'user'
    });

    await testUser.save();
    console.log('Test user created successfully');

    // Create admin user
    await User.deleteOne({ email: 'admin@example.com' });
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });

    await adminUser.save();
    console.log('Admin user created successfully');

    // Create super admin user
    await User.deleteOne({ email: 'super@example.com' });
    const superAdminUser = new User({
      name: 'Super Admin',
      email: 'super@example.com',
      password: 'super123',
      role: 'superadmin'
    });

    await superAdminUser.save();
    console.log('Super admin user created successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
};

createTestUser();