const apiKeyService = require('./apiKeyService');
const { securityMonitorService } = require('./securityMonitorService');

/**
 * Middleware to authenticate API keys
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware function
 */
function apiKeyAuth(options = {}) {
  const {
    required = true,
    permissions = [],
    scopes = [],
    allowUserAuth = true, // Allow JWT auth as alternative
    skipRateLimit = false
  } = options;

  return async (req, res, next) => {
    try {
      // Extract API key from various sources
      const apiKey = extractApiKey(req);
      
      if (!apiKey) {
        if (!required) {
          return next();
        }
        
        // If user auth is allowed and JWT token exists, skip API key requirement
        if (allowUserAuth && req.headers.authorization?.startsWith('Bearer ')) {
          return next();
        }
        
        return res.status(401).json({
          success: false,
          error: {
            code: 'API_KEY_REQUIRED',
            message: 'API key is required for this endpoint'
          }
        });
      }

      // Prepare request context for validation
      const requestContext = {
        ip: getClientIP(req),
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        endpoint: `${req.method} ${req.path}`
      };

      // Validate API key
      const validationResult = await apiKeyService.validateApiKey(apiKey, requestContext);
      
      if (!validationResult) {
        await logFailedAuthentication(req, 'invalid_api_key');
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or expired API key'
          }
        });
      }

      // Check for rate limit errors
      if (validationResult.error) {
        const statusCode = validationResult.error === 'rate_limit_exceeded' ? 429 : 401;
        return res.status(statusCode).json({
          success: false,
          error: {
            code: validationResult.error.toUpperCase(),
            message: getRateLimitMessage(validationResult.reason),
            retryAfter: getRateLimitRetryAfter(validationResult.reason)
          }
        });
      }

      const { apiKey: validatedApiKey } = validationResult;

      // Check required permissions
      if (permissions.length > 0) {
        const hasRequiredPermissions = permissions.every(permission => 
          apiKeyService.hasPermission(validatedApiKey, permission)
        );

        if (!hasRequiredPermissions) {
          await logUnauthorizedAccess(req, validatedApiKey, permissions);
          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'API key does not have required permissions',
              required: permissions,
              granted: validatedApiKey.permissions
            }
          });
        }
      }

      // Check required scopes
      if (scopes.length > 0) {
        const hasRequiredScopes = scopes.every(scope => 
          validatedApiKey.scopes.includes(scope)
        );

        if (!hasRequiredScopes) {
          await logUnauthorizedAccess(req, validatedApiKey, [], scopes);
          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_SCOPES',
              message: 'API key does not have required scopes',
              required: scopes,
              granted: validatedApiKey.scopes
            }
          });
        }
      }

      // Attach API key info to request
      req.apiKey = validatedApiKey;
      req.apiKeyAuth = true;
      
      // Set user context from API key
      req.user = validatedApiKey.user;

      // Add rate limit headers
      if (!skipRateLimit) {
        addRateLimitHeaders(res, validatedApiKey);
      }

      next();
    } catch (error) {
      console.error('API key authentication error:', error);
      
      await securityMonitorService.logSecurityEvent({
        eventType: 'api_key_auth_error',
        severity: 'high',
        details: {
          error: error.message,
          endpoint: `${req.method} ${req.path}`,
          ip: getClientIP(req),
          userAgent: req.get('User-Agent')
        }
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Internal authentication error'
        }
      });
    }
  };
}

/**
 * Middleware to require specific permissions
 * @param {Array} permissions - Required permissions
 * @returns {Function} Express middleware function
 */
function requirePermissions(permissions) {
  return (req, res, next) => {
    if (!req.apiKey && !req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    // Check API key permissions
    if (req.apiKey) {
      const hasPermissions = permissions.every(permission => 
        apiKeyService.hasPermission(req.apiKey, permission)
      );

      if (!hasPermissions) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions',
            required: permissions,
            granted: req.apiKey.permissions
          }
        });
      }
    }

    // For JWT auth, check user role permissions (simplified)
    if (req.user && !req.apiKey) {
      const userPermissions = getUserPermissions(req.user.role);
      const hasPermissions = permissions.every(permission => 
        userPermissions.includes(permission) || userPermissions.includes('admin:all')
      );

      if (!hasPermissions) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions',
            required: permissions
          }
        });
      }
    }

    next();
  };
}

/**
 * Middleware to require specific scopes
 * @param {Array} scopes - Required scopes
 * @returns {Function} Express middleware function
 */
function requireScopes(scopes) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_REQUIRED',
          message: 'API key required for scope validation'
        }
      });
    }

    const hasScopes = scopes.every(scope => 
      req.apiKey.scopes.includes(scope)
    );

    if (!hasScopes) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: 'Insufficient scopes',
          required: scopes,
          granted: req.apiKey.scopes
        }
      });
    }

    next();
  };
}

/**
 * Extract API key from request
 * @param {Object} req - Express request object
 * @returns {string|null} API key or null
 */
function extractApiKey(req) {
  // Check Authorization header (Bearer token)
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Check if it's an API key (starts with prefix)
    if (token.startsWith('lba_')) {
      return token;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = req.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter (less secure, for development only)
  if (process.env.NODE_ENV === 'development' && req.query.api_key) {
    return req.query.api_key;
  }

  return null;
}

/**
 * Get client IP address
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
  return req.ip || 
         (req.connection && req.connection.remoteAddress) || 
         (req.socket && req.socket.remoteAddress) ||
         (req.connection && req.connection.socket && req.connection.socket.remoteAddress) ||
         '127.0.0.1';
}

/**
 * Add rate limit headers to response
 * @param {Object} res - Express response object
 * @param {Object} apiKey - API key object
 */
function addRateLimitHeaders(res, apiKey) {
  const rateLimitStatus = apiKey.usage;
  
  res.set({
    'X-RateLimit-Limit-Hour': apiKey.rateLimit.requestsPerHour.toString(),
    'X-RateLimit-Limit-Day': apiKey.rateLimit.requestsPerDay.toString(),
    'X-RateLimit-Remaining-Hour': Math.max(0, apiKey.rateLimit.requestsPerHour - rateLimitStatus.requestsThisHour).toString(),
    'X-RateLimit-Remaining-Day': Math.max(0, apiKey.rateLimit.requestsPerDay - rateLimitStatus.requestsToday).toString(),
    'X-RateLimit-Reset-Hour': new Date(rateLimitStatus.lastResetHour.getTime() + 60 * 60 * 1000).toISOString(),
    'X-RateLimit-Reset-Day': new Date(rateLimitStatus.lastResetDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
  });
}

/**
 * Get rate limit message based on reason
 * @param {string} reason - Rate limit reason
 * @returns {string} Human-readable message
 */
function getRateLimitMessage(reason) {
  switch (reason) {
    case 'hourly_limit_exceeded':
      return 'Hourly rate limit exceeded';
    case 'daily_limit_exceeded':
      return 'Daily rate limit exceeded';
    default:
      return 'Rate limit exceeded';
  }
}

/**
 * Get retry after seconds based on reason
 * @param {string} reason - Rate limit reason
 * @returns {number} Seconds to wait before retry
 */
function getRateLimitRetryAfter(reason) {
  switch (reason) {
    case 'hourly_limit_exceeded':
      return 3600; // 1 hour
    case 'daily_limit_exceeded':
      return 86400; // 24 hours
    default:
      return 3600;
  }
}

/**
 * Get user permissions based on role
 * @param {string} role - User role
 * @returns {Array} Array of permissions
 */
function getUserPermissions(role) {
  const rolePermissions = {
    user: ['read:books', 'read:bookings', 'read:libraries'],
    admin: ['read:books', 'write:books', 'read:bookings', 'write:bookings', 'read:users', 'read:libraries', 'write:libraries'],
    superadmin: ['admin:all']
  };

  return rolePermissions[role] || [];
}

/**
 * Log failed authentication attempt
 * @param {Object} req - Express request object
 * @param {string} reason - Failure reason
 */
async function logFailedAuthentication(req, reason) {
  await securityMonitorService.logSecurityEvent({
    eventType: 'api_key_auth_failed',
    severity: 'medium',
    details: {
      reason,
      endpoint: `${req.method} ${req.path}`,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    }
  });
}

/**
 * Log unauthorized access attempt
 * @param {Object} req - Express request object
 * @param {Object} apiKey - API key object
 * @param {Array} requiredPermissions - Required permissions
 * @param {Array} requiredScopes - Required scopes
 */
async function logUnauthorizedAccess(req, apiKey, requiredPermissions = [], requiredScopes = []) {
  await securityMonitorService.logSecurityEvent({
    eventType: 'api_key_unauthorized_access',
    severity: 'high',
    userId: apiKey.userId,
    details: {
      apiKeyId: apiKey.id,
      endpoint: `${req.method} ${req.path}`,
      requiredPermissions,
      requiredScopes,
      grantedPermissions: apiKey.permissions,
      grantedScopes: apiKey.scopes,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    }
  });
}

module.exports = {
  apiKeyAuth,
  requirePermissions,
  requireScopes,
  extractApiKey,
  getClientIP
};