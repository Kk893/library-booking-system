const mongoose = require('mongoose');
const Offer = require('./models/Offer');
require('dotenv').config();

async function createSampleOffers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Clear existing offers
    await Offer.deleteMany({});
    console.log('Cleared existing offers');

    // Sample offers data
    const offers = [
      {
        title: 'Welcome Offer',
        description: 'Get 30% off on your first booking',
        discount: 30,
        code: 'WELCOME30',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 100,
        usedCount: 15
      },
      {
        title: 'Student Discount',
        description: 'Special 25% discount for students',
        discount: 25,
        code: 'STUDENT25',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 200,
        usedCount: 45
      },
      {
        title: 'Weekend Special',
        description: '20% off on weekend bookings',
        discount: 20,
        code: 'WEEKEND20',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 150,
        usedCount: 32
      },
      {
        title: 'Early Bird',
        description: '15% discount for morning slots',
        discount: 15,
        code: 'EARLY15',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 80,
        usedCount: 12
      },
      {
        title: 'Loyalty Reward',
        description: '35% off for loyal customers',
        discount: 35,
        code: 'LOYAL35',
        validUntil: new Date('2024-12-31'),
        isActive: false,
        usageLimit: 50,
        usedCount: 8
      },
      {
        title: 'Flash Sale',
        description: '40% off limited time offer',
        discount: 40,
        code: 'FLASH40',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        usageLimit: 30,
        usedCount: 25
      }
    ];

    // Insert offers
    await Offer.insertMany(offers);
    console.log(`✅ Created ${offers.length} sample offers`);

    // Display created offers
    const createdOffers = await Offer.find();
    console.log('\n📋 Created Offers:');
    createdOffers.forEach(offer => {
      console.log(`- ${offer.title} (${offer.code}) - ${offer.discount}% OFF - ${offer.isActive ? 'Active' : 'Inactive'}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error creating sample offers:', error);
  }
}

createSampleOffers();