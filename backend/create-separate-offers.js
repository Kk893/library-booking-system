const mongoose = require('mongoose');
const Offer = require('./models/Offer');
const User = require('./models/User');
require('dotenv').config();

async function createSeparateOffers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Clear existing offers
    await Offer.deleteMany({});
    console.log('Cleared existing offers');

    // Get admin and superadmin users
    const admin = await User.findOne({ role: 'admin' });
    const superadmin = await User.findOne({ role: 'superadmin' });

    console.log('Admin found:', admin?.name);
    console.log('SuperAdmin found:', superadmin?.name);

    // Create SuperAdmin offers
    const superadminOffers = [
      {
        title: 'Platform Wide Discount',
        description: 'Global 30% discount for all users',
        discount: 30,
        code: 'GLOBAL30',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 1000,
        usedCount: 45,
        createdBy: superadmin?._id,
        createdByRole: 'superadmin'
      },
      {
        title: 'New User Welcome',
        description: 'Welcome offer for new users',
        discount: 25,
        code: 'WELCOME25',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 500,
        usedCount: 120,
        createdBy: superadmin?._id,
        createdByRole: 'superadmin'
      }
    ];

    // Create Admin offers
    const adminOffers = [
      {
        title: 'Library Special Offer',
        description: 'Special discount for library members',
        discount: 20,
        code: 'LIBRARY20',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 100,
        usedCount: 15,
        createdBy: admin?._id,
        createdByRole: 'admin'
      },
      {
        title: 'Student Discount',
        description: 'Discount for students',
        discount: 15,
        code: 'STUDENT15',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 200,
        usedCount: 35,
        createdBy: admin?._id,
        createdByRole: 'admin'
      },
      {
        title: 'Weekend Special',
        description: 'Weekend booking discount',
        discount: 10,
        code: 'WEEKEND10',
        validUntil: new Date('2024-12-31'),
        isActive: false,
        usageLimit: 50,
        usedCount: 8,
        createdBy: admin?._id,
        createdByRole: 'admin'
      }
    ];

    // Insert offers
    if (superadmin) {
      await Offer.insertMany(superadminOffers);
      console.log(`✅ Created ${superadminOffers.length} SuperAdmin offers`);
    }

    if (admin) {
      await Offer.insertMany(adminOffers);
      console.log(`✅ Created ${adminOffers.length} Admin offers`);
    }

    // Display created offers
    const allOffers = await Offer.find().populate('createdBy', 'name role');
    console.log('\n📋 All Offers Created:');
    allOffers.forEach(offer => {
      console.log(`- ${offer.title} (${offer.code}) - Created by: ${offer.createdBy?.name} (${offer.createdByRole})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSeparateOffers();