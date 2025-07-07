const mongoose = require('mongoose');
const Offer = require('./models/Offer');
const User = require('./models/User');
const Library = require('./models/Library');
require('dotenv').config();

async function createAdminOffers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Get some admins and libraries
    const admins = await User.find({ role: 'admin' }).limit(3);
    const libraries = await Library.find().limit(3);
    
    console.log(`Found ${admins.length} admins and ${libraries.length} libraries`);

    // Create admin-specific offers
    const adminOffers = [
      {
        title: 'Central Library Special',
        description: '20% discount for Central Library bookings',
        discount: 20,
        code: 'CENTRAL20',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 50,
        usedCount: 8,
        createdBy: admins[0]?._id,
        libraryId: libraries[0]?._id,
        type: 'library-specific'
      },
      {
        title: 'Student Hours Discount',
        description: '15% off during student hours',
        discount: 15,
        code: 'STUDENT15',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 100,
        usedCount: 25,
        createdBy: admins[1]?._id,
        libraryId: libraries[1]?._id,
        type: 'library-specific'
      },
      {
        title: 'Weekend Reading Special',
        description: '10% discount for weekend bookings',
        discount: 10,
        code: 'WEEKEND10',
        validUntil: new Date('2024-12-31'),
        isActive: false,
        usageLimit: 75,
        usedCount: 12,
        createdBy: admins[2]?._id,
        libraryId: libraries[2]?._id,
        type: 'library-specific'
      }
    ];

    // Insert admin offers
    for (const offer of adminOffers) {
      if (offer.createdBy && offer.libraryId) {
        await Offer.create(offer);
        console.log(`✅ Created admin offer: ${offer.title}`);
      }
    }

    console.log('\n📋 All Offers in Database:');
    const allOffers = await Offer.find()
      .populate('createdBy', 'name email')
      .populate('libraryId', 'name city');
    
    allOffers.forEach(offer => {
      console.log(`- ${offer.title} (${offer.code})`);
      console.log(`  Created by: ${offer.createdBy?.name || 'System'}`);
      console.log(`  Library: ${offer.libraryId?.name || 'All Libraries'}`);
      console.log(`  Type: ${offer.type || 'global'}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAdminOffers();