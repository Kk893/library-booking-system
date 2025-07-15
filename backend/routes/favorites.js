const express = require('express');
const Favorite = require('../models/Favorite');
const Book = require('../models/Book');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user's favorite books
router.get('/my-favorites', auth, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user._id })
      .populate({
        path: 'bookId',
        match: { isActive: true },
        populate: { path: 'libraryId', select: 'name city area' }
      })
      .populate('libraryId', 'name city area')
      .sort({ createdAt: -1 });

    // Filter out favorites where book or library doesn't exist
    const validFavorites = favorites.filter(fav => fav.bookId && fav.libraryId);
    
    res.json(validFavorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add book to favorites
router.post('/add/:bookId', auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const existingFavorite = await Favorite.findOne({
      userId: req.user._id,
      bookId: req.params.bookId
    });

    if (existingFavorite) {
      return res.status(200).json({ message: 'Book already in favorites', favorite: existingFavorite });
    }

    const favorite = new Favorite({
      userId: req.user._id,
      bookId: req.params.bookId,
      libraryId: book.libraryId
    });

    await favorite.save();
    res.status(201).json({ message: 'Book added to favorites', favorite });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - book already in favorites
      return res.status(200).json({ message: 'Book already in favorites' });
    }
    console.error('Add favorite error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove book from favorites
router.delete('/remove/:bookId', auth, async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndDelete({
      userId: req.user._id,
      bookId: req.params.bookId
    });

    if (!favorite) {
      return res.status(200).json({ message: 'Book not in favorites' });
    }

    res.json({ message: 'Book removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if book is favorite
router.get('/check/:bookId', auth, async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      userId: req.user._id,
      bookId: req.params.bookId
    });

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;