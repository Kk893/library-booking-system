const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const PasswordPolicyService = require('./passwordPolicyService');

class PasswordResetService {
  constructor() {
    this.passwordPolicyService = new PasswordPolicyService();
    
    this.config = {
      // Token configuration
      tokenLength: 32, // 32 bytes = 256 bits
      tokenExpiryMs: 15 * 60 * 1000, // 15 minutes
      
      // Rate limiting
      maxResetAttempts: 3, // Max reset requests per time window
      resetWindowMs: 60 * 60 * 1000, // 1 hour window
      
      // Security settings
      requireCurrentPassword: false, // For password change vs reset
      requireEmailVerification: true,
      allowResetWithMFA: false, // Require MFA bypass for reset
      
      // Additional verification
      requireSecurityQuestions: false,
      requireDeviceVerification: false,
      
      // Lockout settings
      maxFailedVerifications: 5,
      lockoutDurationMs: 30 * 60 * 1000 // 30 minutes
    };
  }

  /**
   * Generate secure password reset token
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {Object} options - Additional options
   * @returns {Object} Reset token data
   */
  generateResetToken(userId, email, options = {}) {
    try {
      // Generate cryptographically secure token
      const token = crypto.randomBytes(this.config.tokenLength).toString('hex');
      
      // Create token hash for storage (never store plain token)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Calculate expiry time
      const expiresAt = new Date(Date.now() + this.config.tokenExpiryMs);
      
      // Generate additional security data
      const securityData = {
        userAgent: options.userAgent || null,
        ip: options.ip || null,
        timestamp: new Date(),
        attempts: 0
      };

      return {
        token, // Return plain token (send to user)
        tokenHash, // Store this in database
        userId,
        email,
        expiresAt,
        securityData,
        used: false,
        createdAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to generate reset token: ${error.message}`);
    }
  }

  /**
   * Verify password reset token
   * @param {string} token - Plain token from user
   * @param {Object} storedResetData - Stored reset data from database
   * @param {Object} requestData - Current request data
   * @returns {Object} Verification result
   */
  verifyResetToken(token, storedResetData, requestData = {}) {
    try {
      if (!token || !storedResetData) {
        return {
          valid: false,
          error: 'Invalid reset token',
          errorCode: 'INVALID_TOKEN'
        };
      }

      // Check if token is already used
      if (storedResetData.used) {
        return {
          valid: false,
          error: 'Reset token has already been used',
          errorCode: 'TOKEN_USED'
        };
      }

      // Check if token is expired
      if (new Date() > new Date(storedResetData.expiresAt)) {
        return {
          valid: false,
          error: 'Reset token has expired',
          errorCode: 'TOKEN_EXPIRED'
        };
      }

      // Verify token hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      if (tokenHash !== storedResetData.tokenHash) {
        return {
          valid: false,
          error: 'Invalid reset token',
          errorCode: 'INVALID_TOKEN'
        };
      }

      // Additional security checks
      const securityCheck = this.performSecurityChecks(storedResetData, requestData);
      if (!securityCheck.passed) {
        return {
          valid: false,
          error: securityCheck.error,
          errorCode: securityCheck.errorCode
        };
      }

      return {
        valid: true,
        userId: storedResetData.userId,
        email: storedResetData.email,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        valid: false,
        error: 'Token verification failed',
        errorCode: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * Perform additional security checks
   * @param {Object} storedResetData - Stored reset data
   * @param {Object} requestData - Current request data
   * @returns {Object} Security check result
   * @private
   */
  performSecurityChecks(storedResetData, requestData) {
    // Check for too many verification attempts
    if (storedResetData.securityData.attempts >= this.config.maxFailedVerifications) {
      return {
        passed: false,
        error: 'Too many verification attempts',
        errorCode: 'TOO_MANY_ATTEMPTS'
      };
    }

    // Optional: Check user agent consistency
    if (this.config.requireDeviceVerification && 
        storedResetData.securityData.userAgent && 
        requestData.userAgent &&
        storedResetData.securityData.userAgent !== requestData.userAgent) {
      
      return {
        passed: false,
        error: 'Device verification failed',
        errorCode: 'DEVICE_MISMATCH'
      };
    }

    // Optional: Check IP consistency (with some tolerance for mobile networks)
    if (this.config.requireDeviceVerification && 
        storedResetData.securityData.ip && 
        requestData.ip) {
      
      const originalIP = storedResetData.securityData.ip;
      const currentIP = requestData.ip;
      
      // Allow same IP or same subnet (basic check)
      if (!this.isIPSimilar(originalIP, currentIP)) {
        return {
          passed: false,
          error: 'Location verification failed',
          errorCode: 'LOCATION_MISMATCH'
        };
      }
    }

    return { passed: true };
  }

  /**
   * Check if IPs are similar (same or similar subnet)
   * @param {string} ip1 - First IP
   * @param {string} ip2 - Second IP
   * @returns {boolean} True if IPs are similar
   * @private
   */
  isIPSimilar(ip1, ip2) {
    if (ip1 === ip2) return true;
    
    // Basic subnet check for IPv4 (same first 3 octets)
    const parts1 = ip1.split('.');
    const parts2 = ip2.split('.');
    
    if (parts1.length === 4 && parts2.length === 4) {
      return parts1[0] === parts2[0] && 
             parts1[1] === parts2[1] && 
             parts1[2] === parts2[2];
    }
    
    return false;
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @param {Object} storedResetData - Stored reset data
   * @param {Object} user - User object
   * @param {Object} options - Additional options
   * @returns {Object} Reset result
   */
  async resetPassword(token, newPassword, storedResetData, user, options = {}) {
    try {
      // Verify token first
      const tokenVerification = this.verifyResetToken(token, storedResetData, options.requestData);
      if (!tokenVerification.valid) {
        return {
          success: false,
          error: tokenVerification.error,
          errorCode: tokenVerification.errorCode
        };
      }

      // Validate new password
      const passwordValidation = this.passwordPolicyService.validatePassword(
        newPassword, 
        { name: user.name, email: user.email }
      );

      if (!passwordValidation.success) {
        return {
          success: false,
          error: 'Password does not meet security requirements',
          errorCode: 'INVALID_PASSWORD',
          details: passwordValidation.errors
        };
      }

      // Check password history
      if (user.passwordHistory && user.passwordHistory.length > 0) {
        const isInHistory = await this.passwordPolicyService.isPasswordInHistory(
          newPassword, 
          user.passwordHistory
        );

        if (isInHistory) {
          return {
            success: false,
            error: 'Password has been used recently. Please choose a different password',
            errorCode: 'PASSWORD_REUSED'
          };
        }
      }

      // Hash new password
      const saltRounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS) : 14;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Add current password to history before changing
      if (user.password) {
        const updatedHistory = this.passwordPolicyService.addToPasswordHistory(
          user.password, 
          user.passwordHistory || []
        );
        user.passwordHistory = updatedHistory;
      }

      // Update user password
      user.password = hashedPassword;
      user.passwordLastChanged = new Date();
      user.forcePasswordChange = false;

      // Update password strength
      user.passwordStrength = {
        score: passwordValidation.strengthScore,
        text: passwordValidation.strengthText
      };

      // Reset failed login attempts
      user.loginAttempts = 0;
      user.lockUntil = undefined;

      // Invalidate all existing sessions
      user.tokenVersion += 1;

      // Mark reset token as used
      storedResetData.used = true;
      storedResetData.usedAt = new Date();

      return {
        success: true,
        message: 'Password reset successfully',
        timestamp: new Date(),
        passwordStrength: passwordValidation.strengthScore
      };

    } catch (error) {
      return {
        success: false,
        error: 'Password reset failed',
        errorCode: 'RESET_ERROR'
      };
    }
  }

  /**
   * Check rate limiting for password reset requests
   * @param {Array} resetAttempts - Array of previous reset attempt timestamps
   * @returns {Object} Rate limit status
   */
  checkResetRateLimit(resetAttempts = []) {
    if (!Array.isArray(resetAttempts)) {
      return { allowed: true, remainingAttempts: this.config.maxResetAttempts };
    }

    // Filter recent attempts within the time window
    const cutoffTime = new Date(Date.now() - this.config.resetWindowMs);
    const recentAttempts = resetAttempts.filter(attempt => 
      new Date(attempt) > cutoffTime
    );

    const remainingAttempts = Math.max(0, this.config.maxResetAttempts - recentAttempts.length);
    const allowed = recentAttempts.length < this.config.maxResetAttempts;

    let nextAllowedTime = null;
    if (!allowed && recentAttempts.length > 0) {
      const oldestAttempt = new Date(Math.min(...recentAttempts.map(a => new Date(a).getTime())));
      nextAllowedTime = new Date(oldestAttempt.getTime() + this.config.resetWindowMs);
    }

    return {
      allowed,
      remainingAttempts,
      nextAllowedTime,
      recentAttempts: recentAttempts.length
    };
  }

  /**
   * Generate secure password reset link
   * @param {string} token - Reset token
   * @param {string} baseUrl - Base URL of the application
   * @returns {string} Reset link
   */
  generateResetLink(token, baseUrl) {
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  /**
   * Validate password change request (different from reset)
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {Object} user - User object
   * @returns {Object} Validation result
   */
  async validatePasswordChange(currentPassword, newPassword, user) {
    try {
      // Verify current password
      const isCurrentValid = await user.comparePassword(currentPassword);
      if (!isCurrentValid) {
        return {
          valid: false,
          error: 'Current password is incorrect',
          errorCode: 'INVALID_CURRENT_PASSWORD'
        };
      }

      // Check if new password is same as current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return {
          valid: false,
          error: 'New password must be different from current password',
          errorCode: 'SAME_PASSWORD'
        };
      }

      // Check minimum password age
      const ageCheck = this.passwordPolicyService.canChangePassword(user.passwordLastChanged);
      if (!ageCheck.allowed) {
        return {
          valid: false,
          error: `Password can be changed in ${ageCheck.timeRemainingHours} hours`,
          errorCode: 'PASSWORD_TOO_RECENT'
        };
      }

      // Validate new password
      const passwordValidation = this.passwordPolicyService.validatePassword(
        newPassword, 
        { name: user.name, email: user.email }
      );

      if (!passwordValidation.success) {
        return {
          valid: false,
          error: 'New password does not meet security requirements',
          errorCode: 'INVALID_NEW_PASSWORD',
          details: passwordValidation.errors
        };
      }

      // Check password history
      if (user.passwordHistory && user.passwordHistory.length > 0) {
        const isInHistory = await this.passwordPolicyService.isPasswordInHistory(
          newPassword, 
          user.passwordHistory
        );

        if (isInHistory) {
          return {
            valid: false,
            error: 'Password has been used recently. Please choose a different password',
            errorCode: 'PASSWORD_REUSED'
          };
        }
      }

      return {
        valid: true,
        passwordStrength: passwordValidation.strengthScore
      };

    } catch (error) {
      return {
        valid: false,
        error: 'Password validation failed',
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Clean up expired reset tokens
   * @param {Array} resetTokens - Array of reset token objects
   * @returns {Array} Cleaned array with only valid tokens
   */
  cleanupExpiredTokens(resetTokens = []) {
    const now = new Date();
    return resetTokens.filter(token => 
      new Date(token.expiresAt) > now && !token.used
    );
  }

  /**
   * Generate password reset audit log entry
   * @param {string} action - Action performed
   * @param {Object} details - Additional details
   * @returns {Object} Audit log entry
   */
  generateAuditLogEntry(action, details = {}) {
    return {
      action,
      timestamp: new Date(),
      details: {
        ip: details.ip || null,
        userAgent: details.userAgent || null,
        userId: details.userId || null,
        email: details.email || null,
        success: details.success || false,
        errorCode: details.errorCode || null
      }
    };
  }

  /**
   * Get configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = PasswordResetService;