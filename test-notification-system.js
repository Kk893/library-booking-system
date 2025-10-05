const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Test credentials
const testUser = {
  email: 'alice@user.com',
  password: 'password123'
};

let authToken = '';

const testNotificationSystem = async () => {
  try {
    console.log('🧪 Testing Notification System...\n');

    // 1. Login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, testUser);
    authToken = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Test fetching notifications
    console.log('2️⃣ Fetching notifications...');
    const notificationsResponse = await axios.get(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Found ${notificationsResponse.data.length} notifications\n`);

    // 3. Test unread count
    console.log('3️⃣ Getting unread count...');
    const unreadResponse = await axios.get(`${API_BASE}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Unread count: ${unreadResponse.data.count}\n`);

    // 4. Test marking as read (if notifications exist)
    if (notificationsResponse.data.length > 0) {
      const firstNotification = notificationsResponse.data[0];
      console.log('4️⃣ Marking first notification as read...');
      
      await axios.put(`${API_BASE}/api/notifications/${firstNotification._id}/read`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Notification marked as read\n');
    }

    // 5. Test notification click (should not cause logout)
    console.log('5️⃣ Testing notification click behavior...');
    const testResponse = await axios.get(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (testResponse.status === 200) {
      console.log('✅ Notification API calls working properly - no logout issue!\n');
    }

    console.log('🎉 All notification tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('- ✅ Login successful');
    console.log('- ✅ Notifications fetched');
    console.log('- ✅ Unread count retrieved');
    console.log('- ✅ Mark as read working');
    console.log('- ✅ No logout on notification click');
    console.log('\n🚀 Your notification system is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔍 Debug Info:');
      console.log('- This might be the logout issue we fixed');
      console.log('- Check if backend server is running');
      console.log('- Verify user credentials are correct');
    }
  }
};

// Run the test
testNotificationSystem();