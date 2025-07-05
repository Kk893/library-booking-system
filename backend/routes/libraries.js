const express = require('express');
const Library = require('../models/Library');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all libraries with search and filter
router.get('/', async (req, res) => {
  try {
    const { city, area, search } = req.query;
    let query = { isActive: true };
    
    if (city) query.city = new RegExp(city, 'i');
    if (area) query.area = new RegExp(area, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
        { area: new RegExp(search, 'i') }
      ];
    }

    const libraries = await Library.find(query).select('-adminId');
    res.json(libraries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get library by ID
router.get('/:id', async (req, res) => {
  try {
    const library = await Library.findById(req.params.id).select('-adminId');
    if (!library) {
      return res.status(404).json({ message: 'Library not found' });
    }
    res.json(library);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available cities
router.get('/meta/cities', async (req, res) => {
  try {
    const cities = await Library.distinct('city', { isActive: true });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get nearby libraries based on location
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const libraries = await Library.find({ isActive: true }).select('-adminId');
    
    if (!libraries || libraries.length === 0) {
      return res.json([]);
    }
    
    // Pincode-based coordinates for better location accuracy
    const pincodeCoordinates = {
      // Mumbai
      '400001': { lat: 19.0330, lng: 72.8570 },
      '400002': { lat: 19.0410, lng: 72.8570 },
      '400020': { lat: 19.0176, lng: 72.8562 },
      '400050': { lat: 19.0596, lng: 72.8295 },
      '400070': { lat: 19.1136, lng: 72.8697 },
      // Delhi
      '110001': { lat: 28.6358, lng: 77.2244 },
      '110011': { lat: 28.5706, lng: 77.3272 },
      '110021': { lat: 28.6304, lng: 77.2177 },
      '110060': { lat: 28.4595, lng: 77.0266 },
      // Bangalore
      '560001': { lat: 12.9716, lng: 77.5946 },
      '560025': { lat: 12.9698, lng: 77.7500 },
      '560066': { lat: 12.9279, lng: 77.6271 },
      '560100': { lat: 13.0827, lng: 77.5946 },
      // Chennai
      '600001': { lat: 13.0827, lng: 80.2707 },
      '600020': { lat: 13.0569, lng: 80.2091 },
      '600040': { lat: 13.0475, lng: 80.2574 },
      // Pune
      '411001': { lat: 18.5204, lng: 73.8567 },
      '411014': { lat: 18.5679, lng: 73.9143 },
      '411038': { lat: 18.4574, lng: 73.8567 }
    };
    
    // Fallback city coordinates
    const cityCoordinates = {
      'Mumbai': { lat: 19.0760, lng: 72.8777 },
      'Delhi': { lat: 28.6139, lng: 77.2090 },
      'Bangalore': { lat: 12.9716, lng: 77.5946 },
      'Chennai': { lat: 13.0827, lng: 80.2707 },
      'Pune': { lat: 18.5204, lng: 73.8567 }
    };
    
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    
    // Calculate distance using Haversine formula (more accurate)
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };
    
    // Filter and sort libraries by distance using pincode or city
    let nearbyLibraries = [];
    
    try {
      nearbyLibraries = libraries
        .map(library => {
          try {
            // Try pincode first, then fallback to city
            let coord = pincodeCoordinates[library.pincode] || cityCoordinates[library.city];
            if (!coord) return null;
            
            const distance = calculateDistance(userLat, userLng, coord.lat, coord.lng);
            const libraryObj = library.toJSON ? library.toJSON() : library;
            return { ...libraryObj, distance: Math.round(distance * 10) / 10 };
          } catch (error) {
            console.error('Error processing library:', library.name, error);
            return null;
          }
        })
        .filter(library => library && library.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10); // Limit to 10 nearest libraries
    } catch (error) {
      console.error('Error filtering libraries:', error);
      nearbyLibraries = [];
    }
    
    res.json(nearbyLibraries || []);
  } catch (error) {
    console.error('Nearby libraries error:', error);
    res.json([]);
  }
});

// Get seat availability for a library
router.get('/:id/seats/availability', async (req, res) => {
  try {
    const { date, timeSlot } = req.query;
    const library = await Library.findById(req.params.id);
    
    if (!library) {
      return res.status(404).json({ message: 'Library not found' });
    }

    // Get booked seats for the date and time slot
    const Booking = require('../models/Booking');
    const bookedSeats = await Booking.find({
      libraryId: req.params.id,
      type: 'seat',
      date: new Date(date),
      'timeSlot.name': timeSlot,
      status: { $in: ['confirmed', 'pending'] }
    }).select('seatNumbers seatType');

    // Calculate availability
    const availability = {
      regular: {
        total: library.seatLayout.regular.count,
        booked: bookedSeats.filter(b => b.seatType === 'regular').reduce((acc, b) => acc + b.seatNumbers.length, 0),
        price: library.seatLayout.regular.price
      },
      ac: {
        total: library.seatLayout.ac.count,
        booked: bookedSeats.filter(b => b.seatType === 'ac').reduce((acc, b) => acc + b.seatNumbers.length, 0),
        price: library.seatLayout.ac.price
      },
      premium: {
        total: library.seatLayout.premium.count,
        booked: bookedSeats.filter(b => b.seatType === 'premium').reduce((acc, b) => acc + b.seatNumbers.length, 0),
        price: library.seatLayout.premium.price
      }
    };

    Object.keys(availability).forEach(type => {
      availability[type].available = availability[type].total - availability[type].booked;
    });

    res.json({ availability, timeSlots: library.timeSlots });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;