const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailService');

const router = express.Router();

// Register
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
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = new User({ 
      name, 
      email, 
      phone, 
      password, 
      role: role || 'user',
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpiry,
      isVerified: false
    });
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      console.log('Verification email sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login (Regular users and admins only)
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
    console.log('Login attempt:', { email, password });
    
    const user = await User.findOne({ email });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(400).json({ message: 'User not found with this email' });
    }
    
    // Block super admin from regular login
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'Super Admin must use dedicated portal. Please use /superadmin-login' });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Allow login regardless of verification status for now
    // TODO: Implement proper email verification flow later

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

// Forgot Password
router.post('/forgot-password', [
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
      return res.status(404).json({ message: 'User not found with this email address' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
      console.log('Password reset email sent to:', user.email);
      
      res.json({ 
        message: 'Password reset email sent successfully! Please check your email.',
        success: true 
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      res.status(500).json({ 
        message: 'Failed to send reset email. Please try again later.',
        error: emailError.message 
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
      return res.status(404).json({ message: 'User not found with this email address' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpiry;
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      console.log('Verification email resent to:', user.email);
      
      res.json({ 
        message: 'Verification email sent successfully! Please check your email.',
        success: true 
      });
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      res.status(500).json({ 
        message: 'Failed to send verification email. Please try again later.',
        error: emailError.message 
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify Email
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;
    
    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token. Please request a new verification email.' 
      });
    }

    // Verify email
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send welcome email after verification
    try {
      await sendWelcomeEmail(user.email, user.name);
      console.log('Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Generate new JWT token
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Email verified successfully! Welcome to Library Booking System.',
      token: jwtToken,
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
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    
    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Generate new JWT token
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Password reset successful! You are now logged in.',
      token: jwtToken,
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
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

module.exports = router;