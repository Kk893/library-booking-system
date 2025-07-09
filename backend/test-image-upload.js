const fs = require('fs');
const path = require('path');

// Test image upload directories
const testDirectories = () => {
  const baseDir = path.join(__dirname, 'uploads');
  const dirs = ['profiles', 'books', 'libraries', 'general'];
  
  console.log('🔍 Testing upload directories...');
  
  // Create base uploads directory
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
    console.log('✅ Created base uploads directory');
  } else {
    console.log('✅ Base uploads directory exists');
  }
  
  // Create subdirectories
  dirs.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created ${dir} directory`);
    } else {
      console.log(`✅ ${dir} directory exists`);
    }
  });
  
  // Test write permissions
  dirs.forEach(dir => {
    const testFile = path.join(baseDir, dir, 'test.txt');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`✅ ${dir} directory is writable`);
    } catch (error) {
      console.log(`❌ ${dir} directory is not writable:`, error.message);
    }
  });
  
  console.log('🎉 Directory test completed!');
};

// Create a sample image for testing
const createSampleImage = () => {
  const sampleImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const base64Data = sampleImageData.replace(/^data:image\/png;base64,/, '');
  
  const sampleDir = path.join(__dirname, 'uploads', 'samples');
  if (!fs.existsSync(sampleDir)) {
    fs.mkdirSync(sampleDir, { recursive: true });
  }
  
  const samplePath = path.join(sampleDir, 'sample.png');
  fs.writeFileSync(samplePath, base64Data, 'base64');
  
  console.log('📸 Sample image created at:', samplePath);
  return samplePath;
};

// Run tests
testDirectories();
createSampleImage();

console.log('\n🚀 Upload system ready for testing!');
console.log('Test endpoints:');
console.log('- POST /api/images/upload/profiles');
console.log('- POST /api/images/upload/books');
console.log('- POST /api/images/upload/libraries');
console.log('- POST /api/images/upload/general');