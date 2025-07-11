const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Book = require('./models/Book');
const Library = require('./models/Library');

async function fixImagePaths() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('✅ Connected to MongoDB');

    let fixedCount = 0;

    // Fix User profile images
    console.log('\n👤 Fixing User profile images...');
    const users = await User.find({ profileImage: { $exists: true, $ne: null } });
    
    for (const user of users) {
      let needsUpdate = false;
      let newImagePath = user.profileImage;

      // Ensure path starts with /uploads/
      if (newImagePath && !newImagePath.startsWith('/uploads/') && !newImagePath.startsWith('http')) {
        if (newImagePath.startsWith('uploads/')) {
          newImagePath = '/' + newImagePath;
        } else {
          newImagePath = '/uploads/profiles/' + path.basename(newImagePath);
        }
        needsUpdate = true;
      }

      // Check if file exists
      if (newImagePath && newImagePath.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, newImagePath.substring(1)); // Remove leading /
        if (!fs.existsSync(filePath)) {
          console.log(`⚠️  Image not found for user ${user.name}: ${filePath}`);
        }
      }

      if (needsUpdate) {
        await User.findByIdAndUpdate(user._id, { profileImage: newImagePath });
        console.log(`✅ Fixed profile image for user: ${user.name}`);
        fixedCount++;
      }
    }

    // Fix Book cover images
    console.log('\n📚 Fixing Book cover images...');
    const books = await Book.find({ coverImage: { $exists: true, $ne: null } });
    
    for (const book of books) {
      let needsUpdate = false;
      let newImagePath = book.coverImage;

      // Ensure path starts with /uploads/
      if (newImagePath && !newImagePath.startsWith('/uploads/') && !newImagePath.startsWith('http')) {
        if (newImagePath.startsWith('uploads/')) {
          newImagePath = '/' + newImagePath;
        } else {
          newImagePath = '/uploads/books/' + path.basename(newImagePath);
        }
        needsUpdate = true;
      }

      // Check if file exists
      if (newImagePath && newImagePath.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, newImagePath.substring(1)); // Remove leading /
        if (!fs.existsSync(filePath)) {
          console.log(`⚠️  Image not found for book ${book.title}: ${filePath}`);
        }
      }

      if (needsUpdate) {
        await Book.findByIdAndUpdate(book._id, { coverImage: newImagePath });
        console.log(`✅ Fixed cover image for book: ${book.title}`);
        fixedCount++;
      }
    }

    // Fix Library images
    console.log('\n🏢 Fixing Library images...');
    const libraries = await Library.find({ images: { $exists: true, $ne: [] } });
    
    for (const library of libraries) {
      let needsUpdate = false;
      const newImages = library.images.map(imagePath => {
        if (imagePath && !imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
          needsUpdate = true;
          if (imagePath.startsWith('uploads/')) {
            return '/' + imagePath;
          } else {
            return '/uploads/libraries/' + path.basename(imagePath);
          }
        }
        return imagePath;
      });

      // Check if files exist
      newImages.forEach(imagePath => {
        if (imagePath && imagePath.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, imagePath.substring(1)); // Remove leading /
          if (!fs.existsSync(filePath)) {
            console.log(`⚠️  Image not found for library ${library.name}: ${filePath}`);
          }
        }
      });

      if (needsUpdate) {
        await Library.findByIdAndUpdate(library._id, { images: newImages });
        console.log(`✅ Fixed images for library: ${library.name}`);
        fixedCount++;
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} image paths in database`);

    // Create missing directories
    console.log('\n📁 Ensuring upload directories exist...');
    const uploadDirs = [
      'uploads',
      'uploads/profiles',
      'uploads/books', 
      'uploads/libraries',
      'uploads/general',
      'uploads/samples'
    ];

    uploadDirs.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });

    // Generate summary report
    console.log('\n📊 SUMMARY REPORT');
    console.log('='.repeat(40));
    
    const userCount = await User.countDocuments({ profileImage: { $exists: true, $ne: null } });
    const bookCount = await Book.countDocuments({ coverImage: { $exists: true, $ne: null } });
    const libraryCount = await Library.countDocuments({ images: { $exists: true, $ne: [] } });
    
    console.log(`👤 Users with profile images: ${userCount}`);
    console.log(`📚 Books with cover images: ${bookCount}`);
    console.log(`🏢 Libraries with images: ${libraryCount}`);
    console.log(`🔧 Total paths fixed: ${fixedCount}`);
    console.log('='.repeat(40));

  } catch (error) {
    console.error('❌ Error fixing image paths:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
fixImagePaths();