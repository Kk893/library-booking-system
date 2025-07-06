const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Book = require('./backend/models/Book');
const Offer = require('./backend/models/Offer');
const User = require('./backend/models/User');

async function createSampleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Create sample books
    const sampleBooks = [
      {
        title: 'JavaScript: The Good Parts',
        author: 'Douglas Crockford',
        genre: 'Programming',
        totalCopies: 5,
        availableCopies: 5,
        isActive: true,
        language: 'English'
      },
      {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        genre: 'Programming',
        totalCopies: 3,
        availableCopies: 2,
        isActive: true,
        language: 'English'
      },
      {
        title: 'The Pragmatic Programmer',
        author: 'David Thomas',
        genre: 'Programming',
        totalCopies: 4,
        availableCopies: 4,
        isActive: true,
        language: 'English'
      }
    ];

    // Create sample offers
    const sampleOffers = [
      {
        title: 'New User Discount',
        discount: 25,
        code: 'NEWUSER25',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        description: 'Special discount for new users'
      },
      {
        title: 'Student Special',
        discount: 15,
        code: 'STUDENT15',
        validUntil: new Date('2024-12-31'),
        isActive: true,
        description: 'Discount for students'
      }
    ];

    // Clear existing data
    await Book.deleteMany({});
    await Offer.deleteMany({});
    console.log('Cleared existing data');

    // Insert sample data
    await Book.insertMany(sampleBooks);
    await Offer.insertMany(sampleOffers);
    
    console.log('Sample data created successfully!');
    console.log(`Created ${sampleBooks.length} books`);
    console.log(`Created ${sampleOffers.length} offers`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error creating sample data:', error);
    process.exit(1);
  }
}

createSampleData();