const express = require('express');
const { verifyToken, requireRole } = require('../middleware/security');
const NotificationService = require('../services/notificationService');
const router = express.Router();

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await NotificationService.getUserNotifications(
      req.user.id, 
      parseInt(page), 
      parseInt(limit)
    );
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send admin notification (admin/superadmin only)
router.post('/admin', verifyToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { message, priority = 'medium' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const notification = await NotificationService.sendAdminNotification(
      message, 
      priority, 
      req.user.id
    );
    
    res.json({ message: 'Admin notification sent', notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send super admin notification (superadmin only)
router.post('/superadmin', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const { message, priority = 'high' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const notification = await NotificationService.sendSuperAdminNotification(
      message, 
      priority, 
      req.user.id
    );
    
    res.json({ message: 'Super admin notification sent', notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send notification to specific users (admin/superadmin only)
router.post('/send', verifyToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { userIds, title, message, type = 'system', priority = 'medium' } = req.body;
    
    if (!userIds || !title || !message) {
      return res.status(400).json({ error: 'userIds, title, and message are required' });
    }
    
    const notification = await NotificationService.sendToUsers(userIds, {
      title,
      message,
      type,
      priority,
      createdBy: req.user.id
    });
    
    res.json({ message: 'Notification sent', notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;