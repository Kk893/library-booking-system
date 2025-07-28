const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const rightToBeForgottenService = require('../rightToBeForgottenService');

// Import models
const User = require('../../../models/User');
const Booking = require('../../../models/Booking');
const Favorite = require('../../../models/Favorite');
const Rating = require('../../../models/Rating');
const Notification = require('../../../models/Notification');
const AuditLog = require('../../../models/AuditLog');

// Mock services
jest.mock('../securityMonitorService', () => ({
  logSecurityEvent: jest.fn().mockResolvedValue(true)
}));

jest.mock('../auditTrailService', () => ({
  createAuditEntry: jest.fn().mockResolvedValue(true)
}));

jest.mock('../dataAnonymizationService', () => ({
  anonymizeUserData: jest.fn().mockResolvedValue({ anonymized: true }),
  anonymizationMethods: {
    FULL_ANONYMIZATION: 'full_anonymization'
  }
}));

jest.mock('../databaseEncryptionService', () => ({
  applyEncryption: jest.fn()
}));

jest.mock('../encryptionService', () => ({
  initialize: jest.fn().mockResolvedValue(true)
}));

describe('RightToBeForgottenService', () => {
  let mongoServer;
  let testUserId;
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
    await Booking.deleteMany({});
    await Favorite.deleteMany({});
    await Rating.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '+1234567890',
      address: '123 Test St',
      city: 'Test City',
      role: 'user',
      privacyConsent: {
        consents: [{
          type: 'data_processing',
          status: 'granted',
          grantedAt: new Date(),
          legalBasis: 'consent'
        }],
        lastUpdated: new Date(),
        version: '1.0'
      },
      privacyPreferences: {
        dataMinimization: true,
        marketingCommunications: false
      }
    });
    await testUser.save();
    testUserId = testUser._id.toString();

    // Create test data across different models
    await createTestData(testUserId);
  });

  async function createTestData(userId) {
    // Create test booking
    const booking = new Booking({
      userId: userId,
      libraryId: new mongoose.Types.ObjectId(),
      type: 'seat',
      seatNumbers: ['A1'],
      amount: 50,
      status: 'confirmed'
    });
    await booking.save();

    // Create test favorite
    const favorite = new Favorite({
      userId: userId,
      bookId: new mongoose.Types.ObjectId(),
      libraryId: new mongoose.Types.ObjectId()
    });
    await favorite.save();

    // Create test rating
    const rating = new Rating({
      userId: userId,
      libraryId: new mongoose.Types.ObjectId(),
      rating: 5,
      review: 'Great library!'
    });
    await rating.save();

    // Create test notification
    const notification = new Notification({
      title: 'Test Notification',
      message: 'Test message',
      type: 'booking',
      recipients: [{
        userId: userId,
        read: false
      }],
      createdBy: userId
    });
    await notification.save();

    // Create test audit log
    const auditLog = new AuditLog({
      action: 'LOGIN',
      userId: userId,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
      success: true
    });
    await auditLog.save();
  }

  describe('initiateDataDeletion', () => {
    it('should successfully initiate data deletion request', async () => {
      const options = {
        reason: 'User requested deletion',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
        requestSource: 'user_portal'
      };

      const result = await rightToBeForgottenService.initiateDataDeletion(testUserId, options);

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('userId', testUserId);
      expect(result).toHaveProperty('userEmail', testUser.email);
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('reason', options.reason);
      expect(result).toHaveProperty('requestedAt');
      expect(result.metadata).toHaveProperty('ipAddress', options.ipAddress);
      expect(result.metadata).toHaveProperty('userAgent', options.userAgent);
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        rightToBeForgottenService.initiateDataDeletion(nonExistentUserId)
      ).rejects.toThrow('User not found');
    });

    it('should handle deletion request with custom options', async () => {
      const options = {
        includeAuditLogs: true,
        retainForLegalReasons: true,
        scheduledDeletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        verificationRequired: true
      };

      const result = await rightToBeForgottenService.initiateDataDeletion(testUserId, options);

      expect(result.includeAuditLogs).toBe(true);
      expect(result.retainForLegalReasons).toBe(true);
      expect(result.verificationRequired).toBe(true);
      expect(result.scheduledDeletionDate).toEqual(options.scheduledDeletionDate);
    });
  });

  describe('exportUserData', () => {
    it('should export complete user data package', async () => {
      const options = {
        format: 'json',
        includeMetadata: true,
        includeAuditLogs: true
      };

      const result = await rightToBeForgottenService.exportUserData(testUserId, options);

      expect(result).toHaveProperty('exportId');
      expect(result).toHaveProperty('userId', testUserId);
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('format', 'json');
      expect(result).toHaveProperty('dataIntegrityHash');

      // Check data structure
      expect(result.data).toHaveProperty('profile');
      expect(result.data).toHaveProperty('bookings');
      expect(result.data).toHaveProperty('favorites');
      expect(result.data).toHaveProperty('ratings');
      expect(result.data).toHaveProperty('notifications');
      expect(result.data).toHaveProperty('auditLogs');
      expect(result.data).toHaveProperty('privacy');

      // Verify profile data
      expect(result.data.profile).toHaveProperty('name', testUser.name);
      expect(result.data.profile).toHaveProperty('email', testUser.email);
      expect(result.data.profile).not.toHaveProperty('password'); // Should be excluded

      // Verify privacy data
      expect(result.data.privacy).toHaveProperty('consents');
      expect(result.data.privacy).toHaveProperty('preferences');
    });

    it('should export user data without audit logs when not requested', async () => {
      const options = {
        includeAuditLogs: false
      };

      const result = await rightToBeForgottenService.exportUserData(testUserId, options);

      expect(result.data).toHaveProperty('profile');
      expect(result.data).toHaveProperty('bookings');
      expect(result.data).toHaveProperty('favorites');
      expect(result.data).toHaveProperty('ratings');
      expect(result.data).toHaveProperty('notifications');
      expect(result.data).not.toHaveProperty('auditLogs');
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        rightToBeForgottenService.exportUserData(nonExistentUserId)
      ).rejects.toThrow('User not found');
    });

    it('should generate consistent data integrity hash', async () => {
      const result1 = await rightToBeForgottenService.exportUserData(testUserId);
      const result2 = await rightToBeForgottenService.exportUserData(testUserId);

      expect(result1.dataIntegrityHash).toBe(result2.dataIntegrityHash);
    });
  });

  describe('executeDataDeletion', () => {
    it('should successfully delete all user data', async () => {
      const deletionRequestId = 'test-deletion-request-123';
      const options = {
        userId: testUserId,
        retainForLegalReasons: false
      };

      // Verify data exists before deletion
      expect(await User.countDocuments({ _id: testUserId })).toBe(1);
      expect(await Booking.countDocuments({ userId: testUserId })).toBe(1);
      expect(await Favorite.countDocuments({ userId: testUserId })).toBe(1);
      expect(await Rating.countDocuments({ userId: testUserId })).toBe(1);
      expect(await Notification.countDocuments({ 'recipients.userId': testUserId })).toBe(1);
      expect(await AuditLog.countDocuments({ userId: testUserId })).toBe(1);

      const result = await rightToBeForgottenService.executeDataDeletion(deletionRequestId, options);

      expect(result).toHaveProperty('deletionRequestId', deletionRequestId);
      expect(result).toHaveProperty('userId', testUserId);
      expect(result).toHaveProperty('status', 'completed');
      expect(result).toHaveProperty('startedAt');
      expect(result).toHaveProperty('completedAt');
      expect(result).toHaveProperty('deletedData');
      expect(result).toHaveProperty('verificationResults');

      // Verify data has been deleted
      expect(await User.countDocuments({ _id: testUserId })).toBe(0);
      expect(await Booking.countDocuments({ userId: testUserId })).toBe(0);
      expect(await Favorite.countDocuments({ userId: testUserId })).toBe(0);
      expect(await Rating.countDocuments({ userId: testUserId })).toBe(0);
      expect(await Notification.countDocuments({ 'recipients.userId': testUserId })).toBe(0);
      expect(await AuditLog.countDocuments({ userId: testUserId })).toBe(0);

      // Check deletion results
      expect(result.deletedData.User).toHaveProperty('deletedCount', 1);
      expect(result.deletedData.Booking).toHaveProperty('deletedCount', 1);
      expect(result.deletedData.Favorite).toHaveProperty('deletedCount', 1);
      expect(result.deletedData.Rating).toHaveProperty('deletedCount', 1);
      expect(result.deletedData.Notification).toHaveProperty('deletedCount', 1);
      expect(result.deletedData.AuditLog).toHaveProperty('deletedCount', 1);

      // Check verification results
      expect(result.verificationResults.isComplete).toBe(true);
      expect(result.verificationResults.totalRemainingRecords).toBe(0);
    });

    it('should handle data retention for legal reasons', async () => {
      const deletionRequestId = 'test-deletion-request-456';
      const options = {
        userId: testUserId,
        retainForLegalReasons: true
      };

      const result = await rightToBeForgottenService.executeDataDeletion(deletionRequestId, options);

      expect(result.status).toBe('completed');
      
      // Some data should be anonymized instead of deleted
      expect(result.deletedData.AuditLog).toHaveProperty('action', 'anonymized');
      expect(result.deletedData.Booking).toHaveProperty('action', 'anonymized');
    });

    it('should handle partial deletion failures gracefully', async () => {
      const deletionRequestId = 'test-deletion-request-789';
      const options = {
        userId: testUserId
      };

      // Mock a deletion error for one model
      const originalDeleteMany = Booking.deleteMany;
      Booking.deleteMany = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await rightToBeForgottenService.executeDataDeletion(deletionRequestId, options);

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toHaveProperty('model', 'Booking');
      expect(result.errors[0]).toHaveProperty('error', 'Database error');

      // Restore original method
      Booking.deleteMany = originalDeleteMany;
    });

    it('should require userId in options', async () => {
      const deletionRequestId = 'test-deletion-request-no-user';
      const options = {}; // Missing userId

      await expect(
        rightToBeForgottenService.executeDataDeletion(deletionRequestId, options)
      ).rejects.toThrow('User ID is required for data deletion');
    });
  });

  describe('verifyDeletionCompleteness', () => {
    it('should verify complete deletion', async () => {
      // Delete all user data first
      await User.deleteMany({ _id: testUserId });
      await Booking.deleteMany({ userId: testUserId });
      await Favorite.deleteMany({ userId: testUserId });
      await Rating.deleteMany({ userId: testUserId });
      await Notification.deleteMany({ 'recipients.userId': testUserId });
      await AuditLog.deleteMany({ userId: testUserId });

      const result = await rightToBeForgottenService.verifyDeletionCompleteness(testUserId);

      expect(result).toHaveProperty('verifiedAt');
      expect(result).toHaveProperty('isComplete', true);
      expect(result).toHaveProperty('totalRemainingRecords', 0);
      expect(Object.keys(result.remainingData)).toHaveLength(0);
    });

    it('should detect incomplete deletion', async () => {
      // Leave some data undeleted
      await User.deleteMany({ _id: testUserId });
      await Booking.deleteMany({ userId: testUserId });
      // Keep Favorite, Rating, Notification, AuditLog

      const result = await rightToBeForgottenService.verifyDeletionCompleteness(testUserId);

      expect(result.isComplete).toBe(false);
      expect(result.totalRemainingRecords).toBeGreaterThan(0);
      expect(result.remainingData).toHaveProperty('Favorite');
      expect(result.remainingData).toHaveProperty('Rating');
      expect(result.remainingData).toHaveProperty('Notification');
      expect(result.remainingData).toHaveProperty('AuditLog');
    });
  });

  describe('Data Export Functions', () => {
    it('should export user profile correctly', async () => {
      const profile = await rightToBeForgottenService.exportUserProfile(testUserId);

      expect(profile).toHaveProperty('name', testUser.name);
      expect(profile).toHaveProperty('email', testUser.email);
      expect(profile).toHaveProperty('phone', testUser.phone);
      expect(profile).not.toHaveProperty('password');
      expect(profile).not.toHaveProperty('totpSecret');
    });

    it('should export user bookings with populated data', async () => {
      const bookings = await rightToBeForgottenService.exportUserBookings(testUserId);

      expect(bookings).toHaveLength(1);
      expect(bookings[0]).toHaveProperty('userId');
      expect(bookings[0]).toHaveProperty('type', 'seat');
      expect(bookings[0]).toHaveProperty('amount', 50);
    });

    it('should export user favorites', async () => {
      const favorites = await rightToBeForgottenService.exportUserFavorites(testUserId);

      expect(favorites).toHaveLength(1);
      expect(favorites[0]).toHaveProperty('userId');
    });

    it('should export user ratings', async () => {
      const ratings = await rightToBeForgottenService.exportUserRatings(testUserId);

      expect(ratings).toHaveLength(1);
      expect(ratings[0]).toHaveProperty('userId');
      expect(ratings[0]).toHaveProperty('rating', 5);
      expect(ratings[0]).toHaveProperty('review', 'Great library!');
    });

    it('should export user notifications', async () => {
      const notifications = await rightToBeForgottenService.exportUserNotifications(testUserId);

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toHaveProperty('title', 'Test Notification');
      expect(notifications[0].recipients).toHaveLength(1);
      expect(notifications[0].recipients[0].userId.toString()).toBe(testUserId);
    });

    it('should export user audit logs', async () => {
      const auditLogs = await rightToBeForgottenService.exportUserAuditLogs(testUserId);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toHaveProperty('action', 'LOGIN');
      expect(auditLogs[0]).toHaveProperty('userId');
      expect(auditLogs[0]).toHaveProperty('success', true);
    });
  });

  describe('Utility Functions', () => {
    it('should generate consistent data hash', async () => {
      const data = { test: 'data', number: 123 };
      const hash1 = rightToBeForgottenService.generateDataHash(data);
      const hash2 = rightToBeForgottenService.generateDataHash(data);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });

    it('should determine data retention correctly', async () => {
      expect(rightToBeForgottenService.shouldRetainData('audit_data')).toBe(true);
      expect(rightToBeForgottenService.shouldRetainData('transactional_data')).toBe(true);
      expect(rightToBeForgottenService.shouldRetainData('personal_data')).toBe(false);
      expect(rightToBeForgottenService.shouldRetainData('behavioral_data')).toBe(false);
    });

    it('should get deletion request status', async () => {
      const requestId = 'test-request-123';
      const status = await rightToBeForgottenService.getDeletionRequestStatus(requestId);

      expect(status).toHaveProperty('requestId', requestId);
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('message');
    });

    it('should cancel deletion request', async () => {
      const requestId = 'test-request-456';
      const options = {
        userId: testUserId,
        reason: 'User changed mind'
      };

      const result = await rightToBeForgottenService.cancelDeletionRequest(requestId, options);

      expect(result).toHaveProperty('requestId', requestId);
      expect(result).toHaveProperty('status', 'cancelled');
      expect(result).toHaveProperty('reason', options.reason);
      expect(result).toHaveProperty('cancelledAt');
    });
  });

  describe('Integration Workflow Tests', () => {
    it('should complete full right-to-be-forgotten workflow', async () => {
      // Step 1: Export user data
      const exportResult = await rightToBeForgottenService.exportUserData(testUserId, {
        includeAuditLogs: true
      });
      expect(exportResult).toHaveProperty('exportId');
      expect(exportResult.data).toHaveProperty('profile');

      // Step 2: Initiate deletion request
      const deletionRequest = await rightToBeForgottenService.initiateDataDeletion(testUserId, {
        reason: 'GDPR Article 17 request'
      });
      expect(deletionRequest).toHaveProperty('requestId');
      expect(deletionRequest.status).toBe('pending');

      // Step 3: Execute deletion
      const deletionResult = await rightToBeForgottenService.executeDataDeletion(
        deletionRequest.requestId,
        { userId: testUserId }
      );
      expect(deletionResult.status).toBe('completed');

      // Step 4: Verify deletion
      const verification = await rightToBeForgottenService.verifyDeletionCompleteness(testUserId);
      expect(verification.isComplete).toBe(true);

      // Step 5: Confirm no data remains
      expect(await User.countDocuments({ _id: testUserId })).toBe(0);
      expect(await Booking.countDocuments({ userId: testUserId })).toBe(0);
      expect(await Favorite.countDocuments({ userId: testUserId })).toBe(0);
      expect(await Rating.countDocuments({ userId: testUserId })).toBe(0);
      expect(await Notification.countDocuments({ 'recipients.userId': testUserId })).toBe(0);
      expect(await AuditLog.countDocuments({ userId: testUserId })).toBe(0);
    });

    it('should handle workflow with legal data retention', async () => {
      // Export data first
      const exportResult = await rightToBeForgottenService.exportUserData(testUserId);
      expect(exportResult).toHaveProperty('exportId');

      // Initiate deletion with legal retention
      const deletionRequest = await rightToBeForgottenService.initiateDataDeletion(testUserId, {
        retainForLegalReasons: true
      });

      // Execute deletion with retention
      const deletionResult = await rightToBeForgottenService.executeDataDeletion(
        deletionRequest.requestId,
        { 
          userId: testUserId,
          retainForLegalReasons: true
        }
      );

      expect(deletionResult.status).toBe('completed');
      
      // Some data should be anonymized instead of deleted
      expect(deletionResult.deletedData.AuditLog.action).toBe('anonymized');
      expect(deletionResult.deletedData.Booking.action).toBe('anonymized');
    });
  });
});