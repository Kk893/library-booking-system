const mongoose = require('mongoose');
const Book = require('./models/Book');
const Library = require('./models/Library');
require('dotenv').config();

async function testFinalImages() {
  console.log('🧪 FINAL IMAGE TEST\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('✅ Connected to MongoDB\n');

    // Test books with images
    console.log('📚 BOOKS WITH IMAGES:');
    const books = await Book.find({ coverImage: { $exists: true, $ne: null } });
    books.forEach(book => {
      const fullUrl = `http://localhost:5000${book.coverImage}`;
      console.log(`  - ${book.title}: ${book.coverImage} → ${fullUrl}`);
    });

    // Test libraries with images  
    console.log('\n🏢 LIBRARIES WITH IMAGES:');
    const libraries = await Library.find({ images: { $exists: true, $ne: [] } });
    libraries.forEach(library => {
      console.log(`  - ${library.name}: ${library.images.length} images`);
      library.images.forEach(img => {
        const fullUrl = `http://localhost:5000${img}`;
        console.log(`    → ${img} → ${fullUrl}`);
      });
    });

    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log('1. Start servers: backend (npm start) + frontend (npm start)');
    console.log('2. Go to http://localhost:3000/books');
    console.log('3. Book covers should display (not just 📖 icons)');
    console.log('4. Go to http://localhost:3000/libraries');
    console.log('5. Library images should display (not just 📚 icons)');
    console.log('6. Admin panel: Ctrl+Shift+A → Books tab should show covers');

    console.log('\n✅ If images still not showing:');
    console.log('- Check browser console for 404 errors');
    console.log('- Verify backend server running on port 5000');
    console.log('- Test direct URL: http://localhost:5000/uploads/books/javascript-guide-cover.png');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

testFinalImages();