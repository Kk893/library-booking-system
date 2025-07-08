const express = require('express');
const Rating = require('../models/Rating');
const Library = require('../models/Library');
const { auth, adminAuth, superAdminAuth } = require('../middleware/auth');

const router = express.Router();

// Get ratings for a library (public)
router.get('/library/:libraryId', async (req, res) => {
  try {
    const ratings = await Rating.find({ 
      libraryId: req.params.libraryId, 
      isActive: true 
    })
    .populate('userId', 'name')
    .sort({ createdAt: -1 });

    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;

    res.json({
      ratings,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add/Update rating (users only)
router.post('/library/:libraryId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can rate libraries' });
    }

    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const existingRating = await Rating.findOne({
      userId: req.user._id,
      libraryId: req.params.libraryId
    });

    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review || '';
      await existingRating.save();
      res.json({ message: 'Rating updated successfully', rating: existingRating });
    } else {
      const newRating = new Rating({
        userId: req.user._id,
        libraryId: req.params.libraryId,
        rating,
        review: review || ''
      });
      await newRating.save();
      res.status(201).json({ message: 'Rating added successfully', rating: newRating });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's rating for a library
router.get('/user/:libraryId', auth, async (req, res) => {
  try {
    const rating = await Rating.findOne({
      userId: req.user._id,
      libraryId: req.params.libraryId
    });
    res.json(rating);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Get all ratings for their library
router.get('/admin/library/:libraryId', auth, adminAuth, async (req, res) => {
  try {
    const ratings = await Rating.find({ libraryId: req.params.libraryId })
      .populate('userId', 'name email')
      .populate('moderatedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Moderate rating (hide/show)
router.put('/admin/moderate/:ratingId', auth, adminAuth, async (req, res) => {
  try {
    const { isActive, moderationNote } = req.body;
    
    const rating = await Rating.findById(req.params.ratingId);
    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    // Admin can only moderate ratings for their library
    if (req.user.role === 'admin') {
      const library = await Library.findById(rating.libraryId);
      if (!library || library.adminId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Can only moderate ratings for your library' });
      }
    }

    rating.isActive = isActive;
    rating.moderatedBy = req.user._id;
    rating.moderationNote = moderationNote || '';
    await rating.save();

    res.json({ message: 'Rating moderated successfully', rating });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SuperAdmin: Get all ratings
router.get('/superadmin/all', auth, superAdminAuth, async (req, res) => {
  try {
    const ratings = await Rating.find()
      .populate('userId', 'name email')
      .populate('libraryId', 'name city')
      .populate('moderatedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SuperAdmin: Delete rating
router.delete('/superadmin/:ratingId', auth, superAdminAuth, async (req, res) => {
  try {
    await Rating.findByIdAndDelete(req.params.ratingId);
    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;