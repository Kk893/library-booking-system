const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'REGISTER',
      'CREATE_LIBRARY', 'UPDATE_LIBRARY', 'DELETE_LIBRARY',
      'CREATE_BOOK', 'UPDATE_BOOK', 'DELETE_BOOK',
      'CREATE_BOOKING', 'UPDATE_BOOKING', 'CANCEL_BOOKING',
      'CREATE_OFFER', 'UPDATE_OFFER', 'DELETE_OFFER',
      'CREATE_ADMIN', 'UPDATE_ADMIN', 'DELETE_ADMIN',
      'ASSIGN_LIBRARY', 'REVOKE_ACCESS',
      'PASSWORD_RESET', 'EMAIL_VERIFICATION',
      'SUSPICIOUS_ACTIVITY', 'SECURITY_VIOLATION'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['User', 'Library', 'Book', 'Booking', 'Offer']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// Static method to log actions
auditLogSchema.statics.logAction = async function(actionData) {
  try {
    const log = new this(actionData);
    await log.save();
    
    // Alert on high severity actions
    if (actionData.severity === 'HIGH' || actionData.severity === 'CRITICAL') {
      console.warn(`🚨 SECURITY ALERT: ${actionData.action} by user ${actionData.userId} from IP ${actionData.ipAddress}`);
      // Here you could integrate with alerting systems like Slack, email, etc.
    }
    
    return log;
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);