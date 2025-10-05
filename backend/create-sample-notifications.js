const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
require('dotenv').config();

const createSampleNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get a sample user
    const user = await User.findOne({ role: 'user' });
    if (!user) {
      console.log('No user found. Please create a user first.');
      return;
    }

    console.log('Creating notifications for user:', user.name);

    // Clear existing notifications for this user
    await Notification.deleteMany({ 'recipients.userId': user._id });

    const notifications = [
      {
        title: 'Booking Confirmed! 🎉',
        message: 'Your seat booking at Central Library has been confirmed for tomorrow.',
        type: 'booking',
        priority: 'high',
        recipients: [{ userId: user._id, read: false }],
        createdBy: user._id
      },
      {
        title: 'Book Due Reminder 📚',
        message: 'Your book "JavaScript Guide" is due in 2 days. Please return or renew.',
        type: 'reminder',
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
        title: 'New Event: Book Reading Session 📖',
        message: 'Join our weekly book reading session this Saturday at 3 PM.',
        type: 'event',
        priority: 'medium',
        recipients: [{ userId: user._id, read: true }],
        createdBy: user._id
      },
      {
        title: 'Payment Successful 💳',
        message: 'Your payment of ₹150 has been processed successfully.',
        type: 'payment',
        priority: 'medium',
        recipients: [{ userId: user._id, read: false }],
        createdBy: user._id
      }
    ];

    for (const notifData of notifications) {
      await Notification.create(notifData);
    }

    console.log('Sample notifications created successfully!');
    console.log(`Created ${notifications.length} notifications for user: ${user.name}`);

  } catch (error) {
    console.error('Error creating notifications:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createSampleNotifications();