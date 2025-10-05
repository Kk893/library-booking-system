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
    const bookingType = bookingData.type === 'seat' ? 'seat' : 'book';
    const message = bookingType === 'seat' 
      ? `Your seat booking at ${bookingData.libraryName || 'library'} has been confirmed for ${bookingData.date}`
      : `Your book "${bookingData.bookTitle || 'book'}" reservation has been confirmed`;
    
    return this.sendToUsers([userId], {
      title: 'Booking Confirmed! 🎉',
      message,
      type: 'booking',
      priority: 'high',
      relatedId: bookingData.bookingId,
      relatedModel: 'Booking',
      createdBy: createdBy || userId
    });
  }

  // Send payment confirmation
  static async sendPaymentConfirmation(userId, paymentData, createdBy) {
    return this.sendToUsers([userId], {
      title: 'Payment Successful 💳',
      message: `Your payment of ₹${paymentData.amount} has been processed successfully. Transaction ID: ${paymentData.transactionId}`,
      type: 'payment',
      priority: 'medium',
      relatedId: paymentData.paymentId,
      relatedModel: 'Payment',
      createdBy: createdBy || userId
    });
  }

  // Send reminder notification
  static async sendReminder(userId, reminderData, createdBy) {
    return this.sendToUsers([userId], {
      title: reminderData.title || 'Reminder 📅',
      message: reminderData.message,
      type: 'reminder',
      priority: reminderData.priority || 'medium',
      relatedId: reminderData.relatedId,
      relatedModel: reminderData.relatedModel,
      createdBy: createdBy || userId
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
      isActive: true
    });
    
    let unreadCount = 0;
    notifications.forEach(notification => {
      const recipient = notification.recipients.find(r => r.userId.toString() === userId.toString());
      if (!recipient?.read) {
        unreadCount++;
      }
    });
    
    return unreadCount;
  }

  // Create notification when user books a seat
  static async createBookingNotification(booking) {
    try {
      const bookingData = {
        type: 'seat',
        libraryName: booking.library?.name || 'Library',
        date: new Date(booking.date).toLocaleDateString(),
        bookingId: booking._id
      };
      
      await this.sendBookingConfirmation(booking.user, bookingData, booking.user);
      console.log('Booking notification sent successfully');
    } catch (error) {
      console.error('Error sending booking notification:', error);
    }
  }

  // Create notification when payment is successful
  static async createPaymentNotification(payment) {
    try {
      const paymentData = {
        amount: payment.amount,
        transactionId: payment.transactionId || payment._id,
        paymentId: payment._id
      };
      
      await this.sendPaymentConfirmation(payment.user, paymentData, payment.user);
      console.log('Payment notification sent successfully');
    } catch (error) {
      console.error('Error sending payment notification:', error);
    }
  }
}

module.exports = NotificationService;