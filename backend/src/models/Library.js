const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Library name is required'],
      trim: true,
      maxlength: [100, 'Library name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Library description is required'],
      trim: true,
      maxlength: [1000, 'Library description cannot exceed 1000 characters'],
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        default: 'USA',
      },
      coordinates: {
        latitude: {
          type: Number,
          required: false,
        },
        longitude: {
          type: Number,
          required: false,
        },
      },
    },
    contact: {
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          'Please provide a valid email address',
        ],
      },
      website: {
        type: String,
        trim: true,
      },
    },
    openingHours: [
      {
        day: {
          type: String,
          required: true,
          enum: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
            'Monday - Friday',
            'Weekend',
          ],
        },
        open: {
          type: String,
          required: true,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/,
            'Please provide a valid time format (HH:MM AM/PM)',
          ],
        },
        close: {
          type: String,
          required: true,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/,
            'Please provide a valid time format (HH:MM AM/PM)',
          ],
        },
        isClosed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    facilities: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        icon: {
          type: String,
          trim: true,
        },
      },
    ],
    images: {
      main: {
        type: String,
        required: [true, 'Main image is required'],
      },
      gallery: [
        {
          type: String,
        },
      ],
    },
    seatTypes: [
      {
        name: {
          type: String,
          required: [true, 'Seat type name is required'],
          trim: true,
        },
        description: {
          type: String,
          required: [true, 'Seat type description is required'],
          trim: true,
        },
        price: {
          type: Number,
          required: [true, 'Seat type price is required'],
          min: [0, 'Price cannot be negative'],
        },
        image: {
          type: String,
        },
        capacity: {
          type: Number,
          required: [true, 'Seat type capacity is required'],
          min: [1, 'Capacity must be at least 1'],
        },
        features: [
          {
            type: String,
            trim: true,
          },
        ],
      },
    ],
    seatLayout: {
      rows: {
        type: Number,
        required: [true, 'Number of rows is required'],
        min: [1, 'Rows must be at least 1'],
      },
      columns: {
        type: Number,
        required: [true, 'Number of columns is required'],
        min: [1, 'Columns must be at least 1'],
      },
      map: {
        type: [[String]], // 2D array with seat IDs or empty spaces
        required: [true, 'Seat map is required'],
      },
      legend: {
        type: Map,
        of: {
          type: String,
          enum: ['regular', 'ac_cubicle', 'premium_booth', 'unavailable', 'aisle'],
        },
        required: [true, 'Seat legend is required'],
      },
    },
    timeSlots: [
      {
        start: {
          type: String,
          required: true,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/,
            'Please provide a valid time format (HH:MM AM/PM)',
          ],
        },
        end: {
          type: String,
          required: true,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/,
            'Please provide a valid time format (HH:MM AM/PM)',
          ],
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
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
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Library admin is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    specialOffers: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        discountPercentage: {
          type: Number,
          min: [0, 'Discount cannot be negative'],
          max: [100, 'Discount cannot exceed 100%'],
        },
        validFrom: {
          type: Date,
          required: true,
        },
        validUntil: {
          type: Date,
          required: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        appliesTo: {
          seatTypes: [String],
          timeSlots: [String],
          days: [String],
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

// Virtual for area (derived from city)
librarySchema.virtual('area').get(function () {
  return this.address.city;
});

// Virtual for available seats count
librarySchema.virtual('availableSeats').get(function () {
  return this.seatTypes.reduce((total, type) => total + type.capacity, 0);
});

// Index for geospatial queries
librarySchema.index({ 'address.coordinates': '2dsphere' });

// Index for searching libraries by name, city, and facilities
librarySchema.index({ name: 'text', 'address.city': 'text', 'facilities.name': 'text' });

// Static method to get libraries by city
librarySchema.statics.getLibrariesByCity = function (city) {
  return this.find({ 'address.city': city });
};

// Static method to get featured libraries
librarySchema.statics.getFeaturedLibraries = function () {
  return this.find({ featured: true }).sort({ 'rating.average': -1 }).limit(6);
};

// Instance method to check if a library is open at a specific time
librarySchema.methods.isOpenAt = function (day, time) {
  const todaySchedule = this.openingHours.find(
    (schedule) => schedule.day === day || schedule.day.includes(day)
  );

  if (!todaySchedule || todaySchedule.isClosed) {
    return false;
  }

  // Convert time to minutes for comparison
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

  const openMinutes = convertTimeToMinutes(todaySchedule.open);
  const closeMinutes = convertTimeToMinutes(todaySchedule.close);
  const currentMinutes = convertTimeToMinutes(time);

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

const Library = mongoose.model('Library', librarySchema);

module.exports = Library;