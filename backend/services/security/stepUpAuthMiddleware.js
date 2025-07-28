const { securityMonitorService } = require('./securityMonitorService');

/**
 * Step-up authentication middleware for sensitive operations
 * Requires additional authentication for critical operations
 */
class StepUpAuthMiddleware {
  constructor() {
    this.sensitiveOperations = new Set([
      'DELETE /api/user/:id',
      'PUT /api/user/:id/role',
      'DELETE /api/admin/users/:id',
      'POST /api/admin/users/:id/disable',
      'PUT /api/admin/system/settings',
      'DELETE /api/api-keys/:id',
      'POST /api/auth/invalidate-all-sessions'
    ]);
    
    this.stepUpRequirements = {
      password: 300, // 5 minutes
      mfa: 900, // 15 minutes
      admin: 1800 // 30 minutes
    };
  }

  /**
   * Middleware to require step-up authentication
   * @param {Object} options - Step-up options
   * @returns {Function} Express middleware
   */
  requireStepUp(options = {}) {
    const {
      level = 'password', // password, mfa, admin
      maxAge = this.stepUpRequirements[level] || 300,
      skipForApiKey = false
    } = options;

    return async (req, res, next) => {
      try {
        // Skip for API key authentication if configured
        if (skipForApiKey && req.apiKeyAuth) {
          return next();
        }

        // Check if user is authenticated
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required for this operation'
            }
          });
        }

        // Check step-up authentication
        const stepUpStatus = await this.checkStepUpAuth(req.user, level, maxAge);
        
        if (!stepUpStatus.valid) {
          await this.logStepUpRequired(req, level, stepUpStatus.reason);
          
          return res.status(403).json({
            success: false,
            error: {
              code: 'STEP_UP_REQUIRED',
              message: 'Additional authentication required for this operation',
              stepUpRequired: {
                level: level,
                reason: stepUpStatus.reason,
                maxAge: maxAge,
                lastAuth: stepUpStatus.lastAuth
              }
            }
          });
        }

        // Log successful step-up validation
        await this.logStepUpSuccess(req, level);
        
        next();
      } catch (error) {
        console.error('Step-up authentication error:', error);
        
        await securityMonitorService.logSecurityEvent({
          eventType: 'step_up_auth_error',
          severity: 'high',
          userId: req.user?.id,
          details: {
            error: error.message,
            operation: `${req.method} ${req.path}`,
            level: level
          }
        });

        return res.status(500).json({
          success: false,
          error: {
            code: 'STEP_UP_ERROR',
            message: 'Step-up authentication error'
          }
        });
      }
    };
  }

  /**
   * Check step-up authentication status
   * @param {Object} user - User object
   * @param {string} level - Required level
   * @param {number} maxAge - Maximum age in seconds
   * @returns {Object} Step-up status
   */
  async checkStepUpAuth(user, level, maxAge) {
    const now = Date.now();
    
    switch (level) {
      case 'password':
        // Check recent password authentication
        const lastPasswordAuth = user.lastPasswordAuth || user.lastLogin;
        if (!lastPasswordAuth || (now - lastPasswordAuth.getTime()) > (maxAge * 1000)) {
          return {
            valid: false,
            reason: 'password_auth_expired',
            lastAuth: lastPasswordAuth
          };
        }
        break;
        
      case 'mfa':
        // Check recent MFA authentication
        if (!user.mfaEnabled) {
          return {
            valid: false,
            reason: 'mfa_not_enabled',
            lastAuth: null
          };
        }
        
        const lastMFAAuth = user.lastMFAUsed;
        if (!lastMFAAuth || (now - lastMFAAuth.getTime()) > (maxAge * 1000)) {
          return {
            valid: false,
            reason: 'mfa_auth_expired',
            lastAuth: lastMFAAuth
          };
        }
        break;
        
      case 'admin':
        // Check admin privileges and recent authentication
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          return {
            valid: false,
            reason: 'insufficient_privileges',
            lastAuth: null
          };
        }
        
        const lastAdminAuth = user.lastAdminAuth || user.lastLogin;
        if (!lastAdminAuth || (now - lastAdminAuth.getTime()) > (maxAge * 1000)) {
          return {
            valid: false,
            reason: 'admin_auth_expired',
            lastAuth: lastAdminAuth
          };
        }
        break;
        
      default:
        return {
          valid: false,
          reason: 'invalid_level',
          lastAuth: null
        };
    }
    
    return { valid: true };
  }

  /**
   * Middleware to validate operation permissions
   * @param {Array} requiredPermissions - Required permissions
   * @returns {Function} Express middleware
   */
  requireOperationPermission(requiredPermissions) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required'
            }
          });
        }

        // Check user permissions
        const hasPermission = await this.checkOperationPermission(
          req.user, 
          requiredPermissions, 
          req
        );

        if (!hasPermission.allowed) {
          await this.logUnauthorizedOperation(req, requiredPermissions, hasPermission.reason);
          
          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions for this operation',
              required: requiredPermissions,
              reason: hasPermission.reason
            }
          });
        }

        next();
      } catch (error) {
        console.error('Operation permission error:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'PERMISSION_CHECK_ERROR',
            message: 'Error checking operation permissions'
          }
        });
      }
    };
  }

  /**
   * Check operation-specific permissions
   * @param {Object} user - User object
   * @param {Array} requiredPermissions - Required permissions
   * @param {Object} req - Request object
   * @returns {Object} Permission check result
   */
  async checkOperationPermission(user, requiredPermissions, req) {
    // Super admin has all permissions
    if (user.role === 'superadmin') {
      return { allowed: true };
    }

    // Check role-based permissions
    const userPermissions = this.getUserPermissions(user.role);
    
    for (const permission of requiredPermissions) {
      if (!userPermissions.includes(permission)) {
        return {
          allowed: false,
          reason: `missing_permission_${permission}`
        };
      }
    }

    // Check resource ownership for user-specific operations
    if (req.params.id && req.params.id !== user.id && user.role === 'user') {
      return {
        allowed: false,
        reason: 'resource_ownership_violation'
      };
    }

    return { allowed: true };
  }

  /**
   * Get user permissions based on role
   * @param {string} role - User role
   * @returns {Array} Array of permissions
   */
  getUserPermissions(role) {
    const rolePermissions = {
      user: ['read_own_profile', 'update_own_profile', 'delete_own_account'],
      admin: [
        'read_own_profile', 'update_own_profile', 'delete_own_account',
        'read_users', 'update_users', 'create_users',
        'manage_library', 'manage_books', 'manage_bookings'
      ],
      superadmin: ['*'] // All permissions
    };

    return rolePermissions[role] || [];
  }

  /**
   * Log step-up authentication requirement
   * @param {Object} req - Request object
   * @param {string} level - Required level
   * @param {string} reason - Reason for requirement
   */
  async logStepUpRequired(req, level, reason) {
    await securityMonitorService.logSecurityEvent({
      eventType: 'step_up_required',
      severity: 'medium',
      userId: req.user?.id,
      details: {
        operation: `${req.method} ${req.path}`,
        level: level,
        reason: reason,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  /**
   * Log successful step-up authentication
   * @param {Object} req - Request object
   * @param {string} level - Authentication level
   */
  async logStepUpSuccess(req, level) {
    await securityMonitorService.logSecurityEvent({
      eventType: 'step_up_success',
      severity: 'low',
      userId: req.user?.id,
      details: {
        operation: `${req.method} ${req.path}`,
        level: level,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  /**
   * Log unauthorized operation attempt
   * @param {Object} req - Request object
   * @param {Array} requiredPermissions - Required permissions
   * @param {string} reason - Reason for denial
   */
  async logUnauthorizedOperation(req, requiredPermissions, reason) {
    await securityMonitorService.logSecurityEvent({
      eventType: 'unauthorized_operation',
      severity: 'high',
      userId: req.user?.id,
      details: {
        operation: `${req.method} ${req.path}`,
        requiredPermissions: requiredPermissions,
        reason: reason,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }

  /**
   * Check if operation is sensitive
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @returns {boolean} Whether operation is sensitive
   */
  isSensitiveOperation(method, path) {
    const operation = `${method} ${path}`;
    return this.sensitiveOperations.has(operation);
  }
}

module.exports = new StepUpAuthMiddleware();