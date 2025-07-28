/**
 * Unit Tests for Token Refresh Functionality
 * Tests the core token refresh logic without full integration
 */

const jwt = require('jsonwebtoken');
const sessionService = require('../../services/security/sessionService');
const redisService = require('../../services/security/redisService');

// Mock dependencies
jest.mock('../../services/security/redisService');
jest.mock('../../services/security/configService');

describe('Token Refresh Unit Tests', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    role: 'user',
    tokenVersion: 0
  };

  const mockReq = {
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent'),
    headers: { 'user-agent': 'test-user-agent' }
  };

  beforeAll(() => {
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Redis service methods
    redisService.isReady.mockReturnValue(true);
    redisService.setSession.mockResolvedValue(true);
    redisService.getSession.mockResolvedValue({
      userId: mockUser._id,
      email: mockUser.email,
      role: mockUser.role,
      deviceInfo: { ip: '127.0.0.1', userAgent: 'test-user-agent' },
      deviceFingerprint: 'test-fingerprint',
      tokenVersion: 0,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true
    });
    redisService.isTokenBlacklisted.mockResolvedValue(false);
    redisService.storeSecurityEvent.mockResolvedValue(true);
    
    // Mock config service
    const mockConfigService = require('../../services/security/configService');
    mockConfigService.isInitialized = true;
    mockConfigService.getJWTConfig.mockReturnValue({
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      algorithm: 'HS256'
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token with valid refresh token', async () => {
      // Generate a valid refresh token
      const refreshTokenPayload = {
        id: mockUser._id,
        sessionId: 'test-session-id',
        deviceFingerprint: 'test-fingerprint',
        tokenVersion: 0,
        type: 'refresh'
      };

      const refreshToken = jwt.sign(
        refreshTokenPayload,
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Call refreshAccessToken
      const result = await sessionService.refreshAccessToken(refreshToken, mockUser, mockReq);

      // Verify the result
      expect(result).toMatchObject({
        tokenType: 'Bearer',
        sessionId: 'test-session-id'
      });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBe(refreshToken);
      expect(result.expiresIn).toBe(900); // 15 minutes

      // Verify the new access token is valid
      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(mockUser._id);
      expect(decoded.sessionId).toBe('test-session-id');
      expect(decoded.type).toBe('access');
    });

    it('should throw error for expired refresh token', async () => {
      // Generate an expired refresh token
      const expiredRefreshToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'test-session-id',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1s' }
      );

      await expect(
        sessionService.refreshAccessToken(expiredRefreshToken, mockUser, mockReq)
      ).rejects.toThrow('TOKEN_EXPIRED');
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(
        sessionService.refreshAccessToken(invalidToken, mockUser, mockReq)
      ).rejects.toThrow('TOKEN_INVALID');
    });

    it('should throw error for blacklisted refresh token', async () => {
      // Mock token as blacklisted
      redisService.isTokenBlacklisted.mockResolvedValue(true);

      const refreshToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'test-session-id',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await expect(
        sessionService.refreshAccessToken(refreshToken, mockUser, mockReq)
      ).rejects.toThrow('TOKEN_INVALID');
    });

    it('should throw error when session does not exist', async () => {
      // Mock session as not found
      redisService.getSession.mockResolvedValue(null);

      const refreshToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'non-existent-session',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await expect(
        sessionService.refreshAccessToken(refreshToken, mockUser, mockReq)
      ).rejects.toThrow('TOKEN_INVALID');
    });

    it('should throw error for token version mismatch', async () => {
      // Mock session with different token version
      redisService.getSession.mockResolvedValue({
        userId: mockUser._id,
        tokenVersion: 1, // Different version
        isActive: true
      });

      const refreshToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'test-session-id',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0, // Old version
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await expect(
        sessionService.refreshAccessToken(refreshToken, mockUser, mockReq)
      ).rejects.toThrow('TOKEN_INVALID');
    });

    it('should update session last activity on successful refresh', async () => {
      const refreshToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'test-session-id',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await sessionService.refreshAccessToken(refreshToken, mockUser, mockReq);

      // Verify session was updated
      expect(redisService.setSession).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          lastActivity: expect.any(String)
        }),
        7 * 24 * 60 * 60 // 7 days TTL
      );
    });

    it('should log security event on successful refresh', async () => {
      const refreshToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'test-session-id',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await sessionService.refreshAccessToken(refreshToken, mockUser, mockReq);

      // Verify security event was logged
      expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_REFRESH_test-session-id'),
        expect.objectContaining({
          eventType: 'TOKEN_REFRESH',
          severity: 'low'
        })
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should successfully validate valid refresh token', async () => {
      const refreshToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'test-session-id',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      const result = await sessionService.validateRefreshToken(refreshToken, mockReq);

      expect(result).toMatchObject({
        id: mockUser._id,
        sessionId: 'test-session-id',
        deviceFingerprint: 'test-fingerprint',
        tokenVersion: 0,
        type: 'refresh'
      });
    });

    it('should throw error for wrong token type', async () => {
      const accessToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'test-session-id',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0,
          type: 'access' // Wrong type
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await expect(
        sessionService.validateRefreshToken(accessToken, mockReq)
      ).rejects.toThrow('TOKEN_INVALID');
    });

    it('should throw error for inactive session', async () => {
      // Mock session as inactive
      redisService.getSession.mockResolvedValue({
        userId: mockUser._id,
        tokenVersion: 0,
        isActive: false // Inactive session
      });

      const refreshToken = jwt.sign(
        {
          id: mockUser._id,
          sessionId: 'test-session-id',
          deviceFingerprint: 'test-fingerprint',
          tokenVersion: 0,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await expect(
        sessionService.validateRefreshToken(refreshToken, mockReq)
      ).rejects.toThrow('TOKEN_INVALID');
    });
  });

  describe('parseExpiryToSeconds', () => {
    it('should correctly parse different time units', () => {
      expect(sessionService.parseExpiryToSeconds('30s')).toBe(30);
      expect(sessionService.parseExpiryToSeconds('15m')).toBe(900);
      expect(sessionService.parseExpiryToSeconds('2h')).toBe(7200);
      expect(sessionService.parseExpiryToSeconds('7d')).toBe(604800);
    });

    it('should return default for invalid format', () => {
      expect(sessionService.parseExpiryToSeconds('invalid')).toBe(3600);
      expect(sessionService.parseExpiryToSeconds('')).toBe(3600);
      expect(sessionService.parseExpiryToSeconds(null)).toBe(3600);
    });
  });
});