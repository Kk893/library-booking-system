const dataAnonymizationService = require('../dataAnonymizationService');
const User = require('../../../models/User');
const securityMonitorService = require('../securityMonitorService');

// Mock dependencies
jest.mock('../../../models/User');
jest.mock('../securityMonitorService');

describe('DataAnonymizationService', () => {
  let mockUserData;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUserData = {
      _id: '507f1f77bcf86cd799439011',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      address: '123 Main St',
      city: 'New York',
      role: 'user',
      isActive: true,
      totalBookings: 15,
      createdAt: new Date('2023-01-15'),
      lastLogin: new Date('2024-01-15'),
      preferences: {
        notifications: true,
        emailUpdates: false
      },
      privilegeLevel: 1,
      mfaEnabled: false,
      password: 'hashedpassword',
      resetPasswordToken: 'reset-token',
      totpSecret: 'totp-secret'
    };

    securityMonitorService.logSecurityEvent = jest.fn().mockResolvedValue();
  });

  describe('anonymizeUserData', () => {
    it('should perform full anonymization by default', async () => {
      const result = await dataAnonymizationService.anonymizeUserData(mockUserData);

      expect(result).toHaveProperty('anonymizationId');
      expect(result).toHaveProperty('anonymizedAt');
      expect(result).toHaveProperty('method', 'full_anonymization');
      expect(result).toHaveProperty('originalDataHash');
      
      // Should not contain PII
      expect(result).not.toHaveProperty('name');
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('address');
      
      // Should contain non-identifying data
      expect(result).toHaveProperty('role', 'user');
      expect(result).toHaveProperty('isActive', true);
      expect(result).toHaveProperty('totalBookings', 15);
      
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        userId: mockUserData._id,
        eventType: 'data_anonymized',
        severity: 'low',
        details: expect.objectContaining({
          method: 'full_anonymization',
          anonymizationId: expect.any(String)
        })
      });
    });

    it('should perform pseudonymization when specified', async () => {
      const result = await dataAnonymizationService.anonymizeUserData(
        mockUserData, 
        'pseudonymization'
      );

      expect(result).toHaveProperty('pseudonymizationId');
      expect(result).toHaveProperty('method', 'pseudonymization');
      
      // Should have pseudonyms instead of original values
      expect(result).toHaveProperty('emailPseudonym');
      expect(result).toHaveProperty('namePseudonym');
      expect(result).toHaveProperty('phonePseudonym');
      expect(result).toHaveProperty('userPseudonym');
      
      // Should not contain original PII
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('name');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('_id');
      
      // Should not contain sensitive auth data
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('resetPasswordToken');
      expect(result).not.toHaveProperty('totpSecret');
    });

    it('should perform generalization when specified', async () => {
      const result = await dataAnonymizationService.anonymizeUserData(
        mockUserData, 
        'generalization'
      );

      expect(result).toHaveProperty('generalizationId');
      expect(result).toHaveProperty('method', 'generalization');
      
      // Should have generalized categories
      expect(result).toHaveProperty('usageCategory');
      expect(result).toHaveProperty('registrationPeriod');
      
      // Should not contain specific identifiers
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('name');
      expect(result).not.toHaveProperty('city');
    });

    it('should perform suppression when specified', async () => {
      const result = await dataAnonymizationService.anonymizeUserData(
        mockUserData, 
        'suppression'
      );

      expect(result).toHaveProperty('suppressionId');
      expect(result).toHaveProperty('method', 'suppression');
      expect(result).toHaveProperty('suppressedFieldsCount');
      
      // Should only contain allowed fields
      const allowedFields = ['role', 'isActive', 'preferences', 'createdAt', 'updatedAt'];
      const resultKeys = Object.keys(result).filter(key => 
        !['suppressionId', 'suppressedAt', 'method', 'suppressedFieldsCount'].includes(key)
      );
      
      resultKeys.forEach(key => {
        expect(allowedFields).toContain(key);
      });
    });

    it('should perform noise addition when specified', async () => {
      const result = await dataAnonymizationService.anonymizeUserData(
        mockUserData, 
        'noise_addition'
      );

      expect(result).toHaveProperty('noiseAdditionId');
      expect(result).toHaveProperty('method', 'noise_addition');
      expect(result).toHaveProperty('noiseLevel');
      
      // Numerical fields should be modified but still reasonable
      expect(result.totalBookings).toBeGreaterThanOrEqual(0);
      expect(result.totalBookings).not.toBe(mockUserData.totalBookings);
      
      // Should not contain identifiers
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('name');
    });

    it('should throw error for unknown anonymization method', async () => {
      await expect(
        dataAnonymizationService.anonymizeUserData(mockUserData, 'unknown_method')
      ).rejects.toThrow('Unknown anonymization method: unknown_method');
    });
  });

  describe('generatePseudonym', () => {
    it('should generate consistent pseudonyms for same input', () => {
      const pseudonym1 = dataAnonymizationService.generatePseudonym('test@example.com', 'email');
      const pseudonym2 = dataAnonymizationService.generatePseudonym('test@example.com', 'email');
      
      expect(pseudonym1).toBe(pseudonym2);
      expect(pseudonym1).toMatch(/^email_[a-f0-9]{16}$/);
    });

    it('should generate different pseudonyms for different contexts', () => {
      const emailPseudonym = dataAnonymizationService.generatePseudonym('test@example.com', 'email');
      const namePseudonym = dataAnonymizationService.generatePseudonym('test@example.com', 'name');
      
      expect(emailPseudonym).not.toBe(namePseudonym);
      expect(emailPseudonym).toMatch(/^email_/);
      expect(namePseudonym).toMatch(/^name_/);
    });

    it('should generate different pseudonyms for different inputs', () => {
      const pseudonym1 = dataAnonymizationService.generatePseudonym('test1@example.com', 'email');
      const pseudonym2 = dataAnonymizationService.generatePseudonym('test2@example.com', 'email');
      
      expect(pseudonym1).not.toBe(pseudonym2);
    });
  });

  describe('createPseudonymizedAnalytics', () => {
    it('should create pseudonymized analytics data', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const analyticsData = {
        pageViews: 10,
        sessionDuration: 300,
        clickEvents: 5
      };

      const result = await dataAnonymizationService.createPseudonymizedAnalytics(userId, analyticsData);

      expect(result).toHaveProperty('userPseudonym');
      expect(result).toHaveProperty('sessionPseudonym');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('retentionExpiry');
      
      expect(result.userPseudonym).toMatch(/^analytics_[a-f0-9]{16}$/);
      expect(result.sessionPseudonym).toMatch(/^session_[a-f0-9]{16}$/);
      
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        userId: userId,
        eventType: 'analytics_pseudonymized',
        severity: 'low',
        details: expect.objectContaining({
          userPseudonym: result.userPseudonym,
          dataFields: 3
        })
      });
    });
  });

  describe('enforceDataRetentionPolicy', () => {
    beforeEach(() => {
      User.find = jest.fn();
      User.findByIdAndDelete = jest.fn();
    });

    it('should process users for data retention', async () => {
      const mockUsers = [
        { 
          _id: 'user1', 
          lastLogin: new Date('2022-01-01'),
          toObject: () => mockUserData
        }
      ];
      
      User.find.mockResolvedValue(mockUsers);
      User.findByIdAndDelete.mockResolvedValue();
      
      // Mock checkRetentionConsent to return false (no consent)
      jest.spyOn(dataAnonymizationService, 'checkRetentionConsent').mockResolvedValue(false);
      jest.spyOn(dataAnonymizationService, 'storeAnonymizedData').mockResolvedValue();

      const result = await dataAnonymizationService.enforceDataRetentionPolicy('user_data');

      expect(result).toHaveProperty('processed', 1);
      expect(result).toHaveProperty('anonymized', 1);
      expect(result).toHaveProperty('deleted', 0);
      expect(result.errors).toHaveLength(0);
      
      expect(User.find).toHaveBeenCalled();
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('user1');
      
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'data_retention_enforced',
        severity: 'medium',
        details: expect.objectContaining({
          dataType: 'user_data',
          results: result
        })
      });
    });

    it('should handle errors during retention enforcement', async () => {
      const mockUsers = [
        { 
          _id: 'user1', 
          lastLogin: new Date('2022-01-01'),
          toObject: () => mockUserData
        }
      ];
      
      User.find.mockResolvedValue(mockUsers);
      User.findByIdAndDelete.mockRejectedValue(new Error('Database error'));
      
      jest.spyOn(dataAnonymizationService, 'checkRetentionConsent').mockResolvedValue(false);
      jest.spyOn(dataAnonymizationService, 'storeAnonymizedData').mockResolvedValue();

      const result = await dataAnonymizationService.enforceDataRetentionPolicy('user_data');

      expect(result).toHaveProperty('processed', 1);
      expect(result).toHaveProperty('anonymized', 0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toHaveProperty('userId', 'user1');
      expect(result.errors[0]).toHaveProperty('error', 'Database error');
    });
  });

  describe('checkRetentionConsent', () => {
    it('should return true when user has valid data processing consent', async () => {
      const mockUser = {
        _id: 'user1',
        privacyConsent: {
          consents: [{
            type: 'data_processing',
            status: 'granted',
            expiresAt: new Date(Date.now() + 86400000) // expires tomorrow
          }]
        }
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await dataAnonymizationService.checkRetentionConsent('user1');
      
      expect(result).toBe(true);
      expect(User.findById).toHaveBeenCalledWith('user1');
    });

    it('should return false when user has no consent', async () => {
      const mockUser = {
        _id: 'user1',
        privacyConsent: null
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await dataAnonymizationService.checkRetentionConsent('user1');
      
      expect(result).toBe(false);
    });

    it('should return false when consent is expired', async () => {
      const mockUser = {
        _id: 'user1',
        privacyConsent: {
          consents: [{
            type: 'data_processing',
            status: 'granted',
            expiresAt: new Date(Date.now() - 86400000) // expired yesterday
          }]
        }
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await dataAnonymizationService.checkRetentionConsent('user1');
      
      expect(result).toBe(false);
    });

    it('should return false when user is not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      const result = await dataAnonymizationService.checkRetentionConsent('user1');
      
      expect(result).toBe(false);
    });
  });

  describe('helper methods', () => {
    describe('anonymizeTimestamp', () => {
      it('should anonymize timestamp to month by default', () => {
        const timestamp = new Date('2024-03-15T10:30:00Z');
        const result = dataAnonymizationService.anonymizeTimestamp(timestamp);
        
        expect(result).toBe('2024-03');
      });

      it('should anonymize timestamp to specified granularity', () => {
        const timestamp = new Date('2024-03-15T10:30:00Z');
        
        expect(dataAnonymizationService.anonymizeTimestamp(timestamp, 'day')).toBe('2024-03-15');
        expect(dataAnonymizationService.anonymizeTimestamp(timestamp, 'year')).toBe('2024');
        expect(dataAnonymizationService.anonymizeTimestamp(timestamp, 'quarter')).toBe('2024-Q1');
      });
    });

    describe('generalizeAge', () => {
      it('should categorize ages into ranges', () => {
        expect(dataAnonymizationService.generalizeAge(16)).toBe('under-18');
        expect(dataAnonymizationService.generalizeAge(22)).toBe('18-24');
        expect(dataAnonymizationService.generalizeAge(30)).toBe('25-34');
        expect(dataAnonymizationService.generalizeAge(40)).toBe('35-44');
        expect(dataAnonymizationService.generalizeAge(50)).toBe('45-54');
        expect(dataAnonymizationService.generalizeAge(60)).toBe('55-64');
        expect(dataAnonymizationService.generalizeAge(70)).toBe('65-plus');
      });
    });

    describe('generalizeUsage', () => {
      it('should categorize usage levels', () => {
        expect(dataAnonymizationService.generalizeUsage(0)).toBe('inactive');
        expect(dataAnonymizationService.generalizeUsage(3)).toBe('light-user');
        expect(dataAnonymizationService.generalizeUsage(15)).toBe('moderate-user');
        expect(dataAnonymizationService.generalizeUsage(35)).toBe('active-user');
        expect(dataAnonymizationService.generalizeUsage(75)).toBe('power-user');
      });
    });

    describe('categorizeUserType', () => {
      it('should categorize user types based on role and activity', () => {
        expect(dataAnonymizationService.categorizeUserType({ role: 'admin', totalBookings: 10 }))
          .toBe('administrative');
        expect(dataAnonymizationService.categorizeUserType({ role: 'user', totalBookings: 75 }))
          .toBe('power-user');
        expect(dataAnonymizationService.categorizeUserType({ role: 'user', totalBookings: 25 }))
          .toBe('regular-user');
        expect(dataAnonymizationService.categorizeUserType({ role: 'user', totalBookings: 5 }))
          .toBe('casual-user');
      });
    });

    describe('categorizeActivityLevel', () => {
      it('should categorize activity levels based on last login', () => {
        const now = Date.now();
        
        expect(dataAnonymizationService.categorizeActivityLevel({ 
          lastLogin: new Date(now - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        })).toBe('highly-active');
        
        expect(dataAnonymizationService.categorizeActivityLevel({ 
          lastLogin: new Date(now - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        })).toBe('active');
        
        expect(dataAnonymizationService.categorizeActivityLevel({ 
          lastLogin: new Date(now - 60 * 24 * 60 * 60 * 1000) // 60 days ago
        })).toBe('moderately-active');
        
        expect(dataAnonymizationService.categorizeActivityLevel({ 
          lastLogin: new Date(now - 120 * 24 * 60 * 60 * 1000) // 120 days ago
        })).toBe('inactive');
      });
    });

    describe('generateDataHash', () => {
      it('should generate consistent hash for same data', () => {
        const data = { name: 'John', email: 'john@example.com' };
        const hash1 = dataAnonymizationService.generateDataHash(data);
        const hash2 = dataAnonymizationService.generateDataHash(data);
        
        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should generate different hashes for different data', () => {
        const data1 = { name: 'John', email: 'john@example.com' };
        const data2 = { name: 'Jane', email: 'jane@example.com' };
        
        const hash1 = dataAnonymizationService.generateDataHash(data1);
        const hash2 = dataAnonymizationService.generateDataHash(data2);
        
        expect(hash1).not.toBe(hash2);
      });
    });

    describe('generateNoise', () => {
      it('should generate noise proportional to value and noise level', () => {
        const value = 100;
        const noiseLevel = 0.1;
        
        const noise = dataAnonymizationService.generateNoise(value, noiseLevel);
        
        // Noise should be reasonable (within expected range for Gaussian distribution)
        expect(Math.abs(noise)).toBeLessThan(value * noiseLevel * 5); // 5 standard deviations
      });
    });
  });

  describe('createAnonymizedBehaviorProfile', () => {
    it('should create behavior profile from user data', async () => {
      const profile = await dataAnonymizationService.createAnonymizedBehaviorProfile(mockUserData);
      
      expect(profile).toHaveProperty('userType');
      expect(profile).toHaveProperty('activityLevel');
      expect(profile).toHaveProperty('engagementPattern');
      expect(profile).toHaveProperty('preferenceProfile');
      
      expect(profile.userType).toBe('regular-user');
      expect(profile.preferenceProfile).toHaveProperty('hasNotificationPreferences', true);
      expect(profile.preferenceProfile).toHaveProperty('hasEmailPreferences', false);
      expect(profile.preferenceProfile).toHaveProperty('preferenceCount', 2);
    });
  });

  describe('storeAnonymizedData', () => {
    it('should log anonymized data storage', async () => {
      const anonymizedData = {
        anonymizationId: 'test-id',
        method: 'full_anonymization',
        originalDataHash: 'test-hash'
      };

      await dataAnonymizationService.storeAnonymizedData('user1', anonymizedData);

      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user1',
        eventType: 'data_anonymized_and_stored',
        severity: 'medium',
        details: {
          anonymizationId: 'test-id',
          method: 'full_anonymization',
          originalDataHash: 'test-hash',
          timestamp: expect.any(Date)
        }
      });
    });
  });
});