const mongoose = require('mongoose');
const User = require('./models/User');
const Library = require('./models/Library');
require('dotenv').config();

async function testData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Check libraries
    const libraries = await Library.find().populate('adminId', 'name email');
    console.log('\n📚 Libraries in database:');
    libraries.forEach(lib => {
      console.log(`- ${lib.name} (${lib.city}) - Admin: ${lib.adminId ? lib.adminId.name : 'None'}`);
    });

    // Check admins
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    console.log('\n👨‍💼 Admins in database:');
    admins.forEach(admin => {
      console.log(`- ${admin.name} (${admin.email}) - Role: ${admin.role}`);
    });

    // Check users
    const users = await User.find({ role: 'user' });
    console.log('\n👥 Users in database:');
    console.log(`Total users: ${users.length}`);

    await mongoose.connection.close();
    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testData();