const express = require('express');
const NotificationService = require('../services/notificationService');
const router = express.Router();

// Auth middleware for notifications
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await NotificationService.getUserNotifications(
      req.user._id, 
      parseInt(page), 
      parseInt(limit)
    );
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.user._id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    await Notification.findOneAndDelete({ 
      _id: req.params.id, 
      'recipients.userId': req.user._id 
    });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send admin notification (admin/superadmin only)
router.post('/admin', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { message, priority = 'medium' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const notification = await NotificationService.sendAdminNotification(
      message, 
      priority, 
      req.user._id
    );
    
    res.json({ message: 'Admin notification sent', notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send super admin notification (superadmin only)
router.post('/superadmin', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { message, priority = 'high' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const notification = await NotificationService.sendSuperAdminNotification(
      message, 
      priority, 
      req.user._id
    );
    
    res.json({ message: 'Super admin notification sent', notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send notification to specific users (admin/superadmin only)
router.post('/send', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { userIds, title, message, type = 'system', priority = 'medium' } = req.body;
    
    if (!userIds || !title || !message) {
      return res.status(400).json({ error: 'userIds, title, and message are required' });
    }
    
    const notification = await NotificationService.sendToUsers(userIds, {
      title,
      message,
      type,
      priority,
      createdBy: req.user._id
    });
    
    res.json({ message: 'Notification sent', notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;