const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
// const databaseEncryptionService = require('../services/security/databaseEncryptionService');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    emailUpdates: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false // Require email verification
  },
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Library',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  privilegeLevel: {
    type: Number,
    default: function() {
      const levels = { user: 1, admin: 2, superadmin: 3 };
      return levels[this.role] || 1;
    }
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  loginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Password security fields
  passwordHistory: [{
    hash: String,
    createdAt: { type: Date, default: Date.now }
  }],
  passwordLastChanged: {
    type: Date,
    default: Date.now
  },
  forcePasswordChange: {
    type: Boolean,
    default: false
  },
  passwordStrength: {
    score: { type: Number, default: 0 },
    text: { type: String, default: 'Not Set' }
  },
  // Multi-Factor Authentication fields
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  totpSecret: {
    type: String,
    default: null
  },
  backupCodes: [{
    code: String,
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    usedAt: Date
  }],
  mfaFailedAttempts: [{
    type: Date
  }],
  lastMFAUsed: {
    type: Date,
    default: null
  },
  mfaRecovery: {
    recoveryCode: String,
    expiresAt: Date,
    used: { type: Boolean, default: false },
    createdAt: Date
  },
  // Privacy and consent management fields
  privacyConsent: {
    consents: [{
      type: {
        type: String,
        enum: ['data_processing', 'marketing', 'analytics', 'cookies', 'third_party_sharing', 'location_tracking'],
        required: true
      },
      status: {
        type: String,
        enum: ['granted', 'denied', 'withdrawn', 'pending'],
        required: true
      },
      grantedAt: Date,
      deniedAt: Date,
      withdrawnAt: Date,
      updatedAt: { type: Date, default: Date.now },
      expiresAt: Date,
      legalBasis: {
        type: String,
        enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
        default: 'consent'
      },
      purpose: { type: String, default: 'General data processing' },
      dataCategories: [{ type: String }],
      retentionPeriod: { type: String, default: '2 years' },
      withdrawalReason: String,
      version: { type: String, default: '1.0' },
      ipAddress: String,
      userAgent: String,
      metadata: { type: mongoose.Schema.Types.Mixed }
    }],
    lastUpdated: { type: Date, default: Date.now },
    version: { type: String, default: '1.0' }
  },
  privacyPreferences: {
    dataMinimization: { type: Boolean, default: true },
    anonymousAnalytics: { type: Boolean, default: false },
    marketingCommunications: { type: Boolean, default: false },
    thirdPartySharing: { type: Boolean, default: false },
    locationTracking: { type: Boolean, default: false },
    cookiePreferences: {
      essential: { type: Boolean, default: true },
      functional: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false }
    },
    dataRetentionPeriod: { type: String, default: '2 years' },
    communicationChannels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false }
    },
    lastUpdated: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Use higher cost factor for enhanced security (14 rounds)
  const saltRounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS) : 14;
  this.password = await bcrypt.hash(this.password, saltRounds);
  
  // Update password change timestamp
  if (this.isModified('password')) {
    this.passwordLastChanged = new Date();
  }
  
  next();
});

// Compare password method with timing attack protection
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Always perform bcrypt comparison to prevent timing attacks
  const startTime = process.hrtime.bigint();
  
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    
    // Add consistent delay to prevent timing analysis
    const endTime = process.hrtime.bigint();
    const elapsedMs = Number(endTime - startTime) / 1000000;
    const minDelay = 100; // Minimum 100ms delay
    
    if (elapsedMs < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsedMs));
    }
    
    return isMatch;
  } catch (error) {
    // Even on error, maintain consistent timing
    const endTime = process.hrtime.bigint();
    const elapsedMs = Number(endTime - startTime) / 1000000;
    const minDelay = 100;
    
    if (elapsedMs < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsedMs));
    }
    
    throw error;
  }
};

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1, loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 8 && !this.isLocked) { // increased from 5 to 8
    updates.$set = {
      lockUntil: Date.now() + 30 * 60 * 1000 // reduced from 2 hours to 30 minutes
    };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Invalidate all tokens
userSchema.methods.invalidateTokens = function() {
  this.tokenVersion += 1;
  return this.save();
};

// Add password to history
userSchema.methods.addToPasswordHistory = function(passwordHash) {
  const newEntry = {
    hash: passwordHash,
    createdAt: new Date()
  };
  
  this.passwordHistory = this.passwordHistory || [];
  this.passwordHistory.unshift(newEntry);
  
  // Keep only last 5 passwords
  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(0, 5);
  }
  
  return this.save();
};

// Check if password was used before
userSchema.methods.isPasswordInHistory = async function(candidatePassword) {
  if (!this.passwordHistory || this.passwordHistory.length === 0) {
    return false;
  }
  
  for (const historyEntry of this.passwordHistory) {
    const isMatch = await bcrypt.compare(candidatePassword, historyEntry.hash);
    if (isMatch) {
      return true;
    }
  }
  
  return false;
};

// Update password strength score
userSchema.methods.updatePasswordStrength = function(score, text) {
  this.passwordStrength = {
    score: score,
    text: text
  };
  return this.save();
};

// Enable MFA for user
userSchema.methods.enableMFA = function(totpSecret, backupCodes) {
  this.mfaEnabled = true;
  this.totpSecret = totpSecret;
  this.backupCodes = backupCodes || [];
  return this.save();
};

// Disable MFA for user
userSchema.methods.disableMFA = function() {
  this.mfaEnabled = false;
  this.totpSecret = null;
  this.backupCodes = [];
  this.mfaFailedAttempts = [];
  this.lastMFAUsed = null;
  this.mfaRecovery = undefined;
  return this.save();
};

// Add MFA failed attempt
userSchema.methods.addMFAFailedAttempt = function() {
  this.mfaFailedAttempts = this.mfaFailedAttempts || [];
  this.mfaFailedAttempts.push(new Date());
  
  // Keep only recent attempts (last 24 hours)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  this.mfaFailedAttempts = this.mfaFailedAttempts.filter(attempt => attempt > cutoff);
  
  return this.save();
};

// Reset MFA failed attempts
userSchema.methods.resetMFAFailedAttempts = function() {
  this.mfaFailedAttempts = [];
  return this.save();
};

// Update last MFA used timestamp
userSchema.methods.updateLastMFAUsed = function() {
  this.lastMFAUsed = new Date();
  return this.save();
};

// Use backup code
userSchema.methods.useBackupCode = async function(code) {
  const backupCode = this.backupCodes.find(bc => bc.code === code && !bc.used);
  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    await this.save();
    return true;
  }
  return false;
};

// Apply database field-level encryption - DISABLED for now
// databaseEncryptionService.applyEncryption(userSchema, 'User');

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);