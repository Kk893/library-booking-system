const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testDatabaseImage() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Find a user to test with
    const user = await User.findOne({ role: 'user' });
    if (!user) {
      console.log('❌ No user found to test with');
      return;
    }

    console.log('📋 Testing with user:', user.name, user.email);
    console.log('🖼️ Current profile image:', user.profileImage);

    // Test updating profile image
    const testImageUrl = '/uploads/profiles/test-image.jpg';
    
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { 
        profileImage: testImageUrl,
        lastModifiedBy: user._id
      },
      { new: true, runValidators: true }
    ).select('-password');

    console.log('✅ Updated user profile image:', updatedUser.profileImage);
    
    // Verify the update
    const verifyUser = await User.findById(user._id).select('profileImage name email');
    console.log('🔍 Verification - Profile image in database:', verifyUser.profileImage);

    // Test with multiple users
    const allUsers = await User.find({ role: 'user' }).select('name email profileImage').limit(5);
    console.log('\n👥 All users profile images:');
    allUsers.forEach(u => {
      console.log(`- ${u.name}: ${u.profileImage || 'No image'}`);
    });

  } catch (error) {
    console.error('❌ Database test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

testDatabaseImage();