/**
 * Integration Tests for CAPTCHA Service
 * Tests Google reCAPTCHA integration, CAPTCHA challenge triggers,
 * validation middleware, and complete verification flow
 */

const captchaService = require('../captchaService');
const redisService = require('../redisService');
const axios = require('axios');
const { ERROR_CODES, SECURITY_EVENTS, SEVERITY_LEVELS } = require('../utils/constants');

// Mock axios for reCAPTCHA API calls
jest.mock('axios');

// Mock Redis service
jest.mock('../redisService', () => ({
  get: jest.fn(),
  setWithTTL: jest.fn(),
  delete: jest.fn(),
  storeSecurityEvent: jest.fn(),
}));

describe('CAPTCHA Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables for testing
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret-key';
    process.env.RECAPTCHA_SITE_KEY = 'test-site-key';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.RECAPTCHA_SECRET_KEY;
    delete process.env.RECAPTCHA_SITE_KEY;
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      const result = await captchaService.initialize();
      expect(result).toBe(true);
    });

    it('should handle missing reCAPTCHA configuration gracefully', async () => {
      delete process.env.RECAPTCHA_SECRET_KEY;
      delete process.env.RECAPTCHA_SITE_KEY;
      
      const result = await captchaService.initialize();
      expect(result).toBe(false);
    });

    it('should provide health status information', async () => {
      await captchaService.initialize(); // Initialize first
      const health = captchaService.getHealthStatus();
      
      expect(health.configured).toBe(true);
      expect(health.secretKeyConfigured).toBe(true);
      expect(health.siteKeyConfigured).toBe(true);
      expect(health.verifyUrl).toBe('https://www.google.com/recaptcha/api/siteverify');
      expect(health.triggerThresholds).toBeDefined();
    });
  });

  describe('reCAPTCHA Verification', () => {
    beforeEach(async () => {
      await captchaService.initialize(); // Initialize before each test
    });

    it('should successfully verify valid reCAPTCHA token', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.9,
          action: 'login',
          challenge_ts: '2025-01-27T10:30:00Z',
          hostname: 'localhost'
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await captchaService.verifyRecaptcha('valid-token', '192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.score).toBe(0.9);
      expect(result.action).toBe('login');
      expect(axios.post).toHaveBeenCalledWith(
        'https://www.google.com/recaptcha/api/siteverify',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000
        })
      );
      expect(redisService.storeSecurityEvent).toHaveBeenCalled();
    });

    it('should handle invalid reCAPTCHA token', async () => {
      const mockResponse = {
        data: {
          success: false,
          'error-codes': ['invalid-input-response']
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await captchaService.verifyRecaptcha('invalid-token');

      expect(result.success).toBe(false);
      expect(result['error-codes']).toContain('invalid-input-response');
    });

    it('should handle missing CAPTCHA token', async () => {
      const result = await captchaService.verifyRecaptcha('');

      expect(result.success).toBe(false);
      expect(result['error-codes']).toContain('missing-input-response');
      expect(result.message).toBe('CAPTCHA token is required');
    });

    it('should handle reCAPTCHA API timeout', async () => {
      axios.post.mockRejectedValue(new Error('Request timeout'));

      const result = await captchaService.verifyRecaptcha('test-token');

      expect(result.success).toBe(false);
      expect(result['error-codes']).toContain('timeout-or-duplicate');
      expect(result.message).toBe('CAPTCHA verification failed due to service error');
    });

    it('should bypass verification when not configured', async () => {
      delete process.env.RECAPTCHA_SECRET_KEY;
      await captchaService.initialize(); // Re-initialize without secret key
      
      const result = await captchaService.verifyRecaptcha('test-token');

      expect(result.success).toBe(true);
      expect(result.bypassed).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });

  describe('CAPTCHA Requirement Management', () => {
    beforeEach(async () => {
      await captchaService.initialize(); // Initialize before each test
    });

    it('should check CAPTCHA requirement status', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await captchaService.isCaptchaRequired('192.168.1.1', 'login');

      expect(result.required).toBe(false);
      expect(result.siteKey).toBe('test-site-key');
    });

    it('should return active CAPTCHA requirement', async () => {
      const requirementData = {
        reason: 'failed_login_threshold_exceeded',
        triggeredAt: Date.now() - 60000,
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(requirementData));

      const result = await captchaService.isCaptchaRequired('192.168.1.1', 'login');

      expect(result.required).toBe(true);
      expect(result.reason).toBe('failed_login_threshold_exceeded');
      expect(result.siteKey).toBe('test-site-key');
    });

    it('should clean up expired CAPTCHA requirements', async () => {
      const expiredRequirement = {
        reason: 'failed_login_threshold_exceeded',
        triggeredAt: Date.now() - 120000,
        expiresAt: Date.now() - 60000 // Expired
      };
      redisService.get.mockResolvedValue(JSON.stringify(expiredRequirement));
      redisService.delete.mockResolvedValue(true);

      const result = await captchaService.isCaptchaRequired('192.168.1.1', 'login');

      expect(result.required).toBe(false);
      expect(redisService.delete).toHaveBeenCalled();
    });

    it('should trigger CAPTCHA requirement', async () => {
      redisService.get.mockResolvedValue(null); // No existing requirement
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await captchaService.triggerCaptchaRequirement(
        '192.168.1.1',
        'failed_login_threshold_exceeded',
        'login'
      );

      expect(result.identifier).toBe('192.168.1.1');
      expect(result.reason).toBe('failed_login_threshold_exceeded');
      expect(result.context).toBe('login');
      expect(result.triggerCount).toBe(1);
      expect(redisService.setWithTTL).toHaveBeenCalled();
      expect(redisService.storeSecurityEvent).toHaveBeenCalled();
    });

    it('should increment trigger count for repeated triggers', async () => {
      const existingRequirement = {
        triggerCount: 2,
        triggeredAt: Date.now() - 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(existingRequirement));
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await captchaService.triggerCaptchaRequirement(
        '192.168.1.1',
        'repeated_violation',
        'login'
      );

      expect(result.triggerCount).toBe(3);
      expect(result.triggeredAt).toBe(existingRequirement.triggeredAt);
    });

    it('should clear CAPTCHA requirement', async () => {
      redisService.delete.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await captchaService.clearCaptchaRequirement('192.168.1.1', 'login');

      expect(result).toBe(true);
      expect(redisService.delete).toHaveBeenCalledWith('captcha_required:login:192.168.1.1');
      expect(redisService.storeSecurityEvent).toHaveBeenCalled();
    });
  });

  describe('CAPTCHA Trigger Logic', () => {
    it('should trigger CAPTCHA after failed login threshold', async () => {
      redisService.get.mockResolvedValue('2'); // 2 previous attempts
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const shouldTrigger = await captchaService.shouldTriggerCaptcha(
        '192.168.1.1',
        'failedLogins',
        { context: 'login' }
      );

      expect(shouldTrigger).toBe(true);
      expect(redisService.setWithTTL).toHaveBeenCalledWith(
        'captcha_activity:failedLogins:192.168.1.1',
        '3',
        3600
      );
    });

    it('should not trigger CAPTCHA below threshold', async () => {
      redisService.get.mockResolvedValue('1'); // 1 previous attempt
      redisService.setWithTTL.mockResolvedValue(true);

      const shouldTrigger = await captchaService.shouldTriggerCaptcha(
        '192.168.1.1',
        'failedLogins'
      );

      expect(shouldTrigger).toBe(false);
    });

    it('should handle different activity types with different thresholds', async () => {
      redisService.get.mockResolvedValue('4'); // 4 previous violations
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const shouldTrigger = await captchaService.shouldTriggerCaptcha(
        '192.168.1.1',
        'rateLimitViolations'
      );

      expect(shouldTrigger).toBe(true); // Threshold is 5, so 4+1=5 triggers
    });

    it('should use default threshold for unknown activity types', async () => {
      redisService.get.mockResolvedValue('1'); // 1 previous attempt
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const shouldTrigger = await captchaService.shouldTriggerCaptcha(
        '192.168.1.1',
        'unknownActivity'
      );

      expect(shouldTrigger).toBe(true); // Default threshold is 2, so 1+1=2 triggers
    });
  });

  describe('CAPTCHA Validation', () => {
    beforeEach(async () => {
      await captchaService.initialize(); // Initialize before each test
    });

    it('should validate CAPTCHA successfully and clear requirement', async () => {
      // Mock CAPTCHA requirement
      const requirementData = {
        required: true,
        reason: 'failed_login_threshold_exceeded',
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(requirementData));
      
      // Mock successful reCAPTCHA verification
      const mockResponse = {
        data: {
          success: true,
          score: 0.8,
          action: 'login'
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.storeSecurityEvent.mockResolvedValue(true);
      redisService.delete.mockResolvedValue(true);

      const result = await captchaService.validateCaptcha('valid-token', '192.168.1.1', 'login');

      expect(result.success).toBe(true);
      expect(result.score).toBe(0.8);
      expect(result.message).toBe('CAPTCHA validation successful');
      expect(redisService.delete).toHaveBeenCalled(); // Requirement cleared
    });

    it('should reject CAPTCHA with low score', async () => {
      const requirementData = {
        required: true,
        reason: 'suspicious_activity',
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(requirementData));
      
      const mockResponse = {
        data: {
          success: true,
          score: 0.3, // Low score
          action: 'login'
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await captchaService.validateCaptcha(
        'low-score-token',
        '192.168.1.1',
        'login',
        { minScore: 0.5 }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('CAPTCHA score too low');
      expect(result.score).toBe(0.3);
      expect(result.minScore).toBe(0.5);
    });

    it('should skip validation when CAPTCHA not required', async () => {
      redisService.get.mockResolvedValue(null); // No requirement

      const result = await captchaService.validateCaptcha('token', '192.168.1.1', 'login');

      expect(result.success).toBe(true);
      expect(result.required).toBe(false);
      expect(result.message).toBe('CAPTCHA not required');
    });

    it('should handle validation errors gracefully', async () => {
      // Mock the isCaptchaRequired method to throw an error
      redisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await captchaService.validateCaptcha('token', '192.168.1.1', 'login');

      // When there's an error checking CAPTCHA requirement, it should fail safe and not require CAPTCHA
      expect(result.success).toBe(true);
      expect(result.required).toBe(false);
      expect(result.message).toBe('CAPTCHA not required');
    });
  });

  describe('CAPTCHA Middleware', () => {
    let req, res, next;

    beforeEach(async () => {
      await captchaService.initialize(); // Initialize before each test
      
      req = {
        ip: '192.168.1.1',
        body: {},
        headers: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should pass through when CAPTCHA not required', async () => {
      redisService.get.mockResolvedValue(null); // No requirement
      
      const middleware = captchaService.createCaptchaMiddleware({ context: 'login' });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should require CAPTCHA token when CAPTCHA is required', async () => {
      const requirementData = {
        required: true,
        reason: 'failed_login_threshold_exceeded',
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(requirementData));

      const middleware = captchaService.createCaptchaMiddleware({ context: 'login' });
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'CAPTCHA token is required',
          captchaRequired: true,
          siteKey: 'test-site-key'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate CAPTCHA token from request body', async () => {
      const requirementData = {
        required: true,
        reason: 'failed_login_threshold_exceeded',
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(requirementData));
      
      const mockResponse = {
        data: {
          success: true,
          score: 0.8,
          action: 'login'
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.storeSecurityEvent.mockResolvedValue(true);
      redisService.delete.mockResolvedValue(true);

      req.body['g-recaptcha-response'] = 'valid-token';

      const middleware = captchaService.createCaptchaMiddleware({ context: 'login' });
      await middleware(req, res, next);

      expect(req.captchaValidated).toBe(true);
      expect(req.captchaScore).toBe(0.8);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should validate CAPTCHA token from custom header', async () => {
      const requirementData = {
        required: true,
        reason: 'suspicious_activity',
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(requirementData));
      
      const mockResponse = {
        data: {
          success: true,
          score: 0.9,
          action: 'login'
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.storeSecurityEvent.mockResolvedValue(true);
      redisService.delete.mockResolvedValue(true);

      req.headers['x-captcha-token'] = 'header-token';

      const middleware = captchaService.createCaptchaMiddleware({ context: 'login' });
      await middleware(req, res, next);

      expect(req.captchaValidated).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid CAPTCHA token', async () => {
      const requirementData = {
        required: true,
        reason: 'failed_login_threshold_exceeded',
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(requirementData));
      
      const mockResponse = {
        data: {
          success: false,
          'error-codes': ['invalid-input-response']
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      req.body.captchaToken = 'invalid-token';

      const middleware = captchaService.createCaptchaMiddleware({ context: 'login' });
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: expect.stringContaining('CAPTCHA validation failed'),
          captchaRequired: true,
          siteKey: 'test-site-key',
          errorCodes: ['invalid-input-response']
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle middleware errors gracefully', async () => {
      redisService.get.mockRejectedValue(new Error('Redis connection failed'));

      const middleware = captchaService.createCaptchaMiddleware({ context: 'login' });
      await middleware(req, res, next);

      // The middleware should handle the error and call next() since CAPTCHA is not required when there's an error
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should force CAPTCHA validation when configured', async () => {
      redisService.get.mockResolvedValue(null); // No requirement
      
      req.body.captchaToken = 'force-token';
      
      const mockResponse = {
        data: {
          success: true,
          score: 0.7,
          action: 'login'
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const middleware = captchaService.createCaptchaMiddleware({ 
        context: 'login',
        force: true 
      });
      await middleware(req, res, next);

      expect(req.captchaValidated).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide CAPTCHA statistics', async () => {
      const stats = await captchaService.getStatistics('1h');

      expect(stats.timeframe).toBe('1h');
      expect(stats).toHaveProperty('totalCaptchaRequests');
      expect(stats).toHaveProperty('successfulVerifications');
      expect(stats).toHaveProperty('failedVerifications');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('topTriggerReasons');
      expect(stats).toHaveProperty('activeRequirements');
    });

    it('should handle different timeframes for statistics', async () => {
      const timeframes = ['1h', '24h', '7d'];

      for (const timeframe of timeframes) {
        const stats = await captchaService.getStatistics(timeframe);
        expect(stats.timeframe).toBe(timeframe);
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete failed login to CAPTCHA flow', async () => {
      // Simulate multiple failed login attempts
      redisService.get.mockResolvedValueOnce('2'); // 2 previous attempts
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      // Should trigger CAPTCHA after 3rd attempt
      const shouldTrigger = await captchaService.shouldTriggerCaptcha(
        '192.168.1.1',
        'failedLogins',
        { context: 'login' }
      );

      expect(shouldTrigger).toBe(true);

      // Check that CAPTCHA is now required
      const requirementData = {
        required: true,
        reason: 'failedLogins_threshold_exceeded',
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(requirementData));

      const requirement = await captchaService.isCaptchaRequired('192.168.1.1', 'login');
      expect(requirement.required).toBe(true);

      // Validate successful CAPTCHA
      const mockResponse = {
        data: {
          success: true,
          score: 0.8,
          action: 'login'
        }
      };
      axios.post.mockResolvedValue(mockResponse);
      redisService.delete.mockResolvedValue(true);

      const validation = await captchaService.validateCaptcha('valid-token', '192.168.1.1', 'login');
      expect(validation.success).toBe(true);
      expect(redisService.delete).toHaveBeenCalled(); // Requirement cleared
    });

    it('should handle concurrent CAPTCHA requirements', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const triggerPromises = [
        captchaService.triggerCaptchaRequirement('192.168.1.1', 'reason1', 'context1'),
        captchaService.triggerCaptchaRequirement('192.168.1.2', 'reason2', 'context2'),
        captchaService.triggerCaptchaRequirement('192.168.1.3', 'reason3', 'context3')
      ];

      const results = await Promise.all(triggerPromises);

      results.forEach((result, index) => {
        expect(result.identifier).toBe(`192.168.1.${index + 1}`);
        expect(result.reason).toBe(`reason${index + 1}`);
        expect(result.context).toBe(`context${index + 1}`);
      });

      expect(redisService.setWithTTL).toHaveBeenCalledTimes(3);
      expect(redisService.storeSecurityEvent).toHaveBeenCalledTimes(3);
    });
  });
});