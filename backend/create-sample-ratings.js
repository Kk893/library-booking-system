const mongoose = require('mongoose');
const User = require('./models/User');
const Library = require('./models/Library');
const Rating = require('./models/Rating');
require('dotenv').config();

async function createSampleRatings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Clear existing ratings
    await Rating.deleteMany({});
    console.log('🗑️ Cleared existing ratings');

    // Get users and libraries
    const users = await User.find({ role: 'user' }).limit(10);
    const libraries = await Library.find().limit(5);

    if (users.length === 0) {
      console.log('❌ No users found. Creating sample users...');
      
      // Create sample users
      const sampleUsers = [
        { name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'user', isVerified: true },
        { name: 'Jane Smith', email: 'jane@example.com', password: 'password123', role: 'user', isVerified: true },
        { name: 'Mike Johnson', email: 'mike@example.com', password: 'password123', role: 'user', isVerified: true },
        { name: 'Sarah Wilson', email: 'sarah@example.com', password: 'password123', role: 'user', isVerified: true },
        { name: 'David Brown', email: 'david@example.com', password: 'password123', role: 'user', isVerified: true }
      ];

      for (const userData of sampleUsers) {
        const user = new User(userData);
        await user.save();
        users.push(user);
      }
      console.log('✅ Created sample users');
    }

    if (libraries.length === 0) {
      console.log('❌ No libraries found. Please create libraries first.');
      return;
    }

    // Sample ratings data
    const sampleRatings = [
      { rating: 5, review: 'Excellent library! Very quiet and well-maintained. Perfect for studying.' },
      { rating: 4, review: 'Great facilities and helpful staff. WiFi could be faster.' },
      { rating: 5, review: 'Love this place! Clean, comfortable seats and good lighting.' },
      { rating: 3, review: 'Decent library but gets crowded during peak hours.' },
      { rating: 4, review: 'Good collection of books and peaceful environment.' },
      { rating: 5, review: 'Outstanding service and modern facilities. Highly recommended!' },
      { rating: 4, review: 'Nice place to study. AC works well and seats are comfortable.' },
      { rating: 2, review: 'Too noisy and seats are not very comfortable.' },
      { rating: 5, review: 'Perfect study environment with all necessary amenities.' },
      { rating: 4, review: 'Good library with helpful staff and clean facilities.' }
    ];

    let ratingsCreated = 0;

    // Create ratings for each library
    for (const library of libraries) {
      console.log(`\n📚 Creating ratings for: ${library.name}`);
      
      // Create 3-5 ratings per library
      const numRatings = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < numRatings && i < users.length; i++) {
        const user = users[i];
        const ratingData = sampleRatings[ratingsCreated % sampleRatings.length];
        
        try {
          const rating = new Rating({
            userId: user._id,
            libraryId: library._id,
            rating: ratingData.rating,
            review: ratingData.review,
            isActive: true
          });
          
          await rating.save();
          ratingsCreated++;
          
          console.log(`  ⭐ ${user.name}: ${ratingData.rating} stars - "${ratingData.review.substring(0, 50)}..."`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`  ⚠️ ${user.name} already rated this library`);
          } else {
            console.error(`  ❌ Error creating rating: ${error.message}`);
          }
        }
      }
    }

    console.log(`\n🎉 Successfully created ${ratingsCreated} ratings!`);
    
    // Show summary
    const totalRatings = await Rating.countDocuments();
    const avgRating = await Rating.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Ratings: ${totalRatings}`);
    console.log(`Average Rating: ${avgRating[0]?.avgRating?.toFixed(1) || 0} stars`);
    
    // Show ratings by library
    const ratingsByLibrary = await Rating.aggregate([
      {
        $lookup: {
          from: 'libraries',
          localField: 'libraryId',
          foreignField: '_id',
          as: 'library'
        }
      },
      {
        $group: {
          _id: '$libraryId',
          libraryName: { $first: { $arrayElemAt: ['$library.name', 0] } },
          avgRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);
    
    console.log(`\n📈 RATINGS BY LIBRARY:`);
    ratingsByLibrary.forEach(lib => {
      console.log(`${lib.libraryName}: ${lib.avgRating.toFixed(1)} ⭐ (${lib.totalRatings} reviews)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

createSampleRatings();