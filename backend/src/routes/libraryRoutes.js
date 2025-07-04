const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Library = require('../models/Library');
const Booking = require('../models/Booking');
const Book = require('../models/Book');
const { protect, restrictTo } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/libraries
 * @desc    Get all libraries with filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      city,
      area,
      facilities,
      search,
      sort = 'rating',
      limit = 20,
      page = 1,
    } = req.query;

    // Build query
    const query = {};

    // Filter by city
    if (city) {
      query['address.city'] = city;
    }

    // Filter by area
    if (area) {
      query['address.area'] = area;
    }

    // Filter by facilities
    if (facilities) {
      const facilitiesArray = facilities.split(',');
      query['facilities.name'] = { $in: facilitiesArray };
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Only active libraries
    query.status = 'active';

    // Sorting
    let sortOptions = {};
    if (sort === 'rating') {
      sortOptions = { 'rating.average': -1 };
    } else if (sort === 'name') {
      sortOptions = { name: 1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const libraries = await Library.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('name description address images facilities openingHours rating seatTypes status featured');

    // Get total count for pagination
    const total = await Library.countDocuments(query);

    // Get unique cities and areas for filters
    const cities = await Library.distinct('address.city');
    const areas = await Library.distinct('address.area');
    const allFacilities = await Library.distinct('facilities.name');

    res.status(200).json({
      success: true,
      count: libraries.length,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
      filters: {
        cities,
        areas,
        facilities: allFacilities,
      },
      data: libraries,
    });
  } catch (error) {
    console.error('Error fetching libraries:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/libraries/featured
 * @desc    Get featured libraries
 * @access  Public
 */
router.get('/featured', async (req, res) => {
  try {
    const featuredLibraries = await Library.getFeaturedLibraries();

    res.status(200).json({
      success: true,
      count: featuredLibraries.length,
      data: featuredLibraries,
    });
  } catch (error) {
    console.error('Error fetching featured libraries:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/libraries/:id
 * @desc    Get library details by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID format',
      });
    }

    const library = await Library.findById(id);

    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found',
      });
    }

    // Get featured books from this library
    const featuredBooks = await Book.find({
      library: id,
      isFeatured: true,
      availableCopies: { $gt: 0 },
    })
      .limit(6)
      .select('title author genre coverImage status availableCopies rating');

    res.status(200).json({
      success: true,
      data: {
        library,
        featuredBooks,
      },
    });
  } catch (error) {
    console.error('Error fetching library details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/libraries/:id/seat-availability
 * @desc    Get seat availability for a specific date
 * @access  Public
 */
router.get('/:id/seat-availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID format',
      });
    }

    const library = await Library.findById(id);

    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found',
      });
    }

    // Get all bookings for this library on the specified date
    const bookingDate = new Date(date);
    const bookings = await Booking.findByLibraryAndDate(id, bookingDate);

    // Prepare availability data by time slot
    const timeSlotAvailability = {};

    // Initialize availability for all time slots
    library.timeSlots.forEach(slot => {
      if (slot.isAvailable) {
        timeSlotAvailability[`${slot.start}-${slot.end}`] = {
          startTime: slot.start,
          endTime: slot.end,
          seatTypes: {},
          bookedSeats: [],
        };

        // Initialize seat type availability
        library.seatTypes.forEach(type => {
          timeSlotAvailability[`${slot.start}-${slot.end}`].seatTypes[type.name] = {
            total: type.capacity,
            available: type.capacity,
            price: type.price,
          };
        });
      }
    });

    // Update availability based on bookings
    bookings.forEach(booking => {
      const timeSlotKey = `${booking.timeSlot.start}-${booking.timeSlot.end}`;
      
      if (timeSlotAvailability[timeSlotKey]) {
        // Add booked seats to the list
        timeSlotAvailability[timeSlotKey].bookedSeats = [
          ...timeSlotAvailability[timeSlotKey].bookedSeats,
          ...booking.seats,
        ];

        // Decrease available count for the seat type
        if (
          timeSlotAvailability[timeSlotKey].seatTypes[booking.seatType] &&
          timeSlotAvailability[timeSlotKey].seatTypes[booking.seatType].available >= booking.seats.length
        ) {
          timeSlotAvailability[timeSlotKey].seatTypes[booking.seatType].available -= booking.seats.length;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        date: bookingDate.toISOString(),
        libraryId: id,
        seatLayout: library.seatLayout,
        timeSlots: Object.values(timeSlotAvailability),
      },
    });
  } catch (error) {
    console.error('Error fetching seat availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/libraries/:id/books
 * @desc    Get books available in a specific library
 * @access  Public
 */
router.get('/:id/books', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      genre,
      author,
      language,
      available,
      search,
      sort = 'title',
      limit = 20,
      page = 1,
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID format',
      });
    }

    // Check if library exists
    const libraryExists = await Library.exists({ _id: id });

    if (!libraryExists) {
      return res.status(404).json({
        success: false,
        message: 'Library not found',
      });
    }

    // Build query
    const query = { library: id };

    // Filter by genre
    if (genre) {
      query.genre = genre;
    }

    // Filter by author
    if (author) {
      query.author = { $regex: author, $options: 'i' };
    }

    // Filter by language
    if (language) {
      query.language = language;
    }

    // Filter by availability
    if (available === 'true') {
      query.availableCopies = { $gt: 0 };
      query.status = 'available';
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
      ];
    }

    // Sorting
    let sortOptions = {};
    if (sort === 'title') {
      sortOptions = { title: 1 };
    } else if (sort === 'author') {
      sortOptions = { author: 1 };
    } else if (sort === 'newest') {
      sortOptions = { publicationYear: -1 };
    } else if (sort === 'rating') {
      sortOptions = { 'rating.average': -1 };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const books = await Book.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('title author genre coverImage language publicationYear rating availableCopies status');

    // Get total count for pagination
    const total = await Book.countDocuments(query);

    // Get unique genres, authors, and languages for filters
    const genres = await Book.distinct('genre', { library: id });
    const authors = await Book.distinct('author', { library: id });
    const languages = await Book.distinct('language', { library: id });

    res.status(200).json({
      success: true,
      count: books.length,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
      filters: {
        genres,
        authors,
        languages,
      },
      data: books,
    });
  } catch (error) {
    console.error('Error fetching library books:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/libraries
 * @desc    Create a new library
 * @access  Private/Admin
 */
router.post('/', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    // Admin ID from authenticated user
    req.body.admin = req.user.id;

    const library = await Library.create(req.body);

    res.status(201).json({
      success: true,
      data: library,
    });
  } catch (error) {
    console.error('Error creating library:', error);

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
 * @route   PUT /api/libraries/:id
 * @desc    Update a library
 * @access  Private/Admin
 */
router.put('/:id', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID format',
      });
    }

    const library = await Library.findById(id);

    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found',
      });
    }

    // Check if the user is the library admin or a super_admin
    if (req.user.role !== 'super_admin' && library.admin.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this library',
      });
    }

    // Update the library
    const updatedLibrary = await Library.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedLibrary,
    });
  } catch (error) {
    console.error('Error updating library:', error);

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
 * @route   DELETE /api/libraries/:id
 * @desc    Delete a library
 * @access  Private/SuperAdmin
 */
router.delete('/:id', protect, restrictTo('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID format',
      });
    }

    const library = await Library.findById(id);

    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found',
      });
    }

    // Check for existing bookings
    const hasBookings = await Booking.exists({ library: id });

    if (hasBookings) {
      // Instead of deleting, mark as inactive
      library.status = 'inactive';
      await library.save();

      return res.status(200).json({
        success: true,
        message: 'Library marked as inactive due to existing bookings',
      });
    }

    // No bookings, safe to delete
    await library.remove();

    res.status(200).json({
      success: true,
      message: 'Library deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting library:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;