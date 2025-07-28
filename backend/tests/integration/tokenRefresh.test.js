/**
 * Integration Tests for Token Refresh Functionality
 * Tests the complete token refresh flow including endpoint and middleware
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('../../models/User');
const sessionService = require('../../services/security/sessionService');
const redisService = require('../../services/security/redisService');
const { connectDB, clearDB, closeDB } = require('../helpers/database');

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  // Import auth routes
  const authRoutes = require('../../routes/auth');
  app.use('/api/auth', authRoutes);
  
  return app;
};

describe('Token Refresh Integration Tests', () => {
  let testUser;
  let validTokenPair;
  let expiredAccessToken;
  let app;

  beforeAll(async () => {
    await connectDB();
    await sessionService.initialize();
    await redisService.initialize();
  });

  afterAll(async () => {
    await clearDB();
    await closeDB();
  });

  beforeEach(async () => {
    // Set up environment variables for testing
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
    
    // Create test app
    app = createTestApp();
    
    // Clear database and Redis
    await User.deleteMany({});
    await redisService.flushAll();

    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
      isActive: true,
      isVerified: true
    });
    await testUser.save();

    // Generate valid token pair
    const mockReq = {
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      headers: { 'user-agent': 'test-user-agent' }
    };
    
    validTokenPair = await sessionService.generateTokenPair(testUser, mockReq);

    // Create an expired access token for testing
    expiredAccessToken = jwt.sign(
      {
        id: testUser._id.toString(),
        email: testUser.email,
        role: testUser.role,
        sessionId: validTokenPair.sessionId,
        deviceFingerprint: validTokenPair.deviceFingerprint,
        tokenVersion: 0,
        type: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' } // Already expired
    );
  });

  describe('POST /api/auth/refresh', () => {
    it('should successfully refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        tokenType: 'Bearer'
      });
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBe(validTokenPair.refreshToken);
      expect(response.body.expiresIn).toBe(900); // 15 minutes
      expect(response.body.user).toMatchObject({
        id: testUser._id.toString(),
        email: testUser.email,
        role: testUser.role
      });

      // Verify new access token is valid
      const decoded = jwt.verify(response.body.accessToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(testUser._id.toString());
      expect(decoded.sessionId).toBe(validTokenPair.sessionId);
    });

    it('should refresh token using refresh token from cookie', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${validTokenPair.refreshToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should refresh token using X-Refresh-Token header', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('X-Refresh-Token', validTokenPair.refreshToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should return 401 when no refresh token provided', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    });

    it('should return 401 when refresh token is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Invalid refresh token. Please login again.',
        code: 'REFRESH_TOKEN_INVALID'
      });
    });

    it('should return 401 when refresh token is expired', async () => {
      // Create expired refresh token
      const expiredRefreshToken = jwt.sign(
        {
          id: testUser._id.toString(),
          sessionId: validTokenPair.sessionId,
          deviceFingerprint: validTokenPair.deviceFingerprint,
          tokenVersion: 0,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: expiredRefreshToken
        })
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Refresh token expired. Please login again.',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    });

    it('should return 401 when refresh token is blacklisted', async () => {
      // Blacklist the refresh token
      await sessionService.blacklistToken(validTokenPair.refreshToken);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(401);

      expect(response.body.code).toBe('REFRESH_TOKEN_INVALID');
    });

    it('should return 401 when user does not exist', async () => {
      // Delete the user
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    });

    it('should return 403 when user account is deactivated', async () => {
      // Deactivate user account
      testUser.isActive = false;
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(403);

      expect(response.body).toMatchObject({
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    });

    it('should return 401 when session is invalidated', async () => {
      // Invalidate the session
      await sessionService.invalidateSession(validTokenPair.sessionId, testUser._id.toString());

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(401);

      expect(response.body.code).toBe('REFRESH_TOKEN_INVALID');
    });

    it('should detect device fingerprint mismatch', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('User-Agent', 'different-user-agent')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(401);

      expect(response.body.code).toBe('REFRESH_TOKEN_INVALID');
    });

    it('should set secure cookies on successful refresh', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('SameSite=Strict');
    });
  });

  describe('Token Refresh Middleware Integration', () => {
    it('should automatically refresh expired access token on protected route', async () => {
      // First, make a request with expired access token and valid refresh token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredAccessToken}`)
        .set('Cookie', [`refreshToken=${validTokenPair.refreshToken}`])
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: testUser._id.toString(),
        email: testUser.email
      });

      // Check if new access token was set in cookie
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
        expect(accessTokenCookie).toBeDefined();
      }
    });

    it('should fail when both access and refresh tokens are invalid', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .set('Cookie', ['refreshToken=invalid-refresh-token'])
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    it('should work with valid access token without refresh', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validTokenPair.accessToken}`)
        .expect(200);

      expect(response.body.user.id).toBe(testUser._id.toString());
    });
  });

  describe('Token Refresh Security', () => {
    it('should log security events on token refresh', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(200);

      // Verify security event was logged
      const events = await redisService.getSecurityEvents(`TOKEN_REFRESH_${validTokenPair.sessionId}`);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should update session last activity on refresh', async () => {
      const initialSessionInfo = await sessionService.getSessionInfo(validTokenPair.sessionId);
      const initialLastActivity = new Date(initialSessionInfo.lastActivity);

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(200);

      const updatedSessionInfo = await sessionService.getSessionInfo(validTokenPair.sessionId);
      const updatedLastActivity = new Date(updatedSessionInfo.lastActivity);

      expect(updatedLastActivity.getTime()).toBeGreaterThan(initialLastActivity.getTime());
    });

    it('should maintain same session ID across refreshes', async () => {
      const response1 = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokenPair.refreshToken
        })
        .expect(200);

      const response2 = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: response1.body.refreshToken
        })
        .expect(200);

      // Decode tokens to verify session ID consistency
      const token1 = jwt.decode(response1.body.accessToken);
      const token2 = jwt.decode(response2.body.accessToken);

      expect(token1.sessionId).toBe(token2.sessionId);
      expect(token1.sessionId).toBe(validTokenPair.sessionId);
    });

    it('should handle concurrent refresh requests gracefully', async () => {
      const refreshPromises = Array(5).fill().map(() =>
        request(app)
          .post('/api/auth/refresh')
          .send({
            refreshToken: validTokenPair.refreshToken
          })
      );

      const responses = await Promise.all(refreshPromises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // All should have the same session ID
      const sessionIds = responses.map(response => {
        const decoded = jwt.decode(response.body.accessToken);
        return decoded.sessionId;
      });

      expect(new Set(sessionIds).size).toBe(1); // All same session ID
    });
  });

  describe('Token Refresh Rate Limiting', () => {
    it('should handle multiple refresh requests within time window', async () => {
      // Make multiple refresh requests quickly
      const responses = await Promise.all([
        request(app).post('/api/auth/refresh').send({ refreshToken: validTokenPair.refreshToken }),
        request(app).post('/api/auth/refresh').send({ refreshToken: validTokenPair.refreshToken }),
        request(app).post('/api/auth/refresh').send({ refreshToken: validTokenPair.refreshToken })
      ]);

      // All should succeed (no rate limiting on refresh endpoint in basic implementation)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Token Refresh Error Handling', () => {
    it('should handle malformed refresh token gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'malformed.token.here'
        })
        .expect(401);

      expect(response.body.code).toBe('REFRESH_TOKEN_INVALID');
    });

    it('should handle empty refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: ''
        })
        .expect(401);

      expect(response.body.code).toBe('REFRESH_TOKEN_MISSING');
    });

    it('should handle null refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: null
        })
        .expect(401);

      expect(response.body.code).toBe('REFRESH_TOKEN_MISSING');
    });
  });
});