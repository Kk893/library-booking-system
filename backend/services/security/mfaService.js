const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class MFAService {
  constructor() {
    this.config = {
      // TOTP configuration
      issuer: process.env.TOTP_ISSUER || 'LibraryBookingApp',
      window: 2, // Allow 2 time steps before/after current time (60 seconds total)
      step: 30, // 30 second time step
      digits: 6, // 6 digit codes
      algorithm: 'sha1', // Standard TOTP algorithm
      
      // Backup codes configuration
      backupCodeLength: 8,
      backupCodeCount: 10,
      
      // Security settings
      maxFailedAttempts: 5,
      lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
      
      // QR code settings
      qrCodeSize: 200,
      qrCodeErrorCorrectionLevel: 'M'
    };
  }

  /**
   * Generate TOTP secret for a user
   * @param {string} userId - User ID
   * @param {string} userEmail - User email for QR code label
   * @returns {Object} Secret and QR code data
   */
  async generateTOTPSecret(userId, userEmail) {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: this.config.issuer,
        length: 32 // 32 byte secret for enhanced security
      });

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url, {
        width: this.config.qrCodeSize,
        errorCorrectionLevel: this.config.qrCodeErrorCorrectionLevel,
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        secret: secret.base32,
        qrCode: qrCodeDataURL,
        manualEntryKey: secret.base32,
        otpauthUrl: secret.otpauth_url,
        issuer: this.config.issuer,
        algorithm: this.config.algorithm,
        digits: this.config.digits,
        period: this.config.step
      };

    } catch (error) {
      throw new Error(`Failed to generate TOTP secret: ${error.message}`);
    }
  }

  /**
   * Verify TOTP token
   * @param {string} token - 6-digit TOTP token
   * @param {string} secret - User's TOTP secret
   * @param {Object} options - Verification options
   * @returns {Object} Verification result
   */
  verifyTOTP(token, secret, options = {}) {
    try {
      // Validate inputs
      if (!token || !secret) {
        return {
          verified: false,
          error: 'Token and secret are required'
        };
      }

      // Clean token (remove spaces, ensure 6 digits)
      const cleanToken = token.replace(/\s/g, '');
      if (!/^\d{6}$/.test(cleanToken)) {
        return {
          verified: false,
          error: 'Token must be 6 digits'
        };
      }

      // Verify token with time window tolerance
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: options.window || this.config.window,
        step: this.config.step,
        digits: this.config.digits,
        algorithm: this.config.algorithm
      });

      if (verified) {
        return {
          verified: true,
          timestamp: new Date(),
          window: options.window || this.config.window
        };
      } else {
        return {
          verified: false,
          error: 'Invalid token',
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        verified: false,
        error: `Verification failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate backup codes for MFA recovery
   * @param {number} count - Number of backup codes to generate
   * @returns {Array} Array of backup codes
   */
  generateBackupCodes(count = null) {
    const codeCount = count || this.config.backupCodeCount;
    const codes = [];

    for (let i = 0; i < codeCount; i++) {
      // Generate cryptographically secure backup code
      const code = this.generateSecureCode(this.config.backupCodeLength);
      codes.push({
        code: code,
        used: false,
        createdAt: new Date(),
        usedAt: null
      });
    }

    return codes;
  }

  /**
   * Verify backup code
   * @param {string} inputCode - Backup code provided by user
   * @param {Array} backupCodes - User's backup codes
   * @returns {Object} Verification result
   */
  verifyBackupCode(inputCode, backupCodes) {
    try {
      if (!inputCode || !backupCodes || !Array.isArray(backupCodes)) {
        return {
          verified: false,
          error: 'Invalid input parameters'
        };
      }

      // Clean input code (remove spaces and dashes, convert to uppercase)
      const cleanCode = inputCode.replace(/[\s-]/g, '').toUpperCase();

      // Find matching unused backup code (compare with cleaned version)
      const matchingCode = backupCodes.find(bc => {
        const cleanStoredCode = bc.code.replace(/[\s-]/g, '').toUpperCase();
        return cleanStoredCode === cleanCode && !bc.used;
      });

      if (matchingCode) {
        // Mark code as used
        matchingCode.used = true;
        matchingCode.usedAt = new Date();

        return {
          verified: true,
          codeUsed: matchingCode.code,
          timestamp: new Date(),
          remainingCodes: backupCodes.filter(bc => !bc.used).length
        };
      } else {
        return {
          verified: false,
          error: 'Invalid or already used backup code',
          timestamp: new Date()
        };
      }

    } catch (error) {
      return {
        verified: false,
        error: `Backup code verification failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate current TOTP token (for testing purposes)
   * @param {string} secret - TOTP secret
   * @returns {string} Current TOTP token
   */
  generateCurrentToken(secret) {
    try {
      if (!secret) {
        throw new Error('Secret is required');
      }
      
      return speakeasy.totp({
        secret: secret,
        encoding: 'base32',
        step: this.config.step,
        digits: this.config.digits,
        algorithm: this.config.algorithm
      });
    } catch (error) {
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }

  /**
   * Get time remaining until next token
   * @returns {number} Seconds until next token
   */
  getTimeRemaining() {
    const now = Math.floor(Date.now() / 1000);
    const timeStep = this.config.step;
    const currentStep = Math.floor(now / timeStep);
    const nextStep = (currentStep + 1) * timeStep;
    return nextStep - now;
  }

  /**
   * Validate MFA setup completion
   * @param {string} secret - TOTP secret
   * @param {string} verificationToken - Token provided by user
   * @returns {Object} Validation result
   */
  validateMFASetup(secret, verificationToken) {
    const verification = this.verifyTOTP(verificationToken, secret);
    
    if (verification.verified) {
      return {
        valid: true,
        message: 'MFA setup completed successfully',
        timestamp: new Date()
      };
    } else {
      return {
        valid: false,
        error: verification.error || 'Invalid verification token',
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate secure backup code
   * @param {number} length - Code length
   * @returns {string} Secure backup code
   * @private
   */
  generateSecureCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      result += chars[randomIndex];
    }
    
    // Format with dashes for readability (XXXX-XXXX)
    if (length === 8) {
      return result.substring(0, 4) + '-' + result.substring(4);
    }
    
    return result;
  }

  /**
   * Check if user has exceeded failed MFA attempts
   * @param {Array} failedAttempts - Array of failed attempt timestamps
   * @returns {Object} Lockout status
   */
  checkMFALockout(failedAttempts = []) {
    if (!Array.isArray(failedAttempts) || failedAttempts.length === 0) {
      return { 
        locked: false, 
        remainingAttempts: this.config.maxFailedAttempts,
        unlockTime: null,
        recentFailures: 0
      };
    }

    // Filter recent failed attempts (within lockout duration)
    const cutoffTime = new Date(Date.now() - this.config.lockoutDurationMs);
    const recentFailures = failedAttempts.filter(attempt => 
      new Date(attempt) > cutoffTime
    );

    const remainingAttempts = Math.max(0, this.config.maxFailedAttempts - recentFailures.length);
    const locked = recentFailures.length >= this.config.maxFailedAttempts;

    let unlockTime = null;
    if (locked && recentFailures.length > 0) {
      const oldestFailure = new Date(Math.min(...recentFailures.map(f => new Date(f).getTime())));
      unlockTime = new Date(oldestFailure.getTime() + this.config.lockoutDurationMs);
    }

    return {
      locked,
      remainingAttempts,
      unlockTime,
      recentFailures: recentFailures.length
    };
  }

  /**
   * Generate MFA recovery information
   * @param {string} userId - User ID
   * @returns {Object} Recovery information
   */
  generateRecoveryInfo(userId) {
    const recoveryCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      recoveryCode,
      userId,
      expiresAt,
      used: false,
      createdAt: new Date()
    };
  }

  /**
   * Verify MFA recovery code
   * @param {string} recoveryCode - Recovery code
   * @param {Object} storedRecovery - Stored recovery information
   * @returns {Object} Verification result
   */
  verifyRecoveryCode(recoveryCode, storedRecovery) {
    if (!recoveryCode || !storedRecovery) {
      return { verified: false, error: 'Invalid recovery code' };
    }

    if (storedRecovery.used) {
      return { verified: false, error: 'Recovery code already used' };
    }

    if (new Date() > new Date(storedRecovery.expiresAt)) {
      return { verified: false, error: 'Recovery code expired' };
    }

    if (recoveryCode !== storedRecovery.recoveryCode) {
      return { verified: false, error: 'Invalid recovery code' };
    }

    return {
      verified: true,
      userId: storedRecovery.userId,
      timestamp: new Date()
    };
  }

  /**
   * Get MFA configuration
   * @returns {Object} Current MFA configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update MFA configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generate MFA status report for user
   * @param {Object} userMFAData - User's MFA data
   * @returns {Object} MFA status report
   */
  generateMFAStatus(userMFAData) {
    const status = {
      enabled: !!userMFAData.totpSecret,
      setupComplete: !!userMFAData.totpSecret && !!userMFAData.mfaEnabled,
      backupCodesGenerated: !!(userMFAData.backupCodes && userMFAData.backupCodes.length > 0),
      unusedBackupCodes: 0,
      lastUsed: userMFAData.lastMFAUsed || null,
      failedAttempts: userMFAData.mfaFailedAttempts ? userMFAData.mfaFailedAttempts.length : 0
    };

    if (userMFAData.backupCodes) {
      status.unusedBackupCodes = userMFAData.backupCodes.filter(bc => !bc.used).length;
    }

    const lockoutStatus = this.checkMFALockout(userMFAData.mfaFailedAttempts);
    status.locked = lockoutStatus.locked;
    status.unlockTime = lockoutStatus.unlockTime;

    return status;
  }
}

module.exports = MFAService;