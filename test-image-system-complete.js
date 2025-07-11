const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5000';

// Test credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

const adminUser = {
  email: 'admin@library.com',
  password: 'admin123'
};

let userToken = '';
let adminToken = '';

// Helper function to create test image
function createTestImage(filename) {
  const imagePath = path.join(__dirname, 'backend', 'uploads', 'samples', filename);
  if (fs.existsSync(imagePath)) {
    return imagePath;
  }
  
  // Create a simple test image (1x1 PNG)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x5C, 0xC2, 0x5D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(imagePath, pngData);
  return imagePath;
}

// Test functions
async function testLogin() {
  console.log('\n🔐 Testing Authentication...');
  
  try {
    // Test user login
    const userResponse = await axios.post(`${API_BASE}/api/auth/login`, testUser);
    userToken = userResponse.data.token;
    console.log('✅ User login successful');
    
    // Test admin login
    const adminResponse = await axios.post(`${API_BASE}/api/auth/login`, adminUser);
    adminToken = adminResponse.data.token;
    console.log('✅ Admin login successful');
    
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testImageUpload(type, token, description) {
  console.log(`\n📸 Testing ${description}...`);
  
  try {
    const testImagePath = createTestImage(`test-${type}.png`);
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    
    const response = await axios.post(`${API_BASE}/api/images/upload/${type}`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log(`✅ ${description} upload successful:`, response.data.imageUrl);
    
    // Test if image is accessible
    const imageResponse = await axios.get(`${API_BASE}${response.data.imageUrl}`);
    console.log(`✅ ${description} accessible via URL`);
    
    return response.data.imageUrl;
  } catch (error) {
    console.log(`❌ ${description} failed:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function testProfileImageUpload() {
  console.log('\n👤 Testing Profile Image Upload...');
  
  try {
    const testImagePath = createTestImage('test-profile.png');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    
    const response = await axios.post(`${API_BASE}/api/user/profile/image`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${userToken}`
      }
    });
    
    console.log('✅ Profile image upload successful:', response.data.imageUrl);
    
    // Verify profile was updated
    const profileResponse = await axios.get(`${API_BASE}/api/user/profile`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (profileResponse.data.profileImage) {
      console.log('✅ Profile image saved to database');
      
      // Test image accessibility
      const imageResponse = await axios.get(`${API_BASE}${profileResponse.data.profileImage}`);
      console.log('✅ Profile image accessible via URL');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Profile image upload failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testBookWithCover() {
  console.log('\n📚 Testing Book with Cover Image...');
  
  try {
    // First upload a book cover
    const coverUrl = await testImageUpload('books', adminToken, 'Book Cover');
    if (!coverUrl) return false;
    
    // Create book with cover
    const bookData = {
      title: 'Test Book with Cover',
      author: 'Test Author',
      genre: 'Technology',
      isbn: '1234567890123',
      totalCopies: 5,
      availableCopies: 5,
      description: 'A test book with cover image',
      coverImage: coverUrl,
      language: 'English'
    };
    
    const response = await axios.post(`${API_BASE}/api/admin/books`, bookData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Book with cover created successfully');
    
    // Verify book has cover image
    const booksResponse = await axios.get(`${API_BASE}/api/books`);
    const createdBook = booksResponse.data.find(book => book.title === 'Test Book with Cover');
    
    if (createdBook && createdBook.coverImage) {
      console.log('✅ Book cover image saved to database');
      
      // Test cover image accessibility
      const imageResponse = await axios.get(`${API_BASE}${createdBook.coverImage}`);
      console.log('✅ Book cover accessible via URL');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Book with cover creation failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testStaticFileServing() {
  console.log('\n🌐 Testing Static File Serving...');
  
  try {
    // Test different image types
    const testFiles = [
      '/uploads/samples/sample.png',
      '/uploads/profiles/sample-profile.png',
      '/uploads/books/sample-book.png',
      '/uploads/libraries/sample-library.png'
    ];
    
    let successCount = 0;
    
    for (const file of testFiles) {
      try {
        const response = await axios.get(`${API_BASE}${file}`);
        console.log(`✅ ${file} accessible`);
        successCount++;
      } catch (error) {
        console.log(`❌ ${file} not accessible:`, error.response?.status || error.message);
      }
    }
    
    console.log(`📊 Static file serving: ${successCount}/${testFiles.length} files accessible`);
    return successCount > 0;
  } catch (error) {
    console.log('❌ Static file serving test failed:', error.message);
    return false;
  }
}

async function testImageDeletion() {
  console.log('\n🗑️ Testing Image Deletion...');
  
  try {
    // Upload a test image
    const imageUrl = await testImageUpload('general', adminToken, 'Test Image for Deletion');
    if (!imageUrl) return false;
    
    // Extract filename from URL
    const filename = path.basename(imageUrl);
    
    // Delete the image
    const response = await axios.delete(`${API_BASE}/api/images/delete/general/${filename}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Image deletion successful');
    
    // Verify image is no longer accessible
    try {
      await axios.get(`${API_BASE}${imageUrl}`);
      console.log('❌ Image still accessible after deletion');
      return false;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Image properly deleted and no longer accessible');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.log('❌ Image deletion failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testCORSHeaders() {
  console.log('\n🌍 Testing CORS Headers...');
  
  try {
    const response = await axios.options(`${API_BASE}/api/images/upload/general`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    const corsHeaders = response.headers;
    console.log('✅ CORS preflight successful');
    console.log('📋 CORS Headers:', {
      'access-control-allow-origin': corsHeaders['access-control-allow-origin'],
      'access-control-allow-methods': corsHeaders['access-control-allow-methods'],
      'access-control-allow-headers': corsHeaders['access-control-allow-headers']
    });
    
    return true;
  } catch (error) {
    console.log('❌ CORS test failed:', error.response?.status || error.message);
    return false;
  }
}

async function generateTestReport() {
  console.log('\n📊 Generating Test Report...');
  
  const tests = [
    { name: 'Authentication', passed: await testLogin() },
    { name: 'Profile Image Upload', passed: await testProfileImageUpload() },
    { name: 'General Image Upload', passed: !!(await testImageUpload('general', userToken, 'General Image')) },
    { name: 'Book Cover Upload', passed: !!(await testImageUpload('books', adminToken, 'Book Cover')) },
    { name: 'Library Image Upload', passed: !!(await testImageUpload('libraries', adminToken, 'Library Image')) },
    { name: 'Book with Cover Creation', passed: await testBookWithCover() },
    { name: 'Static File Serving', passed: await testStaticFileServing() },
    { name: 'Image Deletion', passed: await testImageDeletion() },
    { name: 'CORS Headers', passed: await testCORSHeaders() }
  ];
  
  const passedTests = tests.filter(test => test.passed).length;
  const totalTests = tests.length;
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 IMAGE SYSTEM TEST REPORT');
  console.log('='.repeat(50));
  
  tests.forEach(test => {
    console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
  });
  
  console.log('='.repeat(50));
  console.log(`📊 Overall Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Image system is fully functional.');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('⚠️  Most tests passed. Minor issues may exist.');
  } else {
    console.log('❌ Multiple issues detected. Image system needs attention.');
  }
  
  console.log('='.repeat(50));
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Complete Image System Test...');
  console.log('⏰ This may take a few minutes...\n');
  
  try {
    await generateTestReport();
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/health`);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('   Run: cd backend && npm start');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAllTests();
  }
}

main().catch(console.error);