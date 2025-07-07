const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireRole, logPrivilegeAction } = require('./rbac');

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

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Use RBAC middleware for role-based access
const adminAuth = [auth, requireRole('admin'), logPrivilegeAction('admin_access')];
const superAdminAuth = [auth, requireRole('superadmin'), logPrivilegeAction('superadmin_access')];
const userAuth = [auth, requireRole('user')];

module.exports = { auth, adminAuth, superAdminAuth, userAuth };