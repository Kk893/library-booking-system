const PasswordHashingService = require('../passwordHashingService');
const bcrypt = require('bcryptjs');

describe('PasswordHashingService', () => {
  let passwordHashingService;

  beforeEach(() => {
    passwordHashingService = new PasswordHashingService();
    // Use lower salt rounds for testing to speed up tests
    passwordHashingService.updateConfig({ saltRounds: 10, minTimingMs: 50 });
  });

  describe('Configuration', () => {
    test('should initialize with default configuration', () => {
      const config = passwordHashingService.getConfig();

      expect(config.saltRounds).toBeGreaterThanOrEqual(10);
      expect(config.minTimingMs).toBeGreaterThanOrEqual(50);
      expect(config.maxSaltRounds).toBe(16);
      expect(config.saltLength).toBe(16);
    });

    test('should validate configuration on initialization', () => {
      expect(() => {
        const service = new PasswordHashingService();
        service.updateConfig({ saltRounds: 20 }); // Exceeds max
      }).toThrow('Salt rounds (20) exceeds maximum allowed (16)');
    });

    test('should allow configuration updates', () => {
      passwordHashingService.updateConfig({ minTimingMs: 150 });
      const config = passwordHashingService.getConfig();

      expect(config.minTimingMs).toBe(150);
    });
  });

  describe('Password Hashing', () => {
    test('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const result = await passwordHashingService.hashPassword(password);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('saltRounds');
      expect(result).toHaveProperty('algorithm', 'bcrypt');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version', '1.0');

      expect(typeof result.hash).toBe('string');
      expect(result.hash.length).toBeGreaterThan(50);
      expect(result.saltRounds).toBeGreaterThanOrEqual(10);
    });

    test('should use custom salt rounds when provided', async () => {
      const password = 'TestPassword123!';
      const customRounds = 12;
      const result = await passwordHashingService.hashPassword(password, { saltRounds: customRounds });

      expect(result.saltRounds).toBe(customRounds);
    });

    test('should reject invalid passwords', async () => {
      await expect(passwordHashingService.hashPassword('')).rejects.toThrow('Password must be a non-empty string');
      await expect(passwordHashingService.hashPassword(null)).rejects.toThrow('Password must be a non-empty string');
      await expect(passwordHashingService.hashPassword(123)).rejects.toThrow('Password must be a non-empty string');
    });

    test('should reject passwords exceeding maximum length', async () => {
      const longPassword = 'a'.repeat(73); // bcrypt limit is 72 characters
      await expect(passwordHashingService.hashPassword(longPassword)).rejects.toThrow('Password exceeds maximum length of 72 characters');
    });

    test('should reject invalid salt rounds', async () => {
      const password = 'TestPassword123!';
      
      await expect(passwordHashingService.hashPassword(password, { saltRounds: 5 })).rejects.toThrow('Salt rounds must be between 10 and 16');
      await expect(passwordHashingService.hashPassword(password, { saltRounds: 20 })).rejects.toThrow('Salt rounds must be between 10 and 16');
    });

    test('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const result1 = await passwordHashingService.hashPassword(password);
      const result2 = await passwordHashingService.hashPassword(password);

      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);
    }, 10000);
  });

  describe('Password Verification', () => {
    test('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const result = await passwordHashingService.hashPassword(password);
      const isValid = await passwordHashingService.verifyPassword(password, result.hash);

      expect(isValid).toBe(true);
    }, 10000);

    test('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const result = await passwordHashingService.hashPassword(password);
      const isValid = await passwordHashingService.verifyPassword(wrongPassword, result.hash);

      expect(isValid).toBe(false);
    }, 10000);

    test('should handle invalid inputs gracefully', async () => {
      const validHash = await passwordHashingService.hashPassword('test');
      
      expect(await passwordHashingService.verifyPassword('', validHash.hash)).toBe(false);
      expect(await passwordHashingService.verifyPassword(null, validHash.hash)).toBe(false);
      expect(await passwordHashingService.verifyPassword('test', '')).toBe(false);
      expect(await passwordHashingService.verifyPassword('test', null)).toBe(false);
    });

    test('should handle malformed hashes gracefully', async () => {
      const password = 'TestPassword123!';
      const malformedHash = 'not-a-valid-hash';
      
      const isValid = await passwordHashingService.verifyPassword(password, malformedHash);
      expect(isValid).toBe(false);
    });
  });

  describe('Timing Attack Protection', () => {
    test('should maintain consistent timing for verification', async () => {
      const password = 'TestPassword123!';
      const result = await passwordHashingService.hashPassword(password);
      
      // Test correct password timing
      const start1 = process.hrtime.bigint();
      await passwordHashingService.verifyPassword(password, result.hash);
      const time1 = Number(process.hrtime.bigint() - start1) / 1000000;

      // Test incorrect password timing
      const start2 = process.hrtime.bigint();
      await passwordHashingService.verifyPassword('wrong-password', result.hash);
      const time2 = Number(process.hrtime.bigint() - start2) / 1000000;

      // Both should take at least the minimum timing
      expect(time1).toBeGreaterThanOrEqual(passwordHashingService.getConfig().minTimingMs - 20); // Allow 20ms tolerance
      expect(time2).toBeGreaterThanOrEqual(passwordHashingService.getConfig().minTimingMs - 20);
    }, 15000);

    test('should maintain consistent timing for hashing', async () => {
      const password1 = 'short';
      const password2 = 'much-longer-password-with-more-characters';
      
      const start1 = process.hrtime.bigint();
      await passwordHashingService.hashPassword(password1);
      const time1 = Number(process.hrtime.bigint() - start1) / 1000000;

      const start2 = process.hrtime.bigint();
      await passwordHashingService.hashPassword(password2);
      const time2 = Number(process.hrtime.bigint() - start2) / 1000000;

      // Both should take at least the minimum timing
      expect(time1).toBeGreaterThanOrEqual(passwordHashingService.getConfig().minTimingMs - 20);
      expect(time2).toBeGreaterThanOrEqual(passwordHashingService.getConfig().minTimingMs - 20);
    }, 15000);

    test('should maintain timing even on errors', async () => {
      const start = process.hrtime.bigint();
      
      try {
        await passwordHashingService.hashPassword(null);
      } catch (error) {
        // Expected error
      }
      
      const elapsed = Number(process.hrtime.bigint() - start) / 1000000;
      expect(elapsed).toBeGreaterThanOrEqual(passwordHashingService.getConfig().minTimingMs - 10);
    });
  });

  describe('Salt Generation', () => {
    test('should generate secure salt', () => {
      const salt = passwordHashingService.generateSalt();

      expect(typeof salt).toBe('string');
      expect(salt.length).toBe(32); // 16 bytes * 2 (hex encoding)
    });

    test('should generate salts of custom length', () => {
      const salt = passwordHashingService.generateSalt(24);

      expect(salt.length).toBe(48); // 24 bytes * 2 (hex encoding)
    });

    test('should generate different salts each time', () => {
      const salt1 = passwordHashingService.generateSalt();
      const salt2 = passwordHashingService.generateSalt();

      expect(salt1).not.toBe(salt2);
    });

    test('should reject invalid salt lengths', () => {
      expect(() => passwordHashingService.generateSalt(5)).toThrow('Salt length must be between 8 and 64 bytes');
      expect(() => passwordHashingService.generateSalt(70)).toThrow('Salt length must be between 8 and 64 bytes');
    });
  });

  describe('Hash Analysis', () => {
    test('should detect if hash needs rehashing', async () => {
      // Create hash with lower rounds
      const lowRoundsHash = await bcrypt.hash('test', 10);
      const needsRehash = passwordHashingService.needsRehash(lowRoundsHash, 14);

      expect(needsRehash).toBe(true);
    });

    test('should detect if hash is current', async () => {
      const currentHash = await bcrypt.hash('test', 14);
      const needsRehash = passwordHashingService.needsRehash(currentHash, 14);

      expect(needsRehash).toBe(false);
    });

    test('should extract rounds from bcrypt hash', () => {
      const hash = '$2a$12$abcdefghijklmnopqrstuvwxyz123456789';
      const rounds = passwordHashingService.extractRoundsFromHash(hash);

      expect(rounds).toBe(12);
    });

    test('should handle invalid hash formats', () => {
      expect(() => passwordHashingService.extractRoundsFromHash('invalid-hash')).toThrow('Invalid bcrypt hash format');
      expect(() => passwordHashingService.extractRoundsFromHash('')).toThrow('Invalid hash format');
      expect(() => passwordHashingService.extractRoundsFromHash(null)).toThrow('Invalid hash format');
    });
  });

  describe('Performance Benchmarking', () => {
    test('should benchmark hashing performance', async () => {
      const benchmark = await passwordHashingService.benchmarkHashing('test-password', 10);

      expect(benchmark).toHaveProperty('rounds', 10);
      expect(benchmark).toHaveProperty('iterations', 5);
      expect(benchmark).toHaveProperty('averageTimeMs');
      expect(benchmark).toHaveProperty('minTimeMs');
      expect(benchmark).toHaveProperty('maxTimeMs');
      expect(benchmark).toHaveProperty('times');

      expect(benchmark.averageTimeMs).toBeGreaterThan(0);
      expect(benchmark.times).toHaveLength(5);
    }, 30000); // Increase timeout for performance test

    test('should show increasing time with higher rounds', async () => {
      const benchmark10 = await passwordHashingService.benchmarkHashing('test', 10);
      const benchmark12 = await passwordHashingService.benchmarkHashing('test', 12);

      expect(benchmark12.averageTimeMs).toBeGreaterThan(benchmark10.averageTimeMs);
    }, 30000);
  });

  describe('Security Recommendations', () => {
    test('should provide security recommendations', () => {
      const recommendations = passwordHashingService.getSecurityRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      
      // Each recommendation should have required properties
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('message');
        expect(rec).toHaveProperty('priority');
      });
    });

    test('should recommend higher rounds for production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const service = new PasswordHashingService();
      service.updateConfig({ saltRounds: 12 });
      const recommendations = service.getSecurityRecommendations();

      const productionRec = recommendations.find(r => r.message.includes('Production environments'));
      expect(productionRec).toBeDefined();
      expect(productionRec.priority).toBe('high');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Integration with bcrypt', () => {
    test('should be compatible with standard bcrypt', async () => {
      const password = 'TestPassword123!';
      
      // Hash with our service
      const result = await passwordHashingService.hashPassword(password);
      
      // Verify with standard bcrypt
      const isValid = await bcrypt.compare(password, result.hash);
      expect(isValid).toBe(true);
    });

    test('should verify hashes created by standard bcrypt', async () => {
      const password = 'TestPassword123!';
      
      // Hash with standard bcrypt
      const standardHash = await bcrypt.hash(password, 12);
      
      // Verify with our service
      const isValid = await passwordHashingService.verifyPassword(password, standardHash);
      expect(isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle bcrypt errors gracefully', async () => {
      // Mock bcrypt to throw an error
      const originalCompare = bcrypt.compare;
      bcrypt.compare = jest.fn().mockRejectedValue(new Error('bcrypt error'));

      const isValid = await passwordHashingService.verifyPassword('test', 'hash');
      expect(isValid).toBe(false);

      // Restore original function
      bcrypt.compare = originalCompare;
    });

    test('should handle hash generation errors gracefully', async () => {
      // Mock bcrypt to throw an error
      const originalHash = bcrypt.hash;
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('bcrypt error'));

      await expect(passwordHashingService.hashPassword('test')).rejects.toThrow('bcrypt error');

      // Restore original function
      bcrypt.hash = originalHash;
    });
  });
});