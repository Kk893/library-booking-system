const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists',
      });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      password,
      verificationToken,
      verificationTokenExpiry,
    });

    await newUser.save();

    // Send verification email
    await sendVerificationEmail(email, name, verificationToken);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please verify your email.',
      userId: newUser._id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        status: 'error',
        message: 'Please verify your email before logging in',
        isVerified: false,
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = user.generateAuthToken();

    // Save updated user with new token
    await user.save();

    // Set token in cookie for web clients
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/auth/social-login/:provider
 * @desc    Login or register with social provider (Google, Facebook)
 * @access  Public
 */
router.post('/social-login/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { token } = req.body;

    if (!['google', 'facebook'].includes(provider)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid social provider',
      });
    }

    // In a real app, verify the token with the provider's API
    // For this demo, we'll assume the token is valid and contains user info
    
    // This would be the result of verifying the token with Google/Facebook
    const mockVerifiedData = {
      // In a real app, these would come from the social provider's response
      socialId: `${provider}_${uuidv4()}`,
      email: req.body.email || `user_${Date.now()}@example.com`,
      name: req.body.name || 'Social User',
      profilePicture: req.body.profilePicture || null,
    };

    // Check if user exists with this social ID
    let user = await User.findOne({
      socialProvider: provider,
      socialId: mockVerifiedData.socialId,
    });

    // If not found by social ID, try to find by email
    if (!user && mockVerifiedData.email) {
      user = await User.findOne({ email: mockVerifiedData.email });
    }

    if (user) {
      // Existing user - update social info if not already set
      if (!user.socialProvider) {
        user.socialProvider = provider;
        user.socialId = mockVerifiedData.socialId;
      }
      
      // Update profile picture if provided
      if (mockVerifiedData.profilePicture) {
        user.profilePicture = mockVerifiedData.profilePicture;
      }
      
      // Update last login
      user.lastLogin = new Date();
      
      // Make sure user is verified
      user.isVerified = true;
      
      await user.save();
    } else {
      // New user - create account
      user = new User({
        name: mockVerifiedData.name,
        email: mockVerifiedData.email,
        profilePicture: mockVerifiedData.profilePicture,
        socialProvider: provider,
        socialId: mockVerifiedData.socialId,
        isVerified: true, // Social logins are auto-verified
      });
      
      await user.save();
    }

    // Generate JWT token
    const jwtToken = user.generateAuthToken();
    
    // Save updated user with new token
    await user.save();

    // Set token in cookie for web clients
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: 'success',
      message: 'Social login successful',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Social login failed. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify user email
 * @access  Public
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token',
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Verification failed. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP for phone verification
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // In a real app, you would verify the OTP against stored OTP
    // For this demo, we'll accept any OTP for the specified email

    // Find user with this email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Mark user as verified
    user.isVerified = true;
    
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'OTP verification failed. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user with this email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No account found with this email',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(email, user.name, resetToken);

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send reset email. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user with this reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token',
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    
    // Invalidate all existing tokens
    user.invalidateAllTokens();
    
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password reset failed. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -validTokens');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user details',
    });
  }
});

/**
 * @route   PUT /api/auth/me
 * @desc    Update user profile
 * @access  Private
 */
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      preferences,
    } = req.body;

    // Fields that can be updated
    const updateFields = {};
    
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    
    if (address) {
      updateFields.address = {
        ...address,
      };
    }
    
    if (preferences) {
      updateFields.preferences = {
        ...preferences,
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password -validTokens');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    
    // Invalidate all existing tokens except current one
    const currentToken = req.headers.authorization.split(' ')[1];
    user.invalidateAllTokens();
    user.validTokens = [currentToken];
    
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    
    // Get user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Invalidate token
    user.invalidateToken(token);
    await user.save();

    // Clear cookie
    res.clearCookie('token');

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
    });
  }
});

module.exports = router;