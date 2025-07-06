const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

const adminAuth = (req, res, next) => {
  // Check if user has admin or superadmin role
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  
  // Super admin bypasses all restrictions
  if (req.user.role === 'superadmin') {
    return next();
  }
  
  // Regular admin needs library assignment (but we'll allow access for now)
  next();
};

const superAdminAuth = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. Super admin role required.' });
  }
  next();
};

module.exports = { auth, adminAuth, superAdminAuth };