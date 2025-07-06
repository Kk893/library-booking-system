const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

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
    console.log('Adding book:', req.body);
    const book = new Book(req.body);
    await book.save();
    res.status(201).json(book);
  } catch (error) {
    console.error('Book creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;