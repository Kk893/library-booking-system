const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireRole, logPrivilegeAction } = require('./rbac');

// Simple auth middleware without complex dependencies
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies.accessToken;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
      // Simple JWT verification
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid token. User not found.' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated.' });
      }

      // Add user info to request
      req.user = user;
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else {
        return res.status(401).json({ 
          message: 'Invalid token. Please login again.',
          code: 'TOKEN_INVALID'
        });
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Legacy RBAC middleware for backward compatibility
const adminAuth = [auth, requireRole('admin'), logPrivilegeAction('admin_access')];
const superAdminAuth = [auth, requireRole('superadmin'), logPrivilegeAction('superadmin_access')];
const userAuth = [auth, requireRole('user')];

// Export simplified middleware
module.exports = { 
  auth, 
  adminAuth, 
  superAdminAuth, 
  userAuth
};