const mongoose = require('mongoose');
const User = require('../models/User');
const Library = require('../models/Library');
require('dotenv').config();

const seedMoreAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create more libraries
    const libraries = [
      {
        name: 'Tech Library',
        city: 'Delhi',
        area: 'Connaught Place',
        address: '456 Tech Street, CP, Delhi - 110001',
        phone: '+91-9876543211',
        email: 'tech@library.com',
        openingHours: { open: '09:00', close: '21:00' },
        facilities: ['WiFi', 'AC', 'Computer Lab'],
        seatLayout: {
          regular: { count: 40, price: 80 },
          ac: { count: 25, price: 120 },
          premium: { count: 15, price: 180 }
        },
        timeSlots: [
          { name: 'Morning', startTime: '09:00', endTime: '13:00', isActive: true },
          { name: 'Afternoon', startTime: '13:00', endTime: '17:00', isActive: true },
          { name: 'Evening', startTime: '17:00', endTime: '21:00', isActive: true }
        ]
      },
      {
        name: 'City Library',
        city: 'Bangalore',
        area: 'Koramangala',
        address: '789 City Road, Koramangala, Bangalore - 560034',
        phone: '+91-9876543212',
        email: 'city@library.com',
        openingHours: { open: '08:30', close: '22:30' },
        facilities: ['WiFi', 'AC', 'Parking', 'Study Rooms'],
        seatLayout: {
          regular: { count: 60, price: 90 },
          ac: { count: 35, price: 140 },
          premium: { count: 25, price: 190 }
        },
        timeSlots: [
          { name: 'Early Morning', startTime: '08:30', endTime: '12:30', isActive: true },
          { name: 'Afternoon', startTime: '12:30', endTime: '16:30', isActive: true },
          { name: 'Evening', startTime: '16:30', endTime: '20:30', isActive: true },
          { name: 'Night', startTime: '20:30', endTime: '22:30', isActive: true }
        ]
      }
    ];

    // Create libraries
    for (let libData of libraries) {
      const existingLib = await Library.findOne({ name: libData.name });
      if (!existingLib) {
        const library = await Library.create(libData);
        console.log(`${library.name} created`);

        // Create admin for this library
        const adminEmail = libData.email.replace('@library.com', '.admin@library.com');
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (!existingAdmin) {
          const admin = await User.create({
            name: `${libData.name} Admin`,
            email: adminEmail,
            phone: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            password: 'admin123',
            role: 'admin',
            isVerified: true,
            libraryId: library._id
          });

          library.adminId = admin._id;
          await library.save();
          console.log(`Admin created for ${library.name}: ${adminEmail}`);
        }
      }
    }

    console.log('Multiple admins seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding multiple admins:', error);
    process.exit(1);
  }
};

seedMoreAdmins();