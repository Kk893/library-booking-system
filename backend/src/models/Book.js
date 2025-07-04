const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [200, 'Book title cannot exceed 200 characters'],
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [100, 'Author name cannot exceed 100 characters'],
    },
    ISBN: {
      type: String,
      required: [true, 'ISBN is required'],
      trim: true,
      unique: true,
      validate: {
        validator: function (isbn) {
          // Basic ISBN-10 or ISBN-13 validation
          return /^(?:\d[- ]?){9}[\dXx]$/.test(isbn) || /^(?:\d[- ]?){13}$/.test(isbn);
        },
        message: 'Please provide a valid ISBN',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      trim: true,
    },
    subGenre: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      trim: true,
      default: 'English',
    },
    publicationYear: {
      type: Number,
      validate: {
        validator: function (year) {
          return year >= 0 && year <= new Date().getFullYear();
        },
        message: 'Publication year must be valid',
      },
    },
    publisher: {
      type: String,
      trim: true,
    },
    pageCount: {
      type: Number,
      min: [1, 'Page count must be at least 1'],
    },
    coverImage: {
      type: String,
      default: '/images/default-book-cover.jpg',
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: [true, 'Book must belong to a library'],
    },
    totalCopies: {
      type: Number,
      required: [true, 'Total number of copies is required'],
      min: [1, 'Total copies must be at least 1'],
      default: 1,
    },
    availableCopies: {
      type: Number,
      required: [true, 'Available number of copies is required'],
      min: [0, 'Available copies cannot be negative'],
      default: 1,
      validate: {
        validator: function (val) {
          return val <= this.totalCopies;
        },
        message: 'Available copies cannot exceed total copies',
      },
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isReserved: {
      type: Boolean,
      default: false,
    },
    borrowFee: {
      type: Number,
      default: 0, // Free by default
      min: [0, 'Borrow fee cannot be negative'],
    },
    borrowPeriod: {
      type: Number,
      default: 14, // Default loan period in days
      min: [1, 'Borrow period must be at least 1 day'],
    },
    lateFeePerDay: {
      type: Number,
      default: 0.5, // Default late fee per day
      min: [0, 'Late fee cannot be negative'],
    },
    status: {
      type: String,
      enum: ['available', 'borrowed', 'reserved', 'maintenance', 'lost'],
      default: 'available',
    },
    location: {
      shelf: {
        type: String,
        trim: true,
      },
      section: {
        type: String,
        trim: true,
      },
      floor: {
        type: String,
        trim: true,
      },
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      average: {
        type: Number,
        min: [0, 'Rating cannot be negative'],
        max: [5, 'Rating cannot exceed 5'],
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: [1, 'Rating must be at least 1'],
          max: [5, 'Rating cannot exceed 5'],
        },
        comment: {
          type: String,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    borrowHistory: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        borrowDate: {
          type: Date,
          required: true,
        },
        dueDate: {
          type: Date,
          required: true,
        },
        returnDate: {
          type: Date,
        },
        status: {
          type: String,
          enum: ['active', 'returned', 'overdue', 'lost'],
          default: 'active',
        },
        fine: {
          amount: {
            type: Number,
            default: 0,
          },
          paid: {
            type: Boolean,
            default: false,
          },
          paidDate: {
            type: Date,
          },
        },
      },
    ],
    reservations: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reservationDate: {
          type: Date,
          default: Date.now,
        },
        expiryDate: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          enum: ['active', 'fulfilled', 'expired', 'canceled'],
          default: 'active',
        },
        notificationSent: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
bookSchema.index({ title: 'text', author: 'text', genre: 'text', tags: 'text' });
bookSchema.index({ library: 1 });
bookSchema.index({ status: 1 });
bookSchema.index({ isFeatured: 1 });

// Virtual for availability status message
bookSchema.virtual('availabilityStatus').get(function () {
  if (this.status === 'maintenance') {
    return 'Under Maintenance';
  } else if (this.status === 'lost') {
    return 'Lost/Damaged';
  } else if (this.availableCopies === 0) {
    return 'Currently Unavailable';
  } else if (this.isReserved) {
    return 'Reserved';
  } else {
    return 'Available';
  }
});

// Virtual for current borrowers
bookSchema.virtual('currentBorrowers', {
  ref: 'User',
  localField: 'borrowHistory.user',
  foreignField: '_id',
  match: { 'borrowHistory.status': 'active' },
});

// Static method to find books by genre
bookSchema.statics.findByGenre = function (genre) {
  return this.find({ genre });
};

// Static method to find featured books
bookSchema.statics.findFeatured = function () {
  return this.find({ isFeatured: true }).sort({ 'rating.average': -1 }).limit(10);
};

// Static method to find available books in a library
bookSchema.statics.findAvailableInLibrary = function (libraryId) {
  return this.find({
    library: libraryId,
    status: 'available',
    availableCopies: { $gt: 0 },
  });
};

// Instance method to check if a book is available for borrowing
bookSchema.methods.isAvailableForBorrow = function () {
  return this.status === 'available' && this.availableCopies > 0;
};

// Instance method to borrow a book
bookSchema.methods.borrow = async function (userId, borrowDays = null) {
  if (!this.isAvailableForBorrow()) {
    throw new Error('Book is not available for borrowing');
  }

  const days = borrowDays || this.borrowPeriod;
  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);

  this.availableCopies -= 1;
  if (this.availableCopies === 0) {
    this.status = 'borrowed';
  }

  this.borrowHistory.push({
    user: userId,
    borrowDate,
    dueDate,
    status: 'active',
  });

  await this.save();
  return {
    borrowDate,
    dueDate,
    bookId: this._id,
  };
};

// Instance method to return a book
bookSchema.methods.returnBook = async function (userId) {
  const activeBorrow = this.borrowHistory.find(
    (record) => record.user.toString() === userId.toString() && record.status === 'active'
  );

  if (!activeBorrow) {
    throw new Error('No active borrow record found for this user');
  }

  const today = new Date();
  activeBorrow.returnDate = today;
  activeBorrow.status = 'returned';

  // Calculate late fee if applicable
  if (today > activeBorrow.dueDate) {
    const daysLate = Math.ceil(
      (today.getTime() - activeBorrow.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    activeBorrow.fine.amount = daysLate * this.lateFeePerDay;
  }

  this.availableCopies += 1;
  if (this.status === 'borrowed' && this.availableCopies > 0) {
    this.status = 'available';
  }

  // Check if there are active reservations
  const activeReservation = this.reservations.find((res) => res.status === 'active');
  if (activeReservation) {
    activeReservation.status = 'fulfilled';
    activeReservation.notificationSent = true;
    this.isReserved = true;
  }

  await this.save();
  return {
    returnDate: today,
    fine: activeBorrow.fine.amount,
    bookId: this._id,
  };
};

// Instance method to reserve a book
bookSchema.methods.reserve = async function (userId) {
  if (this.availableCopies > 0) {
    throw new Error('Book is available for direct borrowing');
  }

  // Check if user already has an active reservation
  const existingReservation = this.reservations.find(
    (res) => res.user.toString() === userId.toString() && res.status === 'active'
  );

  if (existingReservation) {
    throw new Error('User already has an active reservation for this book');
  }

  const reservationDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 3); // Reservation valid for 3 days after book becomes available

  this.reservations.push({
    user: userId,
    reservationDate,
    expiryDate,
    status: 'active',
  });

  this.isReserved = true;
  await this.save();

  return {
    reservationDate,
    expiryDate,
    bookId: this._id,
  };
};

// Pre-save middleware to update rating average when reviews change
bookSchema.pre('save', function (next) {
  if (this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = totalRating / this.reviews.length;
    this.rating.count = this.reviews.length;
  }
  next();
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;