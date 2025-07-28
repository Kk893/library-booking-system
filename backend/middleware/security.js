const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const User = require('../models/User');

// Legacy security headers (for backward compatibility)
const securityHeaders = helmet({
  contentSecurityPolicy: false, // Disable CSP for now to fix images
  hsts: false // Disable HSTS for localhost
});

// Legacy rate limiting (for backward compatibility)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // increased from 100 to 200
  skipSuccessfulRequests: true,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // increased from 5 to 10
  skipSuccessfulRequests: true, // don't count successful requests
  keyGenerator: (req) => {
    // Use combination of IP and email for more granular limiting
    return `${req.ip}-${req.body.email || 'unknown'}`;
  },
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Role-based access control
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (Array.isArray(roles)) {
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ error: 'Access denied - insufficient permissions' });
        }
      } else {
        if (req.user.role !== roles) {
          return res.status(403).json({ error: 'Access denied - insufficient permissions' });
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

// Enhanced JWT verification
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.accessToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied - no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Token invalidated - please login again' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Legacy input sanitization (for backward compatibility)
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Basic XSS protection
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/javascript:/gi, '');
        obj[key] = obj[key].replace(/on\w+\s*=/gi, '');
        
        // Basic SQL injection protection
        obj[key] = obj[key].replace(/('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\})|(\[)|(\]))/g, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

module.exports = {
  securityHeaders,
  generalLimiter,
  authLimiter,
  requireRole,
  verifyToken,
  sanitizeInput
};