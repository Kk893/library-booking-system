const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('Testing login...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'pachuram893@gmail.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('User:', response.data.user.name, response.data.user.role);
    console.log('Token:', response.data.token ? 'Present' : 'Missing');
    
    // Test notifications with token
    const notifResponse = await axios.get('http://localhost:5000/api/notifications', {
      headers: {
        'Authorization': `Bearer ${response.data.token}`
      }
    });
    
    console.log('Notifications:', notifResponse.data.length);
    
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
};

testLogin();