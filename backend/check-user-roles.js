const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkUserRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({}).select('name email role isActive');
    
    console.log('\n=== USER ROLES ===');
    users.forEach(user => {
      console.log(`${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`);
    });

    console.log('\n=== ROLE COUNTS ===');
    const roleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    roleCounts.forEach(role => {
      console.log(`${role._id}: ${role.count}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkUserRoles();