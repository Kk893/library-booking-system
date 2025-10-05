const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
require('dotenv').config();

const checkNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({}).select('name email role');
    console.log('Users in database:', users.length);
    
    for (const user of users) {
      console.log(`\n--- User: ${user.name} (${user.email}) ---`);
      
      // Get notifications for this user
      const notifications = await Notification.find({
        'recipients.userId': user._id
      }).sort({ createdAt: -1 });
      
      console.log(`Notifications: ${notifications.length}`);
      
      notifications.forEach((notif, index) => {
        const recipient = notif.recipients.find(r => r.userId.toString() === user._id.toString());
        console.log(`${index + 1}. ${notif.title} - ${notif.type} - Read: ${recipient?.read || false}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkNotifications();