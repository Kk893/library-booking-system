const mongoose = require('mongoose');
const User = require('../models/User');
const Library = require('../models/Library');
require('dotenv').config();

const seedAdminUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create Super Admin
    const superAdmin = await User.findOne({ email: 'super@admin.com' });
    if (!superAdmin) {
      await User.create({
        name: 'Super Administrator',
        email: 'super@admin.com',
        phone: '+1234567890',
        password: 'super123',
        role: 'superadmin',
        isVerified: true
      });
      console.log('Super Admin created');
    }

    // Create sample library
    let library = await Library.findOne({ name: 'Central Library' });
    if (!library) {
      library = await Library.create({
        name: 'Central Library',
        city: 'Mumbai',
        area: 'Bandra',
        address: '123 Library Street, Bandra, Mumbai - 400050',
        phone: '+91-9876543210',
        email: 'central@library.com',
        openingHours: {
          open: '08:00',
          close: '22:00'
        },
        facilities: ['WiFi', 'AC', 'Parking', 'Cafeteria'],
        seatLayout: {
          regular: { count: 50, price: 100 },
          ac: { count: 30, price: 150 },
          premium: { count: 20, price: 200 }
        },
        timeSlots: [
          { name: 'Morning', startTime: '08:00', endTime: '12:00', isActive: true },
          { name: 'Afternoon', startTime: '12:00', endTime: '16:00', isActive: true },
          { name: 'Evening', startTime: '16:00', endTime: '20:00', isActive: true },
          { name: 'Night', startTime: '20:00', endTime: '22:00', isActive: true }
        ]
      });
      console.log('Sample library created');
    }

    // Create Library Admin
    const libraryAdmin = await User.findOne({ email: 'admin@library.com' });
    if (!libraryAdmin) {
      const admin = await User.create({
        name: 'Library Administrator',
        email: 'admin@library.com',
        phone: '+1234567891',
        password: 'admin123',
        role: 'admin',
        isVerified: true,
        libraryId: library._id
      });

      // Assign admin to library
      library.adminId = admin._id;
      await library.save();
      console.log('Library Admin created and assigned');
    }

    console.log('Admin seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin users:', error);
    process.exit(1);
  }
};

seedAdminUsers();