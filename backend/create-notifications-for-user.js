const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
require('dotenv').config();

const createNotificationsForUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: 'pachuram893@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Creating notifications for user:', user.name, user.email);

    // Clear existing notifications for this user
    await Notification.deleteMany({ 'recipients.userId': user._id });

    const notifications = [
      {
        title: 'Welcome to LibraryBook! 🎉',
        message: 'Thank you for joining LibraryBook. Start exploring libraries and book your seats now!',
        type: 'system',
        priority: 'medium',
        recipients: [{ userId: user._id, read: false }],
        createdBy: user._id
      },
      {
        title: 'Booking Confirmed! 🪑',
        message: 'Your seat booking at Central Library has been confirmed for today.',
        type: 'booking',
        priority: 'high',
        recipients: [{ userId: user._id, read: false }],
        createdBy: user._id
      },
      {
        title: 'Payment Successful 💳',
        message: 'Your payment of ₹150 has been processed successfully.',
        type: 'payment',
        priority: 'medium',
        recipients: [{ userId: user._id, read: false }],
        createdBy: user._id
      },
      {
        title: 'Special Offer! 🎁',
        message: 'Get 20% off on your next seat booking. Use code SAVE20.',
        type: 'offer',
        priority: 'low',
        recipients: [{ userId: user._id, read: true }],
        createdBy: user._id
      },
      {
        title: 'Book Due Reminder 📚',
        message: 'Your book "JavaScript Guide" is due in 2 days. Please return or renew.',
        type: 'reminder',
        priority: 'medium',
        recipients: [{ userId: user._id, read: false }],
        createdBy: user._id
      }
    ];

    for (const notifData of notifications) {
      await Notification.create(notifData);
    }

    console.log(`✅ Created ${notifications.length} notifications for ${user.name}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createNotificationsForUser();