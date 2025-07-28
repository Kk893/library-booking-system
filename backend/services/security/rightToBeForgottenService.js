const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Import models
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const Favorite = require('../../models/Favorite');
const Rating = require('../../models/Rating');
const Notification = require('../../models/Notification');
const AuditLog = require('../../models/AuditLog');

// Import services
const securityMonitorService = require('./securityMonitorService');
const auditTrailService = require('./auditTrailService');
const encryptionService = require('./encryptionService');
const dataAnonymizationService = require('./dataAnonymizationService');

/**
 * Right to be Forgotten Service
 * Implements GDPR Article 17 - Right to erasure ('right to be forgotten')
 * Handles complete user data deletion, data export, and verification
 */
class RightToBeForgottenService {
  constructor() {
    this.deletionStatuses = {
      PENDING: 'pending',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'cancelled'
    };

    this.dataCategories = {
      PERSONAL_DATA: 'personal_data',
      BEHAVIORAL_DATA: 'behavioral_data',
      TRANSACTIONAL_DATA: 'transactional_data',
      TECHNICAL_DATA: 'technical_data',
      AUDIT_DATA: 'audit_data'
    };

    this.retentionReasons = {
      LEGAL_OBLIGATION: 'legal_obligation',
      CONTRACT_PERFORMANCE: 'contract_performance',
      LEGITIMATE_INTERESTS: 'legitimate_interests',
      VITAL_INTERESTS: 'vital_interests'
    };

    // Define data models and their user reference fields
    this.dataModels = {
      User: { model: User, userField: '_id', category: this.dataCategories.PERSONAL_DATA },
      Booking: { model: Booking, userField: 'userId', category: this.dataCategories.TRANSACTIONAL_DATA },
      Favorite: { model: Favorite, userField: 'userId', category: this.dataCategories.BEHAVIORAL_DATA },
      Rating: { model: Rating, userField: 'userId', category: this.dataCategories.BEHAVIORAL_DATA },
      Notification: { model: Notification, userField: 'recipients.userId', category: this.dataCategories.TECHNICAL_DATA },
      AuditLog: { model: AuditLog, userField: 'userId', category: this.dataCategories.AUDIT_DATA }
    };
  }

  /**
   * Initiate right to be forgotten request
   * @param {string} userId - User ID requesting deletion
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion request details
   */
  async initiateDataDeletion(userId, options = {}) {
    try {
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate deletion request ID
      const deletionRequestId = crypto.randomUUID();
      
      // Create deletion request record
      const deletionRequest = {
        requestId: deletionRequestId,
        userId: userId,
        userEmail: user.email,
        status: this.deletionStatuses.PENDING,
        requestedAt: new Date(),
        requestedBy: options.requestedBy || userId,
        reason: options.reason || 'User requested data deletion',
        includeAuditLogs: options.includeAuditLogs || false,
        retainForLegalReasons: options.retainForLegalReasons || false,
        scheduledDeletionDate: options.scheduledDeletionDate || new Date(),
        verificationRequired: options.verificationRequired !== false,
        metadata: {
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          requestSource: options.requestSource || 'user_portal'
        }
      };

      // Log the deletion request
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'data_deletion_requested',
        severity: 'high',
        details: {
          deletionRequestId: deletionRequestId,
          reason: deletionRequest.reason,
          includeAuditLogs: deletionRequest.includeAuditLogs,
          scheduledDate: deletionRequest.scheduledDeletionDate,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent
        }
      });

      // Create audit trail entry
      await auditTrailService.createAuditEntry({
        action: 'DATA_DELETION_REQUESTED',
        userId: userId,
        details: {
          deletionRequestId: deletionRequestId,
          status: deletionRequest.status,
          requestedAt: deletionRequest.requestedAt
        },
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      });

      return deletionRequest;
    } catch (error) {
      console.error('Error initiating data deletion:', error);
      throw error;
    }
  }

  /**
   * Export all user data for portability (GDPR Article 20)
   * @param {string} userId - User ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data package
   */
  async exportUserData(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const exportId = crypto.randomUUID();
      const exportData = {
        exportId: exportId,
        userId: userId,
        exportedAt: new Date(),
        format: options.format || 'json',
        includeMetadata: options.includeMetadata !== false,
        data: {}
      };

      // Export user profile data
      exportData.data.profile = await this.exportUserProfile(userId);

      // Export behavioral data
      exportData.data.bookings = await this.exportUserBookings(userId);
      exportData.data.favorites = await this.exportUserFavorites(userId);
      exportData.data.ratings = await this.exportUserRatings(userId);

      // Export technical data
      exportData.data.notifications = await this.exportUserNotifications(userId);
      
      // Export audit logs if requested
      if (options.includeAuditLogs) {
        exportData.data.auditLogs = await this.exportUserAuditLogs(userId);
      }

      // Add privacy and consent data
      exportData.data.privacy = {
        consents: user.privacyConsent || {},
        preferences: user.privacyPreferences || {}
      };

      // Generate data integrity hash
      exportData.dataIntegrityHash = this.generateDataHash(exportData.data);

      // Log export event
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'user_data_exported',
        severity: 'medium',
        details: {
          exportId: exportId,
          dataCategories: Object.keys(exportData.data),
          includeAuditLogs: options.includeAuditLogs,
          format: exportData.format
        }
      });

      // Create audit trail entry
      await auditTrailService.createAuditEntry({
        action: 'USER_DATA_EXPORTED',
        userId: userId,
        details: {
          exportId: exportId,
          dataSize: JSON.stringify(exportData).length,
          categories: Object.keys(exportData.data)
        },
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      });

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Execute complete user data deletion
   * @param {string} deletionRequestId - Deletion request ID
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Deletion results
   */
  async executeDataDeletion(deletionRequestId, options = {}) {
    try {
      // This would typically retrieve the deletion request from a database
      // For now, we'll work with the userId directly
      const userId = options.userId;
      if (!userId) {
        throw new Error('User ID is required for data deletion');
      }

      const deletionResults = {
        deletionRequestId: deletionRequestId,
        userId: userId,
        status: this.deletionStatuses.IN_PROGRESS,
        startedAt: new Date(),
        deletedData: {},
        retainedData: {},
        errors: [],
        verificationResults: {}
      };

      // Log deletion start
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'data_deletion_started',
        severity: 'high',
        details: {
          deletionRequestId: deletionRequestId,
          startedAt: deletionResults.startedAt
        }
      });

      // Delete data from each model
      for (const [modelName, modelConfig] of Object.entries(this.dataModels)) {
        try {
          const deletionResult = await this.deleteModelData(
            modelConfig.model,
            modelConfig.userField,
            userId,
            modelConfig.category,
            options
          );
          
          deletionResults.deletedData[modelName] = deletionResult;
        } catch (error) {
          console.error(`Error deleting ${modelName} data:`, error);
          deletionResults.errors.push({
            model: modelName,
            error: error.message,
            timestamp: new Date()
          });
        }
      }

      // Delete user files (profile images, uploads, etc.)
      try {
        const filesDeletionResult = await this.deleteUserFiles(userId);
        deletionResults.deletedData.files = filesDeletionResult;
      } catch (error) {
        console.error('Error deleting user files:', error);
        deletionResults.errors.push({
          category: 'files',
          error: error.message,
          timestamp: new Date()
        });
      }

      // Verify deletion completeness
      deletionResults.verificationResults = await this.verifyDeletionCompleteness(userId);

      // Update deletion status
      deletionResults.status = deletionResults.errors.length > 0 
        ? this.deletionStatuses.FAILED 
        : this.deletionStatuses.COMPLETED;
      deletionResults.completedAt = new Date();

      // Log deletion completion
      await securityMonitorService.logSecurityEvent({
        userId: userId,
        eventType: 'data_deletion_completed',
        severity: 'high',
        details: {
          deletionRequestId: deletionRequestId,
          status: deletionResults.status,
          deletedRecords: Object.values(deletionResults.deletedData).reduce((sum, result) => sum + (result.deletedCount || 0), 0),
          errors: deletionResults.errors.length,
          completedAt: deletionResults.completedAt
        }
      });

      return deletionResults;
    } catch (error) {
      console.error('Error executing data deletion:', error);
      throw error;
    }
  }

  /**
   * Delete data from a specific model
   * @param {Object} Model - Mongoose model
   * @param {string} userField - Field that references the user
   * @param {string} userId - User ID
   * @param {string} category - Data category
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteModelData(Model, userField, userId, category, options = {}) {
    try {
      // Build query based on user field structure
      let query = {};
      if (userField === '_id') {
        query._id = userId;
      } else if (userField.includes('.')) {
        // Handle nested fields like 'recipients.userId'
        query[userField] = userId;
      } else {
        query[userField] = userId;
      }

      // Check if data should be retained for legal reasons
      if (options.retainForLegalReasons && this.shouldRetainData(category)) {
        // Anonymize instead of delete
        const records = await Model.find(query);
        let anonymizedCount = 0;
        
        for (const record of records) {
          const anonymizedData = await dataAnonymizationService.anonymizeUserData(
            record.toObject(),
            dataAnonymizationService.anonymizationMethods.FULL_ANONYMIZATION
          );
          
          // Update record with anonymized data
          await Model.findByIdAndUpdate(record._id, anonymizedData);
          anonymizedCount++;
        }

        return {
          category: category,
          action: 'anonymized',
          anonymizedCount: anonymizedCount,
          retentionReason: this.retentionReasons.LEGAL_OBLIGATION
        };
      }

      // Count records before deletion
      const recordCount = await Model.countDocuments(query);

      // Perform deletion
      const deleteResult = await Model.deleteMany(query);

      return {
        category: category,
        action: 'deleted',
        deletedCount: deleteResult.deletedCount,
        expectedCount: recordCount,
        success: deleteResult.deletedCount === recordCount
      };
    } catch (error) {
      console.error(`Error deleting model data:`, error);
      throw error;
    }
  }

  /**
   * Delete user files (profile images, uploads, etc.)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} File deletion result
   */
  async deleteUserFiles(userId) {
    try {
      const deletionResult = {
        deletedFiles: [],
        errors: [],
        totalSize: 0
      };

      // Define user file directories
      const userDirectories = [
        path.join(process.cwd(), 'backend', 'uploads', 'profiles', userId),
        path.join(process.cwd(), 'backend', 'uploads', 'documents', userId),
        path.join(process.cwd(), 'backend', 'uploads', 'temp', userId)
      ];

      for (const directory of userDirectories) {
        try {
          // Check if directory exists
          await fs.access(directory);
          
          // Get all files in directory
          const files = await fs.readdir(directory, { withFileTypes: true });
          
          for (const file of files) {
            const filePath = path.join(directory, file.name);
            try {
              const stats = await fs.stat(filePath);
              deletionResult.totalSize += stats.size;
              
              await fs.unlink(filePath);
              deletionResult.deletedFiles.push({
                path: filePath,
                size: stats.size,
                deletedAt: new Date()
              });
            } catch (fileError) {
              deletionResult.errors.push({
                file: filePath,
                error: fileError.message
              });
            }
          }

          // Remove empty directory
          await fs.rmdir(directory);
        } catch (dirError) {
          // Directory doesn't exist or other error - not necessarily a problem
          if (dirError.code !== 'ENOENT') {
            deletionResult.errors.push({
              directory: directory,
              error: dirError.message
            });
          }
        }
      }

      return deletionResult;
    } catch (error) {
      console.error('Error deleting user files:', error);
      throw error;
    }
  }

  /**
   * Verify that user data has been completely deleted
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Verification results
   */
  async verifyDeletionCompleteness(userId) {
    try {
      const verificationResults = {
        verifiedAt: new Date(),
        isComplete: true,
        remainingData: {},
        totalRemainingRecords: 0
      };

      // Check each model for remaining data
      for (const [modelName, modelConfig] of Object.entries(this.dataModels)) {
        try {
          let query = {};
          if (modelConfig.userField === '_id') {
            query._id = userId;
          } else if (modelConfig.userField.includes('.')) {
            query[modelConfig.userField] = userId;
          } else {
            query[modelConfig.userField] = userId;
          }

          const remainingCount = await modelConfig.model.countDocuments(query);
          
          if (remainingCount > 0) {
            verificationResults.isComplete = false;
            verificationResults.remainingData[modelName] = {
              count: remainingCount,
              category: modelConfig.category
            };
            verificationResults.totalRemainingRecords += remainingCount;
          }
        } catch (error) {
          console.error(`Error verifying ${modelName} deletion:`, error);
          verificationResults.remainingData[modelName] = {
            error: error.message,
            verified: false
          };
          verificationResults.isComplete = false;
        }
      }

      return verificationResults;
    } catch (error) {
      console.error('Error verifying deletion completeness:', error);
      throw error;
    }
  }

  /**
   * Export user profile data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  async exportUserProfile(userId) {
    try {
      const user = await User.findById(userId).select('-password -totpSecret');
      return user ? user.toObject() : null;
    } catch (error) {
      console.error('Error exporting user profile:', error);
      throw error;
    }
  }

  /**
   * Export user bookings data
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User bookings
   */
  async exportUserBookings(userId) {
    try {
      const bookings = await Booking.find({ userId: userId });
      return bookings.map(booking => booking.toObject());
    } catch (error) {
      console.error('Error exporting user bookings:', error);
      throw error;
    }
  }

  /**
   * Export user favorites data
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User favorites
   */
  async exportUserFavorites(userId) {
    try {
      const favorites = await Favorite.find({ userId: userId });
      return favorites.map(favorite => favorite.toObject());
    } catch (error) {
      console.error('Error exporting user favorites:', error);
      throw error;
    }
  }

  /**
   * Export user ratings data
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User ratings
   */
  async exportUserRatings(userId) {
    try {
      const ratings = await Rating.find({ userId: userId });
      return ratings.map(rating => rating.toObject());
    } catch (error) {
      console.error('Error exporting user ratings:', error);
      throw error;
    }
  }

  /**
   * Export user notifications data
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User notifications
   */
  async exportUserNotifications(userId) {
    try {
      const notifications = await Notification.find({ 'recipients.userId': userId });
      return notifications.map(notification => {
        const notificationObj = notification.toObject();
        // Filter recipients to only include the requesting user
        notificationObj.recipients = notificationObj.recipients.filter(
          recipient => recipient.userId.toString() === userId
        );
        return notificationObj;
      });
    } catch (error) {
      console.error('Error exporting user notifications:', error);
      throw error;
    }
  }

  /**
   * Export user audit logs data
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User audit logs
   */
  async exportUserAuditLogs(userId) {
    try {
      const auditLogs = await AuditLog.find({ userId: userId });
      return auditLogs.map(log => log.toObject());
    } catch (error) {
      console.error('Error exporting user audit logs:', error);
      throw error;
    }
  }

  /**
   * Generate data integrity hash
   * @param {Object} data - Data to hash
   * @returns {string} Hash value
   */
  generateDataHash(data) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data, Object.keys(data).sort()));
    return hash.digest('hex');
  }

  /**
   * Check if data should be retained for legal reasons
   * @param {string} category - Data category
   * @returns {boolean} Whether data should be retained
   */
  shouldRetainData(category) {
    // Define retention rules based on legal requirements
    const retentionRules = {
      [this.dataCategories.AUDIT_DATA]: true, // Usually required for compliance
      [this.dataCategories.TRANSACTIONAL_DATA]: true, // May be required for tax/legal purposes
      [this.dataCategories.PERSONAL_DATA]: false,
      [this.dataCategories.BEHAVIORAL_DATA]: false,
      [this.dataCategories.TECHNICAL_DATA]: false
    };

    return retentionRules[category] || false;
  }

  /**
   * Get deletion request status
   * @param {string} deletionRequestId - Deletion request ID
   * @returns {Promise<Object>} Deletion request status
   */
  async getDeletionRequestStatus(deletionRequestId) {
    try {
      // In a real implementation, this would query a deletion requests table
      // For now, return a mock status
      return {
        requestId: deletionRequestId,
        status: this.deletionStatuses.PENDING,
        message: 'Deletion request is being processed'
      };
    } catch (error) {
      console.error('Error getting deletion request status:', error);
      throw error;
    }
  }

  /**
   * Cancel deletion request
   * @param {string} deletionRequestId - Deletion request ID
   * @param {Object} options - Cancellation options
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelDeletionRequest(deletionRequestId, options = {}) {
    try {
      // Log cancellation
      await securityMonitorService.logSecurityEvent({
        userId: options.userId,
        eventType: 'data_deletion_cancelled',
        severity: 'medium',
        details: {
          deletionRequestId: deletionRequestId,
          reason: options.reason || 'User requested cancellation',
          cancelledAt: new Date()
        }
      });

      return {
        requestId: deletionRequestId,
        status: this.deletionStatuses.CANCELLED,
        cancelledAt: new Date(),
        reason: options.reason || 'User requested cancellation'
      };
    } catch (error) {
      console.error('Error cancelling deletion request:', error);
      throw error;
    }
  }
}

module.exports = new RightToBeForgottenService();