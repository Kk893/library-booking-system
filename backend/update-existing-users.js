const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const updateExistingUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update all existing users to be verified
    const result = await User.updateMany(
      { isVerified: { $ne: true } },
      { $set: { isVerified: true } }
    );

    console.log(`Updated ${result.modifiedCount} existing users to verified status`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
};

updateExistingUsers();