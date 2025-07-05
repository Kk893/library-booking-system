const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true },
  type: { type: String, enum: ['seat', 'book'], required: true },
  
  // Seat booking fields
  seatNumbers: [{ type: String }],
  seatType: { type: String, enum: ['regular', 'ac', 'premium'] },
  date: { type: Date },
  timeSlot: {
    name: String,
    startTime: String,
    endTime: String
  },
  
  // Book booking fields
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  borrowDate: { type: Date },
  returnDate: { type: Date },
  actualReturnDate: { type: Date },
  
  // Common fields
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'overdue'], 
    default: 'pending' 
  },
  paymentId: { type: String },
  qrCode: { type: String },
  
  // Cancellation
  cancellationReason: { type: String },
  refundAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);