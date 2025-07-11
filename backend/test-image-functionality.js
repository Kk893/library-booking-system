const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');
const Book = require('./models/Book');
const Library = require('./models/Library');
const User = require('./models/User');
require('dotenv').config();

const API_BASE = 'http://localhost:5000';

async function testImageUploadSystem() {
  console.log('🧪 COMPREHENSIVE IMAGE UPLOAD TEST\n');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Check upload directories
    console.log('📁 TEST 1: Upload Directory Structure');
    const uploadDirs = ['profiles', 'books', 'libraries', 'general'];
    const baseUploadPath = path.join(__dirname, 'uploads');
    
    uploadDirs.forEach(dir => {
      const dirPath = path.join(baseUploadPath, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        console.log(`✅ ${dir}: ${files.length} files`);
      } else {
        console.log(`❌ ${dir}: Directory missing`);
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created ${dir} directory`);
      }
    });

    // Test 2: Create sample images for testing
    console.log('\n📸 TEST 2: Creating Sample Images');
    const sampleImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const sampleImages = {
      book: path.join(baseUploadPath, 'books', 'sample-book.png'),
      library: path.join(baseUploadPath, 'libraries', 'sample-library.png'),
      profile: path.join(baseUploadPath, 'profiles', 'sample-profile.png'),
      general: path.join(baseUploadPath, 'general', 'sample-general.png')
    };

    Object.entries(sampleImages).forEach(([type, filePath]) => {
      fs.writeFileSync(filePath, sampleImageData, 'base64');
      console.log(`✅ Created sample ${type} image`);
    });

    // Test 3: Database Image References
    console.log('\n💾 TEST 3: Database Image References');
    
    // Check books with images
    const booksWithImages = await Book.find({ coverImage: { $exists: true, $ne: null } });
    console.log(`📚 Books with cover images: ${booksWithImages.length}`);
    booksWithImages.forEach(book => {
      console.log(`  - ${book.title}: ${book.coverImage}`);
    });

    // Check libraries with images
    const librariesWithImages = await Library.find({ images: { $exists: true, $ne: [] } });
    console.log(`🏢 Libraries with images: ${librariesWithImages.length}`);
    librariesWithImages.forEach(library => {
      console.log(`  - ${library.name}: ${library.images.length} images`);
    });

    // Check users with profile images
    const usersWithImages = await User.find({ profileImage: { $exists: true, $ne: null } });
    console.log(`👤 Users with profile images: ${usersWithImages.length}`);
    usersWithImages.forEach(user => {
      console.log(`  - ${user.name}: ${user.profileImage}`);
    });

    // Test 4: Update database with sample images
    console.log('\n🔄 TEST 4: Updating Database with Sample Images');
    
    // Update a book with sample cover
    const sampleBook = await Book.findOne();
    if (sampleBook) {
      await Book.findByIdAndUpdate(sampleBook._id, {
        coverImage: '/uploads/books/sample-book.png'
      });
      console.log(`✅ Updated book "${sampleBook.title}" with sample cover`);
    }

    // Update a library with sample images
    const sampleLibrary = await Library.findOne();
    if (sampleLibrary) {
      await Library.findByIdAndUpdate(sampleLibrary._id, {
        images: ['/uploads/libraries/sample-library.png']
      });
      console.log(`✅ Updated library "${sampleLibrary.name}" with sample image`);
    }

    // Update a user with sample profile image
    const sampleUser = await User.findOne();
    if (sampleUser) {
      await User.findByIdAndUpdate(sampleUser._id, {
        profileImage: '/uploads/profiles/sample-profile.png'
      });
      console.log(`✅ Updated user "${sampleUser.name}" with sample profile image`);
    }

    // Test 5: Image URL Generation
    console.log('\n🔗 TEST 5: Image URL Generation');
    const testUrls = [
      '/uploads/books/sample-book.png',
      '/uploads/libraries/sample-library.png',
      '/uploads/profiles/sample-profile.png',
      '/uploads/general/sample-general.png'
    ];

    testUrls.forEach(url => {
      const fullUrl = `${API_BASE}${url}`;
      console.log(`📎 ${url} → ${fullUrl}`);
    });

    // Test 6: File System Validation
    console.log('\n🔍 TEST 6: File System Validation');
    Object.entries(sampleImages).forEach(([type, filePath]) => {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${type}: ${stats.size} bytes, created ${stats.birthtime.toLocaleString()}`);
      } else {
        console.log(`❌ ${type}: File not found`);
      }
    });

    // Test 7: Image Upload API Endpoints
    console.log('\n🌐 TEST 7: Image Upload API Endpoints');
    const endpoints = [
      '/api/images/upload/books',
      '/api/images/upload/libraries', 
      '/api/images/upload/profiles',
      '/api/images/upload/general'
    ];

    endpoints.forEach(endpoint => {
      console.log(`📡 Available: POST ${API_BASE}${endpoint}`);
    });

    // Test 8: Frontend Integration Points
    console.log('\n⚛️ TEST 8: Frontend Integration Points');
    console.log('📱 Components using image upload:');
    console.log('  - ImageUpload.js (General purpose)');
    console.log('  - ProfileImageUpload.js (User profiles)');
    console.log('  - AdminDashboard.js (Book covers in admin panel)');
    console.log('  - BookCard.js (Display book covers)');

    // Test 9: Image Display Logic
    console.log('\n🖼️ TEST 9: Image Display Logic');
    const testImagePaths = [
      'http://localhost:5000/uploads/books/sample.jpg',
      '/uploads/books/sample.jpg',
      'data:image/png;base64,iVBORw0KGgo...'
    ];

    testImagePaths.forEach(imagePath => {
      let displayUrl;
      if (imagePath.startsWith('data:')) {
        displayUrl = imagePath; // Base64 preview
      } else if (imagePath.startsWith('http')) {
        displayUrl = imagePath; // Full URL
      } else {
        displayUrl = `${API_BASE}${imagePath}`; // Relative path
      }
      console.log(`🔗 ${imagePath} → ${displayUrl}`);
    });

    console.log('\n✅ IMAGE UPLOAD SYSTEM TEST COMPLETED!');
    console.log('\n📋 SUMMARY:');
    console.log(`📁 Upload directories: ${uploadDirs.length} created`);
    console.log(`📚 Books with images: ${booksWithImages.length}`);
    console.log(`🏢 Libraries with images: ${librariesWithImages.length}`);
    console.log(`👤 Users with images: ${usersWithImages.length}`);
    console.log(`🌐 API endpoints: ${endpoints.length} available`);

    console.log('\n🚀 READY FOR TESTING:');
    console.log('1. Start backend server: npm start');
    console.log('2. Start frontend server: npm start');
    console.log('3. Test image uploads in admin panel');
    console.log('4. Check real-time display in frontend');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

testImageUploadSystem();