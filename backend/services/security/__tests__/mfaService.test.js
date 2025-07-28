const MFAService = require('../mfaService');
const speakeasy = require('speakeasy');

describe('MFAService', () => {
  let mfaService;

  beforeEach(() => {
    mfaService = new MFAService();
  });

  describe('TOTP Secret Generation', () => {
    test('should generate TOTP secret successfully', async () => {
      const userId = 'user123';
      const userEmail = 'test@example.com';
      
      const result = await mfaService.generateTOTPSecret(userId, userEmail);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('manualEntryKey');
      expect(result).toHaveProperty('otpauthUrl');
      expect(result).toHaveProperty('issuer');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('digits', 6);
      expect(result).toHaveProperty('period', 30);

      expect(typeof result.secret).toBe('string');
      expect(result.secret.length).toBeGreaterThan(20);
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.otpauthUrl).toContain(encodeURIComponent(userEmail));
      expect(result.issuer).toBe('LibraryBookingApp');
    });

    test('should generate different secrets for different users', async () => {
      const result1 = await mfaService.generateTOTPSecret('user1', 'user1@example.com');
      const result2 = await mfaService.generateTOTPSecret('user2', 'user2@example.com');

      expect(result1.secret).not.toBe(result2.secret);
      expect(result1.qrCode).not.toBe(result2.qrCode);
    });

    test('should handle errors gracefully', async () => {
      // Mock QRCode.toDataURL to throw an error
      const QRCode = require('qrcode');
      const originalToDataURL = QRCode.toDataURL;
      QRCode.toDataURL = jest.fn().mockRejectedValue(new Error('QR generation failed'));

      await expect(mfaService.generateTOTPSecret('user123', 'test@example.com'))
        .rejects.toThrow('Failed to generate TOTP secret: QR generation failed');

      // Restore original function
      QRCode.toDataURL = originalToDataURL;
    });
  });

  describe('TOTP Token Verification', () => {
    let testSecret;

    beforeEach(async () => {
      const secretData = await mfaService.generateTOTPSecret('testuser', 'test@example.com');
      testSecret = secretData.secret;
    });

    test('should verify valid TOTP token', () => {
      // Generate current token
      const currentToken = mfaService.generateCurrentToken(testSecret);
      
      const result = mfaService.verifyTOTP(currentToken, testSecret);

      expect(result.verified).toBe(true);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('window');
    });

    test('should reject invalid TOTP token', () => {
      const invalidToken = '123456';
      
      const result = mfaService.verifyTOTP(invalidToken, testSecret);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result).toHaveProperty('timestamp');
    });

    test('should reject malformed tokens', () => {
      const testCases = [
        { token: '12345', expected: 'Token must be 6 digits' },
        { token: '1234567', expected: 'Token must be 6 digits' },
        { token: 'abcdef', expected: 'Token must be 6 digits' },
        { token: '123 456', expected: 'Invalid token' }, // Will be cleaned to 123456 but still invalid
        { token: '', expected: 'Token and secret are required' },
        { token: null, expected: 'Token and secret are required' }
      ];

      testCases.forEach(({ token, expected }) => {
        const result = mfaService.verifyTOTP(token, testSecret);
        expect(result.verified).toBe(false);
        expect(result.error).toBe(expected);
      });
    });

    test('should handle missing secret', () => {
      const currentToken = mfaService.generateCurrentToken(testSecret);
      
      const result = mfaService.verifyTOTP(currentToken, null);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Token and secret are required');
    });

    test('should clean token input (remove spaces)', () => {
      const currentToken = mfaService.generateCurrentToken(testSecret);
      const tokenWithSpaces = currentToken.substring(0, 3) + ' ' + currentToken.substring(3);
      
      const result = mfaService.verifyTOTP(tokenWithSpaces, testSecret);

      expect(result.verified).toBe(true);
    });

    test('should work with custom time window', () => {
      const currentToken = mfaService.generateCurrentToken(testSecret);
      
      const result = mfaService.verifyTOTP(currentToken, testSecret, { window: 1 });

      expect(result.verified).toBe(true);
      expect(result.window).toBe(1);
    });
  });

  describe('Backup Codes', () => {
    test('should generate backup codes', () => {
      const backupCodes = mfaService.generateBackupCodes();

      expect(Array.isArray(backupCodes)).toBe(true);
      expect(backupCodes).toHaveLength(10);

      backupCodes.forEach(codeObj => {
        expect(codeObj).toHaveProperty('code');
        expect(codeObj).toHaveProperty('used', false);
        expect(codeObj).toHaveProperty('createdAt');
        expect(codeObj).toHaveProperty('usedAt', null);
        
        expect(typeof codeObj.code).toBe('string');
        expect(codeObj.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        expect(codeObj.createdAt).toBeInstanceOf(Date);
      });
    });

    test('should generate custom number of backup codes', () => {
      const backupCodes = mfaService.generateBackupCodes(5);

      expect(backupCodes).toHaveLength(5);
    });

    test('should generate unique backup codes', () => {
      const backupCodes = mfaService.generateBackupCodes();
      const codes = backupCodes.map(bc => bc.code);
      const uniqueCodes = [...new Set(codes)];

      expect(uniqueCodes).toHaveLength(codes.length);
    });

    test('should verify valid backup code', () => {
      const backupCodes = mfaService.generateBackupCodes(3);
      const testCode = backupCodes[0].code;

      const result = mfaService.verifyBackupCode(testCode, backupCodes);

      expect(result.verified).toBe(true);
      expect(result.codeUsed).toBe(testCode);
      expect(result.remainingCodes).toBe(2);
      expect(result).toHaveProperty('timestamp');

      // Check that the code is marked as used
      expect(backupCodes[0].used).toBe(true);
      expect(backupCodes[0].usedAt).toBeInstanceOf(Date);
    });

    test('should reject invalid backup code', () => {
      const backupCodes = mfaService.generateBackupCodes(3);
      const invalidCode = 'INVALID-CODE';

      const result = mfaService.verifyBackupCode(invalidCode, backupCodes);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Invalid or already used backup code');
    });

    test('should reject already used backup code', () => {
      const backupCodes = mfaService.generateBackupCodes(3);
      const testCode = backupCodes[0].code;

      // Use the code first time
      const result1 = mfaService.verifyBackupCode(testCode, backupCodes);
      expect(result1.verified).toBe(true);

      // Try to use the same code again
      const result2 = mfaService.verifyBackupCode(testCode, backupCodes);
      expect(result2.verified).toBe(false);
      expect(result2.error).toBe('Invalid or already used backup code');
    });

    test('should handle malformed input', () => {
      const backupCodes = mfaService.generateBackupCodes(3);

      const testCases = [
        { code: null, codes: backupCodes },
        { code: '', codes: backupCodes },
        { code: 'VALID-CODE', codes: null },
        { code: 'VALID-CODE', codes: 'not-an-array' }
      ];

      testCases.forEach(({ code, codes }) => {
        const result = mfaService.verifyBackupCode(code, codes);
        expect(result.verified).toBe(false);
        expect(result.error).toBe('Invalid input parameters');
      });
    });

    test('should handle code formatting (spaces and dashes)', () => {
      const backupCodes = mfaService.generateBackupCodes(1);
      const originalCode = backupCodes[0].code; // Format: XXXX-XXXX
      
      // Test different input formats
      const formats = [
        originalCode.toLowerCase(), // lowercase
        originalCode.replace('-', ''), // no dash
        originalCode.replace('-', ' '), // space instead of dash
        ` ${originalCode} ` // with spaces around
      ];

      formats.forEach(formattedCode => {
        // Reset the backup code for each test
        backupCodes[0].used = false;
        backupCodes[0].usedAt = null;

        const result = mfaService.verifyBackupCode(formattedCode, backupCodes);
        expect(result.verified).toBe(true);
      });
    });
  });

  describe('MFA Setup Validation', () => {
    let testSecret;

    beforeEach(async () => {
      const secretData = await mfaService.generateTOTPSecret('testuser', 'test@example.com');
      testSecret = secretData.secret;
    });

    test('should validate successful MFA setup', () => {
      const currentToken = mfaService.generateCurrentToken(testSecret);
      
      const result = mfaService.validateMFASetup(testSecret, currentToken);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('MFA setup completed successfully');
      expect(result).toHaveProperty('timestamp');
    });

    test('should reject invalid setup token', () => {
      const invalidToken = '123456';
      
      const result = mfaService.validateMFASetup(testSecret, invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('Utility Functions', () => {
    test('should get time remaining until next token', () => {
      const timeRemaining = mfaService.getTimeRemaining();

      expect(typeof timeRemaining).toBe('number');
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(30);
    });

    test('should generate current token', async () => {
      const secretData = await mfaService.generateTOTPSecret('testuser', 'test@example.com');
      const token = mfaService.generateCurrentToken(secretData.secret);

      expect(typeof token).toBe('string');
      expect(token).toMatch(/^\d{6}$/);
    });

    test('should handle token generation errors', () => {
      // speakeasy doesn't throw on invalid secret, it just returns invalid token
      // Let's test with null/undefined secret instead
      expect(() => {
        mfaService.generateCurrentToken(null);
      }).toThrow('Failed to generate token');
    });
  });

  describe('MFA Lockout Protection', () => {
    test('should not be locked with no failed attempts', () => {
      const result = mfaService.checkMFALockout([]);

      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(5);
      expect(result.unlockTime).toBeNull();
    });

    test('should track remaining attempts', () => {
      const failedAttempts = [
        new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
      ];

      const result = mfaService.checkMFALockout(failedAttempts);

      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(3);
      expect(result.recentFailures).toBe(2);
    });

    test('should lock account after max failed attempts', () => {
      const failedAttempts = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() - i * 60 * 1000) // 0, 1, 2, 3, 4 minutes ago
      );

      const result = mfaService.checkMFALockout(failedAttempts);

      expect(result.locked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.unlockTime).toBeInstanceOf(Date);
      expect(result.recentFailures).toBe(5);
    });

    test('should ignore old failed attempts', () => {
      const failedAttempts = [
        new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago (should be ignored)
        new Date(Date.now() - 2 * 60 * 1000),  // 2 minutes ago
      ];

      const result = mfaService.checkMFALockout(failedAttempts);

      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(4);
      expect(result.recentFailures).toBe(1);
    });
  });

  describe('Recovery Codes', () => {
    test('should generate recovery information', () => {
      const userId = 'user123';
      const recovery = mfaService.generateRecoveryInfo(userId);

      expect(recovery).toHaveProperty('recoveryCode');
      expect(recovery).toHaveProperty('userId', userId);
      expect(recovery).toHaveProperty('expiresAt');
      expect(recovery).toHaveProperty('used', false);
      expect(recovery).toHaveProperty('createdAt');

      expect(typeof recovery.recoveryCode).toBe('string');
      expect(recovery.recoveryCode.length).toBe(64); // 32 bytes * 2 (hex)
      expect(recovery.expiresAt).toBeInstanceOf(Date);
      expect(recovery.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should verify valid recovery code', () => {
      const userId = 'user123';
      const recovery = mfaService.generateRecoveryInfo(userId);

      const result = mfaService.verifyRecoveryCode(recovery.recoveryCode, recovery);

      expect(result.verified).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result).toHaveProperty('timestamp');
    });

    test('should reject invalid recovery code', () => {
      const recovery = mfaService.generateRecoveryInfo('user123');
      const invalidCode = 'invalid-recovery-code';

      const result = mfaService.verifyRecoveryCode(invalidCode, recovery);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Invalid recovery code');
    });

    test('should reject used recovery code', () => {
      const recovery = mfaService.generateRecoveryInfo('user123');
      recovery.used = true;

      const result = mfaService.verifyRecoveryCode(recovery.recoveryCode, recovery);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Recovery code already used');
    });

    test('should reject expired recovery code', () => {
      const recovery = mfaService.generateRecoveryInfo('user123');
      recovery.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      const result = mfaService.verifyRecoveryCode(recovery.recoveryCode, recovery);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Recovery code expired');
    });
  });

  describe('MFA Status Reporting', () => {
    test('should generate status for user without MFA', () => {
      const userMFAData = {};
      const status = mfaService.generateMFAStatus(userMFAData);

      expect(status.enabled).toBe(false);
      expect(status.setupComplete).toBe(false);
      expect(status.backupCodesGenerated).toBe(false);
      expect(status.unusedBackupCodes).toBe(0);
      expect(status.lastUsed).toBeNull();
      expect(status.failedAttempts).toBe(0);
      expect(status.locked).toBe(false);
    });

    test('should generate status for user with complete MFA setup', () => {
      const userMFAData = {
        totpSecret: 'secret123',
        mfaEnabled: true,
        backupCodes: [
          { code: 'CODE1', used: false },
          { code: 'CODE2', used: true },
          { code: 'CODE3', used: false }
        ],
        lastMFAUsed: new Date(),
        mfaFailedAttempts: []
      };

      const status = mfaService.generateMFAStatus(userMFAData);

      expect(status.enabled).toBe(true);
      expect(status.setupComplete).toBe(true);
      expect(status.backupCodesGenerated).toBe(true);
      expect(status.unusedBackupCodes).toBe(2);
      expect(status.lastUsed).toBeInstanceOf(Date);
      expect(status.failedAttempts).toBe(0);
      expect(status.locked).toBe(false);
    });

    test('should generate status for locked user', () => {
      const userMFAData = {
        totpSecret: 'secret123',
        mfaEnabled: true,
        mfaFailedAttempts: Array.from({ length: 5 }, () => new Date())
      };

      const status = mfaService.generateMFAStatus(userMFAData);

      expect(status.locked).toBe(true);
      expect(status.unlockTime).toBeInstanceOf(Date);
      expect(status.failedAttempts).toBe(5);
    });
  });

  describe('Configuration Management', () => {
    test('should get current configuration', () => {
      const config = mfaService.getConfig();

      expect(config).toHaveProperty('issuer');
      expect(config).toHaveProperty('window');
      expect(config).toHaveProperty('step');
      expect(config).toHaveProperty('digits');
      expect(config).toHaveProperty('algorithm');
      expect(config).toHaveProperty('backupCodeLength');
      expect(config).toHaveProperty('backupCodeCount');
    });

    test('should update configuration', () => {
      const newConfig = { window: 3, digits: 8 };
      mfaService.updateConfig(newConfig);

      const config = mfaService.getConfig();
      expect(config.window).toBe(3);
      expect(config.digits).toBe(8);
    });
  });
});