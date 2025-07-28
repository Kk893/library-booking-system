const mongoose = require('mongoose');
const crypto = require('crypto');
const databaseEncryptionService = require('../services/security/databaseEncryptionService');

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  keyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hashedKey: {
    type: String,
    required: true
  },
  prefix: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  permissions: [{
    type: String,
    enum: [
      'read:books',
      'write:books',
      'read:bookings',
      'write:bookings',
      'read:users',
      'write:users',
      'read:libraries',
      'write:libraries',
      'admin:all'
    ]
  }],
  scopes: [{
    type: String,
    trim: true
  }],
  rateLimit: {
    requestsPerHour: {
      type: Number,
      default: 1000
    },
    requestsPerDay: {
      type: Number,
      default: 10000
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: null
    },
    requestsToday: {
      type: Number,
      default: 0
    },
    requestsThisHour: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    lastResetHour: {
      type: Date,
      default: Date.now
    }
  },
  restrictions: {
    allowedIPs: [{
      type: String,
      validate: {
        validator: function(ip) {
          // Basic IP validation (IPv4 and IPv6)
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'localhost';
        },
        message: 'Invalid IP address format'
      }
    }],
    allowedDomains: [{
      type: String,
      trim: true
    }],
    allowedUserAgents: [{
      type: String,
      trim: true
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  rotationSchedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    intervalDays: {
      type: Number,
      default: 90
    },
    nextRotation: {
      type: Date,
      default: null
    }
  },
  metadata: {
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development'
    },
    application: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    tags: [{
      type: String,
      trim: true
    }]
  },
  securityEvents: [{
    eventType: {
      type: String,
      enum: ['created', 'used', 'rotated', 'revoked', 'suspicious_activity', 'rate_limit_exceeded']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      ip: String,
      userAgent: String,
      endpoint: String,
      additionalInfo: mongoose.Schema.Types.Mixed
    }
  }],
  revokedAt: {
    type: Date,
    default: null
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  revokedReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate API key pair (keyId and secret)
apiKeySchema.statics.generateKeyPair = function() {
  const keyId = crypto.randomBytes(16).toString('hex');
  const secret = crypto.randomBytes(32).toString('hex');
  const prefix = 'lba_' + crypto.randomBytes(4).toString('hex'); // Library Booking App prefix
  const fullKey = `${prefix}.${keyId}.${secret}`;
  
  return {
    keyId,
    secret,
    prefix,
    fullKey,
    hashedKey: crypto.createHash('sha256').update(secret).digest('hex')
  };
};

// Verify API key
apiKeySchema.methods.verifyKey = function(providedSecret) {
  const hashedProvided = crypto.createHash('sha256').update(providedSecret).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(this.hashedKey, 'hex'),
    Buffer.from(hashedProvided, 'hex')
  );
};

// Check if key is valid and active
apiKeySchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (this.revokedAt) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

// Check rate limits
apiKeySchema.methods.checkRateLimit = function() {
  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Reset hourly counter if needed
  if (this.usage.lastResetHour < currentHour) {
    this.usage.requestsThisHour = 0;
    this.usage.lastResetHour = currentHour;
  }
  
  // Reset daily counter if needed
  if (this.usage.lastResetDate < currentDay) {
    this.usage.requestsToday = 0;
    this.usage.lastResetDate = currentDay;
  }
  
  // Check limits
  if (this.usage.requestsThisHour >= this.rateLimit.requestsPerHour) {
    return { allowed: false, reason: 'hourly_limit_exceeded' };
  }
  
  if (this.usage.requestsToday >= this.rateLimit.requestsPerDay) {
    return { allowed: false, reason: 'daily_limit_exceeded' };
  }
  
  return { allowed: true };
};

// Record API key usage
apiKeySchema.methods.recordUsage = async function(requestDetails = {}) {
  this.usage.totalRequests += 1;
  this.usage.requestsThisHour += 1;
  this.usage.requestsToday += 1;
  this.usage.lastUsed = new Date();
  
  // Add security event
  this.securityEvents.push({
    eventType: 'used',
    timestamp: new Date(),
    details: {
      ip: requestDetails.ip,
      userAgent: requestDetails.userAgent,
      endpoint: requestDetails.endpoint
    }
  });
  
  // Keep only recent security events (last 1000)
  if (this.securityEvents.length > 1000) {
    this.securityEvents = this.securityEvents.slice(-1000);
  }
  
  return this.save();
};

// Check IP restrictions
apiKeySchema.methods.checkIPRestriction = function(clientIP) {
  if (!this.restrictions.allowedIPs || this.restrictions.allowedIPs.length === 0) {
    return true; // No IP restrictions
  }
  
  return this.restrictions.allowedIPs.includes(clientIP);
};

// Check domain restrictions
apiKeySchema.methods.checkDomainRestriction = function(origin) {
  if (!this.restrictions.allowedDomains || this.restrictions.allowedDomains.length === 0) {
    return true; // No domain restrictions
  }
  
  if (!origin) return false;
  
  try {
    const url = new URL(origin);
    return this.restrictions.allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );
  } catch (error) {
    return false;
  }
};

// Check permission
apiKeySchema.methods.hasPermission = function(requiredPermission) {
  if (this.permissions.includes('admin:all')) {
    return true;
  }
  
  return this.permissions.includes(requiredPermission);
};

// Revoke API key
apiKeySchema.methods.revoke = function(revokedBy, reason) {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokedReason = reason;
  
  this.securityEvents.push({
    eventType: 'revoked',
    timestamp: new Date(),
    details: {
      revokedBy: revokedBy,
      reason: reason
    }
  });
  
  return this.save();
};

// Schedule rotation
apiKeySchema.methods.scheduleRotation = function(intervalDays = 90) {
  this.rotationSchedule.enabled = true;
  this.rotationSchedule.intervalDays = intervalDays;
  this.rotationSchedule.nextRotation = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
  return this.save();
};

// Check if rotation is due
apiKeySchema.methods.isRotationDue = function() {
  if (!this.rotationSchedule.enabled) return false;
  if (!this.rotationSchedule.nextRotation) return false;
  return this.rotationSchedule.nextRotation <= new Date();
};

// Apply database field-level encryption
databaseEncryptionService.applyEncryption(apiKeySchema, 'ApiKey');

// Indexes for performance
apiKeySchema.index({ keyId: 1 });
apiKeySchema.index({ prefix: 1 });
apiKeySchema.index({ userId: 1 });
apiKeySchema.index({ isActive: 1 });
apiKeySchema.index({ expiresAt: 1 });
apiKeySchema.index({ 'rotationSchedule.nextRotation': 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);