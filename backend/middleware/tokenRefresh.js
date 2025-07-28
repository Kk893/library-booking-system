/**
 * Token Refresh Middleware
 * Automatically refreshes expired access tokens using refresh tokens
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sessionService = require('../services/security/sessionService');

/**
 * Middleware to automatically refresh expired access tokens
 * This middleware should be used before the auth middleware
 */
const autoRefreshToken = async (req, res, next) => {
  try {
    // Get access token from Authorization header or cookie
    let accessToken = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies.accessToken;

    // If no access token, continue to next middleware (auth will handle)
    if (!accessToken) {
      return next();
    }

    try {
      // Try to verify the access token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      
      // If token is valid, continue
      return next();
    } catch (tokenError) {
      // Only handle expired tokens, let other errors pass through
      if (tokenError.name !== 'TokenExpiredError') {
        return next();
      }

      // Token is expired, try to refresh it
      console.log('Access token expired, attempting refresh...');

      // Get refresh token from cookie, body, or header
      let refreshToken = req.cookies.refreshToken || 
                        req.body.refreshToken || 
                        req.header('X-Refresh-Token');

      if (!refreshToken) {
        // No refresh token available, let auth middleware handle
        return next();
      }

      try {
        // Validate refresh token
        const refreshDecoded = await sessionService.validateRefreshToken(refreshToken, req);
        
        // Get user from database
        const user = await User.findById(refreshDecoded.id).select('-password');
        if (!user || !user.isActive) {
          // Invalid user, let auth middleware handle
          return next();
        }

        // Generate new access token
        const tokenData = await sessionService.refreshAccessToken(refreshToken, user, req);

        // Set new access token in cookie
        res.cookie('accessToken', tokenData.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: tokenData.expiresIn * 1000
        });

        // Update the Authorization header for downstream middleware
        req.headers.authorization = `Bearer ${tokenData.accessToken}`;

        // Add refresh info to request for logging
        req.tokenRefreshed = {
          sessionId: refreshDecoded.sessionId,
          userId: user._id.toString(),
          timestamp: new Date().toISOString()
        };

        console.log('Access token refreshed successfully for user:', user._id);
        return next();
      } catch (refreshError) {
        // Refresh failed, let auth middleware handle the original expired token
        console.log('Token refresh failed:', refreshError.message);
        return next();
      }
    }
  } catch (error) {
    // Unexpected error, log and continue
    console.error('Auto refresh middleware error:', error);
    return next();
  }
};

/**
 * Enhanced auth middleware that works with token refresh
 * This replaces the original auth middleware when using token refresh
 */
const authWithRefresh = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    try {
      // Validate token using session service
      const decoded = await sessionService.validateAccessToken(token, req);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid token. User not found.',
          code: 'USER_NOT_FOUND'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ 
          message: 'Account is deactivated.',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Add user and session info to request
      req.user = user;
      req.sessionId = decoded.sessionId;
      req.deviceFingerprint = decoded.deviceFingerprint;

      // Log token refresh if it occurred
      if (req.tokenRefreshed) {
        console.log('Request processed with refreshed token:', {
          userId: req.tokenRefreshed.userId,
          sessionId: req.tokenRefreshed.sessionId,
          endpoint: req.path
        });
      }

      next();
    } catch (tokenError) {
      // Handle specific token validation errors
      if (tokenError.message === 'TOKEN_EXPIRED') {
        return res.status(401).json({ 
          message: 'Token expired. Please refresh your token or login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (tokenError.message === 'TOKEN_INVALID') {
        return res.status(401).json({ 
          message: 'Invalid token. Please login again.',
          code: 'TOKEN_INVALID'
        });
      } else {
        throw tokenError;
      }
    }
  } catch (error) {
    console.error('Auth with refresh error:', error);
    res.status(500).json({ 
      message: 'Server error during authentication',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * Middleware to check if token refresh is needed soon
 * Adds a header to suggest client should refresh token
 */
const checkTokenExpiry = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies.accessToken;

    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = decoded.exp - now;
          
          // If token expires in less than 5 minutes, suggest refresh
          if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
            res.set('X-Token-Refresh-Suggested', 'true');
            res.set('X-Token-Expires-In', timeUntilExpiry.toString());
          }
        }
      } catch (decodeError) {
        // Ignore decode errors
      }
    }

    next();
  } catch (error) {
    // Don't block request on error
    next();
  }
};

/**
 * Middleware factory for role-based access with token refresh
 */
const requireRoleWithRefresh = (requiredRole) => {
  return [autoRefreshToken, authWithRefresh, (req, res, next) => {
    if (req.user.role !== requiredRole && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        message: `Access denied. ${requiredRole} role required.`,
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }
    next();
  }];
};

module.exports = {
  autoRefreshToken,
  authWithRefresh,
  checkTokenExpiry,
  requireRoleWithRefresh
};