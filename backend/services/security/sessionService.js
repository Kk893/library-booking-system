/**
 * Enhanced Session Management Service
 * Handles JWT token pair generation, validation, blacklisting, and device fingerprinting
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redisService = require('./redisService');
const configService = require('./configService');
const deviceFingerprintService = require('./deviceFingerprintService');
const { 
  generateSecureToken, 
  extractDeviceInfo, 
  generateDeviceFingerprint,
  sanitizeForLogging,
  formatSecurityEvent
} = require('./utils/securityHelpers');
const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS, 
  TOKEN_TYPES,
  ERROR_CODES 
} = require('./utils/constants');

class SessionService {
  constructor() {
    this.isInitialized = false;
    this.jwtConfig = null;
  }

  /**
   * Initialize session service with configuration
   */
  async initialize() {
    try {
      if (!configService.isInitialized) {
        await configService.initialize();
      }
      
      this.jwtConfig = configService.getJWTConfig();
      this.isInitialized = true;
      
      console.log('Session service initialized successfully');
    } catch (error) {
      console.error('Session service initialization failed:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Generate access and refresh token pair with enhanced device fingerprinting
   * @param {Object} user - User object
   * @param {Object} req - Express request object for device info
   * @returns {Object} Token pair with metadata
   */
  async generateTokenPair(user, req) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create comprehensive device profile
      const deviceProfile = deviceFingerprintService.createDeviceProfile(req);
      const sessionId = generateSecureToken(16);
      const tokenVersion = user.tokenVersion || 0;

      // Detect suspicious activity before creating session
      const suspicionAnalysis = await deviceFingerprintService.detectSuspiciousActivity(
        user._id.toString(), 
        deviceProfile
      );

      // Generate access token (15 minutes)
      const accessTokenPayload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        sessionId,
        deviceFingerprint: deviceProfile.deviceFingerprint,
        tokenVersion,
        type: TOKEN_TYPES.ACCESS
      };

      const accessToken = jwt.sign(
        accessTokenPayload,
        this.jwtConfig.secret,
        { 
          expiresIn: this.jwtConfig.accessTokenExpiry,
          algorithm: this.jwtConfig.algorithm,
          issuer: 'library-booking-system',
          audience: 'library-booking-client'
        }
      );

      // Generate refresh token (7 days)
      const refreshTokenPayload = {
        id: user._id.toString(),
        sessionId,
        deviceFingerprint: deviceProfile.deviceFingerprint,
        tokenVersion,
        type: TOKEN_TYPES.REFRESH
      };

      const refreshToken = jwt.sign(
        refreshTokenPayload,
        this.jwtConfig.refreshSecret,
        { 
          expiresIn: this.jwtConfig.refreshTokenExpiry,
          algorithm: this.jwtConfig.algorithm,
          issuer: 'library-booking-system',
          audience: 'library-booking-client'
        }
      );

      // Store session data in Redis with enhanced device info
      const sessionData = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        deviceInfo: deviceProfile.deviceInfo,
        deviceFingerprint: deviceProfile.deviceFingerprint,
        networkFingerprint: deviceProfile.networkFingerprint,
        tokenVersion,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true,
        suspicionScore: suspicionAnalysis.suspicionScore,
        riskLevel: suspicionAnalysis.riskLevel
      };

      await redisService.setSession(sessionId, sessionData, 7 * 24 * 60 * 60); // 7 days

      // Track device session
      await deviceFingerprintService.trackDeviceSession(
        user._id.toString(),
        sessionId,
        deviceProfile
      );

      // Log security event with enhanced information
      const securityEvent = formatSecurityEvent(
        SECURITY_EVENTS.LOGIN_SUCCESS,
        suspicionAnalysis.isSuspicious ? SEVERITY_LEVELS.MEDIUM : SEVERITY_LEVELS.LOW,
        {
          sessionId,
          deviceFingerprint: deviceProfile.deviceFingerprint,
          networkFingerprint: deviceProfile.networkFingerprint,
          ip: deviceProfile.deviceInfo.ip,
          userAgent: deviceProfile.deviceInfo.userAgent,
          suspicionAnalysis: {
            isSuspicious: suspicionAnalysis.isSuspicious,
            suspicionScore: suspicionAnalysis.suspicionScore,
            riskLevel: suspicionAnalysis.riskLevel,
            factors: suspicionAnalysis.factors
          }
        },
        user._id.toString()
      );

      await redisService.storeSecurityEvent(
        `${SECURITY_EVENTS.LOGIN_SUCCESS}_${sessionId}`,
        securityEvent
      );

      return {
        accessToken,
        refreshToken,
        sessionId,
        expiresIn: this.parseExpiryToSeconds(this.jwtConfig.accessTokenExpiry),
        refreshExpiresIn: this.parseExpiryToSeconds(this.jwtConfig.refreshTokenExpiry),
        tokenType: 'Bearer',
        deviceFingerprint: deviceProfile.deviceFingerprint,
        suspicionAnalysis: suspicionAnalysis.isSuspicious ? {
          isSuspicious: true,
          riskLevel: suspicionAnalysis.riskLevel,
          factors: suspicionAnalysis.factors
        } : null
      };
    } catch (error) {
      console.error('Token pair generation failed:', sanitizeForLogging({ 
        userId: user._id,
        error: error.message 
      }));
      throw new Error('Failed to generate token pair');
    }
  }

  /**
   * Validate access token and check blacklist
   * @param {string} token - Access token to validate
   * @param {Object} req - Express request object for device verification
   * @returns {Object} Decoded token payload or null if invalid
   */
  async validateAccessToken(token, req = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Check if token is blacklisted
      const isBlacklisted = await redisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtConfig.secret, {
        algorithms: [this.jwtConfig.algorithm],
        issuer: 'library-booking-system',
        audience: 'library-booking-client'
      });

      // Validate token type
      if (decoded.type !== TOKEN_TYPES.ACCESS) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Get session data from Redis
      const sessionData = await redisService.getSession(decoded.sessionId);
      if (!sessionData || !sessionData.isActive) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Verify token version
      if (decoded.tokenVersion !== sessionData.tokenVersion) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Device fingerprint verification (if request provided)
      if (req) {
        const currentDeviceInfo = extractDeviceInfo(req);
        const currentFingerprint = generateDeviceFingerprint(currentDeviceInfo);
        
        if (decoded.deviceFingerprint !== currentFingerprint) {
          // Log suspicious activity
          const securityEvent = formatSecurityEvent(
            SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
            SEVERITY_LEVELS.HIGH,
            {
              reason: 'Device fingerprint mismatch',
              sessionId: decoded.sessionId,
              expectedFingerprint: decoded.deviceFingerprint,
              actualFingerprint: currentFingerprint,
              ip: currentDeviceInfo.ip
            },
            decoded.id
          );

          await redisService.storeSecurityEvent(
            `suspicious_${decoded.sessionId}_${Date.now()}`,
            securityEvent
          );

          throw new Error(ERROR_CODES.TOKEN_INVALID);
        }
      }

      // Update last activity
      sessionData.lastActivity = new Date().toISOString();
      await redisService.setSession(decoded.sessionId, sessionData, 7 * 24 * 60 * 60);

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error(ERROR_CODES.TOKEN_EXPIRED);
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }
      throw error;
    }
  }

  /**
   * Validate refresh token
   * @param {string} refreshToken - Refresh token to validate
   * @param {Object} req - Express request object for device verification
   * @returns {Object} Decoded token payload or null if invalid
   */
  async validateRefreshToken(refreshToken, req = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Check if token is blacklisted
      const isBlacklisted = await redisService.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Verify JWT token
      const decoded = jwt.verify(refreshToken, this.jwtConfig.refreshSecret, {
        algorithms: [this.jwtConfig.algorithm],
        issuer: 'library-booking-system',
        audience: 'library-booking-client'
      });

      // Validate token type
      if (decoded.type !== TOKEN_TYPES.REFRESH) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Get session data from Redis
      const sessionData = await redisService.getSession(decoded.sessionId);
      if (!sessionData || !sessionData.isActive) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Verify token version
      if (decoded.tokenVersion !== sessionData.tokenVersion) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Device fingerprint verification (if request provided)
      if (req) {
        const currentDeviceInfo = extractDeviceInfo(req);
        const currentFingerprint = generateDeviceFingerprint(currentDeviceInfo);
        
        if (decoded.deviceFingerprint !== currentFingerprint) {
          throw new Error(ERROR_CODES.TOKEN_INVALID);
        }
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error(ERROR_CODES.TOKEN_EXPIRED);
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @param {Object} user - User object
   * @param {Object} req - Express request object
   * @returns {Object} New token pair
   */
  async refreshAccessToken(refreshToken, user, req) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validate refresh token
      const decoded = await this.validateRefreshToken(refreshToken, req);
      
      // Get session data
      const sessionData = await redisService.getSession(decoded.sessionId);
      if (!sessionData) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Generate new access token with same session ID
      const deviceInfo = extractDeviceInfo(req);
      const accessTokenPayload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        sessionId: decoded.sessionId,
        deviceFingerprint: decoded.deviceFingerprint,
        tokenVersion: decoded.tokenVersion,
        type: TOKEN_TYPES.ACCESS
      };

      const newAccessToken = jwt.sign(
        accessTokenPayload,
        this.jwtConfig.secret,
        { 
          expiresIn: this.jwtConfig.accessTokenExpiry,
          algorithm: this.jwtConfig.algorithm,
          issuer: 'library-booking-system',
          audience: 'library-booking-client'
        }
      );

      // Update session last activity
      sessionData.lastActivity = new Date().toISOString();
      await redisService.setSession(decoded.sessionId, sessionData, 7 * 24 * 60 * 60);

      // Log token refresh event
      const securityEvent = formatSecurityEvent(
        SECURITY_EVENTS.TOKEN_REFRESH,
        SEVERITY_LEVELS.LOW,
        {
          sessionId: decoded.sessionId,
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent
        },
        user._id.toString()
      );

      await redisService.storeSecurityEvent(
        `${SECURITY_EVENTS.TOKEN_REFRESH}_${decoded.sessionId}_${Date.now()}`,
        securityEvent
      );

      return {
        accessToken: newAccessToken,
        refreshToken, // Keep the same refresh token
        sessionId: decoded.sessionId,
        expiresIn: this.parseExpiryToSeconds(this.jwtConfig.accessTokenExpiry),
        tokenType: 'Bearer'
      };
    } catch (error) {
      console.error('Token refresh failed:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Blacklist a token (add to Redis blacklist)
   * @param {string} token - Token to blacklist
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async blacklistToken(token, ttl = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Calculate TTL based on token expiry if not provided
      if (!ttl) {
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.exp) {
            const now = Math.floor(Date.now() / 1000);
            ttl = Math.max(decoded.exp - now, 60); // At least 1 minute
          } else {
            ttl = 15 * 60; // Default 15 minutes
          }
        } catch {
          ttl = 15 * 60; // Default 15 minutes
        }
      }

      await redisService.blacklistToken(token, ttl);
      return true;
    } catch (error) {
      console.error('Token blacklisting failed:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Invalidate a specific session
   * @param {string} sessionId - Session ID to invalidate
   * @param {string} userId - User ID for logging
   * @param {string} reason - Reason for invalidation
   */
  async invalidateSession(sessionId, userId = null, reason = 'manual_logout') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Get session data before deletion
      const sessionData = await redisService.getSession(sessionId);
      
      if (sessionData) {
        // Mark session as inactive
        sessionData.isActive = false;
        sessionData.invalidatedAt = new Date().toISOString();
        sessionData.invalidationReason = reason;
        
        // Store for audit purposes with shorter TTL
        await redisService.setSession(sessionId, sessionData, 24 * 60 * 60); // 24 hours
        
        // Invalidate device session tracking
        await deviceFingerprintService.invalidateDeviceSession(sessionId);
        
        // Log session invalidation
        const securityEvent = formatSecurityEvent(
          SECURITY_EVENTS.SESSION_INVALIDATED,
          SEVERITY_LEVELS.LOW,
          {
            sessionId,
            reason,
            deviceFingerprint: sessionData.deviceFingerprint
          },
          userId || sessionData.userId
        );

        await redisService.storeSecurityEvent(
          `${SECURITY_EVENTS.SESSION_INVALIDATED}_${sessionId}`,
          securityEvent
        );
      }

      return true;
    } catch (error) {
      console.error('Session invalidation failed:', sanitizeForLogging({ 
        sessionId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Invalidate all sessions for a user
   * @param {string} userId - User ID
   * @param {string} reason - Reason for invalidation
   * @param {boolean} blacklistTokens - Whether to blacklist all tokens
   */
  async invalidateAllUserSessions(userId, reason = 'security_incident', blacklistTokens = true) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      let invalidatedCount = 0;
      let blacklistedCount = 0;

      // Get all user sessions from Redis
      const userSessions = await redisService.getUserSessions(userId);
      
      for (const sessionId of userSessions) {
        const sessionData = await redisService.getSession(sessionId);
        if (sessionData && sessionData.isActive) {
          // Invalidate session
          await this.invalidateSession(sessionId, userId, reason);
          invalidatedCount++;

          // Blacklist associated tokens if requested
          if (blacklistTokens) {
            // We need to blacklist both access and refresh tokens
            // Since we don't store the actual tokens, we'll increment token version
            // This will invalidate all existing tokens for this session
            sessionData.tokenVersion = (sessionData.tokenVersion || 0) + 1;
            await redisService.setSession(sessionId, sessionData, 24 * 60 * 60);
            blacklistedCount++;
          }
        }
      }

      // If no sessions found in Redis, increment user's token version in database
      // This ensures all existing tokens become invalid
      if (userSessions.length === 0 && blacklistTokens) {
        await redisService.incrementUserTokenVersion(userId);
      }

      // Log bulk session invalidation
      const securityEvent = formatSecurityEvent(
        SECURITY_EVENTS.SESSION_INVALIDATED,
        SEVERITY_LEVELS.MEDIUM,
        {
          reason: `bulk_invalidation_${reason}`,
          affectedUser: userId,
          invalidatedSessions: invalidatedCount,
          blacklistedTokens: blacklistedCount
        },
        userId
      );

      await redisService.storeSecurityEvent(
        `bulk_invalidation_${userId}_${Date.now()}`,
        securityEvent
      );

      console.log(`Invalidated ${invalidatedCount} sessions and blacklisted ${blacklistedCount} token sets for user ${userId}`);
      
      return {
        invalidatedSessions: invalidatedCount,
        blacklistedTokens: blacklistedCount,
        success: true
      };
    } catch (error) {
      console.error('Bulk session invalidation failed:', sanitizeForLogging({ 
        userId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Bulk invalidate sessions for security incidents
   * @param {Array} userIds - Array of user IDs to invalidate
   * @param {string} reason - Reason for bulk invalidation
   * @param {boolean} blacklistTokens - Whether to blacklist all tokens
   */
  async bulkInvalidateSessions(userIds, reason = 'security_incident', blacklistTokens = true) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const results = [];
      let totalInvalidated = 0;
      let totalBlacklisted = 0;

      for (const userId of userIds) {
        try {
          const result = await this.invalidateAllUserSessions(userId, reason, blacklistTokens);
          results.push({ userId, ...result });
          totalInvalidated += result.invalidatedSessions;
          totalBlacklisted += result.blacklistedTokens;
        } catch (error) {
          results.push({ 
            userId, 
            success: false, 
            error: error.message,
            invalidatedSessions: 0,
            blacklistedTokens: 0
          });
        }
      }

      // Log bulk operation
      const securityEvent = formatSecurityEvent(
        SECURITY_EVENTS.BULK_SESSION_INVALIDATION,
        SEVERITY_LEVELS.HIGH,
        {
          reason,
          affectedUsers: userIds.length,
          totalInvalidatedSessions: totalInvalidated,
          totalBlacklistedTokens: totalBlacklisted,
          results: results.map(r => ({ userId: r.userId, success: r.success }))
        }
      );

      await redisService.storeSecurityEvent(
        `bulk_invalidation_incident_${Date.now()}`,
        securityEvent
      );

      return {
        totalUsers: userIds.length,
        totalInvalidatedSessions: totalInvalidated,
        totalBlacklistedTokens: totalBlacklisted,
        results,
        success: true
      };
    } catch (error) {
      console.error('Bulk session invalidation failed:', sanitizeForLogging({ 
        userIds,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get session information
   * @param {string} sessionId - Session ID
   * @returns {Object} Session data
   */
  async getSessionInfo(sessionId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const sessionData = await redisService.getSession(sessionId);
      if (!sessionData) {
        return null;
      }

      // Return sanitized session info
      return {
        sessionId,
        userId: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role,
        deviceInfo: sessionData.deviceInfo,
        createdAt: sessionData.createdAt,
        lastActivity: sessionData.lastActivity,
        isActive: sessionData.isActive
      };
    } catch (error) {
      console.error('Get session info failed:', sanitizeForLogging({ 
        sessionId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Parse JWT expiry string to seconds
   * @param {string} expiry - Expiry string (e.g., '15m', '7d')
   * @returns {number} Expiry in seconds
   */
  parseExpiryToSeconds(expiry) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default 1 hour
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * (units[unit] || 1);
  }

  /**
   * Check if service is initialized
   * @returns {boolean} Initialization status
   */
  isReady() {
    return this.isInitialized && redisService.isReady();
  }
}

// Export singleton instance
module.exports = new SessionService();