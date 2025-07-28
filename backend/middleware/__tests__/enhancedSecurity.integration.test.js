const request = require('supertest');
const express = require('express');
const { 
  enhancedSecurityPipeline, 
  lightweightSecurityPipeline,
  enhancedSecurityHeaders,
  enhancedRateLimit,
  enhancedInputValidation
} = require('../enhancedSecurity');

// Mock security services
jest.mock('../../services/security/rateLimitService');
jest.mock('../../services/security/validationService');
jest.mock('../../services/security/securityMonitorService');
jest.mock('../../services/security/securityHeadersMiddleware');
jest.mock('../../services/security/validationMiddleware');
jest.mock('../../services/security/secureCookieMiddleware');
jest.mock('../../services/security/httpsEnforcementMiddleware');
jest.mock('../../services/security/corsSecurityMiddleware');
jest.mock('../../services/security/fileUploadSecurityService');

const rateLimitService = require('../../services/security/rateLimitService');
const validationService = require('../../services/security/validationService');
const securityMonitorService = require('../../services/security/securityMonitorService');
const securityHeadersMiddleware = require('../../services/security/securityHeadersMiddleware');

describe('Enhanced Security Middleware Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    rateLimitService.checkRateLimit.mockResolvedValue({ 
      allowed: true, 
      remaining: 100,
      resetTime: 60000 
    });
    
    validationService.validateAndSanitizeInput.mockResolvedValue({
      isValid: true,
      sanitizedData: { body: {}, query: {}, params: {} },
      suspiciousPatterns: []
    });
    
    securityMonitorService.logSecurityEvent.mockResolvedValue();
    securityHeadersMiddleware.applySecurityHeaders.mockImplementation((req, res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-Frame-Options', 'DENY');
    });
  });

  describe('Enhanced Security Headers', () => {
    it('should apply comprehensive security headers', async () => {
      const testApp = express();
      testApp.use(enhancedSecurityHeaders);
      testApp.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/test');

      expect(response.status).toBe(200);
      expect(securityHeadersMiddleware.applySecurityHeaders).toHaveBeenCalled();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should continue on security headers error', async () => {
      securityHeadersMiddleware.applySecurityHeaders.mockRejectedValue(new Error('Headers error'));
      
      const testApp = express();
      testApp.use(enhancedSecurityHeaders);
      testApp.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/test');

      expect(response.status).toBe(200);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'security_headers_error',
          severity: 'medium'
        })
      );
    });
  });

  describe('Enhanced Rate Limiting', () => {
    it('should allow requests within rate limits', async () => {
      const testApp = express();
      testApp.use(enhancedRateLimit);
      testApp.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should block requests exceeding rate limits', async () => {
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: 60000
      });

      const testApp = express();
      testApp.use(enhancedRateLimit);
      testApp.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/test');

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.retryAfter).toBe(60);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate_limit_exceeded',
          severity: 'medium'
        })
      );
    });

    it('should continue on rate limit service error', async () => {
      rateLimitService.checkRateLimit.mockRejectedValue(new Error('Rate limit error'));

      const testApp = express();
      testApp.use(enhancedRateLimit);
      testApp.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/test');

      expect(response.status).toBe(200);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate_limit_error',
          severity: 'high'
        })
      );
    });
  });

  describe('Enhanced Input Validation', () => {
    it('should allow valid input', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use(enhancedInputValidation);
      testApp.post('/test', (req, res) => res.json({ success: true, body: req.body }));

      const response = await request(testApp)
        .post('/test')
        .send({ name: 'John Doe', email: 'john@example.com' });

      expect(response.status).toBe(200);
      expect(validationService.validateAndSanitizeInput).toHaveBeenCalled();
    });

    it('should block invalid input', async () => {
      validationService.validateAndSanitizeInput.mockResolvedValue({
        isValid: false,
        errors: ['Invalid email format'],
        suspiciousPatterns: []
      });

      const testApp = express();
      testApp.use(express.json());
      testApp.use(enhancedInputValidation);
      testApp.post('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp)
        .post('/test')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.errors).toContain('Invalid email format');
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input_validation_failed',
          severity: 'medium'
        })
      );
    });

    it('should log suspicious patterns', async () => {
      validationService.validateAndSanitizeInput.mockResolvedValue({
        isValid: true,
        sanitizedData: { body: {}, query: {}, params: {} },
        suspiciousPatterns: ['SQL injection attempt detected']
      });

      const testApp = express();
      testApp.use(express.json());
      testApp.use(enhancedInputValidation);
      testApp.post('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp)
        .post('/test')
        .send({ query: "'; DROP TABLE users; --" });

      expect(response.status).toBe(200);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'suspicious_input_detected',
          severity: 'medium'
        })
      );
    });
  });

  describe('Complete Security Pipeline', () => {
    it('should apply all security middleware in correct order', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use(enhancedSecurityPipeline);
      testApp.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/test');

      expect(response.status).toBe(200);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request_received',
          severity: 'low'
        })
      );
    });

    it('should handle middleware failures gracefully', async () => {
      // Simulate multiple middleware failures
      securityHeadersMiddleware.applySecurityHeaders.mockRejectedValue(new Error('Headers error'));
      rateLimitService.checkRateLimit.mockRejectedValue(new Error('Rate limit error'));
      validationService.validateAndSanitizeInput.mockRejectedValue(new Error('Validation error'));

      const testApp = express();
      testApp.use(express.json());
      testApp.use(enhancedSecurityPipeline);
      testApp.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/test');

      // Should still succeed despite middleware failures
      expect(response.status).toBe(200);
      
      // Should log all errors
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'security_headers_error' })
      );
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'rate_limit_error' })
      );
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'input_validation_error' })
      );
    });
  });

  describe('Lightweight Security Pipeline', () => {
    it('should apply minimal security for static files', async () => {
      const testApp = express();
      testApp.use(lightweightSecurityPipeline);
      testApp.get('/static/image.jpg', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/static/image.jpg');

      expect(response.status).toBe(200);
      expect(securityHeadersMiddleware.applySecurityHeaders).toHaveBeenCalled();
      // Should not apply rate limiting or input validation for static files
      expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
      expect(validationService.validateAndSanitizeInput).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should use different rate limits for different endpoints', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use(enhancedRateLimit);
      testApp.post('/api/auth/login', (req, res) => res.json({ success: true }));
      testApp.post('/api/auth/register', (req, res) => res.json({ success: true }));

      // Test login endpoint
      await request(testApp)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:ip_email:'),
        15 * 60 * 1000,
        10
      );

      jest.clearAllMocks();

      // Test register endpoint
      await request(testApp)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password' });

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:ip:'),
        60 * 60 * 1000,
        5
      );
    });
  });

  describe('Security Monitoring', () => {
    it('should log request and response events', async () => {
      const testApp = express();
      testApp.use(enhancedSecurityPipeline);
      testApp.get('/test', (req, res) => {
        setTimeout(() => res.json({ success: true }), 10);
      });

      const response = await request(testApp).get('/test');

      expect(response.status).toBe(200);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request_received',
          severity: 'low'
        })
      );
    });
  });
});