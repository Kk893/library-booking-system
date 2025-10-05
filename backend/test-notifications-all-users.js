const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
require('dotenv').config();

const createNotificationsForAllUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get users by role
    const users = await User.find({}).select('name email role');
    const usersByRole = {
      user: users.filter(u => u.role === 'user'),
      admin: users.filter(u => u.role === 'admin'),
      superadmin: users.filter(u => u.role === 'superadmin')
    };

    console.log('Users found:');
    console.log('- Users:', usersByRole.user.length);
    console.log('- Admins:', usersByRole.admin.length);
    console.log('- Super Admins:', usersByRole.superadmin.length);

    // Clear all notifications
    await Notification.deleteMany({});
    console.log('\nCleared all existing notifications');

    // Create notifications for each user type
    for (const user of usersByRole.user) {
      await Notification.create({
        title: 'Welcome User! 👋',
        message: 'Welcome to LibraryBook! Start exploring libraries.',
        type: 'system',
        priority: 'medium',
        recipients: [{ userId: user._id, read: false }],
        createdBy: user._id
      });
    }

    for (const admin of usersByRole.admin) {
      await Notification.create({
        title: 'Admin Dashboard Ready 🔑',
        message: 'Your admin dashboard is ready. Manage your library efficiently.',
        type: 'admin',
        priority: 'medium',
        recipients: [{ userId: admin._id, read: false }],
        createdBy: admin._id
      });
    }

    for (const superadmin of usersByRole.superadmin) {
      await Notification.create({
        title: 'Super Admin Access 👑',
        message: 'Super Admin panel is active. Monitor all system activities.',
        type: 'system',
        priority: 'high',
        recipients: [{ userId: superadmin._id, read: false }],
        createdBy: superadmin._id
      });
    }

    console.log('\n✅ Created notifications for all users');
    console.log('- User notifications:', usersByRole.user.length);
    console.log('- Admin notifications:', usersByRole.admin.length);
    console.log('- Super Admin notifications:', usersByRole.superadmin.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createNotificationsForAllUsers();