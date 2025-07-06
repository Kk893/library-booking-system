const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Test Super Admin login
    console.log('\n🧪 Testing Super Admin login...');
    const superAdmin = await User.findOne({ email: 'super@admin.com' });
    if (superAdmin) {
      const isValidPassword = await superAdmin.comparePassword('super123');
      console.log(`Super Admin found: ${superAdmin.name}`);
      console.log(`Password valid: ${isValidPassword}`);
      console.log(`Role: ${superAdmin.role}`);
    } else {
      console.log('❌ Super Admin not found');
    }

    // Test Library Admin login
    console.log('\n🧪 Testing Library Admin login...');
    const admin = await User.findOne({ email: 'john@admin.com' });
    if (admin) {
      const isValidPassword = await admin.comparePassword('admin123');
      console.log(`Admin found: ${admin.name}`);
      console.log(`Password valid: ${isValidPassword}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Library ID: ${admin.libraryId}`);
    } else {
      console.log('❌ Admin not found');
    }

    // Test Regular User login
    console.log('\n🧪 Testing Regular User login...');
    const user = await User.findOne({ email: 'alice@user.com' });
    if (user) {
      const isValidPassword = await user.comparePassword('user123');
      console.log(`User found: ${user.name}`);
      console.log(`Password valid: ${isValidPassword}`);
      console.log(`Role: ${user.role}`);
    } else {
      console.log('❌ User not found');
    }

    await mongoose.connection.close();
    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testLogin();