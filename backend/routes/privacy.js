const express = require('express');
const router = express.Router();
const rightToBeForgottenService = require('../services/security/rightToBeForgottenService');
const privacyConsentService = require('../services/security/privacyConsentService');
const { auth } = require('../middleware/auth');
const validationService = require('../services/security/validationService');
const rateLimitService = require('../services/security/rateLimitService');
const securityMonitorService = require('../services/security/securityMonitorService');

// Rate limiting for privacy endpoints
const privacyRateLimit = async (req, res, next) => {
  try {
    const key = `privacy_${req.ip}_${req.user?.id || 'anonymous'}`;
    const isAllowed = await rateLimitService.checkRateLimit(key, 15 * 60 * 1000, 10); // 10 requests per 15 minutes
    
    if (!isAllowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many privacy requests. Please try again later.'
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Privacy rate limit error:', error);
    next();
  }
};

/**
 * @route POST /api/privacy/data-deletion/request
 * @desc Initiate right to be forgotten request
 * @access Private
 */
router.post('/data-deletion/request', auth, privacyRateLimit, async (req, res) => {
  try {
    const { reason, includeAuditLogs, scheduledDeletionDate } = req.body;
    
    // Validate request
    const validationSchema = {
      reason: validationService.joi.string().max(500).optional(),
      includeAuditLogs: validationService.joi.boolean().optional(),
      scheduledDeletionDate: validationService.joi.date().min('now').optional()
    };
    
    const { error } = validationService.joi.object(validationSchema).validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    // Check if user has already requested deletion recently
    const recentDeletionEvents = await securityMonitorService.getRecentEvents(
      req.user.id,
      'data_deletion_requested',
      24 * 60 * 60 * 1000 // 24 hours
    );

    if (recentDeletionEvents.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DELETION_REQUEST_EXISTS',
          message: 'A deletion request has already been submitted recently. Please contact support if you need assistance.'
        }
      });
    }

    const options = {
      reason: reason || 'User requested data deletion',
      includeAuditLogs: includeAuditLogs || false,
      scheduledDeletionDate: scheduledDeletionDate ? new Date(scheduledDeletionDate) : new Date(),
      requestedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestSource: 'api'
    };

    const deletionRequest = await rightToBeForgottenService.initiateDataDeletion(req.user.id, options);

    res.status(200).json({
      success: true,
      data: {
        requestId: deletionRequest.requestId,
        status: deletionRequest.status,
        requestedAt: deletionRequest.requestedAt,
        scheduledDeletionDate: deletionRequest.scheduledDeletionDate,
        message: 'Data deletion request has been submitted successfully. You will receive confirmation once processing is complete.'
      }
    });

  } catch (error) {
    console.error('Data deletion request error:', error);
    
    await securityMonitorService.logSecurityEvent({
      userId: req.user?.id,
      eventType: 'data_deletion_request_failed',
      severity: 'medium',
      details: {
        error: error.message,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETION_REQUEST_FAILED',
        message: 'Failed to process data deletion request. Please try again later.'
      }
    });
  }
});

/**
 * @route GET /api/privacy/data-export
 * @desc Export user data for portability (GDPR Article 20)
 * @access Private
 */
router.get('/data-export', auth, privacyRateLimit, async (req, res) => {
  try {
    const { format, includeAuditLogs } = req.query;
    
    // Validate query parameters
    const validFormats = ['json'];
    if (format && !validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Supported formats: json'
        }
      });
    }

    const options = {
      format: format || 'json',
      includeAuditLogs: includeAuditLogs === 'true',
      includeMetadata: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const exportData = await rightToBeForgottenService.exportUserData(req.user.id, options);

    // Set appropriate headers for data export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-export-${exportData.exportId}.json"`);
    res.setHeader('X-Export-ID', exportData.exportId);
    res.setHeader('X-Data-Integrity-Hash', exportData.dataIntegrityHash);

    res.status(200).json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Data export error:', error);
    
    await securityMonitorService.logSecurityEvent({
      userId: req.user?.id,
      eventType: 'data_export_failed',
      severity: 'medium',
      details: {
        error: error.message,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'DATA_EXPORT_FAILED',
        message: 'Failed to export user data. Please try again later.'
      }
    });
  }
});

/**
 * @route GET /api/privacy/data-deletion/status/:requestId
 * @desc Get status of data deletion request
 * @access Private
 */
router.get('/data-deletion/status/:requestId', auth, privacyRateLimit, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Validate request ID format
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST_ID',
          message: 'Valid request ID is required'
        }
      });
    }

    const status = await rightToBeForgottenService.getDeletionRequestStatus(requestId);

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Deletion status check error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_FAILED',
        message: 'Failed to check deletion request status'
      }
    });
  }
});

/**
 * @route DELETE /api/privacy/data-deletion/cancel/:requestId
 * @desc Cancel data deletion request
 * @access Private
 */
router.delete('/data-deletion/cancel/:requestId', auth, privacyRateLimit, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    
    // Validate request ID
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST_ID',
          message: 'Valid request ID is required'
        }
      });
    }

    const options = {
      userId: req.user.id,
      reason: reason || 'User requested cancellation',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const cancellationResult = await rightToBeForgottenService.cancelDeletionRequest(requestId, options);

    res.status(200).json({
      success: true,
      data: {
        requestId: cancellationResult.requestId,
        status: cancellationResult.status,
        cancelledAt: cancellationResult.cancelledAt,
        reason: cancellationResult.reason,
        message: 'Data deletion request has been cancelled successfully'
      }
    });

  } catch (error) {
    console.error('Deletion cancellation error:', error);
    
    await securityMonitorService.logSecurityEvent({
      userId: req.user?.id,
      eventType: 'data_deletion_cancellation_failed',
      severity: 'low',
      details: {
        requestId: req.params.requestId,
        error: error.message,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'CANCELLATION_FAILED',
        message: 'Failed to cancel deletion request. Please contact support.'
      }
    });
  }
});

/**
 * @route POST /api/privacy/consent/record
 * @desc Record user consent for data processing
 * @access Private
 */
router.post('/consent/record', auth, privacyRateLimit, async (req, res) => {
  try {
    const { consentType, status, purpose, dataCategories, retentionPeriod } = req.body;
    
    // Validate consent data
    const validationSchema = {
      consentType: validationService.joi.string().valid(
        'data_processing', 'marketing', 'analytics', 'cookies', 'third_party_sharing', 'location_tracking'
      ).required(),
      status: validationService.joi.string().valid('granted', 'denied').required(),
      purpose: validationService.joi.string().max(200).optional(),
      dataCategories: validationService.joi.array().items(validationService.joi.string()).optional(),
      retentionPeriod: validationService.joi.string().optional()
    };
    
    const { error } = validationService.joi.object(validationSchema).validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const metadata = {
      purpose: purpose || 'General data processing',
      dataCategories: dataCategories || ['personal_data'],
      retentionPeriod: retentionPeriod || '2 years',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const consentRecord = await privacyConsentService.recordConsent(
      req.user.id,
      consentType,
      status,
      metadata
    );

    res.status(200).json({
      success: true,
      data: {
        consentType: consentRecord.type,
        status: consentRecord.status,
        recordedAt: consentRecord.updatedAt,
        message: 'Consent has been recorded successfully'
      }
    });

  } catch (error) {
    console.error('Consent recording error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CONSENT_RECORDING_FAILED',
        message: 'Failed to record consent. Please try again.'
      }
    });
  }
});

/**
 * @route GET /api/privacy/consent/history
 * @desc Get user's consent history
 * @access Private
 */
router.get('/consent/history', auth, async (req, res) => {
  try {
    const consents = await privacyConsentService.getUserConsents(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        consents: consents,
        totalConsents: consents.length,
        activeConsents: consents.filter(c => c.status === 'granted').length
      }
    });

  } catch (error) {
    console.error('Consent history error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CONSENT_HISTORY_FAILED',
        message: 'Failed to retrieve consent history'
      }
    });
  }
});

/**
 * @route POST /api/privacy/consent/withdraw
 * @desc Withdraw user consent
 * @access Private
 */
router.post('/consent/withdraw', auth, privacyRateLimit, async (req, res) => {
  try {
    const { consentType, reason } = req.body;
    
    // Validate withdrawal request
    const validationSchema = {
      consentType: validationService.joi.string().valid(
        'data_processing', 'marketing', 'analytics', 'cookies', 'third_party_sharing', 'location_tracking'
      ).required(),
      reason: validationService.joi.string().max(200).optional()
    };
    
    const { error } = validationService.joi.object(validationSchema).validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const metadata = {
      reason: reason || 'User requested withdrawal',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const withdrawnConsent = await privacyConsentService.withdrawConsent(
      req.user.id,
      consentType,
      metadata
    );

    res.status(200).json({
      success: true,
      data: {
        consentType: withdrawnConsent.type,
        status: withdrawnConsent.status,
        withdrawnAt: withdrawnConsent.withdrawnAt,
        reason: withdrawnConsent.withdrawalReason,
        message: 'Consent has been withdrawn successfully'
      }
    });

  } catch (error) {
    console.error('Consent withdrawal error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CONSENT_WITHDRAWAL_FAILED',
        message: 'Failed to withdraw consent. Please try again.'
      }
    });
  }
});

module.exports = router;