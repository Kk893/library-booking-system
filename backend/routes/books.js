const express = require('express');
const Book = require('../models/Book');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get books by library with filters
router.get('/library/:libraryId', async (req, res) => {
  try {
    const { genre, author, language, search, available } = req.query;
    let query = { libraryId: req.params.libraryId, isActive: true };
    
    if (genre) query.genre = new RegExp(genre, 'i');
    if (author) query.author = new RegExp(author, 'i');
    if (language) query.language = new RegExp(language, 'i');
    if (available === 'true') query.availableCopies = { $gt: 0 };
    
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { author: new RegExp(search, 'i') },
        { genre: new RegExp(search, 'i') }
      ];
    }

    const books = await Book.find(query).populate('libraryId', 'name city');
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('libraryId', 'name city area address');
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reserve a book
router.post('/:id/reserve', auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'Book not available' });
    }

    // Check if user already has this book reserved/borrowed
    const Booking = require('../models/Booking');
    const existingBooking = await Booking.findOne({
      userId: req.user._id,
      bookId: book._id,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'You already have this book reserved/borrowed' });
    }

    const booking = new Booking({
      userId: req.user._id,
      libraryId: book.libraryId,
      bookId: book._id,
      type: 'book',
      amount: book.borrowPolicy.reservationFee,
      borrowDate: new Date(),
      returnDate: new Date(Date.now() + book.borrowPolicy.maxDays * 24 * 60 * 60 * 1000),
      status: book.borrowPolicy.reservationFee > 0 ? 'pending' : 'confirmed'
    });

    await booking.save();
    
    // Decrease available copies
    book.availableCopies -= 1;
    await book.save();

    res.json({ message: 'Book reserved successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get book filters metadata
router.get('/library/:libraryId/filters', async (req, res) => {
  try {
    const genres = await Book.distinct('genre', { libraryId: req.params.libraryId, isActive: true });
    const authors = await Book.distinct('author', { libraryId: req.params.libraryId, isActive: true });
    const languages = await Book.distinct('language', { libraryId: req.params.libraryId, isActive: true });
    
    res.json({ genres, authors, languages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;