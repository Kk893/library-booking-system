const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
        'Please provide a valid phone number',
      ],
    },
    password: {
      type: String,
      required: function() {
        // Password is required unless social login is used
        return !this.socialProvider;
      },
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password in query results by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    socialProvider: {
      type: String,
      enum: ['google', 'facebook', null],
      default: null,
    },
    socialId: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values (for non-social users)
    },
    profilePicture: String,
    validTokens: [String], // To store valid JWT tokens for logout functionality
    lastLogin: Date,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    preferences: {
      preferredLibraryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Library',
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
      favoriteGenres: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { 
      userId: this._id,
      email: this.email,
      role: this.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    }
  );
  
  // Add to valid tokens array (limit to 5 most recent tokens)
  if (!this.validTokens) {
    this.validTokens = [];
  }
  
  this.validTokens.push(token);
  
  // Keep only the 5 most recent tokens
  if (this.validTokens.length > 5) {
    this.validTokens = this.validTokens.slice(-5);
  }
  
  return token;
};

// Method to invalidate a specific token
userSchema.methods.invalidateToken = function (tokenToInvalidate) {
  if (!this.validTokens) return;
  
  this.validTokens = this.validTokens.filter(token => token !== tokenToInvalidate);
};

// Method to invalidate all tokens (for password change, etc.)
userSchema.methods.invalidateAllTokens = function () {
  this.validTokens = [];
};

// Create a compound index for social logins
userSchema.index({ socialProvider: 1, socialId: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { socialProvider: { $ne: null } }
});

const User = mongoose.model('User', userSchema);

module.exports = User;