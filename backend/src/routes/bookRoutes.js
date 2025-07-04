const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Library = require('../models/Library');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const emailService = require('../utils/emailService');

/**
 * @route   GET /api/books
 * @desc    Get all books with filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      library,
      genre,
      author,
      language,
      available,
      search,
      sort = 'title',
      limit = 20,
      page = 1,
    } = req.query;

    // Build query
    const query = {};

    // Filter by library
    if (library) {
      if (!mongoose.Types.ObjectId.isValid(library)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid library ID format',
        });
      }
      query.library = library;
    }

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

    // Search by title, author, or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
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
      .populate('library', 'name address')
      .select('-borrowHistory -reservations -reviews');

    // Get total count for pagination
    const total = await Book.countDocuments(query);

    // Get filter options
    const genres = await Book.distinct('genre');
    const languages = await Book.distinct('language');
    const authors = await Book.distinct('author');

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
        languages,
        authors,
      },
      data: books,
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/books/:id
 * @desc    Get book details by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format',
      });
    }

    const book = await Book.findById(id)
      .populate('library', 'name address contact openingHours')
      .populate('reviews.user', 'name');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // Get similar books (same genre and library)
    const similarBooks = await Book.find({
      _id: { $ne: id },
      library: book.library._id,
      genre: book.genre,
    })
      .limit(4)
      .select('title author coverImage genre rating');

    res.status(200).json({
      success: true,
      data: {
        book,
        similarBooks,
      },
    });
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/books/:id/borrow
 * @desc    Borrow a book
 * @access  Private
 */
router.post('/:id/borrow', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { borrowDays } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format',
      });
    }

    const book = await Book.findById(id).populate('library', 'name');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // Check if book is available
    if (!book.isAvailableForBorrow()) {
      return res.status(400).json({
        success: false,
        message: 'Book is not available for borrowing',
      });
    }

    // Check if user already has active borrows
    const hasActiveBorrow = book.borrowHistory.some(
      record => record.user.toString() === req.user.id && record.status === 'active'
    );

    if (hasActiveBorrow) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active borrow for this book',
      });
    }

    // Process the borrow
    try {
      const borrowInfo = await book.borrow(req.user.id, borrowDays);

      // Update user's borrowed books
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          borrowedBooks: {
            book: id,
            borrowDate: borrowInfo.borrowDate,
            dueDate: borrowInfo.dueDate,
            library: book.library._id,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Book borrowed successfully',
        data: {
          bookId: borrowInfo.bookId,
          borrowDate: borrowInfo.borrowDate,
          dueDate: borrowInfo.dueDate,
          bookTitle: book.title,
          libraryName: book.library.name,
        },
      });
    } catch (borrowError) {
      return res.status(400).json({
        success: false,
        message: borrowError.message,
      });
    }
  } catch (error) {
    console.error('Error borrowing book:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/books/:id/return
 * @desc    Return a borrowed book
 * @access  Private
 */
router.post('/:id/return', protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format',
      });
    }

    const book = await Book.findById(id).populate('library', 'name');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // Check if user has borrowed this book
    const hasActiveBorrow = book.borrowHistory.some(
      record => record.user.toString() === req.user.id && record.status === 'active'
    );

    if (!hasActiveBorrow) {
      return res.status(400).json({
        success: false,
        message: 'You do not have an active borrow for this book',
      });
    }

    // Process the return
    try {
      const returnInfo = await book.returnBook(req.user.id);

      // Update user's borrowed books
      await User.findByIdAndUpdate(req.user.id, {
        $pull: {
          borrowedBooks: { book: id, returnDate: null },
        },
      });

      // If there's a fine, add it to the user's fines
      if (returnInfo.fine > 0) {
        await User.findByIdAndUpdate(req.user.id, {
          $push: {
            fines: {
              book: id,
              amount: returnInfo.fine,
              dueDate: book.borrowHistory.find(
                record => record.user.toString() === req.user.id && record.status === 'returned'
              ).dueDate,
              returnDate: new Date(),
              paid: false,
            },
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Book returned successfully',
        data: {
          bookId: returnInfo.bookId,
          returnDate: returnInfo.returnDate,
          fine: returnInfo.fine,
          bookTitle: book.title,
          libraryName: book.library.name,
        },
      });
    } catch (returnError) {
      return res.status(400).json({
        success: false,
        message: returnError.message,
      });
    }
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/books/:id/reserve
 * @desc    Reserve a book
 * @access  Private
 */
router.post('/:id/reserve', protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format',
      });
    }

    const book = await Book.findById(id).populate('library', 'name');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // Check if book needs reservation (if it's available, no need to reserve)
    if (book.availableCopies > 0) {
      return res.status(400).json({
        success: false,
        message: 'Book is available for direct borrowing, no need to reserve',
      });
    }

    // Check if user already has an active reservation
    const hasActiveReservation = book.reservations.some(
      res => res.user.toString() === req.user.id && res.status === 'active'
    );

    if (hasActiveReservation) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active reservation for this book',
      });
    }

    // Process the reservation
    try {
      const reservationInfo = await book.reserve(req.user.id);

      // Update user's reserved books
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          reservedBooks: {
            book: id,
            reservationDate: reservationInfo.reservationDate,
            expiryDate: reservationInfo.expiryDate,
            library: book.library._id,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Book reserved successfully',
        data: {
          bookId: reservationInfo.bookId,
          reservationDate: reservationInfo.reservationDate,
          expiryDate: reservationInfo.expiryDate,
          bookTitle: book.title,
          libraryName: book.library.name,
        },
      });
    } catch (reserveError) {
      return res.status(400).json({
        success: false,
        message: reserveError.message,
      });
    }
  } catch (error) {
    console.error('Error reserving book:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/books/:id/review
 * @desc    Add a review for a book
 * @access  Private
 */
router.post('/:id/review', protect, async (req, res) => {
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
        message: 'Invalid book ID format',
      });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // Check if user has already reviewed this book
    const hasReviewed = book.reviews.some(
      review => review.user.toString() === req.user.id
    );

    if (hasReviewed) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this book',
      });
    }

    // Check if user has borrowed this book (optional verification)
    const hasBorrowed = book.borrowHistory.some(
      record => record.user.toString() === req.user.id
    );

    // Add the review
    book.reviews.push({
      user: req.user.id,
      rating,
      comment,
      createdAt: new Date(),
    });

    // Save the book (this will trigger the pre-save hook to update average rating)
    await book.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: {
        bookId: book._id,
        rating,
        newAverageRating: book.rating.average,
        totalReviews: book.rating.count,
      },
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/books/user/borrowed
 * @desc    Get user's borrowed books
 * @access  Private
 */
router.get('/user/borrowed', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'borrowedBooks.book',
        select: 'title author coverImage',
      })
      .populate({
        path: 'borrowedBooks.library',
        select: 'name address',
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Group by status (active, returned, overdue)
    const today = new Date();
    
    const active = [];
    const overdue = [];
    const returned = [];

    user.borrowedBooks.forEach(borrow => {
      const bookInfo = {
        id: borrow.book._id,
        title: borrow.book.title,
        author: borrow.book.author,
        coverImage: borrow.book.coverImage,
        borrowDate: borrow.borrowDate,
        dueDate: borrow.dueDate,
        returnDate: borrow.returnDate,
        library: borrow.library,
      };

      if (borrow.returnDate) {
        returned.push(bookInfo);
      } else if (borrow.dueDate < today) {
        overdue.push(bookInfo);
      } else {
        active.push(bookInfo);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        active,
        overdue,
        returned,
      },
    });
  } catch (error) {
    console.error('Error fetching borrowed books:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/books/user/reserved
 * @desc    Get user's reserved books
 * @access  Private
 */
router.get('/user/reserved', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'reservedBooks.book',
        select: 'title author coverImage',
      })
      .populate({
        path: 'reservedBooks.library',
        select: 'name address',
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Filter out non-active reservations
    const reservations = user.reservedBooks.filter(
      res => !res.notified || new Date(res.expiryDate) > new Date()
    );

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (error) {
    console.error('Error fetching reserved books:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/books
 * @desc    Add a new book
 * @access  Private/Admin
 */
router.post('/', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { libraryId } = req.body;

    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid library ID is required',
      });
    }

    // Check if library exists
    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found',
      });
    }

    // If user is an admin (not super_admin), check if they manage this library
    if (req.user.role === 'admin' && library.admin.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add books to this library',
      });
    }

    // Set library field in the book data
    req.body.library = libraryId;

    // Set default values if not provided
    if (req.body.totalCopies) {
      req.body.availableCopies = req.body.totalCopies;
    }

    // Create the book
    const book = await Book.create(req.body);

    res.status(201).json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error('Error adding book:', error);

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
 * @route   PUT /api/books/:id
 * @desc    Update a book
 * @access  Private/Admin
 */
router.put('/:id', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format',
      });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // If user is an admin (not super_admin), check if they manage this library
    if (req.user.role === 'admin') {
      const library = await Library.findById(book.library);
      
      if (library.admin.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update books in this library',
        });
      }
    }

    // Prevent modification of borrowHistory and reservations through this route
    delete req.body.borrowHistory;
    delete req.body.reservations;
    delete req.body.reviews;

    // Update the book
    const updatedBook = await Book.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedBook,
    });
  } catch (error) {
    console.error('Error updating book:', error);

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
 * @route   DELETE /api/books/:id
 * @desc    Delete a book
 * @access  Private/Admin
 */
router.delete('/:id', protect, restrictTo('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID format',
      });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // If user is an admin (not super_admin), check if they manage this library
    if (req.user.role === 'admin') {
      const library = await Library.findById(book.library);
      
      if (library.admin.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete books in this library',
        });
      }
    }

    // Check if book has active borrows or reservations
    const hasActiveRecords = book.borrowHistory.some(record => record.status === 'active') ||
                             book.reservations.some(res => res.status === 'active');

    if (hasActiveRecords) {
      // Instead of deleting, mark as maintenance
      book.status = 'maintenance';
      await book.save();

      return res.status(200).json({
        success: true,
        message: 'Book marked as under maintenance due to active borrows or reservations',
      });
    }

    // No active records, safe to delete
    await book.remove();

    res.status(200).json({
      success: true,
      message: 'Book deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;