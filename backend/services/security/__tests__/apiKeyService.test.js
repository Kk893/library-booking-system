const apiKeyService = require('../apiKeyService');
const ApiKey = require('../../../models/ApiKey');
const User = require('../../../models/User');
const { securityMonitorService } = require('../securityMonitorService');

// Mock dependencies
jest.mock('../../../models/ApiKey');
jest.mock('../../../models/User');
jest.mock('../securityMonitorService', () => ({
  securityMonitorService: {
    logSecurityEvent: jest.fn().mockResolvedValue(true)
  }
}));

describe('ApiKeyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('should create a new API key successfully', async () => {
      const userId = 'user123';
      const mockUser = { _id: userId, name: 'Test User', email: 'test@example.com' };
      const mockApiKey = {
        _id: 'apikey123',
        name: 'Test API Key',
        keyId: 'keyid123',
        prefix: 'lba_prefix',
        permissions: ['read:books'],
        save: jest.fn().mockResolvedValue(true),
        securityEvents: []
      };

      User.findById.mockResolvedValue(mockUser);
      ApiKey.generateKeyPair.mockReturnValue({
        keyId: 'keyid123',
        secret: 'secret123',
        prefix: 'lba_prefix',
        fullKey: 'lba_prefix.keyid123.secret123',
        hashedKey: 'hashedsecret123'
      });
      ApiKey.mockImplementation(() => mockApiKey);
      securityMonitorService.logSecurityEvent.mockResolvedValue(true);

      const options = {
        userId,
        name: 'Test API Key',
        permissions: ['read:books']
      };

      const result = await apiKeyService.createApiKey(options);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(ApiKey.generateKeyPair).toHaveBeenCalled();
      expect(mockApiKey.save).toHaveBeenCalled();
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'api_key_created',
        severity: 'medium',
        userId,
        details: expect.objectContaining({
          apiKeyId: 'apikey123',
          keyId: 'keyid123',
          permissions: ['read:books'],
          name: 'Test API Key'
        })
      });
      expect(result.fullKey).toBe('lba_prefix.keyid123.secret123');
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      const options = {
        userId: 'nonexistent',
        name: 'Test API Key'
      };

      await expect(apiKeyService.createApiKey(options)).rejects.toThrow('User not found');
    });

    it('should throw error for invalid permissions', async () => {
      const userId = 'user123';
      const mockUser = { _id: userId, name: 'Test User' };
      User.findById.mockResolvedValue(mockUser);

      const options = {
        userId,
        name: 'Test API Key',
        permissions: ['invalid:permission']
      };

      await expect(apiKeyService.createApiKey(options)).rejects.toThrow('Invalid permission: invalid:permission');
    });
  });

  describe('validateApiKey', () => {
    it('should validate a valid API key successfully', async () => {
      const fullKey = 'lba_prefix.keyid123.secret123';
      const mockApiKey = {
        _id: 'apikey123',
        keyId: 'keyid123',
        prefix: 'lba_prefix',
        userId: { _id: 'user123', name: 'Test User', email: 'test@example.com' },
        permissions: ['read:books'],
        verifyKey: jest.fn().mockReturnValue(true),
        isValid: jest.fn().mockReturnValue(true),
        checkIPRestriction: jest.fn().mockReturnValue(true),
        checkDomainRestriction: jest.fn().mockReturnValue(true),
        checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
        recordUsage: jest.fn().mockResolvedValue(true),
        usage: { totalRequests: 10 }
      };

      ApiKey.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockApiKey)
      });

      const requestContext = {
        ip: '127.0.0.1',
        userAgent: 'Test Agent',
        endpoint: 'GET /api/books'
      };

      const result = await apiKeyService.validateApiKey(fullKey, requestContext);

      expect(ApiKey.findOne).toHaveBeenCalledWith({
        keyId: 'keyid123',
        prefix: 'lba_prefix',
        isActive: true
      });
      expect(mockApiKey.verifyKey).toHaveBeenCalledWith('secret123');
      expect(mockApiKey.isValid).toHaveBeenCalled();
      expect(mockApiKey.checkRateLimit).toHaveBeenCalled();
      expect(mockApiKey.recordUsage).toHaveBeenCalledWith(requestContext);
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.keyId).toBe('keyid123');
    });

    it('should return null for invalid key format', async () => {
      const invalidKey = 'invalid.key';
      const result = await apiKeyService.validateApiKey(invalidKey);
      expect(result).toBeNull();
    });

    it('should return null for non-existent API key', async () => {
      const fullKey = 'lba_prefix.keyid123.secret123';
      ApiKey.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      const result = await apiKeyService.validateApiKey(fullKey);
      expect(result).toBeNull();
    });

    it('should return null for invalid secret', async () => {
      const fullKey = 'lba_prefix.keyid123.wrongsecret';
      const mockApiKey = {
        verifyKey: jest.fn().mockReturnValue(false),
        userId: 'user123',
        securityEvents: [],
        save: jest.fn().mockResolvedValue(true)
      };

      ApiKey.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockApiKey)
      });

      const result = await apiKeyService.validateApiKey(fullKey);
      expect(result).toBeNull();
      expect(mockApiKey.verifyKey).toHaveBeenCalledWith('wrongsecret');
    });

    it('should return rate limit error when limits exceeded', async () => {
      const fullKey = 'lba_prefix.keyid123.secret123';
      const mockApiKey = {
        verifyKey: jest.fn().mockReturnValue(true),
        isValid: jest.fn().mockReturnValue(true),
        checkIPRestriction: jest.fn().mockReturnValue(true),
        checkDomainRestriction: jest.fn().mockReturnValue(true),
        checkRateLimit: jest.fn().mockReturnValue({ 
          allowed: false, 
          reason: 'hourly_limit_exceeded' 
        }),
        userId: 'user123',
        securityEvents: [],
        save: jest.fn().mockResolvedValue(true)
      };

      ApiKey.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockApiKey)
      });

      const result = await apiKeyService.validateApiKey(fullKey);
      expect(result.error).toBe('rate_limit_exceeded');
      expect(result.reason).toBe('hourly_limit_exceeded');
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin permission', () => {
      const apiKey = { permissions: ['admin:all'] };
      const result = apiKeyService.hasPermission(apiKey, 'read:books');
      expect(result).toBe(true);
    });

    it('should return true for direct permission match', () => {
      const apiKey = { permissions: ['read:books', 'write:books'] };
      const result = apiKeyService.hasPermission(apiKey, 'read:books');
      expect(result).toBe(true);
    });

    it('should return false for missing permission', () => {
      const apiKey = { permissions: ['read:books'] };
      const result = apiKeyService.hasPermission(apiKey, 'write:books');
      expect(result).toBe(false);
    });

    it('should return false for null or undefined API key', () => {
      expect(apiKeyService.hasPermission(null, 'read:books')).toBe(false);
      expect(apiKeyService.hasPermission(undefined, 'read:books')).toBe(false);
    });
  });

  describe('listApiKeys', () => {
    it('should list API keys for a user', async () => {
      const userId = 'user123';
      const mockApiKeys = [
        {
          _id: 'key1',
          name: 'Key 1',
          keyId: 'keyid1',
          permissions: ['read:books'],
          createdAt: new Date()
        },
        {
          _id: 'key2',
          name: 'Key 2',
          keyId: 'keyid2',
          permissions: ['read:bookings'],
          createdAt: new Date()
        }
      ];

      ApiKey.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockApiKeys)
      });

      const result = await apiKeyService.listApiKeys(userId);

      expect(ApiKey.find).toHaveBeenCalledWith({ userId, revokedAt: null });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('key1');
      expect(result[1].id).toBe('key2');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key successfully', async () => {
      const apiKeyId = 'apikey123';
      const revokedBy = 'user123';
      const reason = 'Security concern';
      
      const mockApiKey = {
        _id: apiKeyId,
        name: 'Test Key',
        keyId: 'keyid123',
        userId: 'user456',
        revokedAt: null,
        revoke: jest.fn().mockResolvedValue(true)
      };

      ApiKey.findById.mockResolvedValue(mockApiKey);
      securityMonitorService.logSecurityEvent.mockResolvedValue(true);

      const result = await apiKeyService.revokeApiKey(apiKeyId, revokedBy, reason);

      expect(ApiKey.findById).toHaveBeenCalledWith(apiKeyId);
      expect(mockApiKey.revoke).toHaveBeenCalledWith(revokedBy, reason);
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'api_key_revoked',
        severity: 'medium',
        userId: 'user456',
        details: {
          apiKeyId,
          keyId: 'keyid123',
          revokedBy,
          reason
        }
      });
      expect(result.id).toBe(apiKeyId);
    });

    it('should throw error if API key not found', async () => {
      ApiKey.findById.mockResolvedValue(null);

      await expect(apiKeyService.revokeApiKey('nonexistent', 'user123'))
        .rejects.toThrow('API key not found');
    });

    it('should throw error if API key already revoked', async () => {
      const mockApiKey = {
        revokedAt: new Date()
      };

      ApiKey.findById.mockResolvedValue(mockApiKey);

      await expect(apiKeyService.revokeApiKey('apikey123', 'user123'))
        .rejects.toThrow('API key is already revoked');
    });
  });

  describe('rotateApiKey', () => {
    it('should rotate an API key successfully', async () => {
      const apiKeyId = 'apikey123';
      const rotatedBy = 'user123';
      
      const mockOldApiKey = {
        _id: apiKeyId,
        name: 'Test Key',
        keyId: 'oldkeyid',
        userId: 'user456',
        permissions: ['read:books'],
        scopes: [],
        rateLimit: { requestsPerHour: 1000, requestsPerDay: 10000 },
        restrictions: {},
        expiresAt: null,
        metadata: {},
        isValid: jest.fn().mockReturnValue(true),
        revoke: jest.fn().mockResolvedValue(true)
      };

      const mockNewApiKey = {
        _id: 'newapikey123',
        name: 'Test Key',
        keyId: 'newkeyid'
      };

      ApiKey.findById.mockResolvedValue(mockOldApiKey);
      
      // Mock createApiKey method
      const originalCreateApiKey = apiKeyService.createApiKey;
      apiKeyService.createApiKey = jest.fn().mockResolvedValue({
        apiKey: mockNewApiKey,
        fullKey: 'lba_new.newkeyid.newsecret'
      });

      securityMonitorService.logSecurityEvent.mockResolvedValue(true);

      const result = await apiKeyService.rotateApiKey(apiKeyId, rotatedBy);

      expect(ApiKey.findById).toHaveBeenCalledWith(apiKeyId);
      expect(mockOldApiKey.isValid).toHaveBeenCalled();
      expect(apiKeyService.createApiKey).toHaveBeenCalledWith({
        userId: 'user456',
        name: 'Test Key',
        permissions: ['read:books'],
        scopes: [],
        rateLimit: { requestsPerHour: 1000, requestsPerDay: 10000 },
        restrictions: {},
        expiresAt: null,
        metadata: {}
      });
      expect(mockOldApiKey.revoke).toHaveBeenCalledWith(rotatedBy, 'Key rotation');
      expect(result.fullKey).toBe('lba_new.newkeyid.newsecret');

      // Restore original method
      apiKeyService.createApiKey = originalCreateApiKey;
    });

    it('should throw error for invalid API key', async () => {
      const mockApiKey = {
        isValid: jest.fn().mockReturnValue(false)
      };

      ApiKey.findById.mockResolvedValue(mockApiKey);

      await expect(apiKeyService.rotateApiKey('apikey123', 'user123'))
        .rejects.toThrow('Cannot rotate invalid API key');
    });
  });

  describe('validatePermissions', () => {
    it('should validate correct permissions', () => {
      const validPermissions = ['read:books', 'write:books', 'admin:all'];
      expect(() => apiKeyService.validatePermissions(validPermissions)).not.toThrow();
    });

    it('should throw error for invalid permissions', () => {
      const invalidPermissions = ['invalid:permission'];
      expect(() => apiKeyService.validatePermissions(invalidPermissions))
        .toThrow('Invalid permission: invalid:permission');
    });
  });

  describe('checkRotationDue', () => {
    it('should return API keys that need rotation', async () => {
      const mockApiKeys = [
        {
          _id: 'key1',
          name: 'Key 1',
          keyId: 'keyid1',
          userId: 'user1',
          rotationSchedule: {
            nextRotation: new Date('2023-01-01'),
            intervalDays: 90
          }
        }
      ];

      ApiKey.find.mockResolvedValue(mockApiKeys);

      const result = await apiKeyService.checkRotationDue();

      expect(ApiKey.find).toHaveBeenCalledWith({
        isActive: true,
        revokedAt: null,
        'rotationSchedule.enabled': true,
        'rotationSchedule.nextRotation': { $lte: expect.any(Date) }
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('key1');
    });
  });
});