const mongoose = require('mongoose');
const User = require('./models/User');
const Book = require('./models/Book');
const Favorite = require('./models/Favorite');
require('dotenv').config();

async function createSampleFavorites() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking');
    console.log('Connected to MongoDB');

    // Clear existing favorites
    await Favorite.deleteMany({});
    console.log('🗑️ Cleared existing favorites');

    // Get users and books
    const users = await User.find({ role: 'user' }).limit(5);
    const books = await Book.find().limit(10);

    if (users.length === 0 || books.length === 0) {
      console.log('❌ Need users and books to create favorites');
      return;
    }

    const favorites = [];

    // Create favorites for each user
    for (const user of users) {
      // Each user likes 3-5 random books
      const numFavorites = Math.floor(Math.random() * 3) + 3;
      const userBooks = books.sort(() => 0.5 - Math.random()).slice(0, numFavorites);
      
      for (const book of userBooks) {
        favorites.push({
          userId: user._id,
          bookId: book._id,
          libraryId: book.libraryId
        });
      }
    }

    // Insert favorites
    await Favorite.insertMany(favorites);

    console.log(`\n🎉 Successfully created ${favorites.length} favorites!`);
    
    // Show summary
    const totalFavorites = await Favorite.countDocuments();
    const favoritesPerUser = await Favorite.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $group: {
          _id: '$userId',
          userName: { $first: { $arrayElemAt: ['$user.name', 0] } },
          favoriteCount: { $sum: 1 }
        }
      }
    ]);
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Favorites: ${totalFavorites}`);
    
    console.log(`\n👥 FAVORITES BY USER:`);
    favoritesPerUser.forEach(user => {
      console.log(`${user.userName}: ${user.favoriteCount} favorites`);
    });

    // Most popular books
    const popularBooks = await Favorite.aggregate([
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book'
        }
      },
      {
        $group: {
          _id: '$bookId',
          bookTitle: { $first: { $arrayElemAt: ['$book.title', 0] } },
          favoriteCount: { $sum: 1 }
        }
      },
      { $sort: { favoriteCount: -1 } },
      { $limit: 5 }
    ]);
    
    console.log(`\n📚 MOST POPULAR BOOKS:`);
    popularBooks.forEach((book, index) => {
      console.log(`${index + 1}. ${book.bookTitle}: ${book.favoriteCount} favorites`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

createSampleFavorites();