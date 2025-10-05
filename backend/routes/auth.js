const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register with Email Verification
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, role } = req.body;
    
    // Check if trying to create superadmin
    if (role === 'superadmin') {
      const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
      if (existingSuperAdmin) {
        return res.status(400).json({ message: 'Super admin already exists. Only one super admin allowed.' });
      }
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        // User exists but not verified, resend verification email
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        existingUser.emailVerificationToken = emailVerificationToken;
        existingUser.emailVerificationExpires = emailVerificationExpires;
        await existingUser.save();
        
        const { sendVerificationEmail } = require('../utils/emailService');
        const emailResult = await sendVerificationEmail(email, existingUser.name, emailVerificationToken);
        
        return res.status(200).json({
          message: 'Account exists but not verified. We have sent a new verification email.',
          emailSent: emailResult.success
        });
      } else {
        return res.status(400).json({ message: 'User already exists with this email. Please login instead.' });
      }
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({ 
      name, 
      email, 
      phone, 
      password, 
      role: role || 'user',
      isVerified: false, // Require email verification
      emailVerificationToken,
      emailVerificationExpires
    });
    await user.save();

    // Send verification email
    const { sendVerificationEmail } = require('../utils/emailService');
    const emailResult = await sendVerificationEmail(email, name, emailVerificationToken);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }
    
    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      emailSent: emailResult.success
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login with Email Verification Check
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Block super admin from regular login
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'Super Admin must use dedicated portal. Please use /superadmin-login' });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Check if email is verified
    if (!user.isVerified) {
      return res.status(400).json({ 
        message: 'Please verify your email before logging in. Check your inbox for verification link.',
        needsVerification: true
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        city: user.city,
        profileImage: user.profileImage,
        preferences: user.preferences,
        totalBookings: user.totalBookings,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Super Admin Login (Separate route)
router.post('/superadmin-login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Super Admin login attempt:', { email });
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Super Admin not found with this email' });
    }
    
    // Only allow super admin role
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Super Admin credentials required.' });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid super admin password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        city: user.city,
        profileImage: user.profileImage,
        preferences: user.preferences,
        totalBookings: user.totalBookings,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Super Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout - Simplified
router.post('/logout', auth, async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        city: user.city,
        profileImage: user.profileImage,
        preferences: user.preferences,
        totalBookings: user.totalBookings,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify Email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token || token.length !== 64) {
      return res.status(400).json({ message: 'Invalid verification token format' });
    }
    
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();
    
    // Send welcome email
    try {
      const { sendWelcomeEmail } = require('../utils/emailService');
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }
    
    res.json({ message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Resend Verification Email
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();
    
    // Send verification email
    const { sendVerificationEmail } = require('../utils/emailService');
    const emailResult = await sendVerificationEmail(email, user.name, emailVerificationToken);
    
    if (emailResult.success) {
      res.json({ message: 'Verification email sent successfully!' });
    } else {
      res.status(500).json({ message: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;