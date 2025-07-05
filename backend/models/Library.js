const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  area: { type: String, required: true },
  pincode: { type: String, match: /^[0-9]{6}$/ },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  email: { type: String, required: true },
  openingHours: {
    open: { type: String, required: true },
    close: { type: String, required: true }
  },
  facilities: [{ type: String }], // ['WiFi', 'AC', 'Parking']
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' }
  },
  images: [{ type: String }],
  isActive: { type: Boolean, default: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seatLayout: {
    regular: { count: Number, price: Number },
    ac: { count: Number, price: Number },
    premium: { count: Number, price: Number }
  },
  timeSlots: [{
    name: String,
    startTime: String,
    endTime: String,
    isActive: { type: Boolean, default: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Library', librarySchema);