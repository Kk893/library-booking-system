const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to authenticate JWT token
 * Verifies the token from Authorization header or cookies
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid token. User not found.' 
      });
    }

    // Check if token is in user's valid tokens list (for logout functionality)
    if (user.validTokens && !user.validTokens.includes(token)) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Token has been invalidated. Please login again.' 
      });
    }

    // Add user info to request object
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid token.' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error',
        message: 'Token expired.' 
      });
    }
    
    return res.status(500).json({ 
      status: 'error',
      message: 'Internal server error during authentication.' 
    });
  }
};

/**
 * Middleware to check if user has admin role
 * Must be used after authenticateToken middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      status: 'error',
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

/**
 * Middleware to check if user has super admin role
 * Must be used after authenticateToken middleware
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      status: 'error',
      message: 'Access denied. Super Admin privileges required.' 
    });
  }
  next();
};

/**
 * Middleware to restrict access to specific roles
 * Must be used after authenticateToken middleware
 * @param {...String} roles - Allowed roles for this route
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You do not have permission to perform this action.'
      });
    }
    next();
  };
};

/**
 * Middleware to check if user is verified
 * Must be used after authenticateToken middleware
 */
const requireVerified = (req, res, next) => {
  if (!req.user || !req.user.isVerified) {
    return res.status(403).json({ 
      status: 'error',
      message: 'Access denied. Email verification required.' 
    });
  }
  next();
};

/**
 * Optional token authentication
 * Does not require authentication but adds user to request if token is valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      // No token, but that's OK for this middleware
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      // Invalid token, but that's OK for this middleware
      return next();
    }

    // Add user info to request object
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    next();
  } catch (error) {
    // Any errors in token verification are ignored in optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireSuperAdmin,
  requireVerified,
  optionalAuth,
  restrictTo,
  protect: authenticateToken // Alias for compatibility
};