const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Library',
    required: true
  }
}, {
  timestamps: true
});

// Prevent duplicate favorites
favoriteSchema.index({ userId: 1, bookId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);