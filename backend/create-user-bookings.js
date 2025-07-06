const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const User = require('./models/User');
const Library = require('./models/Library');
const Book = require('./models/Book');
require('dotenv').config();

async function createUserBookings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Get users, libraries, and books
    const users = await User.find({ role: 'user' });
    const libraries = await Library.find();
    const books = await Book.find();

    if (users.length === 0 || libraries.length === 0) {
      console.log('No users or libraries found');
      return;
    }

    // Create sample bookings for users
    const bookings = [
      {
        userId: users[0]._id,
        libraryId: libraries[0]._id,
        type: 'seat',
        seatNumber: 'A-15',
        date: new Date(),
        timeSlot: '09:00-17:00',
        amount: 150,
        status: 'confirmed',
        paymentId: 'pay_' + Date.now()
      },
      {
        userId: users[0]._id,
        libraryId: libraries[1]._id,
        type: 'seat',
        seatNumber: 'B-08',
        date: new Date(Date.now() + 86400000), // Tomorrow
        timeSlot: '10:00-18:00',
        amount: 120,
        status: 'confirmed',
        paymentId: 'pay_' + (Date.now() + 1)
      },
      {
        userId: users[1]._id,
        libraryId: libraries[0]._id,
        bookId: books.length > 0 ? books[0]._id : null,
        type: 'book',
        date: new Date(Date.now() - 86400000), // Yesterday
        amount: 0,
        status: 'confirmed'
      },
      {
        userId: users[1]._id,
        libraryId: libraries[2]._id,
        type: 'seat',
        seatNumber: 'C-12',
        date: new Date(Date.now() + 172800000), // Day after tomorrow
        timeSlot: '14:00-22:00',
        amount: 190,
        status: 'pending'
      },
      {
        userId: users[2]._id,
        libraryId: libraries[1]._id,
        bookId: books.length > 1 ? books[1]._id : null,
        type: 'book',
        date: new Date(Date.now() - 172800000), // 2 days ago
        amount: 0,
        status: 'confirmed'
      }
    ];

    // Clear existing bookings
    await Booking.deleteMany({});
    console.log('Cleared existing bookings');

    // Insert new bookings
    await Booking.insertMany(bookings);
    console.log(`✅ Created ${bookings.length} user bookings`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error creating user bookings:', error);
  }
}

createUserBookings();