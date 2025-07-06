const mongoose = require('mongoose');
const Book = require('../models/Book');
const Library = require('../models/Library');
require('dotenv').config();

const createTestBooks = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get first library
    const library = await Library.findOne();
    if (!library) {
      console.log('No library found. Please create a library first.');
      return;
    }

    // Delete existing books
    await Book.deleteMany({});

    const testBooks = [
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        genre: 'Fiction',
        language: 'English',
        synopsis: 'A classic American novel set in the Jazz Age.',
        totalCopies: 5,
        availableCopies: 3,
        libraryId: library._id
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '9780061120084',
        genre: 'Fiction',
        language: 'English',
        synopsis: 'A story of racial injustice and childhood innocence.',
        totalCopies: 4,
        availableCopies: 2,
        libraryId: library._id
      },
      {
        title: '1984',
        author: 'George Orwell',
        isbn: '9780451524935',
        genre: 'Dystopian Fiction',
        language: 'English',
        synopsis: 'A dystopian social science fiction novel.',
        totalCopies: 6,
        availableCopies: 4,
        libraryId: library._id
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        isbn: '9780141439518',
        genre: 'Romance',
        language: 'English',
        synopsis: 'A romantic novel of manners.',
        totalCopies: 3,
        availableCopies: 1,
        libraryId: library._id
      },
      {
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        isbn: '9780316769174',
        genre: 'Fiction',
        language: 'English',
        synopsis: 'A controversial novel about teenage rebellion.',
        totalCopies: 4,
        availableCopies: 3,
        libraryId: library._id
      }
    ];

    await Book.insertMany(testBooks);
    console.log('Test books created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test books:', error);
    process.exit(1);
  }
};

createTestBooks();