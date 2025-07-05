const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Library = require('../models/Library');
const Book = require('../models/Book');
const { auth } = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create seat booking
router.post('/seats', auth, async (req, res) => {
  try {
    const { libraryId, seatType, seatNumbers, date, timeSlot } = req.body;
    
    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({ message: 'Library not found' });
    }

    // Check seat availability
    const existingBookings = await Booking.find({
      libraryId,
      type: 'seat',
      date: new Date(date),
      'timeSlot.name': timeSlot.name,
      status: { $in: ['confirmed', 'pending'] },
      seatNumbers: { $in: seatNumbers }
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({ message: 'Some seats are already booked' });
    }

    const amount = library.seatLayout[seatType].price * seatNumbers.length;
    
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `seat_${Date.now()}`
    });

    const booking = new Booking({
      userId: req.user._id,
      libraryId,
      type: 'seat',
      seatNumbers,
      seatType,
      date: new Date(date),
      timeSlot,
      amount,
      paymentId: order.id
    });

    await booking.save();
    
    res.json({ booking, order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify payment and confirm booking
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const booking = await Booking.findById(bookingId);
      booking.status = 'confirmed';
      booking.paymentId = razorpay_payment_id;
      booking.qrCode = `QR_${booking._id}_${Date.now()}`;
      await booking.save();
      
      res.json({ message: 'Payment verified successfully', booking });
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('libraryId', 'name city area')
      .populate('bookId', 'title author')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel booking
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Cannot cancel this booking' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.refundAmount = booking.amount * 0.8; // 80% refund
    await booking.save();
    
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;