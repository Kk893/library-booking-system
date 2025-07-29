const express = require('express');
const Library = require('../models/Library');
const Book = require('../models/Book');

const router = express.Router();

// Get nearby libraries (must be before /:id route)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 25, city } = req.query;
    
    let query = { isActive: { $ne: false } };
    
    // If city is provided, filter by city
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    
    const Rating = require('../models/Rating');
    const libraries = await Library.find(query)
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });
    
    // Calculate distance if coordinates provided
    let librariesWithDistance = libraries;
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      
      librariesWithDistance = libraries.map(lib => {
        let distance = 0;
        if (lib.coordinates && lib.coordinates.lat && lib.coordinates.lng) {
          // Calculate distance using Haversine formula
          const R = 6371; // Earth's radius in km
          const dLat = (lib.coordinates.lat - userLat) * Math.PI / 180;
          const dLng = (lib.coordinates.lng - userLng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(userLat * Math.PI / 180) * Math.cos(lib.coordinates.lat * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = R * c;
        } else {
          // Fallback: random distance for demo
          distance = Math.random() * 20 + 1;
        }
        
        return {
          ...lib.toObject(),
          distance: Math.round(distance * 10) / 10
        };
      });
      
      // Filter by radius and sort by distance
      librariesWithDistance = librariesWithDistance
        .filter(lib => lib.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }
    
    // Add rating data
    const librariesWithRatings = await Promise.all(
      librariesWithDistance.map(async (library) => {
        const ratings = await Rating.find({ libraryId: library._id, isActive: true });
        const avgRating = ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
          : 0;
        
        return {
          ...library,
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
      query.city = { $regex: city, $options: 'i' };
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



// Update library images
router.put('/:id/images', async (req, res) => {
  try {
    const { images } = req.body;
    
    const library = await Library.findByIdAndUpdate(
      req.params.id,
      { images },
      { new: true }
    );
    
    if (!library) {
      return res.status(404).json({ message: 'Library not found' });
    }
    
    res.json({ 
      success: true,
      message: 'Library images updated successfully',
      library 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;