const MFAService = require('../mfaService');
const User = require('../../../models/User');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Backup Codes and Recovery Mechanisms', () => {
  let mfaService;
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
    mfaService = new MFAService();
    
    // Create a test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123!',
      role: 'user'
    });
    await testUser.save();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('Backup Code Generation', () => {
    test('should generate backup codes with correct format', () => {
      const backupCodes = mfaService.generateBackupCodes();

      expect(backupCodes).toHaveLength(10);
      
      backupCodes.forEach(codeObj => {
        expect(codeObj).toHaveProperty('code');
        expect(codeObj).toHaveProperty('used', false);
        expect(codeObj).toHaveProperty('createdAt');
        expect(codeObj).toHaveProperty('usedAt', null);
        
        // Check code format: XXXX-XXXX
        expect(codeObj.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        expect(codeObj.createdAt).toBeInstanceOf(Date);
      });
    });

    test('should generate unique backup codes', () => {
      const backupCodes = mfaService.generateBackupCodes();
      const codes = backupCodes.map(bc => bc.code);
      const uniqueCodes = [...new Set(codes)];

      expect(uniqueCodes).toHaveLength(codes.length);
    });

    test('should generate different sets of backup codes', () => {
      const set1 = mfaService.generateBackupCodes();
      const set2 = mfaService.generateBackupCodes();

      const codes1 = set1.map(bc => bc.code);
      const codes2 = set2.map(bc => bc.code);

      // Should have no overlap
      const overlap = codes1.filter(code => codes2.includes(code));
      expect(overlap).toHaveLength(0);
    });

    test('should generate custom number of backup codes', () => {
      const customCount = 5;
      const backupCodes = mfaService.generateBackupCodes(customCount);

      expect(backupCodes).toHaveLength(customCount);
    });
  });

  describe('Backup Code Verification', () => {
    let backupCodes;

    beforeEach(() => {
      backupCodes = mfaService.generateBackupCodes(5);
    });

    test('should verify valid unused backup code', () => {
      const testCode = backupCodes[0].code;
      
      const result = mfaService.verifyBackupCode(testCode, backupCodes);

      expect(result.verified).toBe(true);
      expect(result.codeUsed).toBe(testCode);
      expect(result.remainingCodes).toBe(4);
      expect(result).toHaveProperty('timestamp');

      // Verify the code is marked as used
      expect(backupCodes[0].used).toBe(true);
      expect(backupCodes[0].usedAt).toBeInstanceOf(Date);
    });

    test('should reject invalid backup code', () => {
      const invalidCode = 'INVALID-CODE';
      
      const result = mfaService.verifyBackupCode(invalidCode, backupCodes);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Invalid or already used backup code');
      expect(result).toHaveProperty('timestamp');
    });

    test('should reject already used backup code', () => {
      const testCode = backupCodes[0].code;

      // Use the code first time
      const result1 = mfaService.verifyBackupCode(testCode, backupCodes);
      expect(result1.verified).toBe(true);

      // Try to use the same code again
      const result2 = mfaService.verifyBackupCode(testCode, backupCodes);
      expect(result2.verified).toBe(false);
      expect(result2.error).toBe('Invalid or already used backup code');
    });

    test('should handle different input formats', () => {
      const originalCode = backupCodes[0].code; // Format: XXXX-XXXX
      
      const testFormats = [
        originalCode.toLowerCase(), // lowercase
        originalCode.replace('-', ''), // no dash
        originalCode.replace('-', ' '), // space instead of dash
        ` ${originalCode} ` // with spaces around
      ];

      testFormats.forEach((formattedCode, index) => {
        // Reset the backup code for each test
        backupCodes[0].used = false;
        backupCodes[0].usedAt = null;

        const result = mfaService.verifyBackupCode(formattedCode, backupCodes);
        expect(result.verified).toBe(true);
        expect(result.codeUsed).toBe(originalCode);
      });
    });

    test('should track remaining codes correctly', () => {
      // Use 3 out of 5 codes
      for (let i = 0; i < 3; i++) {
        const result = mfaService.verifyBackupCode(backupCodes[i].code, backupCodes);
        expect(result.verified).toBe(true);
        expect(result.remainingCodes).toBe(5 - i - 1);
      }

      // Verify final count
      const unusedCodes = backupCodes.filter(bc => !bc.used);
      expect(unusedCodes).toHaveLength(2);
    });

    test('should handle edge cases gracefully', () => {
      const testCases = [
        { code: null, codes: backupCodes, expectedError: 'Invalid input parameters' },
        { code: '', codes: backupCodes, expectedError: 'Invalid input parameters' },
        { code: 'VALID-CODE', codes: null, expectedError: 'Invalid input parameters' },
        { code: 'VALID-CODE', codes: [], expectedError: 'Invalid or already used backup code' },
        { code: 'VALID-CODE', codes: 'not-array', expectedError: 'Invalid input parameters' }
      ];

      testCases.forEach(({ code, codes, expectedError }) => {
        const result = mfaService.verifyBackupCode(code, codes);
        expect(result.verified).toBe(false);
        expect(result.error).toBe(expectedError);
      });
    });
  });

  describe('User Model Integration', () => {
    test('should enable MFA with backup codes', async () => {
      const totpSecret = 'TESTSECRET123456789';
      const backupCodes = mfaService.generateBackupCodes();

      await testUser.enableMFA(totpSecret, backupCodes);

      expect(testUser.mfaEnabled).toBe(true);
      expect(testUser.totpSecret).toBe(totpSecret);
      expect(testUser.backupCodes).toHaveLength(10);
      expect(testUser.backupCodes[0]).toHaveProperty('code');
      expect(testUser.backupCodes[0]).toHaveProperty('used', false);
    });

    test('should disable MFA and clear backup codes', async () => {
      // First enable MFA
      const totpSecret = 'TESTSECRET123456789';
      const backupCodes = mfaService.generateBackupCodes();
      await testUser.enableMFA(totpSecret, backupCodes);

      // Then disable it
      await testUser.disableMFA();

      expect(testUser.mfaEnabled).toBe(false);
      expect(testUser.totpSecret).toBeNull();
      expect(testUser.backupCodes).toHaveLength(0);
      expect(testUser.mfaFailedAttempts).toHaveLength(0);
      expect(testUser.lastMFAUsed).toBeNull();
    });

    test('should use backup code through user model', async () => {
      const backupCodes = mfaService.generateBackupCodes();
      await testUser.enableMFA('TESTSECRET123456789', backupCodes);

      const testCode = testUser.backupCodes[0].code;
      const result = await testUser.useBackupCode(testCode);

      expect(result).toBe(true);
      
      // Verify the code is marked as used
      expect(testUser.backupCodes[0].used).toBe(true);
      expect(testUser.backupCodes[0].usedAt).toBeInstanceOf(Date);
    });

    test('should reject invalid backup code through user model', async () => {
      const backupCodes = mfaService.generateBackupCodes();
      await testUser.enableMFA('TESTSECRET123456789', backupCodes);

      const result = await testUser.useBackupCode('INVALID-CODE');

      expect(result).toBe(false);
    });

    test('should reject already used backup code through user model', async () => {
      const backupCodes = mfaService.generateBackupCodes();
      await testUser.enableMFA('TESTSECRET123456789', backupCodes);

      const testCode = testUser.backupCodes[0].code;
      
      // Use code first time
      const result1 = await testUser.useBackupCode(testCode);
      expect(result1).toBe(true);

      // Try to use same code again
      const result2 = await testUser.useBackupCode(testCode);
      expect(result2).toBe(false);
    });
  });

  describe('MFA Recovery Flow', () => {
    test('should generate recovery information', () => {
      const userId = testUser._id.toString();
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
      const userId = testUser._id.toString();
      const recovery = mfaService.generateRecoveryInfo(userId);

      const result = mfaService.verifyRecoveryCode(recovery.recoveryCode, recovery);

      expect(result.verified).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result).toHaveProperty('timestamp');
    });

    test('should reject invalid recovery code', () => {
      const recovery = mfaService.generateRecoveryInfo(testUser._id.toString());
      const invalidCode = 'invalid-recovery-code';

      const result = mfaService.verifyRecoveryCode(invalidCode, recovery);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Invalid recovery code');
    });

    test('should reject used recovery code', () => {
      const recovery = mfaService.generateRecoveryInfo(testUser._id.toString());
      recovery.used = true;

      const result = mfaService.verifyRecoveryCode(recovery.recoveryCode, recovery);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Recovery code already used');
    });

    test('should reject expired recovery code', () => {
      const recovery = mfaService.generateRecoveryInfo(testUser._id.toString());
      recovery.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      const result = mfaService.verifyRecoveryCode(recovery.recoveryCode, recovery);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Recovery code expired');
    });

    test('should handle missing parameters', () => {
      const recovery = mfaService.generateRecoveryInfo(testUser._id.toString());

      const testCases = [
        { code: null, recovery: recovery },
        { code: recovery.recoveryCode, recovery: null },
        { code: '', recovery: recovery },
        { code: recovery.recoveryCode, recovery: {} }
      ];

      testCases.forEach(({ code, recovery }) => {
        const result = mfaService.verifyRecoveryCode(code, recovery);
        expect(result.verified).toBe(false);
        expect(result.error).toBe('Invalid recovery code');
      });
    });
  });

  describe('Complete MFA Recovery Workflow', () => {
    test('should complete full recovery workflow', async () => {
      // 1. Setup MFA for user
      const totpSecret = 'TESTSECRET123456789';
      const backupCodes = mfaService.generateBackupCodes();
      await testUser.enableMFA(totpSecret, backupCodes);

      // 2. Simulate user losing device - generate recovery code
      const recovery = mfaService.generateRecoveryInfo(testUser._id.toString());
      testUser.mfaRecovery = recovery;
      await testUser.save();

      // 3. User provides recovery code
      const verificationResult = mfaService.verifyRecoveryCode(recovery.recoveryCode, testUser.mfaRecovery);
      expect(verificationResult.verified).toBe(true);

      // 4. Generate new backup codes after recovery
      const newBackupCodes = mfaService.generateBackupCodes();
      testUser.backupCodes = newBackupCodes;
      testUser.mfaRecovery.used = true;
      await testUser.save();

      // 5. Verify new backup codes work
      const testCode = testUser.backupCodes[0].code;
      const backupResult = await testUser.useBackupCode(testCode);
      expect(backupResult).toBe(true);

      // 6. Verify old recovery code can't be used again
      const oldRecoveryResult = mfaService.verifyRecoveryCode(recovery.recoveryCode, testUser.mfaRecovery);
      expect(oldRecoveryResult.verified).toBe(false);
      expect(oldRecoveryResult.error).toBe('Recovery code already used');
    });

    test('should handle recovery code expiration', async () => {
      // Setup MFA
      const totpSecret = 'TESTSECRET123456789';
      const backupCodes = mfaService.generateBackupCodes();
      await testUser.enableMFA(totpSecret, backupCodes);

      // Generate expired recovery code
      const recovery = mfaService.generateRecoveryInfo(testUser._id.toString());
      recovery.expiresAt = new Date(Date.now() - 1000); // Expired
      testUser.mfaRecovery = recovery;
      await testUser.save();

      // Try to use expired recovery code
      const result = mfaService.verifyRecoveryCode(recovery.recoveryCode, testUser.mfaRecovery);
      expect(result.verified).toBe(false);
      expect(result.error).toBe('Recovery code expired');
    });
  });

  describe('Backup Code Security', () => {
    test('should generate cryptographically secure codes', () => {
      const backupCodes = mfaService.generateBackupCodes(100);
      const codes = backupCodes.map(bc => bc.code);

      // Check for patterns that might indicate weak randomness
      const patterns = [
        /0000|1111|2222|3333|4444|5555|6666|7777|8888|9999/, // Repeated digits
        /AAAA|BBBB|CCCC|DDDD|EEEE|FFFF/, // Repeated letters
        /0123|1234|2345|3456|4567|5678|6789|7890/, // Sequential numbers
        /ABCD|BCDE|CDEF|DEFG|EFGH|FGHI|GHIJ|HIJK/ // Sequential letters
      ];

      let patternMatches = 0;
      codes.forEach(code => {
        patterns.forEach(pattern => {
          if (pattern.test(code)) {
            patternMatches++;
          }
        });
      });

      // With good randomness, pattern matches should be very rare
      expect(patternMatches).toBeLessThan(5); // Allow some coincidental matches
    });

    test('should have good entropy distribution', () => {
      const backupCodes = mfaService.generateBackupCodes(1000);
      const allChars = backupCodes.map(bc => bc.code.replace('-', '')).join('');
      
      // Count character frequency
      const charCount = {};
      for (const char of allChars) {
        charCount[char] = (charCount[char] || 0) + 1;
      }

      // Check that all expected characters appear
      const expectedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (const char of expectedChars) {
        expect(charCount[char]).toBeGreaterThan(0);
      }

      // Check for reasonable distribution (no character should be overly frequent)
      const totalChars = allChars.length;
      const expectedFreq = totalChars / expectedChars.length;
      const tolerance = expectedFreq * 0.5; // 50% tolerance

      Object.values(charCount).forEach(count => {
        expect(count).toBeGreaterThan(expectedFreq - tolerance);
        expect(count).toBeLessThan(expectedFreq + tolerance);
      });
    });
  });
});