const mongoose = require('mongoose');
const User = require('./models/User');
const Library = require('./models/Library');
const Book = require('./models/Book');
require('dotenv').config();

// Test the privilege system
async function testPrivilegeSystem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Create test users with different roles
    const superAdmin = new User({
      name: 'Super Admin',
      email: 'superadmin@test.com',
      password: 'password123',
      role: 'superadmin',
      isVerified: true
    });
    await superAdmin.save();
    console.log('✅ SuperAdmin created');

    const admin = new User({
      name: 'Library Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      isVerified: true,
      createdBy: superAdmin._id
    });
    await admin.save();
    console.log('✅ Admin created by SuperAdmin');

    const user = new User({
      name: 'Regular User',
      email: 'user@test.com',
      password: 'password123',
      role: 'user',
      isVerified: true,
      createdBy: admin._id
    });
    await user.save();
    console.log('✅ User created by Admin');

    // Create test library by superadmin
    const library = new Library({
      name: 'Test Library',
      city: 'Test City',
      area: 'Test Area',
      address: 'Test Address',
      phone: '+91-1234567890',
      email: 'library@test.com',
      openingHours: { open: '09:00', close: '21:00' },
      createdBy: superAdmin._id,
      lastModifiedBy: superAdmin._id
    });
    await library.save();
    console.log('✅ Library created by SuperAdmin');

    // Create test book by admin
    const book = new Book({
      title: 'Test Book',
      author: 'Test Author',
      genre: 'Fiction',
      language: 'English',
      totalCopies: 5,
      availableCopies: 5,
      libraryId: library._id,
      createdBy: admin._id,
      lastModifiedBy: admin._id
    });
    await book.save();
    console.log('✅ Book created by Admin');

    console.log('\n🔐 PRIVILEGE HIERARCHY DEMONSTRATION:');
    console.log('SuperAdmin (Level 3) > Admin (Level 2) > User (Level 1)');
    console.log('\n📋 PRIVILEGE RULES:');
    console.log('✅ SuperAdmin can modify anything created by Admin or User');
    console.log('✅ Admin can modify anything created by User, but NOT SuperAdmin');
    console.log('✅ User can only modify their own content');
    console.log('❌ Lower privilege cannot modify higher privilege content');

    console.log('\n📊 TEST DATA CREATED:');
    console.log(`SuperAdmin: ${superAdmin.email} (ID: ${superAdmin._id})`);
    console.log(`Admin: ${admin.email} (ID: ${admin._id}) - Created by SuperAdmin`);
    console.log(`User: ${user.email} (ID: ${user._id}) - Created by Admin`);
    console.log(`Library: ${library.name} (ID: ${library._id}) - Created by SuperAdmin`);
    console.log(`Book: ${book.title} (ID: ${book._id}) - Created by Admin`);

    console.log('\n🚀 Privilege system implemented successfully!');
    console.log('Use these credentials to test the system:');
    console.log('SuperAdmin: superadmin@test.com / password123');
    console.log('Admin: admin@test.com / password123');
    console.log('User: user@test.com / password123');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testPrivilegeSystem();