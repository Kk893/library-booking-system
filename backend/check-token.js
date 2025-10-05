const jwt = require('jsonwebtoken');
require('dotenv').config();

const checkToken = () => {
  // Sample token from your error logs
  const sampleToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmMyYjRhZWRlM2JjN2QxYWY5ZjZlNyIsImlhdCI6MTc1OTU5ODY3MywiZXhwIjoxNzYwMjAzNDczfQ.NmsIUv_OS2e0PwfJf9iXJplqod9sIDqIuK_JcAKp4A4";
  
  try {
    const decoded = jwt.verify(sampleToken, process.env.JWT_SECRET);
    console.log('✅ Token is valid');
    console.log('User ID:', decoded.id);
    console.log('Issued at:', new Date(decoded.iat * 1000));
    console.log('Expires at:', new Date(decoded.exp * 1000));
    console.log('Current time:', new Date());
    
    if (decoded.exp * 1000 < Date.now()) {
      console.log('❌ Token has expired');
    } else {
      console.log('✅ Token is still valid');
    }
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
  }
  
  // Generate a new token for testing
  console.log('\n🔄 Generating new token...');
  const newToken = jwt.sign(
    { id: '686c2b4aede3bc7d1af9f6e7' }, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );
  console.log('New token:', newToken);
};

checkToken();