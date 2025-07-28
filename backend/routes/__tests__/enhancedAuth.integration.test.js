const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { enhancedAuth, enhancedRoleAuth } = require('../../middleware/enhancedAuth');
const sessionService = require('../../services/security/sessionService');
const securityMonitorService = require('../../services/security/securityMonitorService');
const rateLimitService = require('../../services/security/rateLimitService');
const anomalyDetectionService = require('../../services/security/anomalyDetectionService');

// Mock services
jest.mock('../../services/security/sessionService');
jest.mock('../../services/security/securityMonitorService');
jest.mock('../../services/security/rateLimitService');
jest.mock('../../services/security/anomalyDetectionService');
jest.mock('../../services/security/deviceFingerprintService');

describe('Enhanced Authentication Integration Tests', () => {
  let app;
  let testUser;
  let validToken;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());
    
    // Test routes
    app.get('/protected', enhancedAuth, (req, res) => {
      res.json({ message: 'Access granted', user: req.user.email });
    });
    
    app.get('/admin', enhancedRoleAuth(['admin']), (req, res) => {
      res.json({ message: 'Admin access granted' });
    });
    
    app.get('/user', enhancedRoleAuth(['user', 'admin']), (req, res) => {
      res.json({ message: 'User access granted' });
    });

    // Create test user
    testUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      isActive: true
    };

    validToken = 'valid.jwt.token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    rateLimitService.checkRateLimit.mockResolvedValue({ allowed: true });
    securityMonitorService.logSecurityEvent.mockResolvedValue();
    anomalyDetectionService.analyzeRequest.mockResolvedValue({
      isAnomalous: false,
      score: 0.1,
      severity: 'low'
    });
  });

  describe('Enhanced Authentication Middleware', () => {
    it('should allow access with valid token', async () => {
      sessionService.validateAccessToken.mockResolvedValue({
        id: testUser._id,
        sessionId: 'session123',
        tokenVersion: 1
      });
      
      User.findById = jest.fn().mockResolvedValue(testUser);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Access granted');
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth_success',
          severity: 'low',
          userId: testUser._id
        })
      );
    });

    it('should deny access without token', async () => {
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('NO_TOKEN');
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth_attempt_no_token',
          severity: 'low'
        })
      );
    });

    it('should deny access with expired token', async () => {
      sessionService.validateAccessToken.mockRejectedValue(new Error('TOKEN_EXPIRED'));

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth_token_error',
          severity: 'medium'
        })
      );
    });

    it('should deny access for inactive user', async () => {
      sessionService.validateAccessToken.mockResolvedValue({
        id: testUser._id,
        sessionId: 'session123'
      });
      
      const inactiveUser = { ...testUser, isActive: false };
      User.findById = jest.fn().mockResolvedValue(inactiveUser);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('ACCOUNT_INACTIVE');
    });

    it('should handle rate limiting', async () => {
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: 60000
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(429);
      expect(response.body.retryAfter).toBe(60);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate_limit_exceeded',
          severity: 'medium'
        })
      );
    });

    it('should handle anomaly detection', async () => {
      sessionService.validateAccessToken.mockResolvedValue({
        id: testUser._id,
        sessionId: 'session123'
      });
      
      User.findById = jest.fn().mockResolvedValue(testUser);
      
      anomalyDetectionService.analyzeRequest.mockResolvedValue({
        isAnomalous: true,
        score: 0.9,
        severity: 'high',
        type: 'unusual_location',
        reasons: ['Login from new country']
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('ANOMALY_DETECTED');
      expect(response.body.requiresVerification).toBe(true);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'anomaly_detected',
          severity: 'high'
        })
      );
    });
  });

  describe('Enhanced Role-Based Authentication', () => {
    beforeEach(() => {
      sessionService.validateAccessToken.mockResolvedValue({
        id: testUser._id,
        sessionId: 'session123'
      });
    });

    it('should allow admin access for admin user', async () => {
      const adminUser = { ...testUser, role: 'admin' };
      User.findById = jest.fn().mockResolvedValue(adminUser);

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin access granted');
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'privilege_access',
          severity: 'low'
        })
      );
    });

    it('should deny admin access for regular user', async () => {
      User.findById = jest.fn().mockResolvedValue(testUser);

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'privilege_escalation_attempt',
          severity: 'high'
        })
      );
    });

    it('should allow user access for both user and admin roles', async () => {
      User.findById = jest.fn().mockResolvedValue(testUser);

      const response = await request(app)
        .get('/user')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User access granted');
    });
  });

  describe('Security Event Logging', () => {
    it('should log all authentication events', async () => {
      sessionService.validateAccessToken.mockResolvedValue({
        id: testUser._id,
        sessionId: 'session123'
      });
      
      User.findById = jest.fn().mockResolvedValue(testUser);

      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledTimes(2); // auth_success and privilege_access
    });

    it('should log system errors', async () => {
      sessionService.validateAccessToken.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.code).toBe('AUTH_SYSTEM_ERROR');
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth_system_error',
          severity: 'high'
        })
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing auth middleware', async () => {
      // Test that enhanced auth works with existing route patterns
      sessionService.validateAccessToken.mockResolvedValue({
        id: testUser._id,
        sessionId: 'session123'
      });
      
      User.findById = jest.fn().mockResolvedValue(testUser);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBe(testUser.email);
    });
  });
});