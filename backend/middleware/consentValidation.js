const privacyConsentService = require('../services/security/privacyConsentService');

/**
 * Middleware to validate user consent for data processing operations
 * @param {Array} requiredConsents - Array of required consent types
 * @param {string} operation - Description of the operation being performed
 * @returns {Function} Express middleware function
 */
const validateConsent = (requiredConsents = [], operation = 'data processing') => {
  return async (req, res, next) => {
    try {
      // Skip validation if no consents are required
      if (!requiredConsents || requiredConsents.length === 0) {
        return next();
      }

      // Skip validation if user is not authenticated
      if (!req.user || !req.user.id) {
        return next();
      }

      // Validate consent
      const validationResult = await privacyConsentService.validateDataProcessingConsent(
        req.user.id,
        operation,
        requiredConsents
      );

      if (!validationResult.isValid) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'CONSENT_REQUIRED',
            message: 'Required consent not granted for this operation',
            details: {
              operation: operation,
              missingConsents: validationResult.missingConsents,
              requiredConsents: requiredConsents
            }
          }
        });
      }

      // Add validation result to request for potential use in route handlers
      req.consentValidation = validationResult;

      // Log warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        console.warn('Consent validation warnings:', validationResult.warnings);
      }

      next();
    } catch (error) {
      console.error('Error in consent validation middleware:', error);
      
      // In case of error, allow the request to proceed but log the issue
      // This prevents consent validation from breaking the application
      console.error(`Consent validation failed for operation: ${operation}, user: ${req.user?.id}`);
      next();
    }
  };
};

/**
 * Middleware to check if user has granted marketing consent
 */
const requireMarketingConsent = validateConsent(['marketing'], 'marketing communications');

/**
 * Middleware to check if user has granted analytics consent
 */
const requireAnalyticsConsent = validateConsent(['analytics'], 'analytics data processing');

/**
 * Middleware to check if user has granted data processing consent
 */
const requireDataProcessingConsent = validateConsent(['data_processing'], 'general data processing');

/**
 * Middleware to check if user has granted third-party sharing consent
 */
const requireThirdPartyConsent = validateConsent(['third_party_sharing'], 'third-party data sharing');

/**
 * Middleware to check if user has granted location tracking consent
 */
const requireLocationConsent = validateConsent(['location_tracking'], 'location data processing');

/**
 * Middleware to check if user has granted cookie consent
 */
const requireCookieConsent = validateConsent(['cookies'], 'cookie data processing');

/**
 * Middleware to validate consent and add consent status to response headers
 */
const addConsentHeaders = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }

    // Get user consents
    const consents = await privacyConsentService.getUserConsents(req.user.id);
    
    // Create consent status header
    const consentStatus = {};
    const consentTypes = ['data_processing', 'marketing', 'analytics', 'cookies', 'third_party_sharing', 'location_tracking'];
    
    for (const type of consentTypes) {
      const consent = consents.find(c => c.type === type && c.status === 'granted');
      consentStatus[type] = !!consent;
    }

    // Add consent status to response headers (for client-side consent management)
    res.set('X-Consent-Status', JSON.stringify(consentStatus));
    
    next();
  } catch (error) {
    console.error('Error in consent headers middleware:', error);
    next();
  }
};

/**
 * Middleware to log data processing activities for audit purposes
 */
const logDataProcessing = (operation, dataTypes = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next();
      }

      // Log the data processing activity
      const processingLog = {
        userId: req.user.id,
        operation: operation,
        dataTypes: dataTypes,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method
      };

      // You could store this in a separate audit log collection
      console.log('Data processing activity:', processingLog);

      // Add processing log to request for potential use in route handlers
      req.dataProcessingLog = processingLog;

      next();
    } catch (error) {
      console.error('Error in data processing logging middleware:', error);
      next();
    }
  };
};

module.exports = {
  validateConsent,
  requireMarketingConsent,
  requireAnalyticsConsent,
  requireDataProcessingConsent,
  requireThirdPartyConsent,
  requireLocationConsent,
  requireCookieConsent,
  addConsentHeaders,
  logDataProcessing
};