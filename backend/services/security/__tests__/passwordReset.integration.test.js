const PasswordResetService = require('../passwordResetService');
const User = require('../../../models/User');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

describe('Password Reset Integration Tests', () => {
  let passwordResetService;
  let mongoServer;
  let testUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    passwordResetService = new PasswordResetService();
    
    // Create a test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'CurrentPassword123!',
      role: 'user'
    });
    await testUser.save();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('Password Reset Token Generation', () => {
    test('should generate secure reset token', () => {
      const userId = testUser._id.toString();
      const email = testUser.email;
      const options = {
        userAgent: 'Mozilla/5.0 Test Browser',
        ip: '192.168.1.100'
      };

      const resetData = passwordResetService.generateResetToken(userId, email, options);

      expect(resetData).toHaveProperty('token');
      expect(resetData).toHaveProperty('tokenHash');
      expect(resetData).toHaveProperty('userId', userId);
      expect(resetData).toHaveProperty('email', email);
      expect(resetData).toHaveProperty('expiresAt');
      expect(resetData).toHaveProperty('securityData');
      expect(resetData).toHaveProperty('used', false);
      expect(resetData).toHaveProperty('createdAt');

      // Token should be 64 characters (32 bytes hex)
      expect(resetData.token).toHaveLength(64);
      expect(resetData.tokenHash).toHaveLength(64);
      expect(resetData.token).not.toBe(resetData.tokenHash);

      // Expiry should be in the future
      expect(resetData.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Security data should be populated
      expect(resetData.securityData.userAgent).toBe(options.userAgent);
      expect(resetData.securityData.ip).toBe(options.ip);
      expect(resetData.securityData.attempts).toBe(0);
    });

    test('should generate different tokens each time', () => {
      const userId = testUser._id.toString();
      const email = testUser.email;

      const resetData1 = passwordResetService.generateResetToken(userId, email);
      const resetData2 = passwordResetService.generateResetToken(userId, email);

      expect(resetData1.token).not.toBe(resetData2.token);
      expect(resetData1.tokenHash).not.toBe(resetData2.tokenHash);
    });

    test('should handle missing options gracefully', () => {
      const userId = testUser._id.toString();
      const email = testUser.email;

      const resetData = passwordResetService.generateResetToken(userId, email);

      expect(resetData.securityData.userAgent).toBeNull();
      expect(resetData.securityData.ip).toBeNull();
    });
  });

  describe('Password Reset Token Verification', () => {
    let resetData;

    beforeEach(() => {
      resetData = passwordResetService.generateResetToken(
        testUser._id.toString(),
        testUser.email,
        { userAgent: 'Test Browser', ip: '192.168.1.100' }
      );
    });

    test('should verify valid token', () => {
      const requestData = {
        userAgent: 'Test Browser',
        ip: '192.168.1.100'
      };

      const result = passwordResetService.verifyResetToken(
        resetData.token,
        resetData,
        requestData
      );

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(testUser._id.toString());
      expect(result.email).toBe(testUser.email);
      expect(result).toHaveProperty('timestamp');
    });

    test('should reject invalid token', () => {
      const invalidToken = 'invalid-token-123';
      
      const result = passwordResetService.verifyResetToken(
        invalidToken,
        resetData
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid reset token');
      expect(result.errorCode).toBe('INVALID_TOKEN');
    });

    test('should reject used token', () => {
      resetData.used = true;
      
      const result = passwordResetService.verifyResetToken(
        resetData.token,
        resetData
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Reset token has already been used');
      expect(result.errorCode).toBe('TOKEN_USED');
    });

    test('should reject expired token', () => {
      resetData.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      
      const result = passwordResetService.verifyResetToken(
        resetData.token,
        resetData
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Reset token has expired');
      expect(result.errorCode).toBe('TOKEN_EXPIRED');
    });

    test('should handle missing parameters', () => {
      const testCases = [
        { token: null, resetData: resetData },
        { token: resetData.token, resetData: null },
        { token: '', resetData: resetData }
      ];

      testCases.forEach(({ token, resetData }) => {
        const result = passwordResetService.verifyResetToken(token, resetData);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('INVALID_TOKEN');
      });
    });
  });

  describe('Complete Password Reset Flow', () => {
    test('should complete full password reset successfully', async () => {
      // 1. Generate reset token
      const resetData = passwordResetService.generateResetToken(
        testUser._id.toString(),
        testUser.email,
        { userAgent: 'Test Browser', ip: '192.168.1.100' }
      );

      // 2. Verify original password works
      const originalPasswordValid = await testUser.comparePassword('CurrentPassword123!');
      expect(originalPasswordValid).toBe(true);

      // 3. Reset password
      const newPassword = 'NewSecurePassword456!';
      const resetResult = await passwordResetService.resetPassword(
        resetData.token,
        newPassword,
        resetData,
        testUser,
        {
          requestData: {
            userAgent: 'Test Browser',
            ip: '192.168.1.100'
          }
        }
      );

      expect(resetResult.success).toBe(true);
      expect(resetResult.message).toBe('Password reset successfully');
      expect(resetResult).toHaveProperty('passwordStrength');

      // 4. Verify new password works
      const newPasswordValid = await testUser.comparePassword(newPassword);
      expect(newPasswordValid).toBe(true);

      // 5. Verify old password no longer works
      const oldPasswordValid = await testUser.comparePassword('CurrentPassword123!');
      expect(oldPasswordValid).toBe(false);

      // 6. Verify token is marked as used
      expect(resetData.used).toBe(true);
      expect(resetData.usedAt).toBeInstanceOf(Date);

      // 7. Verify user properties are updated
      expect(testUser.passwordLastChanged).toBeInstanceOf(Date);
      expect(testUser.forcePasswordChange).toBe(false);
      expect(testUser.loginAttempts).toBe(0);
      expect(testUser.tokenVersion).toBeGreaterThan(0);
    }, 15000);

    test('should reject weak password during reset', async () => {
      const resetData = passwordResetService.generateResetToken(
        testUser._id.toString(),
        testUser.email
      );

      const weakPassword = '123456';
      const resetResult = await passwordResetService.resetPassword(
        resetData.token,
        weakPassword,
        resetData,
        testUser
      );

      expect(resetResult.success).toBe(false);
      expect(resetResult.error).toBe('Password does not meet security requirements');
      expect(resetResult.errorCode).toBe('INVALID_PASSWORD');
      expect(resetResult.details).toBeDefined();
    });

    test('should reject password reuse', async () => {
      // First, add current password to history
      const currentPasswordHash = testUser.password;
      testUser.passwordHistory = [{
        hash: currentPasswordHash,
        createdAt: new Date()
      }];
      await testUser.save();

      const resetData = passwordResetService.generateResetToken(
        testUser._id.toString(),
        testUser.email
      );

      // Try to reset to the same password
      const resetResult = await passwordResetService.resetPassword(
        resetData.token,
        'CurrentPassword123!',
        resetData,
        testUser
      );

      expect(resetResult.success).toBe(false);
      expect(resetResult.error).toBe('Password has been used recently. Please choose a different password');
      expect(resetResult.errorCode).toBe('PASSWORD_REUSED');
    });

    test('should handle invalid token during reset', async () => {
      const resetData = passwordResetService.generateResetToken(
        testUser._id.toString(),
        testUser.email
      );

      const invalidToken = 'invalid-token';
      const resetResult = await passwordResetService.resetPassword(
        invalidToken,
        'NewPassword123!',
        resetData,
        testUser
      );

      expect(resetResult.success).toBe(false);
      expect(resetResult.error).toBe('Invalid reset token');
      expect(resetResult.errorCode).toBe('INVALID_TOKEN');
    });
  });

  describe('Password Change (vs Reset)', () => {
    test('should validate password change successfully', async () => {
      // Set password as changed more than 24 hours ago to pass minimum age check
      testUser.passwordLastChanged = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await testUser.save();

      const currentPassword = 'CurrentPassword123!';
      const newPassword = 'NewSecurePassword456!';

      const result = await passwordResetService.validatePasswordChange(
        currentPassword,
        newPassword,
        testUser
      );

      expect(result.valid).toBe(true);
      expect(result).toHaveProperty('passwordStrength');
    }, 10000);

    test('should reject incorrect current password', async () => {
      const wrongCurrentPassword = 'WrongPassword123!';
      const newPassword = 'NewSecurePassword456!';

      const result = await passwordResetService.validatePasswordChange(
        wrongCurrentPassword,
        newPassword,
        testUser
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
      expect(result.errorCode).toBe('INVALID_CURRENT_PASSWORD');
    });

    test('should reject same password', async () => {
      const currentPassword = 'CurrentPassword123!';
      const samePassword = 'CurrentPassword123!';

      const result = await passwordResetService.validatePasswordChange(
        currentPassword,
        samePassword,
        testUser
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('New password must be different from current password');
      expect(result.errorCode).toBe('SAME_PASSWORD');
    });

    test('should respect minimum password age', async () => {
      // Set password as recently changed
      testUser.passwordLastChanged = new Date();
      await testUser.save();

      const currentPassword = 'CurrentPassword123!';
      const newPassword = 'NewSecurePassword456!';

      const result = await passwordResetService.validatePasswordChange(
        currentPassword,
        newPassword,
        testUser
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Password can be changed in');
      expect(result.errorCode).toBe('PASSWORD_TOO_RECENT');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow reset requests within limit', () => {
      const resetAttempts = [
        new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        new Date(Date.now() - 15 * 60 * 1000)  // 15 minutes ago
      ];

      const result = passwordResetService.checkResetRateLimit(resetAttempts);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(1);
      expect(result.recentAttempts).toBe(2);
    });

    test('should block reset requests when limit exceeded', () => {
      const resetAttempts = [
        new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        new Date(Date.now() - 10 * 60 * 1000)  // 10 minutes ago
      ];

      const result = passwordResetService.checkResetRateLimit(resetAttempts);

      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.nextAllowedTime).toBeInstanceOf(Date);
    });

    test('should ignore old reset attempts', () => {
      const resetAttempts = [
        new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (should be ignored)
        new Date(Date.now() - 30 * 60 * 1000)      // 30 minutes ago
      ];

      const result = passwordResetService.checkResetRateLimit(resetAttempts);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(2);
      expect(result.recentAttempts).toBe(1);
    });

    test('should handle empty attempts array', () => {
      const result = passwordResetService.checkResetRateLimit([]);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3);
      expect(result.recentAttempts).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    test('should generate reset link', () => {
      const token = 'test-token-123';
      const baseUrl = 'https://example.com';

      const link = passwordResetService.generateResetLink(token, baseUrl);

      expect(link).toBe('https://example.com/reset-password?token=test-token-123');
    });

    test('should handle base URL with trailing slash', () => {
      const token = 'test-token-123';
      const baseUrl = 'https://example.com/';

      const link = passwordResetService.generateResetLink(token, baseUrl);

      expect(link).toBe('https://example.com/reset-password?token=test-token-123');
    });

    test('should clean up expired tokens', () => {
      const tokens = [
        {
          tokenHash: 'hash1',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Valid (10 min future)
          used: false
        },
        {
          tokenHash: 'hash2',
          expiresAt: new Date(Date.now() - 10 * 60 * 1000), // Expired (10 min past)
          used: false
        },
        {
          tokenHash: 'hash3',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),  // Valid (5 min future)
          used: true // But used
        },
        {
          tokenHash: 'hash4',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Valid (15 min future)
          used: false
        }
      ];

      const cleanTokens = passwordResetService.cleanupExpiredTokens(tokens);

      expect(cleanTokens).toHaveLength(2);
      expect(cleanTokens[0].tokenHash).toBe('hash1');
      expect(cleanTokens[1].tokenHash).toBe('hash4');
    });

    test('should generate audit log entry', () => {
      const action = 'password_reset_requested';
      const details = {
        ip: '192.168.1.100',
        userAgent: 'Test Browser',
        userId: testUser._id.toString(),
        email: testUser.email,
        success: true
      };

      const logEntry = passwordResetService.generateAuditLogEntry(action, details);

      expect(logEntry.action).toBe(action);
      expect(logEntry.timestamp).toBeInstanceOf(Date);
      expect(logEntry.details.ip).toBe(details.ip);
      expect(logEntry.details.userAgent).toBe(details.userAgent);
      expect(logEntry.details.userId).toBe(details.userId);
      expect(logEntry.details.email).toBe(details.email);
      expect(logEntry.details.success).toBe(details.success);
    });
  });

  describe('Security Features', () => {
    test('should perform IP similarity check', () => {
      // Access private method for testing
      const service = passwordResetService;
      
      expect(service.isIPSimilar('192.168.1.100', '192.168.1.100')).toBe(true);
      expect(service.isIPSimilar('192.168.1.100', '192.168.1.101')).toBe(true); // Same subnet
      expect(service.isIPSimilar('192.168.1.100', '192.168.2.100')).toBe(false); // Different subnet
      expect(service.isIPSimilar('192.168.1.100', '10.0.0.100')).toBe(false); // Different network
    });

    test('should handle device verification when enabled', () => {
      // Enable device verification
      passwordResetService.updateConfig({ requireDeviceVerification: true });

      const resetData = passwordResetService.generateResetToken(
        testUser._id.toString(),
        testUser.email,
        { userAgent: 'Original Browser', ip: '192.168.1.100' }
      );

      // Try with different user agent
      const result = passwordResetService.verifyResetToken(
        resetData.token,
        resetData,
        { userAgent: 'Different Browser', ip: '192.168.1.100' }
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('DEVICE_MISMATCH');
    });

    test('should handle location verification when enabled', () => {
      // Enable device verification
      passwordResetService.updateConfig({ requireDeviceVerification: true });

      const resetData = passwordResetService.generateResetToken(
        testUser._id.toString(),
        testUser.email,
        { userAgent: 'Test Browser', ip: '192.168.1.100' }
      );

      // Try with different IP (different network)
      const result = passwordResetService.verifyResetToken(
        resetData.token,
        resetData,
        { userAgent: 'Test Browser', ip: '10.0.0.100' }
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('LOCATION_MISMATCH');
    });
  });

  describe('Configuration Management', () => {
    test('should get current configuration', () => {
      const config = passwordResetService.getConfig();

      expect(config).toHaveProperty('tokenLength');
      expect(config).toHaveProperty('tokenExpiryMs');
      expect(config).toHaveProperty('maxResetAttempts');
      expect(config).toHaveProperty('resetWindowMs');
    });

    test('should update configuration', () => {
      const newConfig = {
        tokenExpiryMs: 30 * 60 * 1000, // 30 minutes
        maxResetAttempts: 5
      };

      passwordResetService.updateConfig(newConfig);
      const config = passwordResetService.getConfig();

      expect(config.tokenExpiryMs).toBe(30 * 60 * 1000);
      expect(config.maxResetAttempts).toBe(5);
    });
  });
});