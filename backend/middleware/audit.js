const AuditLog = require('../models/AuditLog');

// Audit logging middleware
const auditLog = (action, options = {}) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response
      setImmediate(async () => {
        try {
          const logData = {
            action,
            userId: req.user?.id || null,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            success: res.statusCode < 400,
            severity: options.severity || 'LOW',
            details: {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              ...options.details
            }
          };
          
          // Add target information if available
          if (options.getTarget && typeof options.getTarget === 'function') {
            const target = options.getTarget(req, res);
            if (target) {
              logData.targetId = target.id;
              logData.targetModel = target.model;
            }
          }
          
          // Add error message for failed requests
          if (res.statusCode >= 400) {
            try {
              const responseData = JSON.parse(data);
              logData.errorMessage = responseData.message || responseData.error || 'Unknown error';
            } catch (e) {
              logData.errorMessage = 'Failed to parse error message';
            }
          }
          
          await AuditLog.logAction(logData);
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Helper function to log security violations
const logSecurityViolation = async (req, violation, severity = 'HIGH') => {
  try {
    await AuditLog.logAction({
      action: 'SECURITY_VIOLATION',
      userId: req.user?.id || null,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      severity,
      success: false,
      details: {
        violation,
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log security violation:', error);
  }
};

// Helper function to log suspicious activity
const logSuspiciousActivity = async (req, activity, details = {}) => {
  try {
    await AuditLog.logAction({
      action: 'SUSPICIOUS_ACTIVITY',
      userId: req.user?.id || null,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      severity: 'MEDIUM',
      success: false,
      details: {
        activity,
        ...details,
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
  }
};

module.exports = {
  auditLog,
  logSecurityViolation,
  logSuspiciousActivity
};