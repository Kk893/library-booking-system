/**
 * Unit Tests for Progressive Delay and IP Blocking
 * Tests progressive delay calculation, IP blocking with exponential backoff,
 * and IP reputation scoring system
 */

const rateLimitService = require('../rateLimitService');
const redisService = require('../redisService');
const { calculateProgressiveDelay, isValidIP } = require('../utils/securityHelpers');

// Mock Redis service
jest.mock('../redisService', () => ({
  setWithTTL: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  updateIPReputation: jest.fn(),
  storeSecurityEvent: jest.fn(),
}));

describe('Progressive Delay and IP Blocking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Progressive Delay Calculation', () => {
    it('should calculate correct delay for first attempt', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-1);

      const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', 1);

      expect(result.delay).toBe(1000); // Base delay for first attempt
      expect(result.attemptCount).toBe(1);
      expect(result.shouldDelay).toBe(true);
    });

    it('should calculate exponential backoff correctly', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-3);

      const testCases = [
        { attempt: 1, expectedDelay: 1000 },  // 1000 * 2^(1-1) = 1000
        { attempt: 2, expectedDelay: 2000 },  // 1000 * 2^(2-1) = 2000
        { attempt: 3, expectedDelay: 4000 },  // 1000 * 2^(3-1) = 4000
        { attempt: 4, expectedDelay: 8000 },  // 1000 * 2^(4-1) = 8000
        { attempt: 5, expectedDelay: 16000 }, // 1000 * 2^(5-1) = 16000
      ];

      for (const testCase of testCases) {
        const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', testCase.attempt);
        expect(result.delay).toBe(testCase.expectedDelay);
      }
    });

    it('should cap delay at maximum value', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-10);

      const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', 10);

      expect(result.delay).toBe(30000); // Capped at 30 seconds
      expect(result.shouldDelay).toBe(true);
    });

    it('should store delay information in Redis', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-2);

      await rateLimitService.applyProgressiveDelay('192.168.1.1', 2);

      expect(redisService.setWithTTL).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:delay:192.168.1.1'),
        expect.stringContaining('"attemptCount":2'),
        expect.any(Number)
      );
    });

    it('should update IP reputation for valid IP addresses', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-3);

      await rateLimitService.applyProgressiveDelay('192.168.1.1', 3);

      expect(redisService.updateIPReputation).toHaveBeenCalledWith('192.168.1.1', -1);
    });

    it('should not update IP reputation for non-IP identifiers', async () => {
      redisService.setWithTTL.mockResolvedValue(true);

      await rateLimitService.applyProgressiveDelay('user@example.com', 2);

      expect(redisService.updateIPReputation).not.toHaveBeenCalled();
    });

    it('should handle custom base delay', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-2);

      const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', 2, {
        baseDelay: 2000
      });

      expect(result.delay).toBe(4000); // 2000 * 2^(2-1) = 4000
    });

    it('should handle custom maximum delay', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-10);

      const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', 10, {
        maxDelay: 60000
      });

      expect(result.delay).toBe(32000); // 1000 * 2^5 = 32000, not capped since 32000 < 60000
    });

    it('should return fallback delay on Redis errors', async () => {
      redisService.setWithTTL.mockRejectedValue(new Error('Redis connection failed'));

      const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', 3);

      expect(result.delay).toBe(1000); // Fallback delay
      expect(result.shouldDelay).toBe(true);
    });
  });

  describe('IP Blocking', () => {
    describe('checkIPBlock', () => {
      it('should return not blocked for unblocked IP', async () => {
        redisService.get.mockResolvedValue(null);

        const result = await rateLimitService.checkIPBlock('192.168.1.1');

        expect(result.blocked).toBe(false);
      });

      it('should return blocked status for blocked IP', async () => {
        const blockData = {
          reason: 'brute_force_attack',
          expiresAt: Date.now() + 60000,
          blockLevel: 2,
          duration: 60000
        };
        redisService.get.mockResolvedValue(JSON.stringify(blockData));

        const result = await rateLimitService.checkIPBlock('192.168.1.1');

        expect(result.blocked).toBe(true);
        expect(result.reason).toBe('brute_force_attack');
        expect(result.blockLevel).toBe(2);
        expect(result.remainingTime).toBeGreaterThan(0);
        expect(result.remainingTime).toBeLessThanOrEqual(60000);
      });

      it('should clean up expired blocks automatically', async () => {
        const expiredBlockData = {
          reason: 'brute_force_attack',
          expiresAt: Date.now() - 1000, // Expired 1 second ago
          blockLevel: 1
        };
        redisService.get.mockResolvedValue(JSON.stringify(expiredBlockData));
        redisService.delete.mockResolvedValue(true);

        const result = await rateLimitService.checkIPBlock('192.168.1.1');

        expect(result.blocked).toBe(false);
        expect(redisService.delete).toHaveBeenCalledWith(
          expect.stringContaining('ip_reputation:block:192.168.1.1')
        );
      });

      it('should handle invalid IP addresses gracefully', async () => {
        const result = await rateLimitService.checkIPBlock('not-an-ip');

        expect(result.blocked).toBe(false);
        expect(result.reason).toBe('invalid_ip');
      });

      it('should fail open on Redis errors', async () => {
        redisService.get.mockRejectedValue(new Error('Redis connection failed'));

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

        const result = await rateLimitService.blockIP('192.168.1.1', 'repeated_violations');

        expect(result.blocked).toBe(true);
        expect(result.blockLevel).toBe(1);
        expect(result.duration).toBe(60 * 60 * 1000); // 1 hour default
        expect(result.expiresAt).toBeGreaterThan(Date.now());

        expect(redisService.setWithTTL).toHaveBeenCalledWith(
          expect.stringContaining('ip_reputation:block:192.168.1.1'),
          expect.stringContaining('"reason":"repeated_violations"'),
          expect.any(Number)
        );

        expect(redisService.storeSecurityEvent).toHaveBeenCalled();
      });

      it('should apply exponential backoff for repeated blocks', async () => {
        const existingBlock = {
          blockLevel: 2,
          reason: 'previous_violation'
        };
        redisService.get.mockResolvedValue(JSON.stringify(existingBlock));
        redisService.setWithTTL.mockResolvedValue(true);
        redisService.storeSecurityEvent.mockResolvedValue(true);

        const result = await rateLimitService.blockIP('192.168.1.1', 'repeated_violations');

        expect(result.blockLevel).toBe(3); // Incremented from existing
        expect(result.duration).toBe(60 * 60 * 1000 * 4); // 4 hours (2^(3-1) * 1 hour)
      });

      it('should handle custom block duration', async () => {
        redisService.get.mockResolvedValue(null);
        redisService.setWithTTL.mockResolvedValue(true);
        redisService.storeSecurityEvent.mockResolvedValue(true);

        const customDuration = 2 * 60 * 60 * 1000; // 2 hours
        const result = await rateLimitService.blockIP('192.168.1.1', 'custom_violation', {
          duration: customDuration
        });

        expect(result.duration).toBe(customDuration);
      });

      it('should disable exponential backoff when configured', async () => {
        const existingBlock = {
          blockLevel: 3,
          reason: 'previous_violation'
        };
        redisService.get.mockResolvedValue(JSON.stringify(existingBlock));
        redisService.setWithTTL.mockResolvedValue(true);
        redisService.storeSecurityEvent.mockResolvedValue(true);

        const result = await rateLimitService.blockIP('192.168.1.1', 'repeated_violations', {
          exponentialBackoff: false,
          duration: 60 * 60 * 1000
        });

        expect(result.blockLevel).toBe(4); // Still incremented
        expect(result.duration).toBe(60 * 60 * 1000); // But duration not multiplied
      });

      it('should reject invalid IP addresses', async () => {
        await expect(rateLimitService.blockIP('invalid-ip', 'test_reason'))
          .rejects.toThrow('Invalid IP address');
      });

      it('should log security events on IP block', async () => {
        redisService.get.mockResolvedValue(null);
        redisService.setWithTTL.mockResolvedValue(true);
        redisService.storeSecurityEvent.mockResolvedValue(true);

        await rateLimitService.blockIP('192.168.1.1', 'security_violation');

        expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            eventType: 'rate_limit_exceeded',
            severity: 'high',
            details: expect.objectContaining({
              ip: '192.168.1.1',
              reason: 'security_violation',
              action: 'ip_blocked'
            })
          })
        );
      });

      it('should handle Redis errors during blocking', async () => {
        redisService.get.mockResolvedValue(null);
        redisService.setWithTTL.mockRejectedValue(new Error('Redis write failed'));

        await expect(rateLimitService.blockIP('192.168.1.1', 'test_reason'))
          .rejects.toThrow('Redis write failed');
      });
    });
  });

  describe('IP Reputation System', () => {
    it('should update IP reputation correctly', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.updateIPReputation.mockResolvedValue(-5);

      // This is tested indirectly through applyProgressiveDelay
      await rateLimitService.applyProgressiveDelay('192.168.1.1', 3);

      expect(redisService.updateIPReputation).toHaveBeenCalledWith('192.168.1.1', -1);
    });

    it('should trigger IP block when reputation threshold is exceeded', async () => {
      // Mock reputation score that exceeds threshold (-50)
      redisService.updateIPReputation.mockResolvedValue(-51);
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.get.mockResolvedValue(null); // No existing block
      redisService.storeSecurityEvent.mockResolvedValue(true);

      // This should trigger automatic IP blocking
      await rateLimitService.applyProgressiveDelay('192.168.1.1', 10);

      // Verify that blockIP was called internally
      expect(redisService.setWithTTL).toHaveBeenCalledWith(
        expect.stringContaining('ip_reputation:block:192.168.1.1'),
        expect.stringContaining('"reason":"reputation_threshold_exceeded"'),
        expect.any(Number)
      );
    });
  });

  describe('Helper Functions', () => {
    describe('calculateProgressiveDelay', () => {
      it('should calculate correct delays for different attempt counts', () => {
        const testCases = [
          { attempt: 1, baseDelay: 1000, expected: 1000 },
          { attempt: 2, baseDelay: 1000, expected: 2000 },
          { attempt: 3, baseDelay: 1000, expected: 4000 },
          { attempt: 4, baseDelay: 1000, expected: 8000 },
          { attempt: 5, baseDelay: 1000, expected: 16000 },
        ];

        testCases.forEach(({ attempt, baseDelay, expected }) => {
          const result = calculateProgressiveDelay(attempt, baseDelay);
          expect(result).toBe(expected);
        });
      });

      it('should cap delay at maximum value', () => {
        const result = calculateProgressiveDelay(10, 1000); // Would be 512000ms without cap
        expect(result).toBe(30000); // Capped at 30 seconds
      });

      it('should handle custom base delays', () => {
        const result = calculateProgressiveDelay(3, 2000);
        expect(result).toBe(8000); // 2000 * 2^(3-1) = 8000
      });
    });

    describe('isValidIP', () => {
      it('should validate IPv4 addresses correctly', () => {
        const validIPs = [
          '192.168.1.1',
          '10.0.0.1',
          '172.16.0.1',
          '8.8.8.8',
          '255.255.255.255',
          '0.0.0.0'
        ];

        validIPs.forEach(ip => {
          expect(isValidIP(ip)).toBe(true);
        });
      });

      it('should reject invalid IPv4 addresses', () => {
        const invalidIPs = [
          '256.1.1.1',
          '192.168.1',
          '192.168.1.1.1',
          'not-an-ip',
          '192.168.01.1', // Leading zeros
          '192.168.-1.1',
          ''
        ];

        invalidIPs.forEach(ip => {
          expect(isValidIP(ip)).toBe(false);
        });
      });

      it('should validate IPv6 addresses correctly', () => {
        const validIPv6s = [
          '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          '2001:db8:85a3::8a2e:370:7334',
          '::1',
          '::',
          'fe80::1'
        ];

        validIPv6s.forEach(ip => {
          expect(isValidIP(ip)).toBe(true);
        });
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete progressive delay and blocking workflow', async () => {
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.get.mockResolvedValue(null);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      // Simulate multiple failed attempts leading to IP block
      const attempts = [
        { attempt: 1, reputation: -1 },
        { attempt: 5, reputation: -10 },
        { attempt: 10, reputation: -25 },
        { attempt: 15, reputation: -40 },
        { attempt: 20, reputation: -51 } // This should trigger block
      ];

      for (const { attempt, reputation } of attempts) {
        redisService.updateIPReputation.mockResolvedValue(reputation);
        
        const result = await rateLimitService.applyProgressiveDelay('192.168.1.1', attempt);
        
        expect(result.shouldDelay).toBe(true);
        expect(result.attemptCount).toBe(attempt);
        
        if (reputation <= -50) {
          // Should have triggered IP block
          expect(redisService.setWithTTL).toHaveBeenCalledWith(
            expect.stringContaining('ip_reputation:block:192.168.1.1'),
            expect.any(String),
            expect.any(Number)
          );
        }
      }
    });

    it('should handle concurrent blocking attempts gracefully', async () => {
      redisService.get.mockResolvedValue(null);
      redisService.setWithTTL.mockResolvedValue(true);
      redisService.storeSecurityEvent.mockResolvedValue(true);

      // Simulate concurrent block attempts
      const blockPromises = [
        rateLimitService.blockIP('192.168.1.1', 'concurrent_test_1'),
        rateLimitService.blockIP('192.168.1.1', 'concurrent_test_2'),
        rateLimitService.blockIP('192.168.1.1', 'concurrent_test_3')
      ];

      const results = await Promise.all(blockPromises);

      // All should succeed
      results.forEach(result => {
        expect(result.blocked).toBe(true);
        expect(result.blockLevel).toBeGreaterThan(0);
      });
    });
  });
});