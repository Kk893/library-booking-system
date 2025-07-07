const express = require('express');
const Offer = require('../models/Offer');

const router = express.Router();

// Get all active offers
router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find({ 
      isActive: true,
      validUntil: { $gte: new Date() }
    }).sort({ createdAt: -1 });
    
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Validate promo code
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Promo code is required' });
    }
    
    const offer = await Offer.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      validUntil: { $gte: new Date() }
    });
    
    if (!offer) {
      return res.status(404).json({ message: 'Invalid or expired promo code' });
    }
    
    // Check usage limit
    if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
      return res.status(400).json({ message: 'Promo code usage limit exceeded' });
    }
    
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Apply offer (increment usage count)
router.post('/apply', async (req, res) => {
  try {
    const { offerId } = req.body;
    
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Increment usage count
    offer.usedCount = (offer.usedCount || 0) + 1;
    await offer.save();
    
    res.json({ message: 'Offer applied successfully', offer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public offers endpoint (no auth required)
router.get('/public-offers', async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;