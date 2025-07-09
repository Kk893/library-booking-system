const express = require('express');
const Book = require('../models/Book');

const router = express.Router();

// Get books (with optional library filter)
router.get('/', async (req, res) => {
  try {
    const { libraryId, search, genre } = req.query;
    let query = { isActive: true };
    
    if (libraryId) {
      query.libraryId = libraryId;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { genre: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (genre) {
      query.genre = genre;
    }
    
    const books = await Book.find(query)
      .populate('libraryId', 'name area city')
      .sort({ createdAt: -1 });
    
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('libraryId', 'name area city');
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update book cover image
router.put('/:id/image', async (req, res) => {
  try {
    const { coverImage } = req.body;
    
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { coverImage },
      { new: true }
    );
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.json({ 
      success: true,
      message: 'Book cover updated successfully',
      book 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;