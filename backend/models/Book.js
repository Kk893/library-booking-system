const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  isbn: { type: String, unique: true, sparse: true },
  genre: { type: String, required: true },
  language: { type: String, required: true },
  synopsis: { type: String },
  coverImage: { type: String },
  totalCopies: { type: Number, required: true, default: 1 },
  availableCopies: { type: Number, required: true },
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: false },
  borrowPolicy: {
    maxDays: { type: Number, default: 14 },
    fine: { type: Number, default: 5 }, // per day
    reservationFee: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);