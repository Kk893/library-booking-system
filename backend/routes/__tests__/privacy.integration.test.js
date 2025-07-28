const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Import routes and middleware
const privacyRoutes = require('../privacy');
const authMiddleware = require('../../middleware/authMiddleware');
const User = require('../../models/User');

// Mock services
jest.mock('../../services/security/rightToBeForgottenService', () => ({
  initiateDataDeletion: jest.fn().mockResolvedValue({
    requestId: 'test-request-123',
    status: 'pending',
    requestedAt: new Date(),
    scheduledDeletionDate: new Date()
  }),
  exportUserData: jest.fn().mockResolvedValue({
    exportId: 'test-export-123',
    userId: 'test-user-id',
    exportedAt: new Date(),
    format: 'json',
    dataIntegrityHash: 'test-hash',
    data: {
      profile: { name: 'Test User', email: 'test@example.com' },
      bookings: [],
      favorites: [],
      ratings: [],
      notifications: [],
      privacy: { consents: {}, preferences: {} }
    }
  }),
  getDeletionRequestStatus: jest.fn().mockResolvedValue({
    requestId: 'test-request-123',
    status: 'pending',
    message: 'Deletion request is being processed'
  }),
  cancelDeletionRequest: jest.fn().mockResolvedValue({
    requestId: 'test-request-123',
    status: 'cancelled',
    cancelledAt: new Date(),
    reason: 'User requested cancellation'
  })
}));

jest.mock('../../services/security/privacyConsentService', () => ({
  recordConsent: jest.fn().mockResolvedValue({
    type: 'data_processing',
    status: 'granted',
    updatedAt: new Date()
  }),
  getUserConsents: jest.fn().mockResolvedValue([
    {
      type: 'data_processing',
      status: 'granted',
      grantedAt: new Date(),
      legalBasis: 'consent'
    }
  ]),
  withdrawConsent: jest.fn().mockResolvedValue({
    type: 'marketing',
    status: 'withdrawn',
    withdrawnAt: new Date(),
    withdrawalReason: 'User requested withdrawal'
  })
}));

jest.mock('../../services/security/rateLimitService', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../services/security/securityMonitorService', () => ({
  getRecentEvents: jest.fn().mockResolvedValue([]),
  logSecurityEvent: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../services/security/validationService', () => ({
  joi: require('joi')
}));

describe('Privacy Routes Integration Tests', () => {
  let app;
  let mongoServer;
  let testUser;
  let authToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      if (req.headers.authorization) {
        req.user = { id: 'test-user-id', email: 'test@example.com' };
        req.ip = '127.0.0.1';
      }
      next();
    });
    
    app.use('/api/privacy', privacyRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});

    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
    await testUser.save();

    // Create auth token
    authToken = jwt.sign(
      { userId: testUser._id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/privacy/data-deletion/request', () => {
    it('should successfully initiate data deletion request', async () => {
      const response = await request(app)
        .post('/api/privacy/data-deletion/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'User requested deletion',
          includeAuditLogs: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requestId');
      expect(response.body.data).toHaveProperty('status', 'pending');
      expect(response.body.data).toHaveProperty('message');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/privacy/data-deletion/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'a'.repeat(501), // Too long
          includeAuditLogs: 'invalid' // Should be boolean
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/privacy/data-deletion/request')
        .send({
          reason: 'User requested deletion'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/privacy/data-export', () => {
    it('should successfully export user data', async () => {
      const response = await request(app)
        .get('/api/privacy/data-export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'json',
          includeAuditLogs: 'true'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('exportId');
      expect(response.body.data).toHaveProperty('dataIntegrityHash');
      expect(response.body.data.data).toHaveProperty('profile');
      expect(response.body.data.data).toHaveProperty('bookings');
      expect(response.body.data.data).toHaveProperty('privacy');
      
      // Check headers
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['x-export-id']).toBeDefined();
      expect(response.headers['x-data-integrity-hash']).toBeDefined();
    });

    it('should validate format parameter', async () => {
      const response = await request(app)
        .get('/api/privacy/data-export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'xml' // Invalid format
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FORMAT');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/privacy/data-export');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/privacy/data-deletion/status/:requestId', () => {
    it('should get deletion request status', async () => {
      const requestId = 'test-request-123';
      
      const response = await request(app)
        .get(`/api/privacy/data-deletion/status/${requestId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requestId', requestId);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('message');
    });

    it('should validate request ID', async () => {
      const response = await request(app)
        .get('/api/privacy/data-deletion/status/')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/privacy/data-deletion/status/test-request-123');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/privacy/data-deletion/cancel/:requestId', () => {
    it('should cancel deletion request', async () => {
      const requestId = 'test-request-123';
      
      const response = await request(app)
        .delete(`/api/privacy/data-deletion/cancel/${requestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'User changed mind'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requestId', requestId);
      expect(response.body.data).toHaveProperty('status', 'cancelled');
      expect(response.body.data).toHaveProperty('reason', 'User changed mind');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/privacy/data-deletion/cancel/test-request-123');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/privacy/consent/record', () => {
    it('should record user consent', async () => {
      const response = await request(app)
        .post('/api/privacy/consent/record')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: 'data_processing',
          status: 'granted',
          purpose: 'General data processing'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('consentType', 'data_processing');
      expect(response.body.data).toHaveProperty('status', 'granted');
      expect(response.body.data).toHaveProperty('recordedAt');
    });

    it('should validate consent data', async () => {
      const response = await request(app)
        .post('/api/privacy/consent/record')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: 'invalid_type',
          status: 'granted'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/privacy/consent/record')
        .send({
          consentType: 'data_processing',
          status: 'granted'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/privacy/consent/history', () => {
    it('should get user consent history', async () => {
      const response = await request(app)
        .get('/api/privacy/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('consents');
      expect(response.body.data).toHaveProperty('totalConsents');
      expect(response.body.data).toHaveProperty('activeConsents');
      expect(Array.isArray(response.body.data.consents)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/privacy/consent/history');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/privacy/consent/withdraw', () => {
    it('should withdraw user consent', async () => {
      const response = await request(app)
        .post('/api/privacy/consent/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: 'marketing',
          reason: 'No longer interested'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('consentType', 'marketing');
      expect(response.body.data).toHaveProperty('status', 'withdrawn');
      expect(response.body.data).toHaveProperty('withdrawnAt');
      expect(response.body.data).toHaveProperty('reason', 'User requested withdrawal');
    });

    it('should validate withdrawal request', async () => {
      const response = await request(app)
        .post('/api/privacy/consent/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/privacy/consent/withdraw')
        .send({
          consentType: 'marketing'
        });

      expect(response.status).toBe(401);
    });
  });
});