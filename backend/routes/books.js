const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const { auth } = require('../middleware/auth');

// Get all books
router.get('/', async (req, res) => {
  try {
    const books = await Book.find().populate('libraryId', 'name');
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get books by library
router.get('/library/:libraryId', async (req, res) => {
  try {
    const books = await Book.find({ libraryId: req.params.libraryId });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new book (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;