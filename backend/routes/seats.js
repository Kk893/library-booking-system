const express = require('express');
const Seat = require('../models/Seat');
const Library = require('../models/Library');
const { auth, adminAuth, superAdminAuth } = require('../middleware/auth');

const router = express.Router();

// Get seats for a library (public)
router.get('/library/:libraryId', async (req, res) => {
  try {
    const seats = await Seat.find({ 
      libraryId: req.params.libraryId,
      isActive: true 
    }).sort({ 'position.row': 1, 'position.column': 1 });
    
    res.json(seats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Get all seats for their library
router.get('/admin/library/:libraryId', auth, adminAuth, async (req, res) => {
  try {
    // Check if admin owns this library
    if (req.user.role === 'admin') {
      const library = await Library.findById(req.params.libraryId);
      if (!library || library.adminId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Not your library.' });
      }
    }

    const seats = await Seat.find({ libraryId: req.params.libraryId })
      .populate('blockedBy', 'name')
      .populate('createdBy', 'name')
      .sort({ 'position.row': 1, 'position.column': 1 });
    
    res.json(seats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Create seat
router.post('/admin/library/:libraryId', auth, adminAuth, async (req, res) => {
  try {
    // Check if admin owns this library
    if (req.user.role === 'admin') {
      const library = await Library.findById(req.params.libraryId);
      if (!library || library.adminId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Not your library.' });
      }
    }

    const seat = new Seat({
      ...req.body,
      libraryId: req.params.libraryId,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    });

    await seat.save();
    res.status(201).json(seat);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Seat number already exists in this library' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Update seat
router.put('/admin/:seatId', auth, adminAuth, async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.seatId).populate('libraryId');
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // Check if admin owns this library
    if (req.user.role === 'admin') {
      if (!seat.libraryId.adminId || seat.libraryId.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Not your library.' });
      }
    }

    const updatedSeat = await Seat.findByIdAndUpdate(
      req.params.seatId,
      { ...req.body, lastModifiedBy: req.user._id },
      { new: true }
    );

    res.json(updatedSeat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Block/Unblock seat
router.patch('/admin/:seatId/block', auth, adminAuth, async (req, res) => {
  try {
    const { isBlocked, blockReason } = req.body;
    const seat = await Seat.findById(req.params.seatId).populate('libraryId');
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // Check if admin owns this library
    if (req.user.role === 'admin') {
      if (!seat.libraryId.adminId || seat.libraryId.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Not your library.' });
      }
    }

    seat.isBlocked = isBlocked;
    seat.blockReason = isBlocked ? blockReason : null;
    seat.blockedBy = isBlocked ? req.user._id : null;
    seat.lastModifiedBy = req.user._id;
    
    await seat.save();
    res.json({ message: `Seat ${isBlocked ? 'blocked' : 'unblocked'} successfully`, seat });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Delete seat
router.delete('/admin/:seatId', auth, adminAuth, async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.seatId).populate('libraryId');
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // Check if admin owns this library
    if (req.user.role === 'admin') {
      if (!seat.libraryId.adminId || seat.libraryId.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Not your library.' });
      }
    }

    await Seat.findByIdAndDelete(req.params.seatId);
    res.json({ message: 'Seat deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SuperAdmin: Get all seats across all libraries
router.get('/superadmin/all', auth, superAdminAuth, async (req, res) => {
  try {
    const seats = await Seat.find()
      .populate('libraryId', 'name city')
      .populate('blockedBy', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(seats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SuperAdmin: Bulk operations
router.post('/superadmin/bulk-action', auth, superAdminAuth, async (req, res) => {
  try {
    const { action, seatIds, data } = req.body;
    
    switch (action) {
      case 'block':
        await Seat.updateMany(
          { _id: { $in: seatIds } },
          { 
            isBlocked: true, 
            blockReason: data.reason,
            blockedBy: req.user._id,
            lastModifiedBy: req.user._id
          }
        );
        break;
      
      case 'unblock':
        await Seat.updateMany(
          { _id: { $in: seatIds } },
          { 
            isBlocked: false, 
            blockReason: null,
            blockedBy: null,
            lastModifiedBy: req.user._id
          }
        );
        break;
      
      case 'delete':
        await Seat.deleteMany({ _id: { $in: seatIds } });
        break;
      
      case 'updatePrice':
        await Seat.updateMany(
          { _id: { $in: seatIds } },
          { 
            price: data.price,
            lastModifiedBy: req.user._id
          }
        );
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    
    res.json({ message: `Bulk ${action} completed successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SuperAdmin: Generate seats for library
router.post('/superadmin/generate/:libraryId', auth, superAdminAuth, async (req, res) => {
  try {
    const { rows, columns, seatTypes } = req.body;
    const seats = [];
    
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= columns; col++) {
        const seatType = seatTypes[Math.floor(Math.random() * seatTypes.length)];
        const seatNumber = `${String.fromCharCode(64 + row)}${col}`;
        
        seats.push({
          libraryId: req.params.libraryId,
          seatNumber,
          seatType: seatType.type,
          price: seatType.price,
          position: { row, column: col },
          createdBy: req.user._id,
          lastModifiedBy: req.user._id
        });
      }
    }
    
    await Seat.insertMany(seats);
    res.json({ message: `Generated ${seats.length} seats successfully`, count: seats.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;