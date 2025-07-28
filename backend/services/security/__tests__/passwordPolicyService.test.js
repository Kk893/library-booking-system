const PasswordPolicyService = require('../passwordPolicyService');
const bcrypt = require('bcryptjs');

describe('PasswordPolicyService', () => {
  let passwordPolicyService;

  beforeEach(() => {
    passwordPolicyService = new PasswordPolicyService();
  });

  describe('validatePassword', () => {
    test('should validate a strong password successfully', () => {
      const password = 'StrongP@ssw0rd123';
      const result = passwordPolicyService.validatePassword(password);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strengthScore).toBeGreaterThanOrEqual(3);
    });

    test('should reject password that is too short', () => {
      const password = 'Short1!';
      const result = passwordPolicyService.validatePassword(password);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should reject password without uppercase letters', () => {
      const password = 'lowercase123!';
      const result = passwordPolicyService.validatePassword(password);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    test('should reject password without lowercase letters', () => {
      const password = 'UPPERCASE123!';
      const result = passwordPolicyService.validatePassword(password);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    test('should reject password without numbers', () => {
      const password = 'NoNumbers!';
      const result = passwordPolicyService.validatePassword(password);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should reject password without special characters', () => {
      const password = 'NoSpecialChars123';
      const result = passwordPolicyService.validatePassword(password);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password must contain at least 1 special character(s)');
    });

    test('should reject common passwords', () => {
      const password = 'password123';
      const result = passwordPolicyService.validatePassword(password);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a more unique password');
    });

    test('should reject password containing user information', () => {
      const password = 'JohnDoe123!';
      const userInfo = { name: 'John Doe', email: 'john@example.com' };
      const result = passwordPolicyService.validatePassword(password, userInfo);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password must not contain personal information');
    });

    test('should handle empty or null password', () => {
      const result1 = passwordPolicyService.validatePassword('');
      const result2 = passwordPolicyService.validatePassword(null);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result1.strengthScore).toBe(0);
      expect(result2.strengthScore).toBe(0);
    });
  });

  describe('calculatePasswordStrength', () => {
    test('should calculate strength for very weak password', () => {
      const password = '123';
      const strength = passwordPolicyService.calculatePasswordStrength(password);
      expect(strength).toBe(1);
    });

    test('should calculate strength for weak password', () => {
      const password = 'password';
      const strength = passwordPolicyService.calculatePasswordStrength(password);
      expect(strength).toBe(1);
    });

    test('should calculate strength for fair password', () => {
      const password = 'Password123';
      const strength = passwordPolicyService.calculatePasswordStrength(password);
      expect(strength).toBeGreaterThanOrEqual(2);
    });

    test('should calculate strength for strong password', () => {
      const password = 'StrongP@ssw0rd123';
      const strength = passwordPolicyService.calculatePasswordStrength(password);
      expect(strength).toBeGreaterThanOrEqual(3);
    });

    test('should calculate strength for very strong password', () => {
      const password = 'VeryStr0ng&C0mpl3xP@ssw0rd!2024';
      const strength = passwordPolicyService.calculatePasswordStrength(password);
      expect(strength).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getStrengthText', () => {
    test('should return correct strength text for each score', () => {
      expect(passwordPolicyService.getStrengthText(1)).toBe('Very Weak');
      expect(passwordPolicyService.getStrengthText(2)).toBe('Weak');
      expect(passwordPolicyService.getStrengthText(3)).toBe('Fair');
      expect(passwordPolicyService.getStrengthText(4)).toBe('Strong');
      expect(passwordPolicyService.getStrengthText(5)).toBe('Very Strong');
      expect(passwordPolicyService.getStrengthText(0)).toBe('Invalid');
    });
  });

  describe('generatePasswordFeedback', () => {
    test('should provide feedback for weak password', () => {
      const password = 'weak';
      const feedback = passwordPolicyService.generatePasswordFeedback(password);

      expect(feedback.score).toBeLessThanOrEqual(2);
      expect(feedback.suggestions).toContain('Use at least 12 characters for better security');
      expect(feedback.suggestions).toContain('Add uppercase letters');
      expect(feedback.suggestions).toContain('Add numbers');
      expect(feedback.suggestions).toContain('Add special characters (!@#$%^&*)');
    });

    test('should provide minimal feedback for strong password', () => {
      const password = 'VeryStr0ng&C0mpl3xP@ssw0rd!2024';
      const feedback = passwordPolicyService.generatePasswordFeedback(password);

      expect(feedback.score).toBeGreaterThanOrEqual(4);
      expect(feedback.suggestions.length).toBeLessThan(3);
    });

    test('should detect sequential patterns', () => {
      const password = 'Password123456!';
      const feedback = passwordPolicyService.generatePasswordFeedback(password);

      expect(feedback.suggestions).toContain('Avoid sequential numbers');
    });

    test('should detect repeated characters', () => {
      const password = 'Passsssword123!';
      const feedback = passwordPolicyService.generatePasswordFeedback(password);

      expect(feedback.suggestions).toContain('Avoid repeating characters');
    });
  });

  describe('isPasswordInHistory', () => {
    test('should return false for empty history', async () => {
      const password = 'NewPassword123!';
      const result = await passwordPolicyService.isPasswordInHistory(password, []);

      expect(result).toBe(false);
    });

    test('should return true if password exists in history', async () => {
      const password = 'OldPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      const history = [
        { hash: hashedPassword, createdAt: new Date() }
      ];

      const result = await passwordPolicyService.isPasswordInHistory(password, history);

      expect(result).toBe(true);
    });

    test('should return false if password does not exist in history', async () => {
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';
      const hashedPassword = await bcrypt.hash(oldPassword, 12);
      const history = [
        { hash: hashedPassword, createdAt: new Date() }
      ];

      const result = await passwordPolicyService.isPasswordInHistory(newPassword, history);

      expect(result).toBe(false);
    });
  });

  describe('addToPasswordHistory', () => {
    test('should add password to empty history', () => {
      const passwordHash = 'hashedPassword123';
      const result = passwordPolicyService.addToPasswordHistory(passwordHash, []);

      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe(passwordHash);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    test('should add password to existing history', () => {
      const oldHash = 'oldHashedPassword';
      const newHash = 'newHashedPassword';
      const existingHistory = [
        { hash: oldHash, createdAt: new Date(Date.now() - 86400000) }
      ];

      const result = passwordPolicyService.addToPasswordHistory(newHash, existingHistory);

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe(newHash);
      expect(result[1].hash).toBe(oldHash);
    });

    test('should limit history to configured count', () => {
      const existingHistory = Array.from({ length: 5 }, (_, i) => ({
        hash: `hash${i}`,
        createdAt: new Date(Date.now() - i * 86400000)
      }));

      const result = passwordPolicyService.addToPasswordHistory('newHash', existingHistory);

      expect(result).toHaveLength(5);
      expect(result[0].hash).toBe('newHash');
    });
  });

  describe('canChangePassword', () => {
    test('should allow password change if no previous change', () => {
      const result = passwordPolicyService.canChangePassword(null);

      expect(result.allowed).toBe(true);
      expect(result.timeRemaining).toBe(0);
    });

    test('should allow password change after minimum age', () => {
      const lastChange = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const result = passwordPolicyService.canChangePassword(lastChange);

      expect(result.allowed).toBe(true);
      expect(result.timeRemaining).toBe(0);
    });

    test('should not allow password change before minimum age', () => {
      const lastChange = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      const result = passwordPolicyService.canChangePassword(lastChange);

      expect(result.allowed).toBe(false);
      expect(result.timeRemaining).toBeGreaterThan(0);
      expect(result.timeRemainingHours).toBeGreaterThan(0);
    });
  });

  describe('isPasswordExpired', () => {
    test('should not be expired if no previous change', () => {
      const result = passwordPolicyService.isPasswordExpired(null);

      expect(result.expired).toBe(false);
      expect(result.daysUntilExpiry).toBeNull();
    });

    test('should not be expired if within max age', () => {
      const lastChange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const result = passwordPolicyService.isPasswordExpired(lastChange);

      expect(result.expired).toBe(false);
      expect(result.daysUntilExpiry).toBeGreaterThan(0);
    });

    test('should be expired if beyond max age', () => {
      const lastChange = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const result = passwordPolicyService.isPasswordExpired(lastChange);

      expect(result.expired).toBe(true);
      expect(result.daysUntilExpiry).toBe(0);
    });
  });

  describe('generateSecurePassword', () => {
    test('should generate password with default length', () => {
      const password = passwordPolicyService.generateSecurePassword();

      expect(password).toHaveLength(16);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true);
    });

    test('should generate password with custom length', () => {
      const password = passwordPolicyService.generateSecurePassword(20);

      expect(password).toHaveLength(20);
    });

    test('should generate different passwords each time', () => {
      const password1 = passwordPolicyService.generateSecurePassword();
      const password2 = passwordPolicyService.generateSecurePassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe('configuration management', () => {
    test('should update configuration', () => {
      const newConfig = { minLength: 10, requireSpecialChars: false };
      passwordPolicyService.updateConfig(newConfig);

      const config = passwordPolicyService.getConfig();
      expect(config.minLength).toBe(10);
      expect(config.requireSpecialChars).toBe(false);
    });

    test('should get current configuration', () => {
      const config = passwordPolicyService.getConfig();

      expect(config).toHaveProperty('minLength');
      expect(config).toHaveProperty('requireUppercase');
      expect(config).toHaveProperty('passwordHistoryCount');
    });
  });
});