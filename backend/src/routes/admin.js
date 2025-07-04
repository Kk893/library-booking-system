const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const Library = require('../models/Library');
const Booking = require('../models/Booking');
const User = require('../models/User');

// Middleware to ensure admin access
router.use(authenticateToken, requireAdmin);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [totalLibraries, totalBookings, totalUsers] = await Promise.all([
      Library.countDocuments(),
      Booking.countDocuments(),
      User.countDocuments({ role: 'user' })
    ]);

    // Get revenue statistics
    const bookings = await Booking.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.amount, 0);

    res.json({
      totalLibraries,
      totalBookings,
      totalUsers,
      totalRevenue,
      recentBookings: bookings.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Get all libraries with stats
router.get('/libraries', async (req, res) => {
  try {
    const libraries = await Library.find().select('-__v');
    const librariesWithStats = await Promise.all(
      libraries.map(async (library) => {
        const bookings = await Booking.find({ library: library._id });
        const revenue = bookings.reduce((sum, booking) => sum + booking.amount, 0);
        return {
          ...library.toObject(),
          bookings: bookings.length,
          revenue
        };
      })
    );
    res.json(librariesWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching libraries' });
  }
});

// Get all bookings with details
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('library', 'name address')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Update booking status
router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking status' });
  }
});

// Get all users (excluding admins)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password -validTokens')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Update library
router.patch('/libraries/:id', async (req, res) => {
  try {
    const library = await Library.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(library);
  } catch (error) {
    res.status(500).json({ message: 'Error updating library' });
  }
});

// Delete library
router.delete('/libraries/:id', async (req, res) => {
  try {
    await Library.findByIdAndDelete(req.params.id);
    res.json({ message: 'Library deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting library' });
  }
});

module.exports = router;