const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Library = require('../models/Library');
const Book = require('../models/Book');
const { auth, userAuth } = require('../middleware/auth');
const { canManageUser, preventPrivilegeEscalation, logPrivilegeAction } = require('../middleware/rbac');

// Multer configuration for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
router.put('/profile', ...userAuth, preventPrivilegeEscalation, logPrivilegeAction('update_profile'), async (req, res) => {
  try {
    const { name, phone, address, city, role } = req.body;
    
    // Users cannot change their role
    if (role && role !== req.user.role) {
      return res.status(403).json({ message: 'Cannot change user role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, address, city, lastModifiedBy: req.user._id },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin/SuperAdmin can update any user (with privilege checks)
router.put('/users/:userId', auth, canManageUser, preventPrivilegeEscalation, logPrivilegeAction('admin_update_user'), async (req, res) => {
  try {
    const { name, phone, address, city, role, isActive } = req.body;
    const targetUserId = req.params.userId;
    
    const updateData = { name, phone, address, city, lastModifiedBy: req.user._id };
    
    // Only allow role changes if user has sufficient privileges
    if (role) {
      updateData.role = role;
    }
    
    // Only admins+ can deactivate users
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    const user = await User.findByIdAndUpdate(
      targetUserId,
      updateData,
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
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

// Upload profile image
router.post('/profile/image', auth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      
      // Update user profile with new image URL
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { profileImage: imageUrl },
        { new: true }
      ).select('-password');

      res.json({ 
        message: 'Profile image updated successfully',
        imageUrl,
        user 
      });
    } catch (error) {
      console.error('Profile image upload error:', error);
      // Delete uploaded file if database update fails
      if (req.file) {
        const filePath = path.join(__dirname, '../uploads/profiles', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
});

module.exports = router;