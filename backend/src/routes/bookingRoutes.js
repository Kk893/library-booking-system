const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Library = require('../models/Library');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const emailService = require('../utils/emailService');

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const {
      libraryId,
      date,
      timeSlot,
      seatType,
      seats,
      price,
      originalPrice,
      promoCode,
      paymentInfo,
      additionalServices,
    } = req.body;

    // Basic validation
    if (!libraryId || !date || !timeSlot || !seatType || !seats || !price) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Validate library exists
    if (!mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID format',
      });
    }

    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found',
      });
    }

    // Validate date is not in the past
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Booking date cannot be in the past',
      });
    }

    // Validate seat type exists in the library
    const validSeatType = library.seatTypes.find(type => type.name === seatType);
    if (!validSeatType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seat type for this library',
      });
    }

    // Validate time slot exists and is available
    const validTimeSlot = library.timeSlots.find(
      slot => slot.start === timeSlot.start && slot.end === timeSlot.end && slot.isAvailable
    );
    if (!validTimeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unavailable time slot',
      });
    }

    // Check seat availability (make sure seats are not already booked)
    const existingBookings = await Booking.find({
      library: libraryId,
      date: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999)),
      },
      'timeSlot.start': timeSlot.start,
      'timeSlot.end': timeSlot.end,
      status: { $nin: ['cancelled', 'no_show'] },
    });

    const bookedSeats = existingBookings.flatMap(booking => booking.seats);
    const isDoubleBooked = seats.some(seat => bookedSeats.includes(seat));

    if (isDoubleBooked) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected seats are already booked',
        bookedSeats,
      });
    }

    // Process discount if promo code is provided
    let discount = {
      amount: 0,
      code: null,
      percentage: 0,
    };

    if (promoCode) {
      // In a real application, you would validate the promo code against a database
      // This is a simplified example
      if (promoCode === 'WELCOME10') {
        discount = {
          amount: originalPrice * 0.1,
          code: promoCode,
          percentage: 10,
        };
      } else if (promoCode === 'SUMMER20') {
        discount = {
          amount: originalPrice * 0.2,
          code: promoCode,
          percentage: 20,
        };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid promo code',
        });
      }
    }

    // Create booking object
    const newBooking = {
      user: req.user.id,
      library: libraryId,
      date: bookingDate,
      timeSlot,
      seatType,
      seats,
      price,
      originalPrice,
      discount,
      status: 'pending',
    };

    // Add payment info if provided
    if (paymentInfo) {
      newBooking.paymentInfo = {
        ...paymentInfo,
        status: 'completed',
        paidAt: new Date(),
      };
      newBooking.status = 'confirmed'; // Auto-confirm if payment is included
    }

    // Add additional services if provided
    if (additionalServices && additionalServices.length > 0) {
      newBooking.additionalServices = additionalServices;
    }

    // Save booking to database
    const booking = await Booking.create(newBooking);

    // If payment is successful and booking is confirmed, send confirmation email
    if (booking.status === 'confirmed') {
      try {
        await emailService.sendBookingConfirmationEmail(
          req.user.email,
          req.user.name,
          {
            _id: booking._id,
            libraryName: library.name,
            date: booking.date,
            timeSlot: `${booking.timeSlot.start} - ${booking.timeSlot.end}`,
            seatType: booking.seatType,
            seats: booking.seats,
            price: booking.price,
          }
        );

        // Update notification status
        booking.notificationsSent.confirmation = true;
        await booking.save();
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Continue even if email fails
      }
    }

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/bookings
 * @desc    Get user's bookings
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const {
      status,
      type = 'upcoming',
      sort = 'date',
      limit = 20,
      page = 1,
    } = req.query;

    // Build query
    const query = { user: req.user.id };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by type (upcoming, past, all)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (type === 'upcoming') {
      query.date = { $gte: today };
      query.status = { $in: ['pending', 'confirmed'] };
    } else if (type === 'past') {
      query.$or = [
        { date: { $lt: today } },
        { status: { $in: ['completed', 'cancelled', 'no_show'] } },
      ];
    }

    // Sorting
    let sortOptions = {};
    if (sort === 'date') {
      sortOptions = { date: 1, 'timeSlot.start': 1 };
    } else if (sort === 'recent') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'price') {
      sortOptions = { price: -1 };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const bookings = await Booking.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('library', 'name address images')
      .select('-__v');

    // Get total count for pagination
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
      data: bookings,
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id)
      .populate('library', 'name address contact openingHours images facilities')
      .populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if the user is authorized to view this booking
    if (
      booking.user._id.toString() !== req.user.id &&
      !['admin', 'super_admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private
 */
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if the user is authorized to cancel this booking
    if (
      booking.user.toString() !== req.user.id &&
      !['admin', 'super_admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    // Check if booking can be cancelled
    if (['completed', 'cancelled', 'no_show'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking with status: ${booking.status}`,
      });
    }

    // Calculate cancellation fee and process cancellation
    const cancellationInfo = await booking.cancel(reason, req.user.role === 'admin' ? 'admin' : 'user');

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: cancellationInfo.bookingId,
        refundAmount: cancellationInfo.refundAmount,
        refundStatus: cancellationInfo.refundStatus,
      },
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/check-in
 * @desc    Check in a booking
 * @access  Private/Admin
 */
router.put('/:id/check-in', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Process check-in
    try {
      const checkInInfo = await booking.checkIn();

      res.status(200).json({
        success: true,
        message: 'Check-in successful',
        data: {
          bookingId: checkInInfo.bookingId,
          checkInTime: checkInInfo.checkInTime,
        },
      });
    } catch (checkInError) {
      return res.status(400).json({
        success: false,
        message: checkInError.message,
      });
    }
  } catch (error) {
    console.error('Error checking in booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/check-out
 * @desc    Check out a booking
 * @access  Private/Admin
 */
router.put('/:id/check-out', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Process check-out
    try {
      const checkOutInfo = await booking.checkOut();

      res.status(200).json({
        success: true,
        message: 'Check-out successful',
        data: {
          bookingId: checkOutInfo.bookingId,
          checkOutTime: checkOutInfo.checkOutTime,
        },
      });
    } catch (checkOutError) {
      return res.status(400).json({
        success: false,
        message: checkOutError.message,
      });
    }
  } catch (error) {
    console.error('Error checking out booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/feedback
 * @desc    Submit feedback for a booking
 * @access  Private
 */
router.put('/:id/feedback', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating (1-5)',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if the user is authorized to provide feedback for this booking
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to provide feedback for this booking',
      });
    }

    // Check if booking is eligible for feedback
    if (!['checked_in', 'completed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot provide feedback for a booking with status: ${booking.status}`,
      });
    }

    // Submit feedback
    try {
      const feedbackInfo = await booking.submitFeedback(rating, comment);

      // Update library rating
      const library = await Library.findById(booking.library);
      
      if (library) {
        const totalRating = library.rating.average * library.rating.count;
        const newCount = library.rating.count + 1;
        const newAverage = (totalRating + rating) / newCount;
        
        library.rating.average = newAverage;
        library.rating.count = newCount;
        await library.save();
      }

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          bookingId: feedbackInfo.bookingId,
          rating: feedbackInfo.rating,
        },
      });
    } catch (feedbackError) {
      return res.status(400).json({
        success: false,
        message: feedbackError.message,
      });
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/bookings/admin/library/:libraryId
 * @desc    Get all bookings for a library (admin only)
 * @access  Private/Admin
 */
router.get('/admin/library/:libraryId', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { libraryId } = req.params;
    const { date, status, limit = 50, page = 1 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID format',
      });
    }

    // If user is an admin (not super_admin), check if they manage this library
    if (req.user.role === 'admin') {
      const library = await Library.findById(libraryId);
      
      if (!library) {
        return res.status(404).json({
          success: false,
          message: 'Library not found',
        });
      }
      
      if (library.admin.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view bookings for this library',
        });
      }
    }

    // Build query
    const query = { library: libraryId };

    // Filter by date
    if (date) {
      const filterDate = new Date(date);
      const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));
      
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const bookings = await Booking.find(query)
      .sort({ date: 1, 'timeSlot.start': 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email')
      .select('-__v');

    // Get total count for pagination
    const total = await Booking.countDocuments(query);

    // Get revenue statistics
    const totalRevenue = await Booking.aggregate([
      { $match: { ...query, status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // Get seat type statistics
    const seatTypeStats = await Booking.aggregate([
      { $match: { ...query, status: { $nin: ['cancelled'] } } },
      { $group: { _id: '$seatType', count: { $sum: 1 }, revenue: { $sum: '$price' } } },
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
      statistics: {
        totalRevenue: revenue,
        seatTypeBreakdown: seatTypeStats,
      },
      data: bookings,
    });
  } catch (error) {
    console.error('Error fetching library bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/bookings/qr/:reference
 * @desc    Validate booking by QR code reference
 * @access  Private/Admin
 */
router.get('/qr/:reference', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { reference } = req.params;

    const booking = await Booking.findOne({ bookingReference: reference })
      .populate('library', 'name address')
      .populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // If user is an admin (not super_admin), check if they manage this library
    if (req.user.role === 'admin') {
      const library = await Library.findById(booking.library);
      
      if (library.admin.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to validate bookings for this library',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        booking,
        isValid: booking.status === 'confirmed',
        canCheckIn: booking.status === 'confirmed',
        message: booking.status === 'confirmed' 
          ? 'Valid booking, ready for check-in' 
          : `Booking status: ${booking.status}`,
      },
    });
  } catch (error) {
    console.error('Error validating booking QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;