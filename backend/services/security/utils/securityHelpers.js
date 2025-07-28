/**
 * Security Helper Functions
 * Common utility functions used across security services
 */

const crypto = require('crypto');
const { REDIS_PREFIXES, TIMEOUTS } = require('./constants');

/**
 * Generate a secure random token
 * @param {number} length - Length of the token in bytes
 * @returns {string} Hex-encoded random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a Redis key with proper prefix
 * @param {string} prefix - Redis key prefix
 * @param {string} identifier - Unique identifier
 * @returns {string} Formatted Redis key
 */
function generateRedisKey(prefix, identifier) {
  return `${prefix}${identifier}`;
}

/**
 * Calculate TTL for Redis keys based on type
 * @param {string} keyType - Type of key (session, rate_limit, etc.)
 * @returns {number} TTL in seconds
 */
function calculateTTL(keyType) {
  const ttlMap = {
    session: Math.floor(TIMEOUTS.SESSION_TTL / 1000),
    rate_limit: Math.floor(TIMEOUTS.RATE_LIMIT_WINDOW / 1000),
    token_blacklist: Math.floor(TIMEOUTS.TOKEN_BLACKLIST_TTL / 1000),
    ip_block: Math.floor(TIMEOUTS.IP_BLOCK_TTL / 1000),
    security_event: Math.floor(TIMEOUTS.SECURITY_EVENT_TTL / 1000),
  };
  
  return ttlMap[keyType] || 3600; // Default 1 hour
}

/**
 * Extract device information from request
 * @param {Object} req - Express request object
 * @returns {Object} Device information
 */
function extractDeviceInfo(req) {
  return {
    userAgent: req.get('User-Agent') || 'unknown',
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    acceptLanguage: req.get('Accept-Language') || 'unknown',
    acceptEncoding: req.get('Accept-Encoding') || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate device fingerprint
 * @param {Object} deviceInfo - Device information object
 * @returns {string} Device fingerprint hash
 */
function generateDeviceFingerprint(deviceInfo) {
  const fingerprintData = [
    deviceInfo.userAgent,
    deviceInfo.acceptLanguage,
    deviceInfo.acceptEncoding,
  ].join('|');
  
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Sanitize sensitive data for logging
 * @param {Object} data - Data object to sanitize
 * @returns {Object} Sanitized data object
 */
function sanitizeForLogging(data) {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };
  
  function sanitizeObject(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    }
  }
  
  sanitizeObject(sanitized);
  return sanitized;
}

/**
 * Calculate progressive delay for rate limiting
 * @param {number} attemptCount - Number of failed attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Calculated delay in milliseconds
 */
function calculateProgressiveDelay(attemptCount, baseDelay = 1000) {
  // Exponential backoff: baseDelay * 2^(attemptCount - 1)
  // Capped at 30 seconds
  const delay = baseDelay * Math.pow(2, Math.min(attemptCount - 1, 5));
  return Math.min(delay, 30000);
}

/**
 * Validate IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP address
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // IPv4 validation - more strict to reject leading zeros and invalid ranges
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/;
  
  // IPv6 validation - supports compressed notation and various formats
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Generate correlation ID for request tracking
 * @returns {string} Unique correlation ID
 */
function generateCorrelationId() {
  return `req_${Date.now()}_${generateSecureToken(8)}`;
}

/**
 * Format security event for logging
 * @param {string} eventType - Type of security event
 * @param {string} severity - Event severity level
 * @param {Object} details - Event details
 * @param {string} userId - User ID (optional)
 * @returns {Object} Formatted security event
 */
function formatSecurityEvent(eventType, severity, details, userId = null) {
  return {
    eventType,
    severity,
    userId,
    details: sanitizeForLogging(details),
    timestamp: new Date().toISOString(),
    correlationId: generateCorrelationId(),
  };
}

module.exports = {
  generateSecureToken,
  generateRedisKey,
  calculateTTL,
  extractDeviceInfo,
  generateDeviceFingerprint,
  sanitizeForLogging,
  calculateProgressiveDelay,
  isValidIP,
  generateCorrelationId,
  formatSecurityEvent,
};