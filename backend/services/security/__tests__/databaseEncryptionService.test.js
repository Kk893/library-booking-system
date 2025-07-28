const databaseEncryptionService = require('../databaseEncryptionService');
const encryptionService = require('../encryptionService');
const { securityMonitorService } = require('../securityMonitorService');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../encryptionService');
jest.mock('../securityMonitorService', () => ({
  securityMonitorService: {
    logSecurityEvent: jest.fn().mockResolvedValue(true)
  }
}));

describe('DatabaseEncryptionService', () => {
  let testSchema;
  let TestModel;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset service state
    databaseEncryptionService.initialized = false;
    databaseEncryptionService.encryptedFields.clear();

    // Mock encryption service
    encryptionService.initialize = jest.fn().mockResolvedValue(true);
    encryptionService.initialized = true;
    encryptionService.encryptField = jest.fn().mockImplementation(async (data, type) => {
      return `enc:${Buffer.from(JSON.stringify({ data, type })).toString('base64')}`;
    });
    encryptionService.decryptField = jest.fn().mockImplementation(async (encData, type) => {
      if (!encData.startsWith('enc:')) return encData;
      const payload = JSON.parse(Buffer.from(encData.substring(4), 'base64').toString());
      return payload.data;
    });
    encryptionService.isEncrypted = jest.fn().mockImplementation(data => {
      return typeof data === 'string' && data.startsWith('enc:');
    });
    encryptionService.validateConfiguration = jest.fn().mockReturnValue({
      isValid: true,
      issues: [],
      warnings: []
    });

    // Create test schema
    testSchema = new mongoose.Schema({
      name: String,
      email: String,
      phone: String,
      address: String,
      totpSecret: String,
      backupCodes: [{
        code: String,
        used: Boolean,
        createdAt: Date
      }],
      mfaRecovery: {
        recoveryCode: String,
        expiresAt: Date
      }
    });

    // Initialize _pres and _posts maps if they don't exist
    if (!testSchema._pres) {
      testSchema._pres = new Map();
    }
    if (!testSchema._posts) {
      testSchema._posts = new Map();
    }

    // Initialize service
    await databaseEncryptionService.initialize();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(databaseEncryptionService.initialized).toBe(true);
      expect(encryptionService.initialize).toHaveBeenCalled();
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'database_encryption_initialized',
        severity: 'info',
        details: {
          sensitiveModels: expect.arrayContaining(['User', 'ApiKey']),
          timestamp: expect.any(Date)
        }
      });
    });

    it('should not reinitialize if already initialized', async () => {
      const initCallCount = encryptionService.initialize.mock.calls.length;
      await databaseEncryptionService.initialize();
      expect(encryptionService.initialize).toHaveBeenCalledTimes(initCallCount);
    });

    it('should throw error if encryption service initialization fails', async () => {
      databaseEncryptionService.initialized = false;
      encryptionService.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await expect(databaseEncryptionService.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('encryption plugin', () => {
    beforeEach(() => {
      databaseEncryptionService.applyEncryption(testSchema, 'User');
    });

    it('should apply encryption plugin to schema', () => {
      expect(databaseEncryptionService.encryptedFields.has('User')).toBe(true);
      expect(testSchema._pres).toBeDefined();
      expect(testSchema._posts).toBeDefined();
    });

    it('should not apply plugin if no sensitive fields defined', () => {
      const emptySchema = new mongoose.Schema({ name: String });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      databaseEncryptionService.applyEncryption(emptySchema, 'NonExistentModel');
      
      expect(consoleSpy).toHaveBeenCalledWith('No sensitive field mappings defined for model: NonExistentModel');
      consoleSpy.mockRestore();
    });

    describe('pre-save middleware', () => {
      let mockDocument;

      beforeEach(() => {
        mockDocument = {
          _id: 'test-id',
          get: jest.fn(),
          set: jest.fn(),
          isModified: jest.fn().mockReturnValue(true)
        };
      });

      it('should encrypt sensitive fields before saving', async () => {
        mockDocument.get.mockImplementation((field) => {
          const data = {
            email: 'test@example.com',
            phone: '+1234567890',
            totpSecret: 'secret123'
          };
          return data[field];
        });

        // Simulate pre-save hook
        const preSaveHook = testSchema._pres.get('save')[0].fn;
        const nextSpy = jest.fn();

        await preSaveHook.call(mockDocument, nextSpy);

        expect(encryptionService.encryptField).toHaveBeenCalledWith('test@example.com', 'email');
        expect(encryptionService.encryptField).toHaveBeenCalledWith('+1234567890', 'phoneNumber');
        expect(encryptionService.encryptField).toHaveBeenCalledWith('secret123', 'totpSecret');
        expect(mockDocument.set).toHaveBeenCalledTimes(3);
        expect(nextSpy).toHaveBeenCalled();
      });

      it('should handle array fields with objects', async () => {
        const backupCodes = [
          { code: 'code1', used: false, createdAt: new Date() },
          { code: 'code2', used: true, createdAt: new Date() }
        ];

        mockDocument.get.mockImplementation((field) => {
          return field === 'backupCodes' ? backupCodes : undefined;
        });

        const preSaveHook = testSchema._pres.get('save')[0].fn;
        const nextSpy = jest.fn();

        await preSaveHook.call(mockDocument, nextSpy);

        expect(encryptionService.encryptField).toHaveBeenCalledWith('code1', 'backupCodes');
        expect(encryptionService.encryptField).toHaveBeenCalledWith('code2', 'backupCodes');
        expect(mockDocument.set).toHaveBeenCalledWith('backupCodes', expect.any(Array));
      });

      it('should handle nested fields', async () => {
        mockDocument.get.mockImplementation((field) => {
          return field === 'mfaRecovery.recoveryCode' ? 'recovery123' : undefined;
        });

        const preSaveHook = testSchema._pres.get('save')[0].fn;
        const nextSpy = jest.fn();

        await preSaveHook.call(mockDocument, nextSpy);

        expect(encryptionService.encryptField).toHaveBeenCalledWith('recovery123', 'token');
        expect(mockDocument.set).toHaveBeenCalledWith('mfaRecovery.recoveryCode', expect.stringMatching(/^enc:/));
      });

      it('should skip already encrypted fields', async () => {
        mockDocument.get.mockImplementation((field) => {
          return field === 'email' ? 'enc:already-encrypted' : undefined;
        });

        encryptionService.isEncrypted.mockReturnValue(true);

        const preSaveHook = testSchema._pres.get('save')[0].fn;
        const nextSpy = jest.fn();

        await preSaveHook.call(mockDocument, nextSpy);

        expect(encryptionService.encryptField).not.toHaveBeenCalledWith('enc:already-encrypted', 'email');
        expect(nextSpy).toHaveBeenCalled();
      });

      it('should handle encryption errors gracefully', async () => {
        mockDocument.get.mockReturnValue('test@example.com');
        encryptionService.encryptField.mockRejectedValueOnce(new Error('Encryption failed'));

        const preSaveHook = testSchema._pres.get('save')[0].fn;
        const nextSpy = jest.fn();

        await preSaveHook.call(mockDocument, nextSpy);

        expect(nextSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      it('should log security events', async () => {
        mockDocument.get.mockReturnValue('test@example.com');

        const preSaveHook = testSchema._pres.get('save')[0].fn;
        const nextSpy = jest.fn();

        await preSaveHook.call(mockDocument, nextSpy);

        expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
          eventType: 'database_field_encrypted',
          severity: 'low',
          details: {
            modelName: 'User',
            documentId: 'test-id',
            encryptedFields: expect.any(Array),
            timestamp: expect.any(Date)
          }
        });
      });
    });

    describe('post-find middleware', () => {
      it('should decrypt documents after find operations', async () => {
        const mockDoc = {
          get: jest.fn().mockReturnValue('enc:encrypted-email'),
          set: jest.fn(),
          toObject: jest.fn()
        };

        // Mock the constructor with decryptDocument method
        const mockConstructor = {
          decryptDocument: jest.fn().mockResolvedValue(mockDoc)
        };

        // Simulate post-find hook
        const postFindHook = testSchema._posts.get('find')[0].fn;
        await postFindHook.call({ constructor: mockConstructor }, [mockDoc]);

        expect(mockConstructor.decryptDocument).toHaveBeenCalledWith(mockDoc, expect.any(Array));
      });

      it('should handle single document results', async () => {
        const mockDoc = {
          get: jest.fn(),
          set: jest.fn(),
          toObject: jest.fn()
        };

        const mockConstructor = {
          decryptDocument: jest.fn().mockResolvedValue(mockDoc)
        };

        const postFindHook = testSchema._posts.get('find')[0].fn;
        await postFindHook.call({ constructor: mockConstructor }, mockDoc);

        expect(mockConstructor.decryptDocument).toHaveBeenCalledWith(mockDoc, expect.any(Array));
      });

      it('should handle null results gracefully', async () => {
        const postFindHook = testSchema._posts.get('find')[0].fn;
        await expect(postFindHook.call({}, null)).resolves.not.toThrow();
      });

      it('should handle decryption errors gracefully', async () => {
        const mockDoc = { toObject: jest.fn() };
        const mockConstructor = {
          decryptDocument: jest.fn().mockRejectedValue(new Error('Decryption failed'))
        };

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const postFindHook = testSchema._posts.get('find')[0].fn;
        
        await expect(postFindHook.call({ constructor: mockConstructor }, [mockDoc])).resolves.not.toThrow();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('static and instance methods', () => {
      it('should add decryptDocument static method', () => {
        expect(testSchema.statics.decryptDocument).toBeDefined();
      });

      it('should add decryptFields instance method', () => {
        expect(testSchema.methods.decryptFields).toBeDefined();
      });

      it('should add isFieldEncrypted instance method', () => {
        expect(testSchema.methods.isFieldEncrypted).toBeDefined();
      });

      it('should add getFieldEncryptionMetadata instance method', () => {
        expect(testSchema.methods.getFieldEncryptionMetadata).toBeDefined();
      });
    });
  });

  describe('document field operations', () => {
    const testDocument = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St',
      totpSecret: 'secret123'
    };

    it('should encrypt document fields', async () => {
      const encrypted = await databaseEncryptionService.encryptDocumentFields(testDocument, 'User');

      expect(encrypted.name).toBe('John Doe'); // Not sensitive
      expect(encrypted.email).toMatch(/^enc:/);
      expect(encrypted.phone).toMatch(/^enc:/);
      expect(encrypted.address).toMatch(/^enc:/);
      expect(encrypted.totpSecret).toMatch(/^enc:/);
    });

    it('should decrypt document fields', async () => {
      const encryptedDocument = {
        name: 'John Doe',
        email: 'enc:encrypted-email',
        phone: 'enc:encrypted-phone'
      };

      const decrypted = await databaseEncryptionService.decryptDocumentFields(encryptedDocument, 'User');

      expect(decrypted.name).toBe('John Doe');
      expect(encryptionService.decryptField).toHaveBeenCalledWith('enc:encrypted-email', 'email');
      expect(encryptionService.decryptField).toHaveBeenCalledWith('enc:encrypted-phone', 'phoneNumber');
    });

    it('should encrypt specific fields only', async () => {
      const encrypted = await databaseEncryptionService.encryptDocumentFields(
        testDocument, 
        'User', 
        ['email', 'phone']
      );

      expect(encrypted.email).toMatch(/^enc:/);
      expect(encrypted.phone).toMatch(/^enc:/);
      expect(encrypted.address).toBe('123 Main St'); // Not encrypted
      expect(encrypted.totpSecret).toBe('secret123'); // Not encrypted
    });

    it('should decrypt specific fields only', async () => {
      const encryptedDocument = {
        email: 'enc:encrypted-email',
        phone: 'enc:encrypted-phone',
        address: 'enc:encrypted-address'
      };

      const decrypted = await databaseEncryptionService.decryptDocumentFields(
        encryptedDocument,
        'User',
        ['email']
      );

      expect(encryptionService.decryptField).toHaveBeenCalledWith('enc:encrypted-email', 'email');
      expect(encryptionService.decryptField).not.toHaveBeenCalledWith('enc:encrypted-phone', 'phoneNumber');
    });

    it('should handle array fields in documents', async () => {
      const documentWithArray = {
        backupCodes: [
          { code: 'code1', used: false },
          { code: 'code2', used: true }
        ]
      };

      const encrypted = await databaseEncryptionService.encryptDocumentFields(documentWithArray, 'User');

      expect(encrypted.backupCodes).toHaveLength(2);
      expect(encrypted.backupCodes[0].code).toMatch(/^enc:/);
      expect(encrypted.backupCodes[1].code).toMatch(/^enc:/);
    });

    it('should handle null and undefined values', async () => {
      const documentWithNulls = {
        email: null,
        phone: undefined,
        address: ''
      };

      const encrypted = await databaseEncryptionService.encryptDocumentFields(documentWithNulls, 'User');

      expect(encrypted.email).toBeNull();
      expect(encrypted.phone).toBeUndefined();
      expect(encrypted.address).toBe('');
    });

    it('should handle decryption errors gracefully', async () => {
      encryptionService.decryptField.mockRejectedValueOnce(new Error('Decryption failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const encryptedDocument = { email: 'enc:corrupted-data' };
      const result = await databaseEncryptionService.decryptDocumentFields(encryptedDocument, 'User');

      expect(result.email).toBe('enc:corrupted-data'); // Keeps encrypted value
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('sensitive field management', () => {
    it('should add new sensitive field mapping', () => {
      databaseEncryptionService.addSensitiveField('TestModel', { field: 'newField', type: 'token' });

      const mappings = databaseEncryptionService.getSensitiveFields('TestModel');
      expect(mappings).toContainEqual({ field: 'newField', type: 'token' });
    });

    it('should remove sensitive field mapping', () => {
      databaseEncryptionService.addSensitiveField('TestModel', { field: 'testField', type: 'token' });
      databaseEncryptionService.removeSensitiveField('TestModel', 'testField');

      const mappings = databaseEncryptionService.getSensitiveFields('TestModel');
      expect(mappings).not.toContainEqual({ field: 'testField', type: 'token' });
    });

    it('should get sensitive fields for model', () => {
      const userFields = databaseEncryptionService.getSensitiveFields('User');
      expect(userFields).toEqual(expect.arrayContaining([
        { field: 'email', type: 'email' },
        { field: 'phone', type: 'phoneNumber' }
      ]));
    });

    it('should check if field is sensitive', () => {
      expect(databaseEncryptionService.isSensitiveField('User', 'email')).toBe(true);
      expect(databaseEncryptionService.isSensitiveField('User', 'name')).toBe(false);
      expect(databaseEncryptionService.isSensitiveField('NonExistent', 'field')).toBe(false);
    });
  });

  describe('validation and statistics', () => {
    it('should validate encryption configuration', () => {
      const validation = databaseEncryptionService.validateEncryptionConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.modelCount).toBeGreaterThan(0);
      expect(validation.totalSensitiveFields).toBeGreaterThan(0);
    });

    it('should detect configuration issues', () => {
      databaseEncryptionService.initialized = false;

      const validation = databaseEncryptionService.validateEncryptionConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Database encryption service not initialized');
    });

    it('should get encryption statistics', () => {
      const stats = databaseEncryptionService.getEncryptionStatistics();

      expect(stats.modelsWithEncryption).toBeGreaterThan(0);
      expect(stats.totalSensitiveFields).toBeGreaterThan(0);
      expect(stats.fieldsByType).toBeDefined();
      expect(stats.modelBreakdown).toBeDefined();
      expect(stats.modelBreakdown.User).toBeDefined();
      expect(stats.modelBreakdown.User.fieldCount).toBeGreaterThan(0);
    });
  });

  describe('health check', () => {
    it('should perform successful health check', async () => {
      const healthCheck = await databaseEncryptionService.performHealthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.issues).toHaveLength(0);
      expect(healthCheck.performance.encryptionRoundTripMs).toBeDefined();
      expect(healthCheck.timestamp).toBeInstanceOf(Date);
    });

    it('should detect performance degradation', async () => {
      // Mock slow encryption
      encryptionService.encryptField.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 'enc:slow-result';
      });

      const healthCheck = await databaseEncryptionService.performHealthCheck();

      expect(healthCheck.status).toBe('degraded');
      expect(healthCheck.issues).toContain(expect.stringMatching(/Encryption performance degraded/));
    });

    it('should detect encryption failures', async () => {
      encryptionService.encryptField.mockRejectedValueOnce(new Error('Encryption failed'));

      const healthCheck = await databaseEncryptionService.performHealthCheck();

      expect(healthCheck.status).toBe('unhealthy');
      expect(healthCheck.issues).toContain('Health check failed: Encryption failed');
    });

    it('should detect configuration issues in health check', async () => {
      encryptionService.validateConfiguration.mockReturnValue({
        isValid: false,
        issues: ['Configuration error'],
        warnings: []
      });

      const healthCheck = await databaseEncryptionService.performHealthCheck();

      expect(healthCheck.status).toBe('unhealthy');
      expect(healthCheck.issues).toContain('Configuration error');
    });

    it('should detect data integrity issues', async () => {
      encryptionService.decryptField.mockResolvedValueOnce('wrong-data');

      const healthCheck = await databaseEncryptionService.performHealthCheck();

      expect(healthCheck.status).toBe('unhealthy');
      expect(healthCheck.issues).toContain('Encryption/decryption test failed');
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      databaseEncryptionService.initialized = false;
      encryptionService.initialize.mockRejectedValueOnce(new Error('Init error'));

      await expect(databaseEncryptionService.initialize()).rejects.toThrow('Init error');
    });

    it('should handle encryption service not initialized', async () => {
      encryptionService.initialized = false;
      
      const result = await databaseEncryptionService.encryptDocumentFields({ email: 'test' }, 'User');
      
      expect(encryptionService.initialize).toHaveBeenCalled();
    });

    it('should handle missing model mappings gracefully', async () => {
      const result = await databaseEncryptionService.encryptDocumentFields(
        { field: 'value' }, 
        'NonExistentModel'
      );

      expect(result).toEqual({ field: 'value' });
    });
  });
});