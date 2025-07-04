const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must belong to a user'],
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: [true, 'Booking must belong to a library'],
    },
    date: {
      type: Date,
      required: [true, 'Booking date is required'],
      validate: {
        validator: function(date) {
          // Ensure booking date is not in the past
          return date >= new Date(new Date().setHours(0, 0, 0, 0));
        },
        message: 'Booking date cannot be in the past',
      },
    },
    timeSlot: {
      start: {
        type: String,
        required: [true, 'Start time is required'],
        match: [
          /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/,
          'Please provide a valid time format (HH:MM AM/PM)',
        ],
      },
      end: {
        type: String,
        required: [true, 'End time is required'],
        match: [
          /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/,
          'Please provide a valid time format (HH:MM AM/PM)',
        ],
      },
    },
    seatType: {
      type: String,
      required: [true, 'Seat type is required'],
      enum: ['regular', 'ac_cubicle', 'premium_booth'],
    },
    seats: {
      type: [String], // Array of seat IDs (e.g., "A1", "B3")
      required: [true, 'At least one seat must be selected'],
      validate: {
        validator: function(seats) {
          return seats.length > 0;
        },
        message: 'Please select at least one seat',
      },
    },
    price: {
      type: Number,
      required: [true, 'Booking price is required'],
      min: [0, 'Price cannot be negative'],
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Original price cannot be negative'],
    },
    discount: {
      amount: {
        type: Number,
        default: 0,
      },
      code: {
        type: String,
        trim: true,
      },
      percentage: {
        type: Number,
        min: [0, 'Discount percentage cannot be negative'],
        max: [100, 'Discount percentage cannot exceed 100%'],
      },
    },
    paymentInfo: {
      transactionId: {
        type: String,
        trim: true,
      },
      method: {
        type: String,
        enum: ['credit_card', 'debit_card', 'upi', 'wallet', 'netbanking'],
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
      },
      paidAt: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    cancellation: {
      cancelledAt: {
        type: Date,
      },
      reason: {
        type: String,
        trim: true,
      },
      refundAmount: {
        type: Number,
        min: [0, 'Refund amount cannot be negative'],
      },
      refundStatus: {
        type: String,
        enum: ['pending', 'processed', 'rejected'],
      },
      cancelledBy: {
        type: String,
        enum: ['user', 'admin', 'system'],
      },
    },
    additionalServices: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Service price cannot be negative'],
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
          default: 1,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    feedback: {
      rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
      },
      comment: {
        type: String,
        trim: true,
      },
      submittedAt: {
        type: Date,
      },
    },
    bookingReference: {
      type: String,
      unique: true,
    },
    qrCode: {
      type: String, // URL or base64 encoded QR code
    },
    isRescheduled: {
      type: Boolean,
      default: false,
    },
    originalBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    notificationsSent: {
      confirmation: {
        type: Boolean,
        default: false,
      },
      reminder: {
        type: Boolean,
        default: false,
      },
      feedback: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
bookingSchema.index({ user: 1 });
bookingSchema.index({ library: 1 });
bookingSchema.index({ date: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingReference: 1 }, { unique: true });

// Generate a unique booking reference before saving
bookingSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate a booking reference based on timestamp and random string
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingReference = `BK-${timestamp}-${randomStr}`;
    
    // Generate a QR code with the booking reference
    // In a real implementation, you would use a QR code library
    this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${this.bookingReference}`;
  }
  next();
});

// Virtual for duration in hours
bookingSchema.virtual('durationHours').get(function() {
  const convertTimeToMinutes = (timeStr) => {
    const [hoursStr, minutesAmPm] = timeStr.split(':');
    const [minutesStr, amPm] = minutesAmPm.split(' ');
    
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    
    if (amPm === 'PM' && hours < 12) {
      hours += 12;
    } else if (amPm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  const startMinutes = convertTimeToMinutes(this.timeSlot.start);
  const endMinutes = convertTimeToMinutes(this.timeSlot.end);
  const durationMinutes = endMinutes - startMinutes;
  
  return Math.max(0, durationMinutes / 60);
});

// Virtual for formatted booking date
bookingSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Virtual for status label (user-friendly status message)
bookingSchema.virtual('statusLabel').get(function() {
  const statusLabels = {
    pending: 'Awaiting Confirmation',
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  };
  
  return statusLabels[this.status] || this.status;
});

// Static method to find bookings for a specific library and date
bookingSchema.statics.findByLibraryAndDate = function(libraryId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    library: libraryId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled'] },
  });
};

// Static method to find user's upcoming bookings
bookingSchema.statics.findUpcomingForUser = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    user: userId,
    date: { $gte: today },
    status: { $in: ['pending', 'confirmed'] },
  })
  .sort({ date: 1, 'timeSlot.start': 1 })
  .populate('library', 'name address');
};

// Static method to find bookings to send reminders for
bookingSchema.statics.findForReminders = function() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  
  return this.find({
    date: { $gte: tomorrow, $lt: dayAfterTomorrow },
    status: 'confirmed',
    'notificationsSent.reminder': false,
  })
  .populate('user', 'name email')
  .populate('library', 'name address');
};

// Instance method to calculate cancellation fee based on time until booking
bookingSchema.methods.calculateCancellationFee = function() {
  const now = new Date();
  const bookingDate = new Date(this.date);
  
  // Calculate hours difference between now and booking time
  const hoursDifference = (bookingDate - now) / (1000 * 60 * 60);
  
  // Cancellation policy:
  // - More than 24 hours: Full refund
  // - 12-24 hours: 75% refund
  // - 6-12 hours: 50% refund
  // - Less than 6 hours: No refund
  
  let refundPercentage = 0;
  
  if (hoursDifference >= 24) {
    refundPercentage = 100;
  } else if (hoursDifference >= 12) {
    refundPercentage = 75;
  } else if (hoursDifference >= 6) {
    refundPercentage = 50;
  }
  
  const refundAmount = (this.price * refundPercentage) / 100;
  
  return {
    refundPercentage,
    refundAmount: Math.round(refundAmount * 100) / 100, // Round to 2 decimal places
    cancellationFee: this.price - refundAmount,
  };
};

// Instance method to cancel a booking
bookingSchema.methods.cancel = async function(reason, cancelledBy = 'user') {
  if (['completed', 'cancelled', 'no_show'].includes(this.status)) {
    throw new Error(`Cannot cancel a booking with status: ${this.status}`);
  }
  
  const { refundAmount } = this.calculateCancellationFee();
  
  this.status = 'cancelled';
  this.cancellation = {
    cancelledAt: new Date(),
    reason: reason || 'Cancelled by user',
    refundAmount,
    refundStatus: refundAmount > 0 ? 'pending' : 'rejected',
    cancelledBy,
  };
  
  await this.save();
  
  return {
    bookingId: this._id,
    refundAmount,
    refundStatus: this.cancellation.refundStatus,
  };
};

// Instance method to check in a user
bookingSchema.methods.checkIn = async function() {
  if (this.status !== 'confirmed') {
    throw new Error(`Cannot check in a booking with status: ${this.status}`);
  }
  
  const bookingDate = new Date(this.date);
  const today = new Date();
  
  // Check if the booking is for today
  if (
    bookingDate.getDate() !== today.getDate() ||
    bookingDate.getMonth() !== today.getMonth() ||
    bookingDate.getFullYear() !== today.getFullYear()
  ) {
    throw new Error('Can only check in on the booking date');
  }
  
  this.status = 'checked_in';
  this.checkInTime = new Date();
  
  await this.save();
  
  return {
    bookingId: this._id,
    checkInTime: this.checkInTime,
  };
};

// Instance method to check out a user
bookingSchema.methods.checkOut = async function() {
  if (this.status !== 'checked_in') {
    throw new Error(`Cannot check out a booking with status: ${this.status}`);
  }
  
  this.status = 'completed';
  this.checkOutTime = new Date();
  
  await this.save();
  
  return {
    bookingId: this._id,
    checkOutTime: this.checkOutTime,
  };
};

// Instance method to submit feedback
bookingSchema.methods.submitFeedback = async function(rating, comment) {
  if (!['checked_in', 'completed'].includes(this.status)) {
    throw new Error(`Cannot submit feedback for a booking with status: ${this.status}`);
  }
  
  this.feedback = {
    rating,
    comment,
    submittedAt: new Date(),
  };
  
  await this.save();
  
  return {
    bookingId: this._id,
    rating,
  };
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;