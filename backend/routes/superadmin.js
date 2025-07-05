const express = require('express');
const User = require('../models/User');
const Library = require('../models/Library');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware to check super admin role
const superAdminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Super admin only.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard stats
router.get('/stats', auth, superAdminAuth, async (req, res) => {
  try {
    const totalLibraries = await Library.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      totalLibraries,
      totalUsers,
      totalBookings,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all libraries
router.get('/libraries', auth, superAdminAuth, async (req, res) => {
  try {
    const libraries = await Library.find().sort({ createdAt: -1 });
    res.json(libraries);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new library
router.post('/libraries', auth, superAdminAuth, async (req, res) => {
  try {
    const library = new Library(req.body);
    await library.save();
    res.status(201).json(library);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update library
router.put('/libraries/:id', auth, superAdminAuth, async (req, res) => {
  try {
    const library = await Library.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(library);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete library
router.delete('/libraries/:id', auth, superAdminAuth, async (req, res) => {
  try {
    await Library.findByIdAndDelete(req.params.id);
    res.json({ message: 'Library deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all admins
router.get('/admins', auth, superAdminAuth, async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
                            .select('-password')
                            .sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new admin
router.post('/admins', auth, superAdminAuth, async (req, res) => {
  try {
    const { name, email, password, role = 'admin' } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const admin = new User({ name, email, password, role });
    await admin.save();
    
    const { password: _, ...adminData } = admin.toObject();
    res.status(201).json(adminData);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete admin
router.delete('/admins/:id', auth, superAdminAuth, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (admin.role === 'superadmin' && admin._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', auth, superAdminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
                           .select('-password')
                           .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;