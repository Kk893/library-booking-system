/**
 * Integration tests for Security Dashboard Service
 * Tests the complete security dashboard functionality including API endpoints
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const securityRoutes = require('../../../routes/security');
const securityDashboardService = require('../securityDashboardService');
const securityMonitorService = require('../securityMonitorService');
const auditTrailService = require('../auditTrailService');
const redisService = require('../redisService');
const User = require('../../../models/User');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/security', securityRoutes);

// Mock dependencies
jest.mock('../securityMonitorService');
jest.mock('../auditTrailService');
jest.mock('../redisService');
jest.mock('../configService');

describe('Security Dashboard Integration Tests', () => {
  let adminToken, superAdminToken, regularUserToken;
  let adminUser, superAdminUser, regularUser;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/library-test');
    }

    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin',
      libraryId: new mongoose.Types.ObjectId()
    });
    await adminUser.save();

    superAdminUser = new User({
      name: 'Super Admin User',
      email: 'superadmin@test.com',
      password: 'hashedpassword',
      role: 'superadmin'
    });
    await superAdminUser.save();

    regularUser = new User({
      name: 'Regular User',
      email: 'user@test.com',
      password: 'hashedpassword',
      role: 'user'
    });
    await regularUser.save();

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    superAdminToken = jwt.sign(
      { userId: superAdminUser._id, role: superAdminUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    regularUserToken = jwt.sign(
      { userId: regularUser._id, role: regularUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis service
    redisService.isReady = jest.fn().mockReturnValue(true);
    redisService.setWithTTL = jest.fn().mockResolvedValue();
    redisService.addToSet = jest.fn().mockResolvedValue();

    // Reset dashboard service state
    securityDashboardService.isInitialized = false;
    securityDashboardService.metricsCache = new Map();
  });

  describe('GET /api/security/overview', () => {
    it('should return security overview for admin user', async () => {
      const mockEvents = [
        {
          eventType: 'login_failure',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          userId: regularUser._id.toString()
        }
      ];
      const mockAlerts = [
        {
          severity: 'high',
          timestamp: new Date().toISOString(),
          type: 'brute_force'
        }
      ];

      securityMonitorService.getSecurityEvents.mockResolvedValue(mockEvents);
      securityMonitorService.getSecurityAlerts.mockResolvedValue(mockAlerts);

      const response = await request(app)
        .get('/api/security/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timeframe', '24h');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary.totalEvents).toBe(1);
      expect(response.body.data.summary.totalAlerts).toBe(1);
    });

    it('should return security overview with custom timeframe', async () => {
      securityMonitorService.getSecurityEvents.mockResolvedValue([]);
      securityMonitorService.getSecurityAlerts.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/security/overview?timeframe=7d')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeframe).toBe('7d');
    });

    it('should reject invalid timeframe', async () => {
      const response = await request(app)
        .get('/api/security/overview?timeframe=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should deny access to regular users', async () => {
      const response = await request(app)
        .get('/api/security/overview')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/security/overview')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/security/metrics/:type', () => {
    it('should return event metrics for admin user', async () => {
      const mockEvents = [
        {
          eventType: 'login_failure',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          userId: regularUser._id.toString(),
          deviceInfo: { ip: '192.168.1.1' }
        }
      ];

      securityMonitorService.getSecurityEvents.mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/security/metrics/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalEvents', 1);
      expect(response.body.data).toHaveProperty('eventsByType');
      expect(response.body.data).toHaveProperty('topUsers');
    });

    it('should return alert metrics for admin user', async () => {
      const mockAlerts = [
        {
          severity: 'high',
          timestamp: new Date().toISOString(),
          type: 'brute_force'
        }
      ];

      securityMonitorService.getSecurityAlerts.mockResolvedValue(mockAlerts);

      const response = await request(app)
        .get('/api/security/metrics/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAlerts', 1);
      expect(response.body.data).toHaveProperty('alertsByType');
    });

    it('should return audit metrics for admin user', async () => {
      const mockAuditEntries = [
        {
          eventType: 'data_access',
          severity: 'low',
          timestamp: new Date().toISOString(),
          userId: regularUser._id.toString()
        }
      ];

      auditTrailService.getAuditEntries.mockResolvedValue(mockAuditEntries);
      auditTrailService.verifyAuditTrailIntegrity.mockResolvedValue({ valid: true });

      const response = await request(app)
        .get('/api/security/metrics/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalEntries', 1);
      expect(response.body.data).toHaveProperty('integrityStatus');
    });

    it('should reject invalid metric type', async () => {
      const response = await request(app)
        .get('/api/security/metrics/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid metric type');
    });

    it('should apply filters correctly', async () => {
      securityMonitorService.getSecurityEvents.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/security/metrics/events?eventType=login_failure&severity=high')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(securityDashboardService.getDetailedMetrics).toHaveBeenCalledWith(
        'events',
        '24h',
        { eventType: 'login_failure', severity: 'high' }
      );
    });
  });

  describe('GET /api/security/status', () => {
    it('should return real-time security status', async () => {
      securityMonitorService.getSecurityEvents.mockResolvedValue([]);
      securityMonitorService.getSecurityAlerts.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/security/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('systemHealth');
    });

    it('should handle status errors gracefully', async () => {
      securityMonitorService.getSecurityEvents.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/security/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get security status');
    });
  });

  describe('POST /api/security/reports/generate', () => {
    it('should generate daily report for super admin', async () => {
      securityMonitorService.getSecurityEvents.mockResolvedValue([]);
      securityMonitorService.getSecurityAlerts.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/security/reports/generate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reportType: 'daily' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'daily');
      expect(response.body.data).toHaveProperty('timeframe', '24h');
      expect(response.body.data).toHaveProperty('overview');
    });

    it('should generate weekly report for super admin', async () => {
      securityMonitorService.getSecurityEvents.mockResolvedValue([]);
      securityMonitorService.getSecurityAlerts.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/security/reports/generate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reportType: 'weekly' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportType).toBe('weekly');
      expect(response.body.data.timeframe).toBe('7d');
    });

    it('should reject invalid report type', async () => {
      const response = await request(app)
        .post('/api/security/reports/generate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reportType: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should deny access to admin users', async () => {
      const response = await request(app)
        .post('/api/security/reports/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reportType: 'daily' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/security/reports/schedule', () => {
    it('should schedule report for super admin', async () => {
      const response = await request(app)
        .post('/api/security/reports/schedule')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          reportType: 'daily',
          schedule: '0 0 * * *'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('scheduleId');
      expect(response.body.data.reportType).toBe('daily');
      expect(response.body.data.schedule).toBe('0 0 * * *');
    });

    it('should require schedule parameter', async () => {
      const response = await request(app)
        .post('/api/security/reports/schedule')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reportType: 'daily' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/security/health', () => {
    it('should return system health metrics', async () => {
      const response = await request(app)
        .get('/api/security/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should handle health check errors', async () => {
      // Mock a health check error
      jest.spyOn(securityDashboardService, 'getSystemHealthMetrics')
        .mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/security/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get security health metrics');
    });
  });

  describe('GET /api/security/dashboard/config', () => {
    it('should return dashboard configuration', async () => {
      const response = await request(app)
        .get('/api/security/dashboard/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('availableTimeframes');
      expect(response.body.data).toHaveProperty('availableMetricTypes');
      expect(response.body.data).toHaveProperty('availableReportTypes');
      expect(response.body.data).toHaveProperty('refreshIntervals');
      
      expect(response.body.data.availableTimeframes).toContain('24h');
      expect(response.body.data.availableMetricTypes).toContain('events');
      expect(response.body.data.availableReportTypes).toContain('daily');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle dashboard initialization errors', async () => {
      // Mock initialization failure
      jest.spyOn(securityDashboardService, 'initialize')
        .mockRejectedValue(new Error('Initialization failed'));

      const response = await request(app)
        .get('/api/security/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to initialize security dashboard');
    });

    it('should handle service unavailable errors', async () => {
      securityMonitorService.getSecurityEvents.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/security/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get security overview');
    });

    it('should validate query parameters correctly', async () => {
      const response = await request(app)
        .get('/api/security/metrics/events?timeframe=invalid&severity=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveLength(2); // Two validation errors
    });
  });

  describe('Performance and caching', () => {
    it('should cache overview results', async () => {
      securityMonitorService.getSecurityEvents.mockResolvedValue([]);
      securityMonitorService.getSecurityAlerts.mockResolvedValue([]);

      // First request
      await request(app)
        .get('/api/security/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Second request should use cache
      await request(app)
        .get('/api/security/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should only call the service once due to caching
      expect(securityMonitorService.getSecurityEvents).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent requests efficiently', async () => {
      securityMonitorService.getSecurityEvents.mockResolvedValue([]);
      securityMonitorService.getSecurityAlerts.mockResolvedValue([]);

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() =>
        request(app)
          .get('/api/security/overview')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});