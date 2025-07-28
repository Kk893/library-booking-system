/**
 * Unit Tests for Session Invalidation and Blacklisting
 * Tests session invalidation, token blacklisting, and bulk operations
 */

const jwt = require('jsonwebtoken');

// Mock dependencies before importing
jest.mock('../../services/security/redisService', () => ({
  isReady: jest.fn(() => true),
  setSession: jest.fn(() => Promise.resolve(true)),
  getSession: jest.fn(() => Promise.resolve({
    userId: 'user123',
    email: 'test@example.com',
    role: 'user',
    deviceInfo: { ip: '127.0.0.1', userAgent: 'test-user-agent' },
    deviceFingerprint: 'test-fingerprint',
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    isActive: true
  })),
  blacklistToken: jest.fn(() => Promise.resolve(true)),
  storeSecurityEvent: jest.fn(() => Promise.resolve(true)),
  getUserSessions: jest.fn(() => Promise.resolve(['session1', 'session2'])),
  incrementUserTokenVersion: jest.fn(() => Promise.resolve(1)),
  isTokenBlacklisted: jest.fn(() => Promise.resolve(false)),
  get: jest.fn(() => Promise.resolve(null)),
  delete: jest.fn(() => Promise.resolve(true)),
  getHashField: jest.fn(() => Promise.resolve(null)),
  setHashField: jest.fn(() => Promise.resolve(true))
}));

jest.mock('../../services/security/configService', () => ({
  isInitialized: true,
  initialize: jest.fn(() => Promise.resolve()),
  getJWTConfig: jest.fn(() => ({
    secret: 'test-jwt-secret-key-for-testing',
    refreshSecret: 'test-jwt-refresh-secret-key-for-testing',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256'
  }))
}));

jest.mock('../../services/security/deviceFingerprintService', () => ({
  invalidateDeviceSession: jest.fn(() => Promise.resolve(true)),
  createDeviceProfile: jest.fn(() => ({
    deviceFingerprint: 'test-device-fingerprint',
    networkFingerprint: 'test-network-fingerprint',
    deviceInfo: { ip: '127.0.0.1', userAgent: 'test-user-agent' },
    profileId: 'test-profile-id',
    createdAt: new Date().toISOString()
  })),
  detectSuspiciousActivity: jest.fn(() => Promise.resolve({
    isSuspicious: false,
    suspicionScore: 0,
    riskLevel: 'low',
    factors: []
  })),
  trackDeviceSession: jest.fn(() => Promise.resolve({}))
}));

const sessionService = require('../../services/security/sessionService');
const redisService = require('../../services/security/redisService');

describe('Session Invalidation and Blacklisting Unit Tests', () => {
  beforeAll(() => {
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('blacklistToken', () => {
    it('should successfully blacklist a token with calculated TTL', async () => {
      const token = jwt.sign(
        { id: 'user123', exp: Math.floor(Date.now() / 1000) + 900 }, // 15 minutes
        process.env.JWT_SECRET
      );

      const result = await sessionService.blacklistToken(token);

      expect(result).toBe(true);
      expect(redisService.blacklistToken).toHaveBeenCalledWith(token, expect.any(Number));
      expect(redisService.blacklistToken).toHaveBeenCalledTimes(1);
    });

    it('should blacklist token with custom TTL', async () => {
      const token = 'test-token';
      const customTTL = 3600; // 1 hour

      const result = await sessionService.blacklistToken(token, customTTL);

      expect(result).toBe(true);
      expect(redisService.blacklistToken).toHaveBeenCalledWith(token, customTTL);
    });

    it('should handle blacklisting errors gracefully', async () => {
      const token = 'test-token';
      redisService.blacklistToken.mockRejectedValue(new Error('Redis error'));

      await expect(sessionService.blacklistToken(token)).rejects.toThrow('Redis error');
    });

    it('should use default TTL for invalid tokens', async () => {
      const invalidToken = 'invalid-token';
      
      // Reset the mock to ensure clean state
      redisService.blacklistToken.mockResolvedValue(true);

      const result = await sessionService.blacklistToken(invalidToken);

      expect(result).toBe(true);
      expect(redisService.blacklistToken).toHaveBeenCalledWith(invalidToken, 900); // 15 minutes default
    });
  });

  describe('invalidateSession', () => {
    it('should successfully invalidate a session', async () => {
      const sessionId = 'session123';
      const userId = 'user123';
      const reason = 'manual_logout';

      const result = await sessionService.invalidateSession(sessionId, userId, reason);

      expect(result).toBe(true);
      expect(redisService.getSession).toHaveBeenCalledWith(sessionId);
      expect(redisService.setSession).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          isActive: false,
          invalidatedAt: expect.any(String),
          invalidationReason: reason
        }),
        24 * 60 * 60 // 24 hours
      );
      expect(redisService.storeSecurityEvent).toHaveBeenCalled();
    });

    it('should handle non-existent session gracefully', async () => {
      const sessionId = 'nonexistent-session';
      redisService.getSession.mockResolvedValue(null);

      const result = await sessionService.invalidateSession(sessionId);

      expect(result).toBe(true);
      expect(redisService.setSession).not.toHaveBeenCalled();
    });

    it('should handle invalidation errors', async () => {
      const sessionId = 'session123';
      redisService.getSession.mockRejectedValue(new Error('Redis error'));

      await expect(sessionService.invalidateSession(sessionId)).rejects.toThrow('Redis error');
    });
  });

  describe('getSessionInfo', () => {
    it('should return session information successfully', async () => {
      const sessionId = 'session123';
      const mockSessionData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'user',
        deviceInfo: { ip: '127.0.0.1', userAgent: 'test-user-agent' },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };

      redisService.getSession.mockResolvedValue(mockSessionData);

      const result = await sessionService.getSessionInfo(sessionId);

      expect(result).toEqual({
        sessionId,
        userId: mockSessionData.userId,
        email: mockSessionData.email,
        role: mockSessionData.role,
        deviceInfo: mockSessionData.deviceInfo,
        createdAt: mockSessionData.createdAt,
        lastActivity: mockSessionData.lastActivity,
        isActive: mockSessionData.isActive
      });
      expect(redisService.getSession).toHaveBeenCalledWith(sessionId);
    });

    it('should return null for non-existent session', async () => {
      const sessionId = 'nonexistent-session';
      redisService.getSession.mockResolvedValue(null);

      const result = await sessionService.getSessionInfo(sessionId);

      expect(result).toBeNull();
    });

    it('should handle errors when getting session info', async () => {
      const sessionId = 'session123';
      redisService.getSession.mockRejectedValue(new Error('Redis error'));

      await expect(sessionService.getSessionInfo(sessionId)).rejects.toThrow('Redis error');
    });
  });

  describe('Service initialization and readiness', () => {
    it('should check if service is ready', () => {
      const result = sessionService.isReady();
      expect(result).toBe(true);
      expect(redisService.isReady).toHaveBeenCalled();
    });
  });

  describe('Token validation with blacklist checking', () => {
    it('should reject blacklisted access tokens', async () => {
      const token = jwt.sign(
        { id: 'user123', type: 'access', sessionId: 'session123' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      redisService.isTokenBlacklisted.mockResolvedValue(true);

      await expect(sessionService.validateAccessToken(token)).rejects.toThrow('TOKEN_INVALID');
      expect(redisService.isTokenBlacklisted).toHaveBeenCalledWith(token);
    });

    it('should reject blacklisted refresh tokens', async () => {
      const refreshToken = jwt.sign(
        { id: 'user123', type: 'refresh', sessionId: 'session123' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      redisService.isTokenBlacklisted.mockResolvedValue(true);

      await expect(sessionService.validateRefreshToken(refreshToken)).rejects.toThrow('TOKEN_INVALID');
      expect(redisService.isTokenBlacklisted).toHaveBeenCalledWith(refreshToken);
    });
  });

  describe('Core functionality verification', () => {
    it('should have all required methods for session invalidation and blacklisting', () => {
      expect(typeof sessionService.blacklistToken).toBe('function');
      expect(typeof sessionService.invalidateSession).toBe('function');
      expect(typeof sessionService.invalidateAllUserSessions).toBe('function');
      expect(typeof sessionService.bulkInvalidateSessions).toBe('function');
      expect(typeof sessionService.getSessionInfo).toBe('function');
      expect(typeof sessionService.validateAccessToken).toBe('function');
      expect(typeof sessionService.validateRefreshToken).toBe('function');
    });

    it('should verify session service is properly initialized', async () => {
      expect(sessionService.isReady()).toBe(true);
    });
  });
});