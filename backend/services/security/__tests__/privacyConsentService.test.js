const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const privacyConsentService = require('../privacyConsentService');
const securityMonitorService = require('../securityMonitorService');

// Mock the security monitor service
jest.mock('../securityMonitorService', () => ({
  logSecurityEvent: jest.fn().mockResolvedValue(true)
}));

// Mock the database encryption service to avoid initialization issues
jest.mock('../databaseEncryptionService', () => ({
  applyEncryption: jest.fn()
}));

// Create a simple User model for testing without encryption
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  privacyConsent: {
    consents: [{
      type: { type: String, required: true },
      status: { type: String, required: true },
      grantedAt: Date,
      deniedAt: Date,
      withdrawnAt: Date,
      updatedAt: { type: Date, default: Date.now },
      expiresAt: Date,
      legalBasis: { type: String, default: 'consent' },
      purpose: { type: String, default: 'General data processing' },
      dataCategories: [{ type: String }],
      retentionPeriod: { type: String, default: '2 years' },
      withdrawalReason: String,
      version: { type: String, default: '1.0' },
      ipAddress: String,
      userAgent: String,
      metadata: { type: mongoose.Schema.Types.Mixed }
    }],
    lastUpdated: { type: Date, default: Date.now },
    version: { type: String, default: '1.0' }
  },
  privacyPreferences: {
    dataMinimization: { type: Boolean, default: true },
    anonymousAnalytics: { type: Boolean, default: false },
    marketingCommunications: { type: Boolean, default: false },
    thirdPartySharing: { type: Boolean, default: false },
    locationTracking: { type: Boolean, default: false },
    cookiePreferences: {
      essential: { type: Boolean, default: true },
      functional: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false }
    },
    dataRetentionPeriod: { type: String, default: '2 years' },
    communicationChannels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false }
    },
    lastUpdated: { type: Date, default: Date.now }
  }
}, { timestamps: true });

const User = mongoose.model('TestUser', userSchema);

describe('PrivacyConsentService', () => {
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
    // Clear all collections
    await User.deleteMany({});
    
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
    await testUser.save();

    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('recordConsent', () => {
    it('should record new consent successfully', async () => {
      const metadata = {
        purpose: 'Marketing communications',
        dataCategories: ['email', 'preferences'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const consentRecord = await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted',
        metadata
      );

      expect(consentRecord).toBeDefined();
      expect(consentRecord.type).toBe('marketing');
      expect(consentRecord.status).toBe('granted');
      expect(consentRecord.purpose).toBe('Marketing communications');
      expect(consentRecord.grantedAt).toBeDefined();
      expect(consentRecord.ipAddress).toBe('192.168.1.1');

      // Verify user was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.privacyConsent).toBeDefined();
      expect(updatedUser.privacyConsent.consents).toHaveLength(1);
      expect(updatedUser.privacyConsent.consents[0].type).toBe('marketing');

      // Verify security event was logged
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        userId: testUser._id.toString(),
        eventType: 'consent_recorded',
        severity: 'low',
        details: expect.objectContaining({
          consentType: 'marketing',
          status: 'granted'
        })
      });
    });

    it('should update existing consent', async () => {
      // First, record initial consent
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      // Then update it
      const updatedConsent = await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'denied'
      );

      expect(updatedConsent.status).toBe('denied');
      expect(updatedConsent.deniedAt).toBeDefined();

      // Verify only one consent record exists
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.privacyConsent.consents).toHaveLength(1);
    });

    it('should throw error for invalid consent type', async () => {
      await expect(
        privacyConsentService.recordConsent(
          testUser._id.toString(),
          'invalid_type',
          'granted'
        )
      ).rejects.toThrow('Invalid consent type: invalid_type');
    });

    it('should throw error for invalid consent status', async () => {
      await expect(
        privacyConsentService.recordConsent(
          testUser._id.toString(),
          'marketing',
          'invalid_status'
        )
      ).rejects.toThrow('Invalid consent status: invalid_status');
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(
        privacyConsentService.recordConsent(
          nonExistentId.toString(),
          'marketing',
          'granted'
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('withdrawConsent', () => {
    beforeEach(async () => {
      // Set up initial consent
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );
    });

    it('should withdraw consent successfully', async () => {
      const metadata = {
        reason: 'No longer interested',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const withdrawnConsent = await privacyConsentService.withdrawConsent(
        testUser._id.toString(),
        'marketing',
        metadata
      );

      expect(withdrawnConsent.status).toBe('withdrawn');
      expect(withdrawnConsent.withdrawnAt).toBeDefined();
      expect(withdrawnConsent.withdrawalReason).toBe('No longer interested');

      // Verify security event was logged
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        userId: testUser._id.toString(),
        eventType: 'consent_withdrawn',
        severity: 'medium',
        details: expect.objectContaining({
          consentType: 'marketing',
          withdrawalReason: 'No longer interested'
        })
      });
    });

    it('should throw error when no active consent exists', async () => {
      await expect(
        privacyConsentService.withdrawConsent(
          testUser._id.toString(),
          'analytics'
        )
      ).rejects.toThrow('No active consent found for type: analytics');
    });
  });

  describe('hasValidConsent', () => {
    it('should return true for granted consent', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      const hasConsent = await privacyConsentService.hasValidConsent(
        testUser._id.toString(),
        'marketing'
      );

      expect(hasConsent).toBe(true);
    });

    it('should return false for denied consent', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'denied'
      );

      const hasConsent = await privacyConsentService.hasValidConsent(
        testUser._id.toString(),
        'marketing'
      );

      expect(hasConsent).toBe(false);
    });

    it('should return false for withdrawn consent', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      await privacyConsentService.withdrawConsent(
        testUser._id.toString(),
        'marketing'
      );

      const hasConsent = await privacyConsentService.hasValidConsent(
        testUser._id.toString(),
        'marketing'
      );

      expect(hasConsent).toBe(false);
    });

    it('should return false for non-existent consent', async () => {
      const hasConsent = await privacyConsentService.hasValidConsent(
        testUser._id.toString(),
        'marketing'
      );

      expect(hasConsent).toBe(false);
    });

    it('should return false for expired consent', async () => {
      // Record consent with expiration
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      // Manually set expiration in the past
      const user = await User.findById(testUser._id);
      user.privacyConsent.consents[0].expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await user.save();

      const hasConsent = await privacyConsentService.hasValidConsent(
        testUser._id.toString(),
        'marketing'
      );

      expect(hasConsent).toBe(false);
    });
  });

  describe('getUserConsents', () => {
    it('should return all user consents', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'analytics',
        'denied'
      );

      const consents = await privacyConsentService.getUserConsents(testUser._id.toString());

      expect(consents).toHaveLength(2);
      expect(consents.find(c => c.type === 'marketing')).toBeDefined();
      expect(consents.find(c => c.type === 'analytics')).toBeDefined();
    });

    it('should return empty array for user with no consents', async () => {
      const consents = await privacyConsentService.getUserConsents(testUser._id.toString());
      expect(consents).toEqual([]);
    });
  });

  describe('updatePrivacyPreferences', () => {
    it('should update privacy preferences successfully', async () => {
      const preferences = {
        dataMinimization: false,
        marketingCommunications: true,
        cookiePreferences: {
          analytics: true,
          marketing: false
        }
      };

      const updatedPreferences = await privacyConsentService.updatePrivacyPreferences(
        testUser._id.toString(),
        preferences
      );

      expect(updatedPreferences.dataMinimization).toBe(false);
      expect(updatedPreferences.marketingCommunications).toBe(true);
      expect(updatedPreferences.cookiePreferences.analytics).toBe(true);
      expect(updatedPreferences.lastUpdated).toBeDefined();

      // Verify security event was logged
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        userId: testUser._id.toString(),
        eventType: 'privacy_preferences_updated',
        severity: 'low',
        details: expect.objectContaining({
          updatedPreferences: expect.arrayContaining(['dataMinimization', 'marketingCommunications'])
        })
      });
    });

    it('should ignore invalid preference keys', async () => {
      const preferences = {
        dataMinimization: false,
        invalidKey: 'should be ignored',
        marketingCommunications: true
      };

      const updatedPreferences = await privacyConsentService.updatePrivacyPreferences(
        testUser._id.toString(),
        preferences
      );

      expect(updatedPreferences.dataMinimization).toBe(false);
      expect(updatedPreferences.marketingCommunications).toBe(true);
      expect(updatedPreferences.invalidKey).toBeUndefined();
    });
  });

  describe('validateDataProcessingConsent', () => {
    it('should validate consent successfully when all required consents are granted', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'analytics',
        'granted'
      );

      const validationResult = await privacyConsentService.validateDataProcessingConsent(
        testUser._id.toString(),
        'send marketing email',
        ['marketing', 'analytics']
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.missingConsents).toHaveLength(0);
      expect(validationResult.operation).toBe('send marketing email');
    });

    it('should fail validation when required consents are missing', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'denied'
      );

      const validationResult = await privacyConsentService.validateDataProcessingConsent(
        testUser._id.toString(),
        'send marketing email',
        ['marketing', 'analytics']
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.missingConsents).toContain('marketing');
      expect(validationResult.missingConsents).toContain('analytics');
    });

    it('should include warnings for expiring consents', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      // Set consent to expire soon
      const user = await User.findById(testUser._id);
      user.privacyConsent.consents[0].expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
      await user.save();

      const validationResult = await privacyConsentService.validateDataProcessingConsent(
        testUser._id.toString(),
        'send marketing email',
        ['marketing']
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.warnings).toContain('Consent for marketing expires soon');
    });
  });

  describe('generateConsentRenewalNotifications', () => {
    it('should generate renewal notifications for expiring consents', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      // Set consent to expire soon
      const user = await User.findById(testUser._id);
      user.privacyConsent.consents[0].expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
      await user.save();

      const notifications = await privacyConsentService.generateConsentRenewalNotifications(
        testUser._id.toString()
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId.toString()).toBe(testUser._id.toString());
      expect(notifications[0].consentType).toBe('marketing');
      expect(notifications[0].renewalRequired).toBe(true);
      expect(notifications[0].daysUntilExpiry).toBeLessThanOrEqual(30);
    });

    it('should return empty array when no consents are expiring', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      const notifications = await privacyConsentService.generateConsentRenewalNotifications(
        testUser._id.toString()
      );

      expect(notifications).toHaveLength(0);
    });
  });

  describe('exportConsentHistory', () => {
    it('should export complete consent history', async () => {
      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'marketing',
        'granted'
      );

      await privacyConsentService.recordConsent(
        testUser._id.toString(),
        'analytics',
        'denied'
      );

      const consentHistory = await privacyConsentService.exportConsentHistory(
        testUser._id.toString()
      );

      expect(consentHistory.userId).toBe(testUser._id.toString());
      expect(consentHistory.email).toBe(testUser.email);
      expect(consentHistory.exportedAt).toBeDefined();
      expect(consentHistory.consentSummary.totalConsents).toBe(2);
      expect(consentHistory.consentSummary.activeConsents).toBe(1);
      expect(consentHistory.privacyConsent).toBeDefined();

      // Verify security event was logged
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        userId: testUser._id.toString(),
        eventType: 'consent_history_exported',
        severity: 'low',
        details: expect.objectContaining({
          recordCount: 2
        })
      });
    });
  });
});