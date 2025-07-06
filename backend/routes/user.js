const express = require('express');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Library = require('../models/Library');
const Book = require('../models/Book');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user bookings
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('libraryId', 'name area city')
      .populate('bookId', 'title author')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new booking
router.post('/bookings', auth, async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      userId: req.user._id
    };
    
    const booking = new Booking(bookingData);
    await booking.save();
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel booking
router.put('/bookings/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }
    
    booking.status = 'cancelled';
    await booking.save();
    
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, address, city } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, address, city },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const totalBookings = await Booking.countDocuments({ userId });
    const activeBookings = await Booking.countDocuments({ 
      userId, 
      status: 'confirmed' 
    });
    
    const totalSpentResult = await Booking.aggregate([
      { $match: { userId: userId, status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].total : 0;
    
    const recentBookings = await Booking.find({ userId })
      .populate('libraryId', 'name area city')
      .populate('bookId', 'title author')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      stats: {
        totalBookings,
        activeBookings,
        totalSpent,
        favoriteLibraries: 0
      },
      recentBookings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;