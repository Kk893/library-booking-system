/**
 * CAPTCHA Verification Service
 * Integrates with Google reCAPTCHA for suspicious activity verification
 * Provides CAPTCHA challenge triggers and validation middleware
 */

const axios = require('axios');
const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS,
  ERROR_CODES 
} = require('./utils/constants');
const { 
  formatSecurityEvent,
  sanitizeForLogging 
} = require('./utils/securityHelpers');
const redisService = require('./redisService');

class CaptchaService {
  constructor() {
    this.recaptchaVerifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    
    // CAPTCHA trigger thresholds
    this.triggerThresholds = {
      failedLogins: 3,
      rateLimitViolations: 5,
      suspiciousActivity: 2,
      ipReputationScore: -10
    };

    // CAPTCHA requirement duration (how long CAPTCHA is required after trigger)
    this.captchaRequiredDuration = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Initialize CAPTCHA service with configuration validation
   */
  async initialize() {
    try {
      // Read environment variables during initialization
      this.recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
      this.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;

      if (!this.recaptchaSecretKey || !this.recaptchaSiteKey) {
        console.warn('CAPTCHA Service: reCAPTCHA keys not configured, CAPTCHA verification disabled');
        return false;
      }

      console.log('CAPTCHA Service: Initialized successfully');
      return true;
    } catch (error) {
      console.error('CAPTCHA Service: Initialization failed:', sanitizeForLogging({
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Verify reCAPTCHA token with Google's API
   * @param {string} token - reCAPTCHA token from client
   * @param {string} remoteip - Client IP address (optional)
   * @returns {Object} Verification result
   */
  async verifyRecaptcha(token, remoteip = null) {
    try {
      if (!this.recaptchaSecretKey) {
        console.warn('CAPTCHA Service: reCAPTCHA not configured, skipping verification');
        return {
          success: true,
          score: 1.0,
          action: 'login',
          challenge_ts: new Date().toISOString(),
          hostname: 'localhost',
          bypassed: true
        };
      }

      if (!token) {
        return {
          success: false,
          'error-codes': ['missing-input-response'],
          message: 'CAPTCHA token is required'
        };
      }

      const params = new URLSearchParams({
        secret: this.recaptchaSecretKey,
        response: token
      });

      if (remoteip) {
        params.append('remoteip', remoteip);
      }

      const response = await axios.post(this.recaptchaVerifyUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000 // 5 second timeout
      });

      const result = response.data;

      // Log verification attempt
      await this._logCaptchaEvent('captcha_verification', {
        success: result.success,
        score: result.score,
        action: result.action,
        hostname: result.hostname,
        remoteip: remoteip,
        errorCodes: result['error-codes']
      });

      return result;
    } catch (error) {
      console.error('CAPTCHA Service: reCAPTCHA verification failed:', sanitizeForLogging({
        error: error.message,
        remoteip
      }));

      // Return failure result on error
      return {
        success: false,
        'error-codes': ['timeout-or-duplicate'],
        message: 'CAPTCHA verification failed due to service error'
      };
    }
  }

  /**
   * Check if CAPTCHA is required for a given identifier
   * @param {string} identifier - IP address or user identifier
   * @param {string} context - Context for CAPTCHA requirement (login, register, etc.)
   * @returns {Object} CAPTCHA requirement status
   */
  async isCaptchaRequired(identifier, context = 'general') {
    try {
      const captchaKey = `captcha_required:${context}:${identifier}`;
      const requirementData = await redisService.get(captchaKey);

      if (requirementData) {
        const parsed = JSON.parse(requirementData);
        if (parsed.expiresAt > Date.now()) {
          return {
            required: true,
            reason: parsed.reason,
            triggeredAt: parsed.triggeredAt,
            expiresAt: parsed.expiresAt,
            siteKey: this.recaptchaSiteKey
          };
        } else {
          // Requirement expired, clean up
          await redisService.delete(captchaKey);
        }
      }

      return {
        required: false,
        siteKey: this.recaptchaSiteKey
      };
    } catch (error) {
      console.error('CAPTCHA Service: Error checking CAPTCHA requirement:', sanitizeForLogging({
        identifier,
        context,
        error: error.message
      }));

      // Fail safe - don't require CAPTCHA on error
      return {
        required: false,
        error: error.message,
        siteKey: this.recaptchaSiteKey
      };
    }
  }

  /**
   * Trigger CAPTCHA requirement for an identifier
   * @param {string} identifier - IP address or user identifier
   * @param {string} reason - Reason for triggering CAPTCHA
   * @param {string} context - Context for CAPTCHA requirement
   * @param {Object} options - Additional options
   */
  async triggerCaptchaRequirement(identifier, reason, context = 'general', options = {}) {
    try {
      const captchaKey = `captcha_required:${context}:${identifier}`;
      const duration = options.duration || this.captchaRequiredDuration;
      
      const requirementData = {
        identifier,
        reason,
        context,
        triggeredAt: Date.now(),
        expiresAt: Date.now() + duration,
        triggerCount: 1
      };

      // Check if CAPTCHA is already required and increment trigger count
      const existingRequirement = await redisService.get(captchaKey);
      if (existingRequirement) {
        const existing = JSON.parse(existingRequirement);
        requirementData.triggerCount = (existing.triggerCount || 1) + 1;
        requirementData.triggeredAt = existing.triggeredAt; // Keep original trigger time
      }

      await redisService.setWithTTL(
        captchaKey,
        JSON.stringify(requirementData),
        Math.ceil(duration / 1000)
      );

      // Log CAPTCHA trigger event
      await this._logCaptchaEvent('captcha_triggered', {
        identifier,
        reason,
        context,
        triggerCount: requirementData.triggerCount,
        duration
      });

      console.log('CAPTCHA Service: CAPTCHA requirement triggered:', sanitizeForLogging({
        identifier,
        reason,
        context,
        triggerCount: requirementData.triggerCount
      }));

      return requirementData;
    } catch (error) {
      console.error('CAPTCHA Service: Error triggering CAPTCHA requirement:', sanitizeForLogging({
        identifier,
        reason,
        context,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Clear CAPTCHA requirement for an identifier
   * @param {string} identifier - IP address or user identifier
   * @param {string} context - Context for CAPTCHA requirement
   */
  async clearCaptchaRequirement(identifier, context = 'general') {
    try {
      const captchaKey = `captcha_required:${context}:${identifier}`;
      await redisService.delete(captchaKey);

      // Log CAPTCHA clear event
      await this._logCaptchaEvent('captcha_cleared', {
        identifier,
        context
      });

      console.log('CAPTCHA Service: CAPTCHA requirement cleared:', sanitizeForLogging({
        identifier,
        context
      }));

      return true;
    } catch (error) {
      console.error('CAPTCHA Service: Error clearing CAPTCHA requirement:', sanitizeForLogging({
        identifier,
        context,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Check if CAPTCHA should be triggered based on activity patterns
   * @param {string} identifier - IP address or user identifier
   * @param {string} activityType - Type of activity (failed_login, rate_limit_violation, etc.)
   * @param {Object} activityData - Additional activity data
   * @returns {boolean} Whether CAPTCHA should be triggered
   */
  async shouldTriggerCaptcha(identifier, activityType, activityData = {}) {
    try {
      const activityKey = `captcha_activity:${activityType}:${identifier}`;
      
      // Get current activity count
      const currentCount = await redisService.get(activityKey) || '0';
      const count = parseInt(currentCount, 10) + 1;
      
      // Update activity count with 1 hour TTL
      await redisService.setWithTTL(activityKey, count.toString(), 3600);

      // Check if threshold is exceeded
      const threshold = this.triggerThresholds[activityType] || this.triggerThresholds.suspiciousActivity;
      
      if (count >= threshold) {
        // Trigger CAPTCHA requirement
        await this.triggerCaptchaRequirement(
          identifier,
          `${activityType}_threshold_exceeded`,
          activityData.context || 'general',
          activityData.options || {}
        );
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('CAPTCHA Service: Error checking CAPTCHA trigger:', sanitizeForLogging({
        identifier,
        activityType,
        error: error.message
      }));
      return false;
    }
  }

  /**
   * Validate CAPTCHA token and clear requirement if successful
   * @param {string} token - reCAPTCHA token from client
   * @param {string} identifier - IP address or user identifier
   * @param {string} context - Context for CAPTCHA validation
   * @param {Object} options - Additional validation options
   * @returns {Object} Validation result
   */
  async validateCaptcha(token, identifier, context = 'general', options = {}) {
    try {
      // Check if CAPTCHA is required
      const requirement = await this.isCaptchaRequired(identifier, context);
      
      if (!requirement.required && !options.force) {
        return {
          success: true,
          required: false,
          message: 'CAPTCHA not required'
        };
      }

      // Verify reCAPTCHA token
      const verificationResult = await this.verifyRecaptcha(token, options.remoteip);
      
      if (verificationResult.success) {
        // Check score for reCAPTCHA v3 (if available)
        const minScore = options.minScore || 0.5;
        if (verificationResult.score && verificationResult.score < minScore) {
          return {
            success: false,
            required: true,
            message: 'CAPTCHA score too low',
            score: verificationResult.score,
            minScore
          };
        }

        // Clear CAPTCHA requirement on successful validation
        if (requirement.required) {
          await this.clearCaptchaRequirement(identifier, context);
        }

        return {
          success: true,
          required: requirement.required,
          score: verificationResult.score,
          message: 'CAPTCHA validation successful'
        };
      } else {
        return {
          success: false,
          required: true,
          message: verificationResult.message || 'CAPTCHA validation failed',
          errorCodes: verificationResult['error-codes']
        };
      }
    } catch (error) {
      console.error('CAPTCHA Service: Error validating CAPTCHA:', sanitizeForLogging({
        identifier,
        context,
        error: error.message
      }));

      return {
        success: false,
        required: true,
        message: 'CAPTCHA validation error',
        error: error.message
      };
    }
  }

  /**
   * Create CAPTCHA validation middleware
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware function
   */
  createCaptchaMiddleware(options = {}) {
    return async (req, res, next) => {
      try {
        const identifier = req.ip || req.connection.remoteAddress;
        const context = options.context || 'general';
        const force = options.force || false;

        // Check if CAPTCHA is required
        const requirement = await this.isCaptchaRequired(identifier, context);
        
        if (!requirement.required && !force) {
          return next();
        }

        // Get CAPTCHA token from request
        const token = req.body['g-recaptcha-response'] || 
                     req.body.captchaToken || 
                     req.headers['x-captcha-token'];

        if (!token) {
          return res.status(400).json({
            success: false,
            error: {
              code: ERROR_CODES.VALIDATION_FAILED,
              message: 'CAPTCHA token is required',
              captchaRequired: true,
              siteKey: this.recaptchaSiteKey
            }
          });
        }

        // Validate CAPTCHA
        const validation = await this.validateCaptcha(token, identifier, context, {
          remoteip: identifier,
          minScore: options.minScore,
          force
        });

        if (validation.success) {
          // Add CAPTCHA validation info to request
          req.captchaValidated = true;
          req.captchaScore = validation.score;
          return next();
        } else {
          return res.status(400).json({
            success: false,
            error: {
              code: ERROR_CODES.VALIDATION_FAILED,
              message: validation.message,
              captchaRequired: true,
              siteKey: this.recaptchaSiteKey,
              errorCodes: validation.errorCodes
            }
          });
        }
      } catch (error) {
        console.error('CAPTCHA Middleware: Error processing request:', sanitizeForLogging({
          error: error.message,
          ip: req.ip
        }));

        return res.status(500).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_FAILED,
            message: 'CAPTCHA validation error',
            captchaRequired: true,
            siteKey: this.recaptchaSiteKey
          }
        });
      }
    };
  }

  /**
   * Get CAPTCHA statistics and monitoring data
   * @param {string} timeframe - Timeframe for statistics (1h, 24h, 7d)
   * @returns {Object} CAPTCHA statistics
   */
  async getStatistics(timeframe = '1h') {
    try {
      // This would typically query a time-series database or aggregated logs
      // For now, return basic statistics structure
      const stats = {
        timeframe,
        totalCaptchaRequests: 0,
        successfulVerifications: 0,
        failedVerifications: 0,
        averageScore: 0,
        topTriggerReasons: [],
        activeRequirements: 0
      };

      // In a production system, you would implement proper statistics collection
      return stats;
    } catch (error) {
      console.error('CAPTCHA Service: Error getting statistics:', sanitizeForLogging({
        timeframe,
        error: error.message
      }));
      throw error;
    }
  }

  /**
   * Log CAPTCHA-related security events
   * @param {string} eventType - Type of CAPTCHA event
   * @param {Object} details - Event details
   */
  async _logCaptchaEvent(eventType, details) {
    try {
      const event = formatSecurityEvent(
        SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        SEVERITY_LEVELS.MEDIUM,
        {
          captchaEvent: eventType,
          ...details
        }
      );

      await redisService.storeSecurityEvent(event.correlationId, event);
    } catch (error) {
      console.error('CAPTCHA Service: Error logging CAPTCHA event:', sanitizeForLogging({
        eventType,
        error: error.message
      }));
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      configured: !!(this.recaptchaSecretKey && this.recaptchaSiteKey),
      secretKeyConfigured: !!this.recaptchaSecretKey,
      siteKeyConfigured: !!this.recaptchaSiteKey,
      verifyUrl: this.recaptchaVerifyUrl,
      triggerThresholds: this.triggerThresholds
    };
  }
}

// Export singleton instance
module.exports = new CaptchaService();