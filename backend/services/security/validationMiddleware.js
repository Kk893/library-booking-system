const ValidationService = require('./validationService');
const FileUploadSecurityService = require('./fileUploadSecurityService');

/**
 * Validation middleware for Express.js routes
 * Integrates comprehensive input validation and sanitization
 */
class ValidationMiddleware {
  constructor() {
    this.validationService = new ValidationService();
    this.fileUploadSecurity = new FileUploadSecurityService();
    this.initializeMiddleware();
  }

  /**
   * Initialize middleware functions
   */
  initializeMiddleware() {
    // Bind middleware functions to preserve context
    this.validateUserRegistration = this.validateUserRegistration.bind(this);
    this.validateUserLogin = this.validateUserLogin.bind(this);
    this.validateProfileUpdate = this.validateProfileUpdate.bind(this);
    this.validatePasswordChange = this.validatePasswordChange.bind(this);
    this.validatePasswordReset = this.validatePasswordReset.bind(this);
    this.validateBookSearch = this.validateBookSearch.bind(this);
    this.validateBooking = this.validateBooking.bind(this);
    this.validateReview = this.validateReview.bind(this);
    this.validateFileUpload = this.validateFileUpload.bind(this);
    this.sanitizeInput = this.sanitizeInput.bind(this);
    this.detectInjectionAttacks = this.detectInjectionAttacks.bind(this);
    this.validateApiRequest = this.validateApiRequest.bind(this);
  }

  /**
   * Generic validation middleware factory
   * @param {Function} validationFunction - Validation function to use
   * @param {Object} options - Validation options
   * @returns {Function} Express middleware function
   */
  createValidationMiddleware(validationFunction, options = {}) {
    return async (req, res, next) => {
      try {
        const result = await validationFunction.call(this.validationService, req.body, options);
        
        if (!result.isValid) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Input validation failed',
              details: result.errors,
              timestamp: new Date().toISOString(),
              requestId: req.id || req.headers['x-request-id']
            }
          });
        }

        // Replace request body with validated and sanitized data
        req.body = result.value;
        req.validationResult = result;
        
        next();
      } catch (error) {
        console.error('Validation middleware error:', {
          error: error.message,
          path: req?.path || 'unknown',
          method: req?.method || 'unknown',
          timestamp: new Date().toISOString()
        });

        return res.status(500).json({
          success: false,
          error: {
            code: 'VALIDATION_SYSTEM_ERROR',
            message: 'Validation system error',
            timestamp: new Date().toISOString(),
            requestId: req.id || req.headers['x-request-id']
          }
        });
      }
    };
  }

  /**
   * User registration validation middleware
   */
  validateUserRegistration(req, res, next) {
    return this.createValidationMiddleware(
      this.validationService.validateUserRegistration,
      { stripUnknown: true }
    )(req, res, next);
  }

  /**
   * User login validation middleware
   */
  validateUserLogin(req, res, next) {
    return this.createValidationMiddleware(
      this.validationService.validateUserLogin,
      { stripUnknown: true }
    )(req, res, next);
  }

  /**
   * Profile update validation middleware
   */
  validateProfileUpdate(req, res, next) {
    return this.createValidationMiddleware(
      this.validationService.validateProfileUpdate,
      { stripUnknown: true }
    )(req, res, next);
  }

  /**
   * Password change validation middleware
   */
  validatePasswordChange(req, res, next) {
    return this.createValidationMiddleware(
      this.validationService.validatePasswordChange,
      { stripUnknown: true }
    )(req, res, next);
  }

  /**
   * Password reset validation middleware
   */
  validatePasswordReset(req, res, next) {
    return this.createValidationMiddleware(
      this.validationService.validatePasswordReset,
      { stripUnknown: true }
    )(req, res, next);
  }

  /**
   * Book search validation middleware
   */
  validateBookSearch(req, res, next) {
    return this.createValidationMiddleware(
      this.validationService.validateBookSearch,
      { stripUnknown: true }
    )(req, res, next);
  }

  /**
   * Booking validation middleware
   */
  validateBooking(req, res, next) {
    return this.createValidationMiddleware(
      this.validationService.validateBooking,
      { stripUnknown: true }
    )(req, res, next);
  }

  /**
   * Review validation middleware
   */
  validateReview(req, res, next) {
    return this.createValidationMiddleware(
      this.validationService.validateReview,
      { stripUnknown: true }
    )(req, res, next);
  }

  /**
   * File upload validation middleware
   */
  validateFileUpload(options = {}) {
    return async (req, res, next) => {
      try {
        if (!req.file && !req.files) {
          if (options.required !== false) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'FILE_REQUIRED',
                message: 'File upload is required',
                timestamp: new Date().toISOString(),
                requestId: req.id || req.headers['x-request-id']
              }
            });
          }
          return next();
        }

        const files = req.files || [req.file];
        const validationResults = [];

        for (const file of files) {
          if (file) {
            const result = await this.fileUploadSecurity.validateFile(file, options);
            validationResults.push({ file, result });

            if (!result.isValid) {
              return res.status(400).json({
                success: false,
                error: {
                  code: 'FILE_VALIDATION_ERROR',
                  message: 'File validation failed',
                  details: result.errors,
                  warnings: result.warnings,
                  filename: file.originalname,
                  timestamp: new Date().toISOString(),
                  requestId: req.id || req.headers['x-request-id']
                }
              });
            }

            if (result.securityScore < (options.minSecurityScore || 70)) {
              return res.status(400).json({
                success: false,
                error: {
                  code: 'FILE_SECURITY_RISK',
                  message: 'File security score below acceptable threshold',
                  securityScore: result.securityScore,
                  minRequired: options.minSecurityScore || 70,
                  warnings: result.warnings,
                  filename: file.originalname,
                  timestamp: new Date().toISOString(),
                  requestId: req.id || req.headers['x-request-id']
                }
              });
            }
          }
        }

        req.fileValidationResults = validationResults;
        next();
      } catch (error) {
        console.error('File validation middleware error:', {
          error: error.message,
          path: req?.path || 'unknown',
          method: req?.method || 'unknown',
          timestamp: new Date().toISOString()
        });

        return res.status(500).json({
          success: false,
          error: {
            code: 'FILE_VALIDATION_SYSTEM_ERROR',
            message: 'File validation system error',
            timestamp: new Date().toISOString(),
            requestId: req.id || req.headers['x-request-id']
          }
        });
      }
    };
  }

  /**
   * Input sanitization middleware
   */
  sanitizeInput(options = {}) {
    return (req, res, next) => {
      try {
        const sanitizeObject = (obj, depth = 0) => {
          if (depth > 10) return obj; // Prevent deep recursion
          
          if (typeof obj === 'string') {
            const type = options.type || 'text';
            return this.validationService.processUserInput(obj, type, options);
          }
          
          if (Array.isArray(obj)) {
            return obj.map(item => sanitizeObject(item, depth + 1));
          }
          
          if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
              sanitized[key] = sanitizeObject(value, depth + 1);
            }
            return sanitized;
          }
          
          return obj;
        };

        if (req.body) {
          req.body = sanitizeObject(req.body);
        }

        if (req.query) {
          req.query = sanitizeObject(req.query);
        }

        if (req.params) {
          req.params = sanitizeObject(req.params);
        }

        next();
      } catch (error) {
        console.error('Input sanitization middleware error:', {
          error: error.message,
          path: req?.path || 'unknown',
          method: req?.method || 'unknown',
          timestamp: new Date().toISOString()
        });

        return res.status(500).json({
          success: false,
          error: {
            code: 'SANITIZATION_ERROR',
            message: 'Input sanitization error',
            timestamp: new Date().toISOString(),
            requestId: req.id || req.headers['x-request-id']
          }
        });
      }
    };
  }

  /**
   * Injection attack detection middleware
   */
  detectInjectionAttacks(options = {}) {
    return (req, res, next) => {
      try {
        const checkForInjections = (obj, path = '') => {
          if (typeof obj === 'string') {
            const result = this.validationService.detectInjectionAttacks(obj, options);
            if (!result.isClean) {
              return {
                detected: true,
                path,
                threats: result.threats,
                riskScore: result.riskScore
              };
            }
          }
          
          if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
              const result = checkForInjections(obj[i], `${path}[${i}]`);
              if (result.detected) return result;
            }
          }
          
          if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
              const result = checkForInjections(value, path ? `${path}.${key}` : key);
              if (result.detected) return result;
            }
          }
          
          return { detected: false };
        };

        // Check request body
        if (req.body) {
          const bodyResult = checkForInjections(req.body, 'body');
          if (bodyResult.detected) {
            console.warn('Injection attack detected in request body:', {
              path: req.path,
              method: req.method,
              field: bodyResult.path,
              threats: bodyResult.threats,
              riskScore: bodyResult.riskScore,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              timestamp: new Date().toISOString()
            });

            return res.status(400).json({
              success: false,
              error: {
                code: 'INJECTION_ATTACK_DETECTED',
                message: 'Potentially malicious input detected',
                timestamp: new Date().toISOString(),
                requestId: req.id || req.headers['x-request-id']
              }
            });
          }
        }

        // Check query parameters
        if (req.query) {
          const queryResult = checkForInjections(req.query, 'query');
          if (queryResult.detected) {
            console.warn('Injection attack detected in query parameters:', {
              path: req.path,
              method: req.method,
              field: queryResult.path,
              threats: queryResult.threats,
              riskScore: queryResult.riskScore,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              timestamp: new Date().toISOString()
            });

            return res.status(400).json({
              success: false,
              error: {
                code: 'INJECTION_ATTACK_DETECTED',
                message: 'Potentially malicious input detected',
                timestamp: new Date().toISOString(),
                requestId: req.id || req.headers['x-request-id']
              }
            });
          }
        }

        next();
      } catch (error) {
        console.error('Injection detection middleware error:', {
          error: error.message,
          path: req?.path || 'unknown',
          method: req?.method || 'unknown',
          timestamp: new Date().toISOString()
        });

        return res.status(500).json({
          success: false,
          error: {
            code: 'INJECTION_DETECTION_ERROR',
            message: 'Injection detection system error',
            timestamp: new Date().toISOString(),
            requestId: req.id || req.headers['x-request-id']
          }
        });
      }
    };
  }

  /**
   * API request structure validation middleware
   */
  validateApiRequest(req, res, next) {
    try {
      const requestData = {
        method: req.method,
        path: req.path,
        headers: req.headers,
        query: req.query,
        body: req.body
      };

      const result = this.validationService.validateApiRequest(requestData);
      
      if (!result.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_API_REQUEST',
            message: 'API request structure validation failed',
            details: result.errors,
            timestamp: new Date().toISOString(),
            requestId: req.id || req.headers['x-request-id']
          }
        });
      }

      req.apiValidationResult = result;
      next();
    } catch (error) {
      console.error('API request validation middleware error:', {
        error: error.message,
        path: req?.path || 'unknown',
        method: req?.method || 'unknown',
        timestamp: new Date().toISOString()
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'API_VALIDATION_ERROR',
          message: 'API validation system error',
          timestamp: new Date().toISOString(),
          requestId: req.id || req.headers['x-request-id']
        }
      });
    }
  }

  /**
   * Bypass validation for internal system calls
   */
  bypassValidation(req, res, next) {
    // Check for internal system call markers
    const isInternalCall = req.headers['x-internal-call'] === 'true' ||
                          req.headers['x-system-bypass'] === 'true' ||
                          req.ip === '127.0.0.1' && req.headers['x-bypass-validation'];

    if (isInternalCall) {
      console.log('Validation bypassed for internal system call:', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      req.validationBypassed = true;
      return next();
    }

    next();
  }

  /**
   * Comprehensive validation middleware that combines multiple checks
   */
  comprehensiveValidation(options = {}) {
    return [
      this.bypassValidation,
      this.sanitizeInput(options.sanitization),
      this.detectInjectionAttacks(options.injectionDetection),
      this.validateApiRequest
    ];
  }

  /**
   * Error handling middleware for validation errors
   */
  handleValidationErrors(err, req, res, next) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: err.details || [],
          timestamp: new Date().toISOString(),
          requestId: req.id || req.headers['x-request-id']
        }
      });
    }

    if (err.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_UPLOAD_ERROR',
          message: err.message,
          field: err.field,
          timestamp: new Date().toISOString(),
          requestId: req.id || req.headers['x-request-id']
        }
      });
    }

    next(err);
  }

  /**
   * Get validation middleware for specific route type
   */
  getValidationMiddleware(type, options = {}) {
    const middlewareMap = {
      'user-registration': () => this.validateUserRegistration,
      'user-login': () => this.validateUserLogin,
      'profile-update': () => this.validateProfileUpdate,
      'password-change': () => this.validatePasswordChange,
      'password-reset': () => this.validatePasswordReset,
      'book-search': () => this.validateBookSearch,
      'booking': () => this.validateBooking,
      'review': () => this.validateReview,
      'file-upload': () => this.validateFileUpload(options),
      'comprehensive': () => this.comprehensiveValidation(options)
    };

    const middlewareFactory = middlewareMap[type];
    if (!middlewareFactory) {
      throw new Error(`Unknown validation middleware type: ${type}`);
    }

    return middlewareFactory();
  }
}

module.exports = ValidationMiddleware;