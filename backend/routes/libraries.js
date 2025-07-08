const express = require('express');
const Library = require('../models/Library');
const Book = require('../models/Book');

const router = express.Router();

// Get all libraries
router.get('/', async (req, res) => {
  try {
    const { search, city } = req.query;
    let query = { isActive: { $ne: false } };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (city) {
      query.city = city;
    }
    
    const Rating = require('../models/Rating');
    const libraries = await Library.find(query)
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });
    
    // Add rating data to each library
    const librariesWithRatings = await Promise.all(
      libraries.map(async (library) => {
        const ratings = await Rating.find({ libraryId: library._id, isActive: true });
        const avgRating = ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
          : 0;
        
        return {
          ...library.toObject(),
          averageRating: Math.round(avgRating * 10) / 10,
          totalRatings: ratings.length
        };
      })
    );
    
    res.json(librariesWithRatings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single library by ID
router.get('/:id', async (req, res) => {
  try {
    const Rating = require('../models/Rating');
    const library = await Library.findById(req.params.id)
      .populate('adminId', 'name email');
    
    if (!library) {
      return res.status(404).json({ message: 'Library not found' });
    }
    
    // Add rating data
    const ratings = await Rating.find({ libraryId: library._id, isActive: true });
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;
    
    const libraryWithRating = {
      ...library.toObject(),
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length
    };
    
    res.json(libraryWithRating);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get nearby libraries
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 25 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude required' });
    }
    
    // Simple distance calculation (in a real app, use MongoDB geospatial queries)
    const libraries = await Library.find({ isActive: { $ne: false } })
      .populate('adminId', 'name email');
    
    // Add mock distance for demo
    const librariesWithDistance = libraries.map(lib => ({
      ...lib.toObject(),
      distance: (Math.random() * 20 + 1).toFixed(1)
    }));
    
    res.json(librariesWithDistance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;