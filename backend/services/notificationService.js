const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  // Send notification to specific users
  static async sendToUsers(userIds, notificationData) {
    const recipients = userIds.map(userId => ({ userId }));
    
    const notification = await Notification.createNotification({
      ...notificationData,
      recipients
    });
    
    return notification;
  }

  // Send notification to all users of a specific role
  static async sendToRole(role, notificationData, createdBy) {
    const users = await User.find({ role, isActive: true }).select('_id');
    const userIds = users.map(user => user._id);
    
    if (userIds.length === 0) return null;
    
    return this.sendToUsers(userIds, {
      ...notificationData,
      targetRole: role,
      createdBy
    });
  }

  // Send booking confirmation
  static async sendBookingConfirmation(userId, bookingData, createdBy) {
    return this.sendToUsers([userId], {
      title: 'Booking Confirmed! 🎉',
      message: `Your ${bookingData.type} booking has been confirmed for ${bookingData.date}`,
      type: 'booking',
      priority: 'high',
      relatedId: bookingData.bookingId,
      relatedModel: 'Booking',
      createdBy
    });
  }

  // Send admin notification
  static async sendAdminNotification(message, priority = 'medium', createdBy) {
    return this.sendToRole('admin', {
      title: 'Admin Notification 🔔',
      message,
      type: 'admin',
      priority
    }, createdBy);
  }

  // Send super admin notification
  static async sendSuperAdminNotification(message, priority = 'high', createdBy) {
    return this.sendToRole('superadmin', {
      title: 'Super Admin Alert 👑',
      message,
      type: 'system',
      priority
    }, createdBy);
  }

  // Get notifications for user
  static async getUserNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find({
      'recipients.userId': userId,
      isActive: true
    })
    .populate('createdBy', 'name role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    return notifications.map(notification => {
      const recipient = notification.recipients.find(r => r.userId.toString() === userId.toString());
      return {
        ...notification.toObject(),
        read: recipient?.read || false,
        readAt: recipient?.readAt
      };
    });
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    return Notification.markAsRead(notificationId, userId);
  }

  // Get unread count
  static async getUnreadCount(userId) {
    const notifications = await Notification.find({
      'recipients.userId': userId,
      'recipients.read': false,
      isActive: true
    });
    
    return notifications.length;
  }
}

module.exports = NotificationService;