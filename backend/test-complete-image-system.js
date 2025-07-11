const mongoose = require('mongoose');
const User = require('./models/User');
const Book = require('./models/Book');
const Library = require('./models/Library');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testCompleteImageSystem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('🔗 Connected to MongoDB');

    // Test 1: Check User Profile Images
    console.log('\n📋 TEST 1: User Profile Images');
    const users = await User.find().select('name email profileImage').limit(3);
    users.forEach(user => {
      console.log(`- ${user.name}: ${user.profileImage || 'No image'}`);
    });

    // Test 2: Check Book Cover Images
    console.log('\n📚 TEST 2: Book Cover Images');
    const books = await Book.find().select('title author coverImage').limit(5);
    books.forEach(book => {
      console.log(`- ${book.title}: ${book.coverImage || 'No cover'}`);
    });

    // Test 3: Check Library Images
    console.log('\n🏢 TEST 3: Library Images');
    const libraries = await Library.find().select('name images').limit(3);
    libraries.forEach(library => {
      console.log(`- ${library.name}: ${library.images ? library.images.length + ' images' : 'No images'}`);
    });

    // Test 4: Update a book with cover image
    console.log('\n🔄 TEST 4: Updating Book Cover');
    const testBook = books[0];
    if (testBook) {
      const testImageUrl = '/uploads/books/test-cover.jpg';
      const updatedBook = await Book.findByIdAndUpdate(
        testBook._id,
        { coverImage: testImageUrl },
        { new: true }
      );
      console.log(`✅ Updated ${testBook.title} cover: ${updatedBook.coverImage}`);
    }

    // Test 5: Check file system
    console.log('\n📁 TEST 5: File System Check');
    const uploadDirs = ['profiles', 'books', 'libraries', 'general'];
    uploadDirs.forEach(dir => {
      const dirPath = path.join(__dirname, 'uploads', dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        console.log(`- ${dir}: ${files.length} files`);
        if (files.length > 0) {
          console.log(`  Latest: ${files[files.length - 1]}`);
        }
      } else {
        console.log(`- ${dir}: Directory not found`);
      }
    });

    // Test 6: Create test image URLs
    console.log('\n🧪 TEST 6: Creating Test Data');
    
    // Update a user with test image
    const testUser = users[0];
    if (testUser) {
      await User.findByIdAndUpdate(
        testUser._id,
        { profileImage: '/uploads/profiles/test-profile.jpg' }
      );
      console.log(`✅ Updated ${testUser.name} profile image`);
    }

    // Update a library with test images
    const testLibrary = libraries[0];
    if (testLibrary) {
      await Library.findByIdAndUpdate(
        testLibrary._id,
        { images: ['/uploads/libraries/test-lib1.jpg', '/uploads/libraries/test-lib2.jpg'] }
      );
      console.log(`✅ Updated ${testLibrary.name} images`);
    }

    console.log('\n🎉 Complete image system test finished!');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

testCompleteImageSystem();