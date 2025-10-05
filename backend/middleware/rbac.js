const User = require('../models/User');

// Role hierarchy levels
const ROLE_LEVELS = {
  user: 1,
  admin: 2,
  superadmin: 3
};

// Get role level
const getRoleLevel = (role) => ROLE_LEVELS[role] || 0;

// Check if user can modify resource created by another user
const canModifyResource = (currentUserRole, resourceCreatorRole) => {
  const currentLevel = getRoleLevel(currentUserRole);
  const creatorLevel = getRoleLevel(resourceCreatorRole);
  
  // Higher or equal privilege can modify
  return currentLevel >= creatorLevel;
};

// Middleware to check if user can modify a resource
const checkModifyPermission = (resourceModel, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdField];
      const resource = await resourceModel.findById(resourceId).populate('createdBy');
      
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // If resource has no creator, allow modification by admin+
      if (!resource.createdBy) {
        if (getRoleLevel(req.user.role) >= getRoleLevel('admin')) {
          return next();
        }
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      // Check if current user can modify this resource
      if (!canModifyResource(req.user.role, resource.createdBy.role)) {
        return res.status(403).json({ 
          message: `Cannot modify resource created by ${resource.createdBy.role}. Insufficient privileges.` 
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Error checking permissions', error: error.message });
    }
  };
};

// Middleware to require minimum role level
const requireRole = (minRole) => {
  return (req, res, next) => {
    // Handle array of roles
    if (Array.isArray(minRole)) {
      if (!minRole.includes(req.user.role)) {
        return res.status(403).json({ 
          message: `Access denied. One of these roles required: ${minRole.join(', ')}` 
        });
      }
      return next();
    }
    
    const userLevel = getRoleLevel(req.user.role);
    const requiredLevel = getRoleLevel(minRole);
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        message: `Access denied. ${minRole} role or higher required.` 
      });
    }
    
    next();
  };
};

// Middleware to check if user can manage other users
const canManageUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.body.userId;
    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Users can only manage themselves
    if (req.user.role === 'user' && req.user._id.toString() !== targetUserId) {
      return res.status(403).json({ message: 'Users can only manage their own account' });
    }

    // Admins cannot manage superadmins
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ message: 'Admins cannot manage superadmins' });
    }

    // Admins can manage users and themselves
    if (req.user.role === 'admin' && targetUser.role === 'user') {
      return next();
    }

    // Superadmins can manage everyone
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Same level users can manage themselves
    if (req.user.role === targetUser.role && req.user._id.toString() === targetUserId) {
      return next();
    }

    res.status(403).json({ message: 'Insufficient privileges to manage this user' });
  } catch (error) {
    res.status(500).json({ message: 'Error checking user management permissions', error: error.message });
  }
};

// Middleware to prevent privilege escalation
const preventPrivilegeEscalation = (req, res, next) => {
  const { role: newRole } = req.body;
  
  if (!newRole) return next();

  const currentUserLevel = getRoleLevel(req.user.role);
  const newRoleLevel = getRoleLevel(newRole);
  
  // Users cannot change roles
  if (req.user.role === 'user' && newRole !== 'user') {
    return res.status(403).json({ message: 'Users cannot change their role' });
  }
  
  // Admins cannot promote to superadmin
  if (req.user.role === 'admin' && newRole === 'superadmin') {
    return res.status(403).json({ message: 'Admins cannot create superadmins' });
  }
  
  // Cannot promote to higher level than current user
  if (newRoleLevel > currentUserLevel) {
    return res.status(403).json({ 
      message: `Cannot assign role higher than your current role (${req.user.role})` 
    });
  }
  
  next();
};

// Middleware to log privilege actions
const logPrivilegeAction = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful actions
      if (res.statusCode < 400) {
        console.log(`[PRIVILEGE LOG] ${req.user.role} (${req.user.email}) performed ${action} at ${new Date().toISOString()}`);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  getRoleLevel,
  canModifyResource,
  checkModifyPermission,
  requireRole,
  canManageUser,
  preventPrivilegeEscalation,
  logPrivilegeAction,
  ROLE_LEVELS
};