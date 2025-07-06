const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Library = require('./models/Library');
const Book = require('./models/Book');
const Offer = require('./models/Offer');
const Booking = require('./models/Booking');

async function clearAndSeedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Clear all existing data
    await Promise.all([
      User.deleteMany({}),
      Library.deleteMany({}),
      Book.deleteMany({}),
      Offer.deleteMany({}),
      Booking.deleteMany({})
    ]);
    console.log('✅ All existing data cleared');

    // Create Super Admin
    const superAdmin = new User({
      name: 'Super Admin',
      email: 'super@admin.com',
      phone: '+91-9999999999',
      password: 'super123',
      role: 'superadmin',
      isVerified: true
    });
    await superAdmin.save();
    console.log('✅ Super Admin created');

    // Create Libraries
    const libraries = [
      {
        name: 'Central City Library',
        address: '123 Main Street, Downtown',
        city: 'Mumbai',
        area: 'Bandra',
        pincode: '400050',
        phone: '+91-9876543210',
        email: 'central@library.com',
        openingHours: { open: '08:00', close: '22:00' },
        facilities: ['WiFi', 'AC', 'Parking', 'Cafeteria'],
        seatLayout: {
          regular: { count: 50, price: 100 },
          ac: { count: 30, price: 150 },
          premium: { count: 20, price: 200 }
        },
        isActive: true
      },
      {
        name: 'Tech Hub Library',
        address: '456 IT Park, Sector 5',
        city: 'Pune',
        area: 'Hinjewadi',
        pincode: '411057',
        phone: '+91-9876543211',
        email: 'tech@library.com',
        openingHours: { open: '09:00', close: '21:00' },
        facilities: ['WiFi', 'AC', 'Lockers', 'Printer'],
        seatLayout: {
          regular: { count: 40, price: 80 },
          ac: { count: 25, price: 120 },
          premium: { count: 15, price: 180 }
        },
        isActive: true
      },
      {
        name: 'Study Corner',
        address: '789 College Road',
        city: 'Delhi',
        area: 'Connaught Place',
        pincode: '110001',
        phone: '+91-9876543212',
        email: 'study@library.com',
        openingHours: { open: '07:00', close: '23:00' },
        facilities: ['WiFi', 'Parking', 'Cafeteria'],
        seatLayout: {
          regular: { count: 60, price: 90 },
          ac: { count: 35, price: 140 },
          premium: { count: 25, price: 190 }
        },
        isActive: true
      }
    ];

    const savedLibraries = await Library.insertMany(libraries);
    console.log(`✅ Created ${savedLibraries.length} libraries`);

    // Create Library Admins
    const admins = [
      {
        name: 'John Admin',
        email: 'john@admin.com',
        phone: '+91-9876543220',
        password: 'admin123',
        role: 'admin',
        isVerified: true,
        libraryId: savedLibraries[0]._id
      },
      {
        name: 'Jane Admin',
        email: 'jane@admin.com',
        phone: '+91-9876543221',
        password: 'admin123',
        role: 'admin',
        isVerified: true,
        libraryId: savedLibraries[1]._id
      }
    ];

    const savedAdmins = [];
    for (const adminData of admins) {
      const admin = new User(adminData);
      await admin.save();
      savedAdmins.push(admin);
    }
    console.log(`✅ Created ${savedAdmins.length} library admins`);

    // Assign admins to libraries
    await Library.findByIdAndUpdate(savedLibraries[0]._id, { adminId: savedAdmins[0]._id });
    await Library.findByIdAndUpdate(savedLibraries[1]._id, { adminId: savedAdmins[1]._id });
    console.log('✅ Assigned admins to libraries');

    // Create Regular Users
    const users = [
      {
        name: 'Alice Johnson',
        email: 'alice@user.com',
        phone: '+91-9876543230',
        password: 'user123',
        role: 'user',
        isVerified: true
      },
      {
        name: 'Bob Smith',
        email: 'bob@user.com',
        phone: '+91-9876543231',
        password: 'user123',
        role: 'user',
        isVerified: true
      },
      {
        name: 'Carol Davis',
        email: 'carol@user.com',
        phone: '+91-9876543232',
        password: 'user123',
        role: 'user',
        isVerified: true
      },
      {
        name: 'David Wilson',
        email: 'david@user.com',
        phone: '+91-9876543233',
        password: 'user123',
        role: 'user',
        isVerified: true
      },
      {
        name: 'Emma Brown',
        email: 'emma@user.com',
        phone: '+91-9876543234',
        password: 'user123',
        role: 'user',
        isVerified: true
      }
    ];

    const savedUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      savedUsers.push(user);
    }
    console.log(`✅ Created ${savedUsers.length} regular users`);

    // Create Books
    const books = [
      {
        title: 'JavaScript: The Definitive Guide',
        author: 'David Flanagan',
        genre: 'Programming',
        isbn: '978-1491952023',
        language: 'English',
        synopsis: 'Master the world\'s most-used programming language',
        totalCopies: 10,
        availableCopies: 8,
        libraryId: savedLibraries[0]._id,
        isActive: true
      },
      {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        genre: 'Programming',
        isbn: '978-0132350884',
        language: 'English',
        synopsis: 'A handbook of agile software craftsmanship',
        totalCopies: 8,
        availableCopies: 6,
        libraryId: savedLibraries[0]._id,
        isActive: true
      },
      {
        title: 'The Pragmatic Programmer',
        author: 'David Thomas',
        genre: 'Programming',
        isbn: '978-0201616224',
        language: 'English',
        synopsis: 'Your journey to mastery',
        totalCopies: 6,
        availableCopies: 5,
        libraryId: savedLibraries[1]._id,
        isActive: true
      },
      {
        title: 'Design Patterns',
        author: 'Gang of Four',
        genre: 'Programming',
        isbn: '978-0201633610',
        language: 'English',
        synopsis: 'Elements of reusable object-oriented software',
        totalCopies: 5,
        availableCopies: 4,
        libraryId: savedLibraries[1]._id,
        isActive: true
      },
      {
        title: 'System Design Interview',
        author: 'Alex Xu',
        genre: 'Technology',
        isbn: '978-1736049112',
        language: 'English',
        synopsis: 'An insider\'s guide',
        totalCopies: 7,
        availableCopies: 6,
        libraryId: savedLibraries[2]._id,
        isActive: true
      },
      {
        title: 'Atomic Habits',
        author: 'James Clear',
        genre: 'Self-Help',
        isbn: '978-0735211292',
        language: 'English',
        synopsis: 'An easy & proven way to build good habits',
        totalCopies: 12,
        availableCopies: 10,
        libraryId: savedLibraries[2]._id,
        isActive: true
      }
    ];

    const savedBooks = await Book.insertMany(books);
    console.log(`✅ Created ${savedBooks.length} books`);

    // Create Offers
    const offers = [
      {
        title: 'New User Welcome',
        discount: 30,
        code: 'WELCOME30',
        validUntil: new Date('2024-12-31'),
        description: 'Special discount for new users',
        isActive: true,
        usageLimit: 100,
        usedCount: 15
      },
      {
        title: 'Student Discount',
        discount: 20,
        code: 'STUDENT20',
        validUntil: new Date('2024-12-31'),
        description: 'Discount for students with valid ID',
        isActive: true,
        usageLimit: 200,
        usedCount: 45
      },
      {
        title: 'Weekend Special',
        discount: 25,
        code: 'WEEKEND25',
        validUntil: new Date('2024-06-30'),
        description: 'Weekend booking special offer',
        isActive: false,
        usageLimit: 50,
        usedCount: 50
      },
      {
        title: 'Early Bird',
        discount: 15,
        code: 'EARLY15',
        validUntil: new Date('2024-12-31'),
        description: 'Book before 9 AM and save',
        isActive: true,
        usageLimit: 75,
        usedCount: 22
      }
    ];

    const savedOffers = await Offer.insertMany(offers);
    console.log(`✅ Created ${savedOffers.length} offers`);

    // Create Bookings
    const bookings = [
      {
        userId: savedUsers[0]._id,
        libraryId: savedLibraries[0]._id,
        type: 'seat',
        seatNumber: 'A-15',
        date: new Date(),
        timeSlot: '09:00-17:00',
        amount: 150,
        status: 'confirmed',
        paymentId: 'pay_' + Date.now()
      },
      {
        userId: savedUsers[1]._id,
        libraryId: savedLibraries[1]._id,
        type: 'seat',
        seatNumber: 'B-08',
        date: new Date(),
        timeSlot: '10:00-18:00',
        amount: 120,
        status: 'confirmed',
        paymentId: 'pay_' + (Date.now() + 1)
      },
      {
        userId: savedUsers[2]._id,
        libraryId: savedLibraries[0]._id,
        bookId: savedBooks[0]._id,
        type: 'book',
        date: new Date(Date.now() - 86400000),
        amount: 0,
        status: 'confirmed'
      },
      {
        userId: savedUsers[3]._id,
        libraryId: savedLibraries[2]._id,
        type: 'seat',
        seatNumber: 'C-12',
        date: new Date(),
        timeSlot: '14:00-22:00',
        amount: 190,
        status: 'pending'
      },
      {
        userId: savedUsers[4]._id,
        libraryId: savedLibraries[1]._id,
        bookId: savedBooks[2]._id,
        type: 'book',
        date: new Date(Date.now() - 172800000),
        amount: 0,
        status: 'confirmed'
      }
    ];

    const savedBookings = await Booking.insertMany(bookings);
    console.log(`✅ Created ${savedBookings.length} bookings`);

    console.log('\n🎉 Complete test data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- 1 Super Admin (super@admin.com / super123)`);
    console.log(`- 2 Library Admins (john@admin.com, jane@admin.com / admin123)`);
    console.log(`- 5 Regular Users`);
    console.log(`- 3 Libraries (2 with admins, 1 unassigned)`);
    console.log(`- 6 Books across all libraries`);
    console.log(`- 4 Offers (3 active, 1 expired)`);
    console.log(`- 5 Bookings (4 confirmed, 1 pending)`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

clearAndSeedData();