const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireRole, logPrivilegeAction } = require('./rbac');

// Enhanced security services
const sessionService = require('../services/security/sessionService');
const securityMonitorService = require('../services/security/securityMonitorService');
const anomalyDetectionService = require('../services/security/anomalyDetectionService');
const rateLimitService = require('../services/security/rateLimitService');
const deviceFingerprintService = require('../services/security/deviceFingerprintService');

/**
 * Enhanced authentication middleware with comprehensive security features
 */
const enhancedAuth = async (req, res, next) => {
  try {
    // Get device fingerprint for security monitoring
    const deviceProfile = deviceFingerprintService.createDeviceProfile(req);
    req.deviceFingerprint = deviceProfile.deviceFingerprint;

    // Check rate limits first
    const rateLimitKey = `auth:${req.ip}:${deviceFingerprint}`;
    const rateLimitResult = await rateLimitService.checkRateLimit(rateLimitKey, 15 * 60 * 1000, 100);
    
    if (!rateLimitResult.allowed) {
      await securityMonitorService.logSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        userId: null,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          endpoint: req.path,
          rateLimitKey,
          remainingTime: rateLimitResult.resetTime
        }
      });
      
      return res.status(429).json({ 
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(rateLimitResult.resetTime / 1000)
      });
    }

    // Extract token from various sources
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies.accessToken;
    
    if (!token) {
      await securityMonitorService.logSecurityEvent({
        type: 'auth_attempt_no_token',
        severity: 'low',
        userId: null,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: { endpoint: req.path }
      });
      
      return res.status(401).json({ 
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    try {
      // Use enhanced session service for token validation
      const decoded = await sessionService.validateAccessToken(token, req);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        await securityMonitorService.logSecurityEvent({
          type: 'auth_invalid_user',
          severity: 'high',
          userId: decoded.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          details: { token: token.substring(0, 20) + '...' }
        });
        
        return res.status(401).json({ 
          message: 'Invalid token. User not found.',
          code: 'USER_NOT_FOUND'
        });
      }

      if (!user.isActive) {
        await securityMonitorService.logSecurityEvent({
          type: 'auth_inactive_account',
          severity: 'medium',
          userId: user._id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          details: { accountStatus: 'inactive' }
        });
        
        return res.status(403).json({ 
          message: 'Account is deactivated.',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      // Perform anomaly detection
      const anomalyResult = await anomalyDetectionService.analyzeRequest({
        userId: user._id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        timestamp: new Date(),
        deviceFingerprint
      });

      if (anomalyResult.isAnomalous) {
        await securityMonitorService.logSecurityEvent({
          type: 'anomaly_detected',
          severity: anomalyResult.severity,
          userId: user._id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            anomalyType: anomalyResult.type,
            score: anomalyResult.score,
            reasons: anomalyResult.reasons
          }
        });

        // For high-severity anomalies, require additional verification
        if (anomalyResult.severity === 'high') {
          return res.status(403).json({
            message: 'Additional verification required due to suspicious activity.',
            code: 'ANOMALY_DETECTED',
            requiresVerification: true
          });
        }
      }

      // Add enhanced session info to request
      req.user = user;
      req.sessionId = decoded.sessionId;
      req.deviceFingerprint = deviceFingerprint;
      req.tokenVersion = decoded.tokenVersion;
      req.anomalyScore = anomalyResult.score;
      
      // Log successful authentication
      await securityMonitorService.logSecurityEvent({
        type: 'auth_success',
        severity: 'low',
        userId: user._id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          endpoint: req.path,
          sessionId: decoded.sessionId,
          anomalyScore: anomalyResult.score
        }
      });
      
      next();
    } catch (sessionError) {
      // Log authentication failure
      await securityMonitorService.logSecurityEvent({
        type: 'auth_token_error',
        severity: 'medium',
        userId: null,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          error: sessionError.message,
          token: token.substring(0, 20) + '...'
        }
      });

      // Handle session service specific errors
      if (sessionError.message === 'TOKEN_EXPIRED') {
        return res.status(401).json({ 
          message: 'Token expired. Please refresh your token or login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (sessionError.message === 'TOKEN_INVALID') {
        return res.status(401).json({ 
          message: 'Invalid token. Please login again.',
          code: 'TOKEN_INVALID'
        });
      } else if (sessionError.message === 'TOKEN_BLACKLISTED') {
        return res.status(401).json({
          message: 'Token has been invalidated. Please login again.',
          code: 'TOKEN_BLACKLISTED'
        });
      } else {
        throw sessionError;
      }
    }
  } catch (error) {
    console.error('Enhanced authentication error:', error);
    
    await securityMonitorService.logSecurityEvent({
      type: 'auth_system_error',
      severity: 'high',
      userId: null,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        error: error.message,
        stack: error.stack
      }
    });
    
    res.status(500).json({ 
      message: 'Authentication system error. Please try again.',
      code: 'AUTH_SYSTEM_ERROR'
    });
  }
};

/**
 * Enhanced role-based authentication with privilege escalation monitoring
 */
const enhancedRoleAuth = (roles, options = {}) => {
  return [
    enhancedAuth,
    async (req, res, next) => {
      try {
        const user = req.user;
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        
        // Check if user has required role
        if (!requiredRoles.includes(user.role)) {
          await securityMonitorService.logSecurityEvent({
            type: 'privilege_escalation_attempt',
            severity: 'high',
            userId: user._id,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
              userRole: user.role,
              requiredRoles,
              endpoint: req.path,
              method: req.method
            }
          });
          
          return res.status(403).json({ 
            message: 'Access denied - insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          });
        }

        // Log privilege access
        await securityMonitorService.logSecurityEvent({
          type: 'privilege_access',
          severity: 'low',
          userId: user._id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            role: user.role,
            endpoint: req.path,
            method: req.method,
            privilegeLevel: requiredRoles
          }
        });

        // Add role information to request
        req.userRole = user.role;
        req.privilegeLevel = requiredRoles;
        
        next();
      } catch (error) {
        console.error('Enhanced role auth error:', error);
        res.status(500).json({ 
          message: 'Authorization system error',
          code: 'AUTH_SYSTEM_ERROR'
        });
      }
    }
  ];
};

// Convenience middleware for different roles
const adminAuth = enhancedRoleAuth(['admin', 'superadmin']);
const superAdminAuth = enhancedRoleAuth(['superadmin']);
const userAuth = enhancedRoleAuth(['user', 'admin', 'superadmin']);

/**
 * Enhanced logout with comprehensive session cleanup
 */
const enhancedLogout = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies.accessToken;
    
    if (token) {
      // Invalidate session using session service
      await sessionService.invalidateSession(token);
      
      // Log logout event
      await securityMonitorService.logSecurityEvent({
        type: 'user_logout',
        severity: 'low',
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          sessionId: req.sessionId,
          logoutMethod: 'explicit'
        }
      });
    }
    
    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    next();
  } catch (error) {
    console.error('Enhanced logout error:', error);
    next(); // Continue with logout even if logging fails
  }
};

module.exports = {
  enhancedAuth,
  enhancedRoleAuth,
  adminAuth,
  superAdminAuth,
  userAuth,
  enhancedLogout
};