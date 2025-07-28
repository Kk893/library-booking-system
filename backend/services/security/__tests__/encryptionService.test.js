const encryptionService = require('../encryptionService');
const { configService } = require('../configService');

// Mock dependencies
jest.mock('../configService', () => ({
  configService: {
    initialize: jest.fn().mockResolvedValue(true),
    getEncryptionConfig: jest.fn().mockReturnValue({
      encryptionKey: 'test-encryption-key-for-testing-purposes-12345678901234567890',
      fieldEncryptionKey: 'test-field-encryption-key-for-testing-purposes-12345678901234567890',
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000
    })
  }
}));

describe('EncryptionService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset initialization state
    encryptionService.initialized = false;
    await encryptionService.initialize();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      expect(configService.initialize).toHaveBeenCalled();
      expect(configService.getEncryptionConfig).toHaveBeenCalled();
      expect(encryptionService.initialized).toBe(true);
    });

    it('should throw error if encryption key is not configured', async () => {
      configService.getEncryptionConfig.mockReturnValue({});
      encryptionService.initialized = false;

      await expect(encryptionService.initialize()).rejects.toThrow('Encryption service initialization failed');
    });

    it('should not reinitialize if already initialized', async () => {
      const initCallCount = configService.initialize.mock.calls.length;
      await encryptionService.initialize();
      expect(configService.initialize).toHaveBeenCalledTimes(initCallCount);
    });
  });

  describe('field encryption and decryption', () => {
    it('should encrypt and decrypt string data correctly', async () => {
      const originalData = 'sensitive-information';
      const fieldType = 'email';

      const encrypted = await encryptionService.encryptField(originalData, fieldType);
      expect(encrypted).toMatch(/^enc:/);
      expect(encrypted).not.toContain(originalData);

      const decrypted = await encryptionService.decryptField(encrypted, fieldType);
      expect(decrypted).toBe(originalData);
    });

    it('should encrypt and decrypt object data correctly', async () => {
      const originalData = { userId: '123', token: 'secret-token' };
      const fieldType = 'token';

      const encrypted = await encryptionService.encryptField(originalData, fieldType);
      expect(encrypted).toMatch(/^enc:/);

      const decrypted = await encryptionService.decryptField(encrypted, fieldType);
      expect(decrypted).toEqual(originalData);
    });

    it('should return null/undefined values unchanged', async () => {
      expect(await encryptionService.encryptField(null, 'email')).toBeNull();
      expect(await encryptionService.encryptField(undefined, 'email')).toBeUndefined();
      expect(await encryptionService.encryptField('', 'email')).toBe('');
    });

    it('should return non-encrypted data unchanged during decryption', async () => {
      const plainData = 'not-encrypted-data';
      const result = await encryptionService.decryptField(plainData, 'email');
      expect(result).toBe(plainData);
    });

    it('should handle decryption errors gracefully', async () => {
      const invalidEncrypted = 'enc:invalid-base64-data';
      
      await expect(encryptionService.decryptField(invalidEncrypted, 'email'))
        .rejects.toThrow('Failed to decrypt email field');
    });

    it('should use different keys for different field types', async () => {
      const data = 'same-data';
      
      const encryptedEmail = await encryptionService.encryptField(data, 'email');
      const encryptedPhone = await encryptionService.encryptField(data, 'phoneNumber');
      
      expect(encryptedEmail).not.toBe(encryptedPhone);
      
      // Both should decrypt to the same original data
      expect(await encryptionService.decryptField(encryptedEmail, 'email')).toBe(data);
      expect(await encryptionService.decryptField(encryptedPhone, 'phoneNumber')).toBe(data);
    });
  });

  describe('multiple field encryption', () => {
    it('should encrypt multiple fields in an object', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        publicInfo: 'not sensitive'
      };

      const fieldMappings = [
        { field: 'email', type: 'email' },
        { field: 'phone', type: 'phoneNumber' }
      ];

      const encrypted = await encryptionService.encryptFields(data, fieldMappings);

      expect(encrypted.name).toBe(data.name);
      expect(encrypted.publicInfo).toBe(data.publicInfo);
      expect(encrypted.email).toMatch(/^enc:/);
      expect(encrypted.phone).toMatch(/^enc:/);
      expect(encrypted.email).not.toBe(data.email);
      expect(encrypted.phone).not.toBe(data.phone);
    });

    it('should decrypt multiple fields in an object', async () => {
      const originalData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      };

      const fieldMappings = [
        { field: 'email', type: 'email' },
        { field: 'phone', type: 'phoneNumber' }
      ];

      const encrypted = await encryptionService.encryptFields(originalData, fieldMappings);
      const decrypted = await encryptionService.decryptFields(encrypted, fieldMappings);

      expect(decrypted).toEqual(originalData);
    });

    it('should handle missing fields gracefully', async () => {
      const data = { name: 'John Doe' };
      const fieldMappings = [
        { field: 'email', type: 'email' },
        { field: 'phone', type: 'phoneNumber' }
      ];

      const result = await encryptionService.encryptFields(data, fieldMappings);
      expect(result).toEqual(data);
    });
  });

  describe('token generation', () => {
    it('should generate secure random tokens', () => {
      const token1 = encryptionService.generateSecureToken();
      const token2 = encryptionService.generateSecureToken();
      
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate tokens of specified length', () => {
      const token = encryptionService.generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate secure random strings', () => {
      const str1 = encryptionService.generateSecureString();
      const str2 = encryptionService.generateSecureString();
      
      expect(str1).toHaveLength(16);
      expect(str2).toHaveLength(16);
      expect(str1).not.toBe(str2);
      expect(str1).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate strings with custom charset', () => {
      const charset = '0123456789';
      const str = encryptionService.generateSecureString(10, charset);
      
      expect(str).toHaveLength(10);
      expect(str).toMatch(/^[0-9]+$/);
    });
  });

  describe('data hashing', () => {
    it('should hash data with salt', async () => {
      const data = 'password123';
      const result = await encryptionService.hashData(data);
      
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash).toMatch(/^\d+:[a-f0-9]+:[a-f0-9]+$/);
    });

    it('should verify hash correctly', async () => {
      const data = 'password123';
      const { hash } = await encryptionService.hashData(data);
      
      const isValid = await encryptionService.verifyHash(data, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await encryptionService.verifyHash('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should handle invalid hash format gracefully', async () => {
      const result = await encryptionService.verifyHash('data', 'invalid-hash');
      expect(result).toBe(false);
    });
  });

  describe('data integrity', () => {
    it('should create and verify data signatures', () => {
      const data = 'important data';
      const signature = encryptionService.createDataSignature(data);
      
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]+$/);
      
      const isValid = encryptionService.verifyDataIntegrity(data, signature);
      expect(isValid).toBe(true);
      
      const isInvalid = encryptionService.verifyDataIntegrity('tampered data', signature);
      expect(isInvalid).toBe(false);
    });

    it('should handle invalid signatures gracefully', () => {
      const data = 'data';
      const result = encryptionService.verifyDataIntegrity(data, 'invalid-signature');
      expect(result).toBe(false);
    });
  });

  describe('large data encryption', () => {
    it('should encrypt and decrypt large data', async () => {
      const largeData = Buffer.from('x'.repeat(10000));
      
      const encrypted = await encryptionService.encryptLargeData(largeData, 'file');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.fieldType).toBe('file');
      expect(encrypted.size).toBe(largeData.length);
      
      const decrypted = await encryptionService.decryptLargeData(encrypted);
      expect(decrypted).toEqual(largeData);
    });
  });

  describe('utility functions', () => {
    it('should detect encrypted data correctly', () => {
      expect(encryptionService.isEncrypted('enc:base64data')).toBe(true);
      expect(encryptionService.isEncrypted('plain text')).toBe(false);
      expect(encryptionService.isEncrypted(null)).toBe(false);
      expect(encryptionService.isEncrypted(123)).toBe(false);
    });

    it('should extract encryption metadata', async () => {
      const data = 'test data';
      const encrypted = await encryptionService.encryptField(data, 'email');
      
      const metadata = encryptionService.getEncryptionMetadata(encrypted);
      expect(metadata).toEqual({
        algorithm: 'aes-256-gcm',
        fieldType: 'email',
        timestamp: expect.any(Number),
        hasTag: true,
        hasIv: true
      });
    });

    it('should return null metadata for non-encrypted data', () => {
      const metadata = encryptionService.getEncryptionMetadata('plain text');
      expect(metadata).toBeNull();
    });
  });

  describe('key rotation', () => {
    it('should rotate encryption keys', async () => {
      const newMasterKey = 'new-master-key-for-rotation-testing-12345678901234567890';
      
      const rotationInfo = await encryptionService.rotateKeys(newMasterKey);
      
      expect(rotationInfo.timestamp).toBeDefined();
      expect(rotationInfo.oldKeyHash).toBeDefined();
      expect(rotationInfo.newKeyHash).toBeDefined();
      expect(rotationInfo.oldKeyHash).not.toBe(rotationInfo.newKeyHash);
    });
  });

  describe('configuration validation', () => {
    it('should validate configuration successfully', () => {
      const validation = encryptionService.validateConfiguration();
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.keyCount).toBeGreaterThan(0);
      expect(validation.algorithm).toBe('aes-256-gcm');
    });

    it('should detect configuration issues', () => {
      // Temporarily remove master key
      const originalKey = encryptionService.masterKey;
      encryptionService.masterKey = null;
      
      const validation = encryptionService.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Master encryption key not configured');
      
      // Restore key
      encryptionService.masterKey = originalKey;
    });
  });

  describe('error handling', () => {
    it('should handle encryption errors gracefully', async () => {
      // Mock crypto to throw error
      const originalCreateCipheriv = require('crypto').createCipheriv;
      require('crypto').createCipheriv = jest.fn().mockImplementation(() => {
        throw new Error('Crypto error');
      });

      await expect(encryptionService.encryptField('data', 'email'))
        .rejects.toThrow('Failed to encrypt email field');

      // Restore original function
      require('crypto').createCipheriv = originalCreateCipheriv;
    });

    it('should handle decryption of corrupted data', async () => {
      const corruptedData = 'enc:' + Buffer.from('{"invalid":"json"').toString('base64');
      
      await expect(encryptionService.decryptField(corruptedData, 'email'))
        .rejects.toThrow('Failed to decrypt email field');
    });
  });
});