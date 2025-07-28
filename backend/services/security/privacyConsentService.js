const mongoose = require('mongoose');
const User = require('../../models/User');
const securityMonitorService = require('./securityMonitorService');

/**
 * Privacy Consent Management Service
 * Handles user consent tracking, privacy preferences, and data processing consent validation
 */
class PrivacyConsentService {
  constructor() {
    this.consentTypes = {
      DATA_PROCESSING: 'data_processing',
      MARKETING: 'marketing',
      ANALYTICS: 'analytics',
      COOKIES: 'cookies',
      THIRD_PARTY_SHARING: 'third_party_sharing',
      LOCATION_TRACKING: 'location_tracking'
    };

    this.consentStatus = {
      GRANTED: 'granted',
      DENIED: 'denied',
      WITHDRAWN: 'withdrawn',
      PENDING: 'pending'
    };

    this.legalBasis = {
      CONSENT: 'consent',
      CONTRACT: 'contract',
      LEGAL_OBLIGATION: 'legal_obligation',
      VITAL_INTERESTS: 'vital_interests',
      PUBLIC_TASK: 'public_task',
      LEGITIMATE_INTERESTS: 'legitimate_interests'
    };
  }

  /**
   * Record user consent for specific data processing activities
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent
   * @param {string} status - Consent status (granted/denied)
   * @param {Object} metadata - Additional consent metadata
   * @returns {Promise<Object>} Consent record
   */
  async recordConsent(userId, consentType, status, metadata = {}) {
    try {
      if (!Object.values(this.consentTypes).includes(consentType)) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      if (!Object.values(this.consentStatus).includes(status)) {
        throw new Error(`Invalid consent status: ${status}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize privacy consent if not exists
      if (!user.privacyConsent) {
        user.privacyConsent = {
          consents: [],
          lastUpdated: new Date(),
          version: '1.0'
        };
      }

      // Find existing consent record or create new one
      let consentRecord = user.privacyConsent.consents.find(
        c => c.type === consentType && c.status !== this.consentStatus.WITHDRAWN
      );

      if (consentRecord) {
        // Update existing consent
        consentRecord.status = status;
        consentRecord.updatedAt = new Date();
        consentRecord.metadata = { ...consentRecord.metadata, ...metadata };
        consentRecord.version = user.privacyConsent.version;
      } else {
        // Create new consent record
        consentRecord = {
          type: consentType,
          status: status,
          grantedAt: status === this.consentStatus.GRANTED ? new Date() : null,
          deniedAt: status === this.consentStatus.DENIED ? new Date() : null,
          withdrawnAt: status === this.consentStatus.WITHDRAWN ? new Date() : null,
          updatedAt: new Date(),
          legalBasis: metadata.legalBasis || this.legalBasis.CONSENT,
          purpose: metadata.purpose || 'General data processing',
          dataCategories: metadata.dataCategories || ['personal_data'],
          retentionPeriod: metadata.retentionPeriod || '2 years',
          metadata: metadata,
          version: user.privacyConsent.version,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        };

        user.privacyConsent.consents.push(consentRecord);
      }

      user.privacyConsent.lastUpdated = new Date();
      await user.save();

      // Log consent event for audit trail
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'consent_recorded',
        severity: 'low',
        details: {
          consentType: consentType,
          status: status,
          legalBasis: consentRecord.legalBasis,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      });

      return consentRecord;
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    }
  }

  /**
   * Withdraw user consent for specific data processing
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent to withdraw
   * @param {Object} metadata - Withdrawal metadata
   * @returns {Promise<Object>} Updated consent record
   */
  async withdrawConsent(userId, consentType, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.privacyConsent) {
        throw new Error('User or consent records not found');
      }

      const consentRecord = user.privacyConsent.consents.find(
        c => c.type === consentType && c.status !== this.consentStatus.WITHDRAWN
      );

      if (!consentRecord) {
        throw new Error(`No active consent found for type: ${consentType}`);
      }

      // Mark consent as withdrawn
      consentRecord.status = this.consentStatus.WITHDRAWN;
      consentRecord.withdrawnAt = new Date();
      consentRecord.updatedAt = new Date();
      consentRecord.withdrawalReason = metadata.reason || 'User requested withdrawal';
      consentRecord.metadata = { ...consentRecord.metadata, ...metadata };

      user.privacyConsent.lastUpdated = new Date();
      await user.save();

      // Log withdrawal event
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'consent_withdrawn',
        severity: 'medium',
        details: {
          consentType: consentType,
          withdrawalReason: consentRecord.withdrawalReason,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      });

      // Trigger data processing review if necessary
      await this.triggerDataProcessingReview(userId, consentType);

      return consentRecord;
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid consent for specific data processing
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent to check
   * @returns {Promise<boolean>} Whether consent is valid
   */
  async hasValidConsent(userId, consentType) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.privacyConsent) {
        return false;
      }

      const consentRecord = user.privacyConsent.consents.find(
        c => c.type === consentType && c.status === this.consentStatus.GRANTED
      );

      if (!consentRecord) {
        return false;
      }

      // Check if consent has expired
      if (consentRecord.expiresAt && new Date() > consentRecord.expiresAt) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  /**
   * Get all consent records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of consent records
   */
  async getUserConsents(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.privacyConsent) {
        return [];
      }

      return user.privacyConsent.consents.map(consent => ({
        type: consent.type,
        status: consent.status,
        grantedAt: consent.grantedAt,
        deniedAt: consent.deniedAt,
        withdrawnAt: consent.withdrawnAt,
        updatedAt: consent.updatedAt,
        legalBasis: consent.legalBasis,
        purpose: consent.purpose,
        dataCategories: consent.dataCategories,
        retentionPeriod: consent.retentionPeriod,
        version: consent.version,
        expiresAt: consent.expiresAt
      }));
    } catch (error) {
      console.error('Error getting user consents:', error);
      throw error;
    }
  }

  /**
   * Update user privacy preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Privacy preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updatePrivacyPreferences(userId, preferences) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize privacy preferences if not exists
      if (!user.privacyPreferences) {
        user.privacyPreferences = {};
      }

      // Update preferences
      const allowedPreferences = [
        'dataMinimization',
        'anonymousAnalytics',
        'marketingCommunications',
        'thirdPartySharing',
        'locationTracking',
        'cookiePreferences',
        'dataRetentionPeriod',
        'communicationChannels'
      ];

      for (const [key, value] of Object.entries(preferences)) {
        if (allowedPreferences.includes(key)) {
          user.privacyPreferences[key] = value;
        }
      }

      user.privacyPreferences.lastUpdated = new Date();
      await user.save();

      // Log preference update
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'privacy_preferences_updated',
        severity: 'low',
        details: {
          updatedPreferences: Object.keys(preferences),
          timestamp: new Date()
        }
      });

      return user.privacyPreferences;
    } catch (error) {
      console.error('Error updating privacy preferences:', error);
      throw error;
    }
  }

  /**
   * Validate data processing consent before performing operations
   * @param {string} userId - User ID
   * @param {string} operation - Data processing operation
   * @param {Array} requiredConsents - Required consent types
   * @returns {Promise<Object>} Validation result
   */
  async validateDataProcessingConsent(userId, operation, requiredConsents = []) {
    try {
      const validationResult = {
        isValid: true,
        missingConsents: [],
        warnings: [],
        operation: operation,
        timestamp: new Date()
      };

      // Check each required consent
      for (const consentType of requiredConsents) {
        const hasConsent = await this.hasValidConsent(userId, consentType);
        if (!hasConsent) {
          validationResult.isValid = false;
          validationResult.missingConsents.push(consentType);
        }
      }

      // Check for consent expiration warnings
      const user = await User.findById(userId);
      if (user && user.privacyConsent) {
        for (const consent of user.privacyConsent.consents) {
          if (consent.expiresAt && consent.expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
            validationResult.warnings.push(`Consent for ${consent.type} expires soon`);
          }
        }
      }

      // Log validation attempt
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'consent_validation',
        severity: validationResult.isValid ? 'low' : 'medium',
        details: {
          operation: operation,
          isValid: validationResult.isValid,
          missingConsents: validationResult.missingConsents,
          warnings: validationResult.warnings
        }
      });

      return validationResult;
    } catch (error) {
      console.error('Error validating data processing consent:', error);
      throw error;
    }
  }

  /**
   * Generate consent renewal notifications
   * @param {string} userId - User ID (optional, if not provided checks all users)
   * @returns {Promise<Array>} Array of renewal notifications
   */
  async generateConsentRenewalNotifications(userId = null) {
    try {
      const query = userId ? { _id: userId } : {};
      const users = await User.find(query);
      const notifications = [];

      for (const user of users) {
        if (!user.privacyConsent) continue;

        for (const consent of user.privacyConsent.consents) {
          // Check if consent expires within 30 days
          if (consent.expiresAt && consent.expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
            notifications.push({
              userId: user._id,
              email: user.email,
              consentType: consent.type,
              expiresAt: consent.expiresAt,
              daysUntilExpiry: Math.ceil((consent.expiresAt - new Date()) / (24 * 60 * 60 * 1000)),
              renewalRequired: true
            });
          }
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error generating consent renewal notifications:', error);
      throw error;
    }
  }

  /**
   * Trigger data processing review when consent is withdrawn
   * @param {string} userId - User ID
   * @param {string} consentType - Withdrawn consent type
   * @returns {Promise<void>}
   */
  async triggerDataProcessingReview(userId, consentType) {
    try {
      // Log the need for data processing review
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'data_processing_review_required',
        severity: 'medium',
        details: {
          consentType: consentType,
          reason: 'Consent withdrawn',
          reviewRequired: true,
          timestamp: new Date()
        }
      });

      // Here you would typically trigger automated processes to:
      // 1. Stop processing data for the withdrawn consent type
      // 2. Review existing data for potential deletion
      // 3. Update data processing systems
      // 4. Notify relevant teams

      console.log(`Data processing review triggered for user ${userId}, consent type: ${consentType}`);
    } catch (error) {
      console.error('Error triggering data processing review:', error);
      throw error;
    }
  }

  /**
   * Export user consent history for compliance reporting
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Consent history export
   */
  async exportConsentHistory(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const consentHistory = {
        userId: userId,
        email: user.email,
        exportedAt: new Date(),
        privacyConsent: user.privacyConsent || {},
        privacyPreferences: user.privacyPreferences || {},
        consentSummary: {
          totalConsents: user.privacyConsent?.consents?.length || 0,
          activeConsents: user.privacyConsent?.consents?.filter(c => c.status === this.consentStatus.GRANTED).length || 0,
          withdrawnConsents: user.privacyConsent?.consents?.filter(c => c.status === this.consentStatus.WITHDRAWN).length || 0
        }
      };

      // Log export event
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'consent_history_exported',
        severity: 'low',
        details: {
          exportedAt: new Date(),
          recordCount: consentHistory.consentSummary.totalConsents
        }
      });

      return consentHistory;
    } catch (error) {
      console.error('Error exporting consent history:', error);
      throw error;
    }
  }
}

module.exports = new PrivacyConsentService();