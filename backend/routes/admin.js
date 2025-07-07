const express = require('express');
const Library = require('../models/Library');
const Book = require('../models/Book');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Offer = require('../models/Offer');
const { auth, adminAuth, superAdminAuth } = require('../middleware/auth');

const router = express.Router();

// Library Admin Routes
router.get('/library/dashboard', auth, adminAuth, async (req, res) => {
  try {
    const libraryId = req.user.libraryId;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = {
      totalBookings: await Booking.countDocuments({ libraryId }),
      todayBookings: await Booking.countDocuments({ 
        libraryId, 
        createdAt: { $gte: today } 
      }),
      totalRevenue: await Booking.aggregate([
        { $match: { libraryId: libraryId, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      totalBooks: await Book.countDocuments({ libraryId, isActive: true })
    };

    const recentBookings = await Booking.find({ 
      libraryId: libraryId,
      $or: [
        { type: 'seat' },
        { type: 'book', bookId: { $exists: true } }
      ]
    })
      .populate('userId', 'name email')
      .populate('bookId', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ stats, recentBookings, libraryId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get books
router.get('/books', auth, adminAuth, async (req, res) => {
  try {
    const books = await Book.find({ isActive: true });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add book
router.post('/books', auth, adminAuth, async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.status(201).json(book);
  } catch (error) {
    console.error('Book creation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Book with this ISBN already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update book
router.put('/books/:id', auth, adminAuth, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete book
router.delete('/books/:id', auth, adminAuth, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update seat configuration
router.put('/libraries/:id/seats', auth, adminAuth, async (req, res) => {
  try {
    const { seatLayout } = req.body;
    const library = await Library.findOneAndUpdate(
      { _id: req.params.id, adminId: req.user._id },
      { seatLayout },
      { new: true }
    );
    if (!library) {
      return res.status(404).json({ message: 'Library not found or access denied' });
    }
    res.json({ message: 'Seat configuration updated successfully', library });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Super Admin Routes
router.get('/superadmin/dashboard', auth, superAdminAuth, async (req, res) => {
  try {
    const stats = {
      totalLibraries: await Library.countDocuments({ isActive: true }),
      totalUsers: await User.countDocuments({ role: 'user' }),
      totalBookings: await Booking.countDocuments(),
      totalRevenue: await Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    };

    const libraries = await Library.find({ isActive: true })
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ stats, libraries });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Library
router.post('/libraries', auth, superAdminAuth, async (req, res) => {
  try {
    const libraryData = {
      ...req.body,
      phone: req.body.phone || '+91-0000000000' // Default phone if not provided
    };
    const library = new Library(libraryData);
    await library.save();
    res.status(201).json(library);
  } catch (error) {
    console.error('Library creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Library
router.put('/libraries/:id', auth, superAdminAuth, async (req, res) => {
  try {
    const { adminId } = req.body;
    
    // If assigning admin, update both library and admin
    if (adminId) {
      // Remove admin from previous library
      await Library.updateMany({ adminId }, { $unset: { adminId: 1 } });
      
      // Update admin's libraryId
      await User.findByIdAndUpdate(adminId, { libraryId: req.params.id });
    }
    
    const library = await Library.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('adminId', 'name email');
    
    if (!library) {
      return res.status(404).json({ message: 'Library not found' });
    }
    
    res.json(library);
  } catch (error) {
    console.error('Library update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new library admin (only super admin can do this)
router.post('/create-admin', auth, superAdminAuth, async (req, res) => {
  try {
    const { name, email, phone, password, libraryId } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    const existingUser = await User.findOne({ $or: [{ email }, ...(phone ? [{ phone }] : [])] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or phone' });
    }

    const admin = new User({
      name,
      email,
      phone: phone || `+91-${Date.now()}`, // Generate default phone if not provided
      password,
      role: 'admin',
      isVerified: true,
      libraryId: libraryId || null
    });
    await admin.save();

    if (libraryId) {
      await Library.findByIdAndUpdate(libraryId, { adminId: admin._id });
    }

    res.status(201).json({ 
      message: 'Library admin created successfully', 
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        libraryId: admin.libraryId
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or phone already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assign admin to library
router.patch('/libraries/:id/assign-admin', auth, superAdminAuth, async (req, res) => {
  try {
    const { adminId } = req.body;
    
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(400).json({ message: 'Invalid admin user' });
    }

    const library = await Library.findByIdAndUpdate(
      req.params.id,
      { adminId },
      { new: true }
    );

    admin.libraryId = library._id;
    await admin.save();

    res.json({ message: 'Admin assigned successfully', library });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all admins (for super admin)
router.get('/admins', auth, superAdminAuth, async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
      .populate('libraryId', 'name city area')
      .select('-password')
      .sort({ role: 1, name: 1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove admin (for super admin)
router.delete('/admins/:id', auth, superAdminAuth, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Remove admin reference from library
    if (admin.libraryId) {
      await Library.findByIdAndUpdate(admin.libraryId, { $unset: { adminId: 1 } });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users (for super admin)
router.get('/users', auth, superAdminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('libraryId', 'name city')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all libraries with admin info (for super admin)
router.get('/libraries', auth, superAdminAuth, async (req, res) => {
  try {
    const libraries = await Library.find()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });
    res.json(libraries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get library users
router.get('/library-users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Offer Management Routes (only admin's own offers)
router.get('/admin-offers', auth, adminAuth, async (req, res) => {
  try {
    const offers = await Offer.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/admin-offers', auth, adminAuth, async (req, res) => {
  try {
    const offer = new Offer({
      ...req.body,
      createdBy: req.user._id,
      createdByRole: 'admin'
    });
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Offer code already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/admin-offers/:id', auth, adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true }
    );
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found or access denied' });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/admin-offers/:id', auth, adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found or access denied' });
    }
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SuperAdmin Offer Management Routes (all offers)
router.get('/offers', auth, superAdminAuth, async (req, res) => {
  try {
    const offers = await Offer.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/offers', auth, adminAuth, async (req, res) => {
  try {
    const offer = new Offer(req.body);
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Offer code already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/offers/:id', auth, adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/offers/:id', auth, adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;