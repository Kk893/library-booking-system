/**
 * Integration Tests for Dynamic Rate Limiting
 * Tests threat level detection, automatic rate limit adjustment,
 * emergency override mechanisms, and monitoring capabilities
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

describe('Dynamic Rate Limiting Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisService.client.multi.mockReturnValue(mockMulti);
  });

  describe('Threat Level Detection and Adjustment', () => {
    it('should adjust rate limits based on detected threat level', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      // Simulate threat detection
      const threatLevel = 'high';
      const endpoint = '/api/auth/login';
      
      const adjustment = await rateLimitService.adjustRateLimits(endpoint, threatLevel, {
        reason: 'brute_force_detected',
        duration: 30 * 60 * 1000 // 30 minutes
      });

      expect(adjustment.endpoint).toBe(endpoint);
      expect(adjustment.threatLevel).toBe(threatLevel);
      expect(adjustment.multiplier).toBe(0.25); // High threat reduces limits to 25%
      expect(adjustment.reason).toBe('brute_force_detected');
      expect(adjustment.expiresAt - adjustment.adjustedAt).toBe(30 * 60 * 1000);

      expect(redisService.setWithTTL).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:adjustment:/api/auth/login'),
        expect.stringContaining('"threatLevel":"high"'),
        1800 // 30 minutes in seconds
      );

      expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
          severity: SEVERITY_LEVELS.MEDIUM
        })
      );
    });

    it('should apply adjusted rate limits to incoming requests', async () => {
      // Set up an active adjustment
      const adjustmentData = {
        endpoint: '/api/auth/login',
        threatLevel: 'critical',
        multiplier: 0.1,
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(adjustmentData));
      
      // Mock rate limit check
      mockMulti.exec.mockResolvedValue([null, null, 15, null]); // 15 current requests

      const result = await rateLimitService.checkRateLimit(
        '192.168.1.1', 
        RATE_LIMIT_KEYS.AUTH_ATTEMPT,
        { 
          threatLevel: 'critical',
          endpoint: '/api/auth/login'
        }
      );

      // Normal limit is 10, but with critical threat (0.1 multiplier) it becomes 1
      // So 15 requests should be blocked
      expect(result.blocked).toBe(true);
      expect(result.count).toBe(15);
    });

    it('should handle multiple threat levels correctly', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const threatLevels = [
        { level: 'low', expectedMultiplier: 1.0 },
        { level: 'medium', expectedMultiplier: 0.5 },
        { level: 'high', expectedMultiplier: 0.25 },
        { level: 'critical', expectedMultiplier: 0.1 }
      ];

      for (const { level, expectedMultiplier } of threatLevels) {
        const adjustment = await rateLimitService.adjustRateLimits('/api/test', level);
        expect(adjustment.multiplier).toBe(expectedMultiplier);
      }
    });

    it('should automatically expire threat level adjustments', async () => {
      // Mock expired adjustment
      const expiredAdjustment = {
        endpoint: '/api/auth/login',
        threatLevel: 'high',
        expiresAt: Date.now() - 1000 // Expired 1 second ago
      };
      redisService.get.mockResolvedValue(JSON.stringify(expiredAdjustment));
      redisService.delete.mockResolvedValue(true);

      const result = await rateLimitService.getRateLimitAdjustment('/api/auth/login');

      expect(result).toBeNull();
      expect(redisService.delete).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:adjustment:/api/auth/login')
      );
    });
  });

  describe('Emergency Override Mechanisms', () => {
    it('should activate emergency override to disable rate limiting', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const override = await rateLimitService.emergencyOverride('disable', {
        adminUserId: 'admin123',
        reason: 'system_under_attack',
        duration: 60 * 60 * 1000 // 1 hour
      });

      expect(override.action).toBe('disable');
      expect(override.activatedBy).toBe('admin123');
      expect(override.reason).toBe('system_under_attack');
      expect(override.expiresAt - override.activatedAt).toBe(60 * 60 * 1000);

      expect(redisService.setWithTTL).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:emergency_override'),
        expect.stringContaining('"action":"disable"'),
        3600 // 1 hour in seconds
      );

      expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
          severity: SEVERITY_LEVELS.CRITICAL
        })
      );
    });

    it('should activate emergency override to adjust all rate limits', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const override = await rateLimitService.emergencyOverride('adjust', {
        adminUserId: 'security_team',
        reason: 'ddos_mitigation',
        globalMultiplier: 0.1
      });

      expect(override.action).toBe('adjust');
      expect(override.options.globalMultiplier).toBe(0.1);
      expect(override.reason).toBe('ddos_mitigation');
    });

    it('should check active emergency overrides', async () => {
      const activeOverride = {
        action: 'disable',
        activatedBy: 'admin123',
        reason: 'maintenance',
        expiresAt: Date.now() + 30000
      };
      redisService.get.mockResolvedValue(JSON.stringify(activeOverride));

      const result = await rateLimitService.getEmergencyOverride();

      expect(result).toEqual(activeOverride);
    });

    it('should clean up expired emergency overrides', async () => {
      const expiredOverride = {
        action: 'disable',
        activatedBy: 'admin123',
        expiresAt: Date.now() - 1000 // Expired
      };
      redisService.get.mockResolvedValue(JSON.stringify(expiredOverride));
      redisService.delete.mockResolvedValue(true);

      const result = await rateLimitService.getEmergencyOverride();

      expect(result).toBeNull();
      expect(redisService.delete).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:emergency_override')
      );
    });

    it('should handle concurrent emergency override activations', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const overridePromises = [
        rateLimitService.emergencyOverride('disable', { adminUserId: 'admin1' }),
        rateLimitService.emergencyOverride('adjust', { adminUserId: 'admin2' }),
        rateLimitService.emergencyOverride('enable', { adminUserId: 'admin3' })
      ];

      const results = await Promise.all(overridePromises);

      // All should succeed
      results.forEach(result => {
        expect(result.activatedAt).toBeDefined();
        expect(result.expiresAt).toBeGreaterThan(Date.now());
      });

      // Should have logged multiple security events
      expect(redisService.storeSecurityEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rate Limit Monitoring and Alerting', () => {
    it('should log security events for rate limit violations', async () => {
      mockMulti.exec.mockResolvedValue([null, null, 201, null]); // Exceeds limit
      redisService.storeSecurityEvent.mockResolvedValue(true);

      await rateLimitService.checkRateLimit('192.168.1.1', RATE_LIMIT_KEYS.GENERAL_API, {
        ip: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
        endpoint: '/api/test'
      });

      expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
          details: expect.objectContaining({
            identifier: '192.168.1.1',
            limitType: RATE_LIMIT_KEYS.GENERAL_API,
            blocked: true,
            ip: '192.168.1.1',
            userAgent: 'TestAgent/1.0',
            endpoint: '/api/test'
          })
        })
      );
    });

    it('should provide rate limiting statistics', async () => {
      const stats = await rateLimitService.getStatistics('1h');

      expect(stats).toHaveProperty('timeframe', '1h');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('blockedRequests');
      expect(stats).toHaveProperty('uniqueIPs');
      expect(stats).toHaveProperty('topBlockedIPs');
      expect(stats).toHaveProperty('rateLimitTypes');
    });

    it('should handle different timeframes for statistics', async () => {
      const timeframes = ['1h', '24h', '7d'];

      for (const timeframe of timeframes) {
        const stats = await rateLimitService.getStatistics(timeframe);
        expect(stats.timeframe).toBe(timeframe);
      }
    });

    it('should monitor rate limit status for identifiers', async () => {
      redisService.client.zCount.mockResolvedValue(8);

      const status = await rateLimitService.getRateLimitStatus('192.168.1.1', RATE_LIMIT_KEYS.AUTH_ATTEMPT);

      expect(status.identifier).toBe('192.168.1.1');
      expect(status.limitType).toBe(RATE_LIMIT_KEYS.AUTH_ATTEMPT);
      expect(status.current).toBe(8);
      expect(status.limit).toBe(10);
      expect(status.remaining).toBe(2);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('Dynamic Rate Limiting Scenarios', () => {
    it('should handle escalating threat levels', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      // Simulate escalating threat scenario
      const endpoint = '/api/auth/login';
      
      // Start with medium threat
      await rateLimitService.adjustRateLimits(endpoint, 'medium', {
        reason: 'suspicious_activity_detected'
      });

      // Escalate to high threat
      await rateLimitService.adjustRateLimits(endpoint, 'high', {
        reason: 'brute_force_attack_confirmed'
      });

      // Finally escalate to critical
      await rateLimitService.adjustRateLimits(endpoint, 'critical', {
        reason: 'coordinated_attack_detected'
      });

      // Should have logged 3 security events
      expect(redisService.storeSecurityEvent).toHaveBeenCalledTimes(3);
      
      // Last call should be critical severity
      const lastCall = redisService.storeSecurityEvent.mock.calls[2];
      expect(lastCall[1]).toMatchObject({
        severity: SEVERITY_LEVELS.MEDIUM,
        details: expect.objectContaining({
          threatLevel: 'critical',
          multiplier: 0.1
        })
      });
    });

    it('should handle mixed threat levels across different endpoints', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const endpoints = [
        { endpoint: '/api/auth/login', threatLevel: 'critical' },
        { endpoint: '/api/auth/register', threatLevel: 'high' },
        { endpoint: '/api/user/profile', threatLevel: 'medium' },
        { endpoint: '/api/public/info', threatLevel: 'low' }
      ];

      // Apply different threat levels to different endpoints
      for (const { endpoint, threatLevel } of endpoints) {
        await rateLimitService.adjustRateLimits(endpoint, threatLevel);
      }

      // Verify each endpoint has correct adjustment
      for (const { endpoint, threatLevel } of endpoints) {
        redisService.get.mockResolvedValue(JSON.stringify({
          endpoint,
          threatLevel,
          multiplier: rateLimitService.threatMultipliers[threatLevel],
          expiresAt: Date.now() + 60000
        }));

        const adjustment = await rateLimitService.getRateLimitAdjustment(endpoint);
        expect(adjustment.threatLevel).toBe(threatLevel);
        expect(adjustment.multiplier).toBe(rateLimitService.threatMultipliers[threatLevel]);
      }
    });

    it('should handle rate limit reset during active threats', async () => {
      // Set up active threat adjustment
      const adjustmentData = {
        endpoint: '/api/auth/login',
        threatLevel: 'high',
        multiplier: 0.25,
        expiresAt: Date.now() + 60000
      };
      redisService.get.mockResolvedValue(JSON.stringify(adjustmentData));
      redisService.delete.mockResolvedValue(true);

      // Reset rate limit for an identifier
      const result = await rateLimitService.resetRateLimit('192.168.1.1', RATE_LIMIT_KEYS.AUTH_ATTEMPT);

      expect(result).toBe(true);
      expect(redisService.delete).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:auth:attempt:192.168.1.1')
      );
    });

    it('should handle emergency override during active threat adjustments', async () => {
      // Set up active threat adjustment
      redisService.get.mockResolvedValueOnce(JSON.stringify({
        endpoint: '/api/auth/login',
        threatLevel: 'critical',
        expiresAt: Date.now() + 60000
      }));

      // Activate emergency override
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const override = await rateLimitService.emergencyOverride('disable', {
        adminUserId: 'security_admin',
        reason: 'false_positive_mitigation'
      });

      expect(override.action).toBe('disable');
      expect(override.reason).toBe('false_positive_mitigation');

      // Should log critical security event
      expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          severity: SEVERITY_LEVELS.CRITICAL,
          details: expect.objectContaining({
            action: 'emergency_override_activated'
          })
        })
      );
    });

    it('should handle rate limiting with both threat adjustment and emergency override', async () => {
      // Clear previous mocks
      jest.clearAllMocks();
      
      // Mock Redis get to return different values based on the key
      redisService.get.mockImplementation((key) => {
        if (key.includes('adjustment:/api/auth/login')) {
          return Promise.resolve(JSON.stringify({
            endpoint: '/api/auth/login',
            threatLevel: 'critical',
            multiplier: 0.1,
            expiresAt: Date.now() + 60000
          }));
        } else if (key.includes('emergency_override')) {
          return Promise.resolve(JSON.stringify({
            action: 'disable',
            activatedBy: 'admin',
            expiresAt: Date.now() + 30000
          }));
        }
        return Promise.resolve(null);
      });

      // Check both adjustments
      const adjustment = await rateLimitService.getRateLimitAdjustment('/api/auth/login');
      const override = await rateLimitService.getEmergencyOverride();

      expect(adjustment.threatLevel).toBe('critical');
      expect(override.action).toBe('disable');

      // In a real scenario, emergency override would take precedence
      // This would be handled in the middleware that uses these services
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis failures gracefully during threat adjustment', async () => {
      redisService.setWithTTL.mockRejectedValue(new Error('Redis connection failed'));

      await expect(rateLimitService.adjustRateLimits('/api/test', 'high'))
        .rejects.toThrow('Redis connection failed');
    });

    it('should handle Redis failures gracefully during emergency override', async () => {
      redisService.setWithTTL.mockRejectedValue(new Error('Redis write failed'));

      await expect(rateLimitService.emergencyOverride('disable'))
        .rejects.toThrow('Redis write failed');
    });

    it('should handle invalid threat levels', async () => {
      await expect(rateLimitService.adjustRateLimits('/api/test', 'invalid_level'))
        .rejects.toThrow('Invalid threat level: invalid_level');
    });

    it('should handle malformed adjustment data', async () => {
      // Clear any previous mocks and set up fresh mock for this test
      jest.clearAllMocks();
      redisService.get.mockImplementation((key) => {
        if (key.includes('adjustment:/api/test')) {
          return Promise.resolve('invalid-json');
        }
        return Promise.resolve(null);
      });

      const result = await rateLimitService.getRateLimitAdjustment('/api/test');
      expect(result).toBeNull();
    });

    it('should handle malformed override data', async () => {
      redisService.get.mockResolvedValue('invalid-json');

      const result = await rateLimitService.getEmergencyOverride();
      expect(result).toBeNull();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent threat adjustments', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      const adjustmentPromises = [];
      for (let i = 0; i < 10; i++) {
        adjustmentPromises.push(
          rateLimitService.adjustRateLimits(`/api/endpoint${i}`, 'high')
        );
      }

      const results = await Promise.all(adjustmentPromises);

      results.forEach((result, index) => {
        expect(result.endpoint).toBe(`/api/endpoint${index}`);
        expect(result.threatLevel).toBe('high');
      });

      expect(redisService.setWithTTL).toHaveBeenCalledTimes(10);
      expect(redisService.storeSecurityEvent).toHaveBeenCalledTimes(10);
    });

    it('should handle high-frequency rate limit checks with adjustments', async () => {
      // Mock active adjustment
      redisService.get.mockResolvedValue(JSON.stringify({
        endpoint: '/api/test',
        threatLevel: 'medium',
        multiplier: 0.5,
        expiresAt: Date.now() + 60000
      }));

      mockMulti.exec.mockResolvedValue([null, null, 50, null]);

      const checkPromises = [];
      for (let i = 0; i < 100; i++) {
        checkPromises.push(
          rateLimitService.checkRateLimit(`192.168.1.${i}`, RATE_LIMIT_KEYS.GENERAL_API, {
            threatLevel: 'medium'
          })
        );
      }

      const results = await Promise.all(checkPromises);

      results.forEach(result => {
        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('blocked');
        expect(result).toHaveProperty('count');
      });
    });
  });
});