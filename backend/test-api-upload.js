const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000';

async function testImageUploadAPI() {
  console.log('🧪 Testing Image Upload API\n');

  try {
    // Create a simple test image
    const testImagePath = path.join(__dirname, 'uploads', 'samples', 'test-upload.png');
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    // Ensure samples directory exists
    const samplesDir = path.join(__dirname, 'uploads', 'samples');
    if (!fs.existsSync(samplesDir)) {
      fs.mkdirSync(samplesDir, { recursive: true });
    }
    
    fs.writeFileSync(testImagePath, testImageData, 'base64');
    console.log('✅ Created test image file');

    // Test different upload endpoints
    const uploadTypes = ['books', 'libraries', 'profiles', 'general'];
    
    for (const type of uploadTypes) {
      try {
        console.log(`\n📤 Testing ${type} upload...`);
        
        const formData = new FormData();
        formData.append('image', fs.createReadStream(testImagePath));
        
        const response = await axios.post(`${API_BASE}/api/images/upload/${type}`, formData, {
          headers: {
            ...formData.getHeaders(),
            'Authorization': 'Bearer test-token' // Mock token for testing
          },
          timeout: 10000
        });
        
        console.log(`✅ ${type} upload successful:`);
        console.log(`   URL: ${response.data.imageUrl}`);
        console.log(`   File: ${response.data.filename}`);
        
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${type} upload failed: ${error.response.status} - ${error.response.data.message}`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`❌ ${type} upload failed: Server not running`);
        } else {
          console.log(`❌ ${type} upload failed: ${error.message}`);
        }
      }
    }

    // Test image access
    console.log('\n🔍 Testing image access...');
    const testImageUrl = `${API_BASE}/uploads/samples/test-upload.png`;
    
    try {
      const response = await axios.get(testImageUrl, { timeout: 5000 });
      console.log(`✅ Image accessible: ${response.status}`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Image access failed: Server not running');
      } else {
        console.log(`❌ Image access failed: ${error.response?.status || error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n📋 Test completed!');
  console.log('\n💡 To fix any issues:');
  console.log('1. Make sure backend server is running: cd backend && npm start');
  console.log('2. Check if MongoDB is connected');
  console.log('3. Verify upload directories exist');
  console.log('4. Test with valid authentication token');
}

testImageUploadAPI();