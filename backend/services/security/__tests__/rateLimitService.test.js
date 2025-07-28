/**
 * Unit Tests for Rate Limiting Service
 * Tests sliding window rate limiting, progressive delays, IP blocking, and dynamic adjustments
 */

const rateLimitService = require('../rateLimitService');
const redisService = require('../redisService');
const { RATE_LIMIT_KEYS, SECURITY_EVENTS, SEVERITY_LEVELS } = require('../utils/constants');

// Mock Redis service
jest.mock('../redisService', () => ({
  client: {
    multi: jest.fn(),
    zRemRangeByScore: jest.fn(),
    zAdd: jest.fn(),
    zCard: jest.fn(),
    zCount: jest.fn(),
    expire: jest.fn(),
  },
  setWithTTL: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  updateIPReputation: jest.fn(),
  storeSecurityEvent: jest.fn(),
}));

// Mock multi transaction
const mockMulti = {
  zRemRangeByScore: jest.fn().mockReturnThis(),
  zAdd: jest.fn().mockReturnThis(),
  zCard: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

describe('RateLimitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisService.client.multi.mockReturnValue(mockMulti);
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      // Mock Redis responses
      mockMulti.exec.mockResolvedValue([null, null, 5, null]); // 5 current requests

      const result = await rateLimitService.checkRateLimit('192.168.1.1', RATE_LIMIT_KEYS.GENERAL_API);

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.count).toBe(5);
      expect(result.remaining).toBe(195); // 200 - 5
      expect(result.maxRequests).toBe(200);
    });

    it('should block requests exceeding rate limit', async () => {
      // Mock Redis responses - 201 current requests (exceeds limit of 200)
      mockMulti.exec.mockResolvedValue([null, null, 201, null]);

      const result = await rateLimitService.checkRateLimit('192.168.1.1', RATE_LIMIT_KEYS.GENERAL_API);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.count).toBe(201);
      expect(result.remaining).toBe(0);
    });

    it('should apply threat level adjustments', async () => {
      mockMulti.exec.mockResolvedValue([null, null, 60, null]); // 60 current requests

      const result = await rateLimitService.checkRateLimit(
        '192.168.1.1', 
        RATE_LIMIT_KEYS.GENERAL_API,
        { threatLevel: 'high' } // Should reduce limit to 50 (200 * 0.25)
      );

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.count).toBe(60);
    });

    it('should handle auth attempt rate limiting', async () => {
      mockMulti.exec.mockResolvedValue([null, null, 8, null]); // 8 current attempts

      const result = await rateLimitService.checkRateLimit('user@example.com', RATE_LIMIT_KEYS.AUTH_ATTEMPT);

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.count).toBe(8);
      expect(result.remaining).toBe(2); // 10 - 8
    });

    it('should fail open on Redis errors', async () => {
      mockMulti.exec.mockRejectedValue(new Error('Redis connection failed'));

      const result = await rateLimitService.checkRateLimit('192.168.1.1', RATE_LIMIT_KEYS.GENERAL_API);

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require identifier', async () => {
      const result = await rateLimitService.checkRateLimit('', RATE_LIMIT_KEYS.GENERAL_API);

      expect(result.allowed).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe('applyProgressiveDelay', () => {
    it('should calculate progressive delay correctly', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-5);

      const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', 3);

      expect(result.delay).toBe(4000); // 1000 * 2^(3-1) = 4000ms
      expect(result.attemptCount).toBe(3);
      expect(result.shouldDelay).toBe(true);
      expect(result.nextAttemptAt).toBeGreaterThan(Date.now());
    });

    it('should cap delay at maximum', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-10);

      const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', 10);

      expect(result.delay).toBe(30000); // Capped at 30 seconds
      expect(result.shouldDelay).toBe(true);
    });

    it('should update IP reputation for IP addresses', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-3);

      await rateLimitService.applyProgressiveDelay('192.168.1.1', 2);

      expect(redisService.updateIPReputation).toHaveBeenCalledWith('192.168.1.1', -1);
    });

    it('should handle errors gracefully', async () => {
      redisService.setWithTTL.mockRejectedValue(new Error('Redis error'));

      const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', 3);

      expect(result.delay).toBe(1000); // Fallback delay
      expect(result.shouldDelay).toBe(true);
    });
  });

  describe('checkIPBlock', () => {
    it('should return not blocked for unblocked IP', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await rateLimitService.checkIPBlock('192.168.1.1');

      expect(result.blocked).toBe(false);
    });

    it('should return blocked for blocked IP', async () => {
      const blockData = {
        reason: 'brute_force',
        expiresAt: Date.now() + 60000,
        blockLevel: 1
      };
      redisService.get.mockResolvedValue(JSON.stringify(blockData));

      const result = await rateLimitService.checkIPBlock('192.168.1.1');

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('brute_force');
      expect(result.blockLevel).toBe(1);
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it('should clean up expired blocks', async () => {
      const expiredBlockData = {
        reason: 'brute_force',
        expiresAt: Date.now() - 60000, // Expired
        blockLevel: 1
      };
      redisService.get.mockResolvedValue(JSON.stringify(expiredBlockData));
      redisService.delete.mockResolvedValue(true);

      const result = await rateLimitService.checkIPBlock('192.168.1.1');

      expect(result.blocked).toBe(false);
      expect(redisService.delete).toHaveBeenCalled();
    });

    it('should handle invalid IP addresses', async () => {
      const result = await rateLimitService.checkIPBlock('invalid-ip');

      expect(result.blocked).toBe(false);
      expect(result.reason).toBe('invalid_ip');
    });

    it('should fail open on errors', async () => {
      redisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await rateLimitService.checkIPBlock('192.168.1.1');

      expect(result.blocked).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('blockIP', () => {
    it('should block IP with basic configuration', async () => {
      redisService.get.mockResolvedValue(null); // No existing block
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await rateLimitService.blockIP('192.168.1.1', 'brute_force');

      expect(result.blocked).toBe(true);
      expect(result.blockLevel).toBe(1);
      expect(result.duration).toBe(60 * 60 * 1000); // 1 hour
      expect(redisService.setWithTTL).toHaveBeenCalled();
      expect(redisService.storeSecurityEvent).toHaveBeenCalled();
    });

    it('should apply exponential backoff for repeated blocks', async () => {
      const existingBlock = {
        blockLevel: 2
      };
      redisService.get.mockResolvedValue(JSON.stringify(existingBlock));
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await rateLimitService.blockIP('192.168.1.1', 'repeated_violation');

      expect(result.blockLevel).toBe(3);
      expect(result.duration).toBe(60 * 60 * 1000 * 4); // 4 hours (2^(3-1) * 1 hour)
    });

    it('should reject invalid IP addresses', async () => {
      await expect(rateLimitService.blockIP('invalid-ip', 'test'))
        .rejects.toThrow('Invalid IP address');
    });

    it('should handle Redis errors', async () => {
      redisService.get.mockResolvedValue(null);
      redisService.setWithTTL.mockRejectedValue(new Error('Redis error'));

      await expect(rateLimitService.blockIP('192.168.1.1', 'test'))
        .rejects.toThrow('Redis error');
    });
  });

  describe('adjustRateLimits', () => {
    it('should adjust rate limits based on threat level', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await rateLimitService.adjustRateLimits('/api/auth', 'high');

      expect(result.endpoint).toBe('/api/auth');
      expect(result.threatLevel).toBe('high');
      expect(result.multiplier).toBe(0.25);
      expect(result.reason).toBe('threat_detected');
      expect(redisService.setWithTTL).toHaveBeenCalled();
    });

    it('should reject invalid threat levels', async () => {
      await expect(rateLimitService.adjustRateLimits('/api/auth', 'invalid'))
        .rejects.toThrow('Invalid threat level: invalid');
    });

    it('should accept custom duration and reason', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await rateLimitService.adjustRateLimits('/api/auth', 'critical', {
        duration: 2 * 60 * 60 * 1000, // 2 hours
        reason: 'ddos_attack'
      });

      expect(result.reason).toBe('ddos_attack');
      expect(result.expiresAt - result.adjustedAt).toBe(2 * 60 * 60 * 1000);
    });
  });

  describe('getRateLimitAdjustment', () => {
    it('should return active adjustment', async () => {
      const adjustmentData = {
        endpoint: '/api/auth',
        threatLevel: 'high',
        multiplier: 0.25,
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(adjustmentData));

      const result = await rateLimitService.getRateLimitAdjustment('/api/auth');

      expect(result).toEqual(adjustmentData);
    });

    it('should return null for no adjustment', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await rateLimitService.getRateLimitAdjustment('/api/auth');

      expect(result).toBeNull();
    });

    it('should clean up expired adjustments', async () => {
      const expiredAdjustment = {
        endpoint: '/api/auth',
        expiresAt: Date.now() - 60000 // Expired
      };
      redisService.get.mockResolvedValue(JSON.stringify(expiredAdjustment));
      redisService.delete.mockResolvedValue(true);

      const result = await rateLimitService.getRateLimitAdjustment('/api/auth');

      expect(result).toBeNull();
      expect(redisService.delete).toHaveBeenCalled();
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit successfully', async () => {
      redisService.delete.mockResolvedValue(true);

      const result = await rateLimitService.resetRateLimit('192.168.1.1', RATE_LIMIT_KEYS.AUTH_ATTEMPT);

      expect(result).toBe(true);
      expect(redisService.delete).toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      redisService.delete.mockRejectedValue(new Error('Redis error'));

      await expect(rateLimitService.resetRateLimit('192.168.1.1', RATE_LIMIT_KEYS.AUTH_ATTEMPT))
        .rejects.toThrow('Redis error');
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', async () => {
      redisService.client.zCount.mockResolvedValue(15);

      const result = await rateLimitService.getRateLimitStatus('192.168.1.1', RATE_LIMIT_KEYS.AUTH_ATTEMPT);

      expect(result.identifier).toBe('192.168.1.1');
      expect(result.limitType).toBe(RATE_LIMIT_KEYS.AUTH_ATTEMPT);
      expect(result.current).toBe(15);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(0); // Max(0, 10 - 15)
    });

    it('should handle Redis errors', async () => {
      redisService.client.zCount.mockRejectedValue(new Error('Redis error'));

      await expect(rateLimitService.getRateLimitStatus('192.168.1.1', RATE_LIMIT_KEYS.AUTH_ATTEMPT))
        .rejects.toThrow('Redis error');
    });
  });

  describe('emergencyOverride', () => {
    it('should activate emergency override', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await rateLimitService.emergencyOverride('disable', {
        adminUserId: 'admin123',
        reason: 'system_maintenance',
        duration: 2 * 60 * 60 * 1000 // 2 hours
      });

      expect(result.action).toBe('disable');
      expect(result.activatedBy).toBe('admin123');
      expect(result.reason).toBe('system_maintenance');
      expect(redisService.setWithTTL).toHaveBeenCalled();
      expect(redisService.storeSecurityEvent).toHaveBeenCalled();
    });

    it('should use default values', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const result = await rateLimitService.emergencyOverride('enable');

      expect(result.activatedBy).toBe('system');
      expect(result.reason).toBe('emergency_override');
    });
  });

  describe('getEmergencyOverride', () => {
    it('should return active override', async () => {
      const overrideData = {
        action: 'disable',
        activatedBy: 'admin123',
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(overrideData));

      const result = await rateLimitService.getEmergencyOverride();

      expect(result).toEqual(overrideData);
    });

    it('should return null for no override', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await rateLimitService.getEmergencyOverride();

      expect(result).toBeNull();
    });

    it('should clean up expired overrides', async () => {
      const expiredOverride = {
        action: 'disable',
        expiresAt: Date.now() - 60000 // Expired
      };
      redisService.get.mockResolvedValue(JSON.stringify(expiredOverride));
      redisService.delete.mockResolvedValue(true);

      const result = await rateLimitService.getEmergencyOverride();

      expect(result).toBeNull();
      expect(redisService.delete).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return basic statistics', async () => {
      const result = await rateLimitService.getStatistics('1h');

      expect(result.timeframe).toBe('1h');
      expect(result.totalRequests).toBeDefined();
      expect(result.blockedRequests).toBeDefined();
      expect(result.uniqueIPs).toBeDefined();
      expect(result.topBlockedIPs).toBeDefined();
      expect(result.rateLimitTypes).toBeDefined();
    });

    it('should handle different timeframes', async () => {
      const result = await rateLimitService.getStatistics('24h');

      expect(result.timeframe).toBe('24h');
    });
  });

  describe('threat level multipliers', () => {
    it('should have correct multiplier values', () => {
      expect(rateLimitService.threatMultipliers.low).toBe(1.0);
      expect(rateLimitService.threatMultipliers.medium).toBe(0.5);
      expect(rateLimitService.threatMultipliers.high).toBe(0.25);
      expect(rateLimitService.threatMultipliers.critical).toBe(0.1);
    });
  });

  describe('default rate limits', () => {
    it('should have correct default limits', () => {
      expect(rateLimitService.defaultLimits[RATE_LIMIT_KEYS.GENERAL_API].max).toBe(200);
      expect(rateLimitService.defaultLimits[RATE_LIMIT_KEYS.AUTH_ATTEMPT].max).toBe(10);
      expect(rateLimitService.defaultLimits[RATE_LIMIT_KEYS.PASSWORD_RESET].max).toBe(3);
      expect(rateLimitService.defaultLimits[RATE_LIMIT_KEYS.FILE_UPLOAD].max).toBe(20);
      expect(rateLimitService.defaultLimits[RATE_LIMIT_KEYS.MFA_ATTEMPT].max).toBe(5);
    });
  });
});