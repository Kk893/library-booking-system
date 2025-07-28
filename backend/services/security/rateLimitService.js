/**
 * Advanced Rate Limiting Service
 * Implements sliding window rate limiting with Redis backend, progressive delays,
 * IP blocking, and dynamic rate limit adjustment based on threat detection
 */

const redisService = require('./redisService');
const { 
  REDIS_PREFIXES, 
  TIMEOUTS, 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS,
  RATE_LIMIT_KEYS 
} = require('./utils/constants');
const { 
  generateRedisKey, 
  calculateProgressiveDelay, 
  isValidIP,
  formatSecurityEvent,
  sanitizeForLogging 
} = require('./utils/securityHelpers');

class RateLimitService {
  constructor() {
    // Default rate limit configurations
    this.defaultLimits = {
      [RATE_LIMIT_KEYS.GENERAL_API]: { window: 15 * 60 * 1000, max: 200 }, // 200 requests per 15 minutes
      [RATE_LIMIT_KEYS.AUTH_ATTEMPT]: { window: 15 * 60 * 1000, max: 10 }, // 10 attempts per 15 minutes
      [RATE_LIMIT_KEYS.PASSWORD_RESET]: { window: 60 * 60 * 1000, max: 3 }, // 3 attempts per hour
      [RATE_LIMIT_KEYS.FILE_UPLOAD]: { window: 60 * 60 * 1000, max: 20 }, // 20 uploads per hour
      [RATE_LIMIT_KEYS.MFA_ATTEMPT]: { window: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 minutes
    };

    // Threat level multipliers for dynamic adjustment
    this.threatMultipliers = {
      low: 1.0,
      medium: 0.5,
      high: 0.25,
      critical: 0.1
    };

    // Progressive delay configuration
    this.progressiveDelayConfig = {
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      multiplier: 2
    };

    // IP blocking configuration
    this.ipBlockConfig = {
      threshold: 50, // Block after 50 violations
      duration: 60 * 60 * 1000, // 1 hour block
      exponentialBackoff: true
    };
  }

  /**
   * Check rate limit using sliding window algorithm
   * @param {string} identifier - Rate limit identifier (IP, user, etc.)
   * @param {string} limitType - Type of rate limit (from RATE_LIMIT_KEYS)
   * @param {Object} options - Additional options
   * @returns {Object} Rate limit result
   */
  async checkRateLimit(identifier, limitType = RATE_LIMIT_KEYS.GENERAL_API, options = {}) {
    try {
      if (!identifier) {
        throw new Error('Rate limit identifier is required');
      }

      const config = this.defaultLimits[limitType] || this.defaultLimits[RATE_LIMIT_KEYS.GENERAL_API];
      const windowMs = options.windowMs || config.window;
      const maxRequests = options.maxRequests || config.max;

      // Apply threat level adjustment if provided
      const adjustedMax = options.threatLevel 
        ? Math.floor(maxRequests * (this.threatMultipliers[options.threatLevel] || 1.0))
        : maxRequests;

      const result = await this._slidingWindowRateLimit(identifier, limitType, windowMs, adjustedMax);
      
      // Log rate limit events for monitoring
      if (result.blocked) {
        await this._logRateLimitEvent(identifier, limitType, result, options);
      }

      return result;
    } catch (error) {
      console.error('Rate Limit Service: Error checking rate limit:', sanitizeForLogging({
        identifier,
        limitType,
        error: error.message
      }));
      
      // Get config for fallback values
      const config = this.defaultLimits[limitType] || this.defaultLimits[RATE_LIMIT_KEYS.GENERAL_API];
      const windowMs = options.windowMs || config.window;
      const maxRequests = options.maxRequests || config.max;
      
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        blocked: false,
        count: 0,
        remaining: maxRequests || 100,
        resetTime: Date.now() + windowMs,
        error: error.message
      };
    }
  }

  /**
   * Sliding window rate limiting implementation
   * @param {string} identifier - Rate limit identifier
   * @param {string} limitType - Type of rate limit
   * @param {number} windowMs - Time window in milliseconds
   * @param {number} maxRequests - Maximum requests allowed
   * @returns {Object} Rate limit result
   */
  async _slidingWindowRateLimit(identifier, limitType, windowMs, maxRequests) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, `${limitType}:${identifier}`);
    
    // Use Redis sorted set for sliding window
    if (!redisService.client) {
      console.warn('Redis client not available, skipping rate limiting');
      return { allowed: true, resetTime: now + windowMs };
    }
    const multi = redisService.client.multi();
    
    // Remove expired entries
    multi.zRemRangeByScore(key, 0, windowStart);
    
    // Add current request
    multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    
    // Count current requests in window
    multi.zCard(key);
    
    // Set expiration
    multi.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await multi.exec();
    const currentCount = results[2]; // zCard result
    
    const blocked = currentCount > maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);
    const resetTime = now + windowMs;

    return {
      allowed: !blocked,
      blocked,
      count: currentCount,
      remaining,
      resetTime,
      windowMs,
      maxRequests
    };
  }

  /**
   * Apply progressive delay for consecutive failed attempts
   * @param {string} identifier - Identifier for tracking attempts
   * @param {number} attemptCount - Current attempt count
   * @param {Object} options - Configuration options
   * @returns {Object} Delay information
   */
  async applyProgressiveDelay(identifier, attemptCount, options = {}) {
    try {
      const config = { ...this.progressiveDelayConfig, ...options };
      
      // Calculate delay with custom base delay if provided
      const baseDelay = config.baseDelay || this.progressiveDelayConfig.baseDelay;
      const maxDelay = config.maxDelay || this.progressiveDelayConfig.maxDelay;
      
      const delay = baseDelay * Math.pow(2, Math.min(attemptCount - 1, 5));
      const cappedDelay = Math.min(delay, maxDelay);

      // Store delay information in Redis
      const delayKey = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, `delay:${identifier}`);
      const delayData = {
        attemptCount,
        delay: cappedDelay,
        appliedAt: Date.now(),
        expiresAt: Date.now() + cappedDelay
      };

      await redisService.setWithTTL(
        delayKey, 
        JSON.stringify(delayData), 
        Math.ceil(cappedDelay / 1000)
      );

      // Update IP reputation if identifier is an IP
      if (isValidIP(identifier)) {
        await this._updateIPReputation(identifier, -1); // Negative score for failed attempts
      }

      return {
        delay: cappedDelay,
        attemptCount,
        shouldDelay: cappedDelay > 0,
        nextAttemptAt: Date.now() + cappedDelay
      };
    } catch (error) {
      console.error('Rate Limit Service: Error applying progressive delay:', sanitizeForLogging({
        identifier,
        attemptCount,
        error: error.message
      }));
      
      // Return minimal delay on error
      return {
        delay: 1000,
        attemptCount,
        shouldDelay: true,
        nextAttemptAt: Date.now() + 1000
      };
    }
  }

  /**
   * Check if IP should be temporarily blocked
   * @param {string} ip - IP address to check
   * @returns {Object} Block status information
   */
  async checkIPBlock(ip) {
    try {
      if (!isValidIP(ip)) {
        return { blocked: false, reason: 'invalid_ip' };
      }

      const blockKey = generateRedisKey(REDIS_PREFIXES.IP_REPUTATION, `block:${ip}`);
      const blockData = await redisService.get(blockKey);

      if (blockData) {
        const parsed = JSON.parse(blockData);
        const now = Date.now();
        
        if (parsed.expiresAt > now) {
          return {
            blocked: true,
            reason: parsed.reason,
            expiresAt: parsed.expiresAt,
            remainingTime: parsed.expiresAt - now,
            blockLevel: parsed.blockLevel
          };
        } else {
          // Block expired, clean up
          await redisService.delete(blockKey);
        }
      }

      return { blocked: false };
    } catch (error) {
      console.error('Rate Limit Service: Error checking IP block:', sanitizeForLogging({
        ip,
        error: error.message
      }));
      
      // Fail open
      return { blocked: false, error: error.message };
    }
  }

  /**
   * Temporarily block an IP address
   * @param {string} ip - IP address to block
   * @param {string} reason - Reason for blocking
   * @param {Object} options - Block configuration options
   */
  async blockIP(ip, reason, options = {}) {
    try {
      if (!isValidIP(ip)) {
        throw new Error('Invalid IP address');
      }

      const config = { ...this.ipBlockConfig, ...options };
      const blockKey = generateRedisKey(REDIS_PREFIXES.IP_REPUTATION, `block:${ip}`);
      
      // Get current block level for exponential backoff
      let blockLevel = 1;
      const existingBlock = await redisService.get(blockKey);
      if (existingBlock) {
        const parsed = JSON.parse(existingBlock);
        blockLevel = (parsed.blockLevel || 1) + 1;
      }

      const duration = config.exponentialBackoff 
        ? config.duration * Math.pow(2, blockLevel - 1)
        : config.duration;

      const blockData = {
        ip,
        reason,
        blockedAt: Date.now(),
        expiresAt: Date.now() + duration,
        blockLevel,
        duration
      };

      await redisService.setWithTTL(
        blockKey,
        JSON.stringify(blockData),
        Math.ceil(duration / 1000)
      );

      // Log security event
      await this._logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, SEVERITY_LEVELS.HIGH, {
        ip,
        reason,
        blockLevel,
        duration,
        action: 'ip_blocked'
      });

      console.log('Rate Limit Service: IP blocked:', sanitizeForLogging({
        ip,
        reason,
        blockLevel,
        duration
      }));

      return {
        blocked: true,
        blockLevel,
        duration,
        expiresAt: blockData.expiresAt
      };
    } catch (error) {
      console.error('Rate Limit Service: Error blocking IP:', sanitizeForLogging({
        ip,
        reason,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Update IP reputation score
   * @param {string} ip - IP address
   * @param {number} scoreAdjustment - Score adjustment (positive or negative)
   * @param {Object} context - Additional context
   */
  async _updateIPReputation(ip, scoreAdjustment, context = {}) {
    try {
      const currentScore = await redisService.updateIPReputation(ip, scoreAdjustment);
      
      // Check if IP should be blocked based on reputation
      if (currentScore <= -this.ipBlockConfig.threshold) {
        await this.blockIP(ip, 'reputation_threshold_exceeded', {
          ...context,
          reputationScore: currentScore
        });
      }

      return currentScore;
    } catch (error) {
      console.error('Rate Limit Service: Error updating IP reputation:', sanitizeForLogging({
        ip,
        scoreAdjustment,
        error: error.message
      }));
    }
  }

  /**
   * Dynamically adjust rate limits based on threat level
   * @param {string} endpoint - Endpoint identifier
   * @param {string} threatLevel - Threat level (low, medium, high, critical)
   * @param {Object} options - Additional options
   */
  async adjustRateLimits(endpoint, threatLevel, options = {}) {
    try {
      const multiplier = this.threatMultipliers[threatLevel];
      if (!multiplier) {
        throw new Error(`Invalid threat level: ${threatLevel}`);
      }

      const adjustmentKey = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, `adjustment:${endpoint}`);
      const adjustmentData = {
        endpoint,
        threatLevel,
        multiplier,
        adjustedAt: Date.now(),
        expiresAt: Date.now() + (options.duration || 60 * 60 * 1000), // Default 1 hour
        reason: options.reason || 'threat_detected'
      };

      await redisService.setWithTTL(
        adjustmentKey,
        JSON.stringify(adjustmentData),
        Math.ceil((options.duration || 60 * 60 * 1000) / 1000)
      );

      // Log security event
      await this._logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, SEVERITY_LEVELS.MEDIUM, {
        endpoint,
        threatLevel,
        multiplier,
        action: 'rate_limit_adjusted',
        reason: adjustmentData.reason
      });

      console.log('Rate Limit Service: Rate limits adjusted:', sanitizeForLogging({
        endpoint,
        threatLevel,
        multiplier
      }));

      return adjustmentData;
    } catch (error) {
      console.error('Rate Limit Service: Error adjusting rate limits:', sanitizeForLogging({
        endpoint,
        threatLevel,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Get current rate limit adjustment for an endpoint
   * @param {string} endpoint - Endpoint identifier
   * @returns {Object|null} Current adjustment or null
   */
  async getRateLimitAdjustment(endpoint) {
    try {
      const adjustmentKey = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, `adjustment:${endpoint}`);
      const adjustmentData = await redisService.get(adjustmentKey);
      
      if (adjustmentData) {
        const parsed = JSON.parse(adjustmentData);
        if (parsed.expiresAt > Date.now()) {
          return parsed;
        } else {
          // Adjustment expired, clean up
          await redisService.delete(adjustmentKey);
        }
      }

      return null;
    } catch (error) {
      console.error('Rate Limit Service: Error getting rate limit adjustment:', sanitizeForLogging({
        endpoint,
        error: error.message
      }));
      return null;
    }
  }

  /**
   * Reset rate limit for an identifier
   * @param {string} identifier - Rate limit identifier
   * @param {string} limitType - Type of rate limit
   */
  async resetRateLimit(identifier, limitType = RATE_LIMIT_KEYS.GENERAL_API) {
    try {
      const key = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, `${limitType}:${identifier}`);
      await redisService.delete(key);
      
      console.log('Rate Limit Service: Rate limit reset:', sanitizeForLogging({
        identifier,
        limitType
      }));

      return true;
    } catch (error) {
      console.error('Rate Limit Service: Error resetting rate limit:', sanitizeForLogging({
        identifier,
        limitType,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Get rate limit status for an identifier
   * @param {string} identifier - Rate limit identifier
   * @param {string} limitType - Type of rate limit
   * @returns {Object} Rate limit status
   */
  async getRateLimitStatus(identifier, limitType = RATE_LIMIT_KEYS.GENERAL_API) {
    try {
      const config = this.defaultLimits[limitType] || this.defaultLimits[RATE_LIMIT_KEYS.GENERAL_API];
      const key = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, `${limitType}:${identifier}`);
      
      const now = Date.now();
      const windowStart = now - config.window;
      
      // Count current requests in window
      const currentCount = await redisService.client.zCount(key, windowStart, now);
      const remaining = Math.max(0, config.max - currentCount);
      
      return {
        identifier,
        limitType,
        current: currentCount,
        limit: config.max,
        remaining,
        windowMs: config.window,
        resetTime: now + config.window
      };
    } catch (error) {
      console.error('Rate Limit Service: Error getting rate limit status:', sanitizeForLogging({
        identifier,
        limitType,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Log rate limit event for monitoring
   * @param {string} identifier - Rate limit identifier
   * @param {string} limitType - Type of rate limit
   * @param {Object} result - Rate limit result
   * @param {Object} options - Additional options
   */
  async _logRateLimitEvent(identifier, limitType, result, options = {}) {
    try {
      const eventData = {
        identifier,
        limitType,
        count: result.count,
        limit: result.maxRequests,
        blocked: result.blocked,
        ip: options.ip,
        userAgent: options.userAgent,
        endpoint: options.endpoint
      };

      await this._logSecurityEvent(
        SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
        result.blocked ? SEVERITY_LEVELS.MEDIUM : SEVERITY_LEVELS.LOW,
        eventData
      );
    } catch (error) {
      console.error('Rate Limit Service: Error logging rate limit event:', sanitizeForLogging({
        identifier,
        limitType,
        error: error.message
      }));
    }
  }

  /**
   * Log security event
   * @param {string} eventType - Type of security event
   * @param {string} severity - Event severity
   * @param {Object} details - Event details
   */
  async _logSecurityEvent(eventType, severity, details) {
    try {
      const event = formatSecurityEvent(eventType, severity, details);
      await redisService.storeSecurityEvent(event.correlationId, event);
    } catch (error) {
      console.error('Rate Limit Service: Error logging security event:', sanitizeForLogging({
        eventType,
        severity,
        error: error.message
      }));
    }
  }

  /**
   * Get rate limiting statistics
   * @param {string} timeframe - Timeframe for statistics (1h, 24h, 7d)
   * @returns {Object} Rate limiting statistics
   */
  async getStatistics(timeframe = '1h') {
    try {
      // This would typically query a time-series database or aggregated logs
      // For now, return basic statistics from Redis
      const stats = {
        timeframe,
        totalRequests: 0,
        blockedRequests: 0,
        uniqueIPs: 0,
        topBlockedIPs: [],
        rateLimitTypes: {}
      };

      // In a production system, you would implement proper statistics collection
      // This is a simplified version for demonstration
      return stats;
    } catch (error) {
      console.error('Rate Limit Service: Error getting statistics:', sanitizeForLogging({
        timeframe,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Emergency rate limit override (for emergency situations)
   * @param {string} action - Override action (disable, enable, adjust)
   * @param {Object} options - Override options
   */
  async emergencyOverride(action, options = {}) {
    try {
      const overrideKey = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, 'emergency_override');
      const overrideData = {
        action,
        options,
        activatedAt: Date.now(),
        activatedBy: options.adminUserId || 'system',
        reason: options.reason || 'emergency_override',
        expiresAt: Date.now() + (options.duration || 60 * 60 * 1000) // Default 1 hour
      };

      await redisService.setWithTTL(
        overrideKey,
        JSON.stringify(overrideData),
        Math.ceil((options.duration || 60 * 60 * 1000) / 1000)
      );

      // Log critical security event
      await this._logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, SEVERITY_LEVELS.CRITICAL, {
        action: 'emergency_override_activated',
        overrideAction: action,
        activatedBy: overrideData.activatedBy,
        reason: overrideData.reason
      });

      console.warn('Rate Limit Service: Emergency override activated:', sanitizeForLogging({
        action,
        activatedBy: overrideData.activatedBy,
        reason: overrideData.reason
      }));

      return overrideData;
    } catch (error) {
      console.error('Rate Limit Service: Error activating emergency override:', sanitizeForLogging({
        action,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Check if emergency override is active
   * @returns {Object|null} Active override or null
   */
  async getEmergencyOverride() {
    try {
      const overrideKey = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, 'emergency_override');
      const overrideData = await redisService.get(overrideKey);
      
      if (overrideData) {
        const parsed = JSON.parse(overrideData);
        if (parsed.expiresAt > Date.now()) {
          return parsed;
        } else {
          // Override expired, clean up
          await redisService.delete(overrideKey);
        }
      }

      return null;
    } catch (error) {
      console.error('Rate Limit Service: Error getting emergency override:', sanitizeForLogging({
        error: error.message
      }));
      return null;
    }
  }
}

// Export singleton instance
module.exports = new RateLimitService();