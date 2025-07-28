const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class PasswordPolicyService {
  constructor() {
    // Configurable password policy rules
    this.config = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minSpecialChars: 1,
      preventCommonPasswords: true,
      preventUserInfoInPassword: true,
      passwordHistoryCount: 5, // Number of previous passwords to remember
      minPasswordAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      maxPasswordAge: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
      strengthThreshold: 3 // Minimum strength score (1-5)
    };

    // Common passwords list (subset for demonstration)
    this.commonPasswords = new Set([
      'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
      'qwerty123', 'admin123', 'root', 'toor', 'pass', '12345678'
    ]);

    // Special characters regex
    this.specialCharsRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  }

  /**
   * Validate password against policy rules
   * @param {string} password - Password to validate
   * @param {Object} userInfo - User information to check against
   * @returns {Object} Validation result with success, errors, and strength score
   */
  validatePassword(password, userInfo = {}) {
    const errors = [];
    const warnings = [];

    // Basic length validation
    if (!password || password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    if (password && password.length > this.config.maxLength) {
      errors.push(`Password must not exceed ${this.config.maxLength} characters`);
    }

    if (!password) {
      return {
        success: false,
        errors,
        warnings,
        strengthScore: 0,
        strengthText: 'Invalid'
      };
    }

    // Character type requirements
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.requireSpecialChars) {
      const specialCharCount = (password.match(this.specialCharsRegex) || []).length;
      if (specialCharCount < this.config.minSpecialChars) {
        errors.push(`Password must contain at least ${this.config.minSpecialChars} special character(s)`);
      }
    }

    // Common password check
    if (this.config.preventCommonPasswords && this.commonPasswords.has(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a more unique password');
    }

    // User information check
    if (this.config.preventUserInfoInPassword && userInfo) {
      const userInfoFields = [userInfo.name, userInfo.email, userInfo.username];
      for (const field of userInfoFields) {
        if (field) {
          // Check if password contains the field or parts of it
          const fieldParts = field.toLowerCase().split(/[\s@.]+/);
          for (const part of fieldParts) {
            if (part.length >= 3 && password.toLowerCase().includes(part)) {
              errors.push('Password must not contain personal information');
              break;
            }
          }
        }
      }
    }

    // Calculate strength score
    const strengthScore = this.calculatePasswordStrength(password);
    const strengthText = this.getStrengthText(strengthScore);

    // Check minimum strength requirement
    if (strengthScore < this.config.strengthThreshold) {
      warnings.push(`Password strength is ${strengthText}. Consider using a stronger password`);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      strengthScore,
      strengthText
    };
  }

  /**
   * Calculate password strength score (1-5)
   * @param {string} password - Password to analyze
   * @returns {number} Strength score from 1 (weak) to 5 (very strong)
   */
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length scoring (more weight for longer passwords)
    if (password.length >= 8) score += 2;
    if (password.length >= 12) score += 2;
    if (password.length >= 16) score += 2;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (this.specialCharsRegex.test(password)) score += 1;

    // Pattern analysis (bonus points for good patterns)
    if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
    if (!/012|123|234|345|456|567|678|789|890|abc|bcd|cde/.test(password.toLowerCase())) {
      score += 1; // No sequential patterns
    }

    // Entropy check (simplified)
    const uniqueChars = new Set(password).size;
    if (uniqueChars / password.length > 0.7) score += 1;

    // Common password penalty
    if (this.commonPasswords.has(password.toLowerCase())) {
      score = Math.max(1, score - 3);
    }

    // Convert to 1-5 scale
    if (score <= 3) return 1;
    if (score <= 5) return 2;
    if (score <= 7) return 3;
    if (score <= 9) return 4;
    return 5;
  }

  /**
   * Get strength text description
   * @param {number} score - Strength score
   * @returns {string} Strength description
   */
  getStrengthText(score) {
    const strengthMap = {
      1: 'Very Weak',
      2: 'Weak',
      3: 'Fair',
      4: 'Strong',
      5: 'Very Strong'
    };
    return strengthMap[score] || 'Invalid';
  }

  /**
   * Generate password strength feedback
   * @param {string} password - Password to analyze
   * @returns {Object} Detailed feedback for password improvement
   */
  generatePasswordFeedback(password) {
    const feedback = {
      score: this.calculatePasswordStrength(password),
      suggestions: []
    };

    if (password.length < 12) {
      feedback.suggestions.push('Use at least 12 characters for better security');
    }

    if (!/[A-Z]/.test(password)) {
      feedback.suggestions.push('Add uppercase letters');
    }

    if (!/[a-z]/.test(password)) {
      feedback.suggestions.push('Add lowercase letters');
    }

    if (!/\d/.test(password)) {
      feedback.suggestions.push('Add numbers');
    }

    if (!this.specialCharsRegex.test(password)) {
      feedback.suggestions.push('Add special characters (!@#$%^&*)');
    }

    if (/(.)\1{2,}/.test(password)) {
      feedback.suggestions.push('Avoid repeating characters');
    }

    if (/012|123|234|345|456|567|678|789|890/.test(password)) {
      feedback.suggestions.push('Avoid sequential numbers');
    }

    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/.test(password.toLowerCase())) {
      feedback.suggestions.push('Avoid sequential letters');
    }

    return feedback;
  }

  /**
   * Check if password is in user's password history
   * @param {string} newPassword - New password to check
   * @param {Array} passwordHistory - Array of previous password hashes
   * @returns {Promise<boolean>} True if password was used before
   */
  async isPasswordInHistory(newPassword, passwordHistory = []) {
    if (!passwordHistory || passwordHistory.length === 0) {
      return false;
    }

    for (const historyEntry of passwordHistory) {
      const isMatch = await bcrypt.compare(newPassword, historyEntry.hash);
      if (isMatch) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add password to user's history
   * @param {string} passwordHash - Hashed password to add
   * @param {Array} currentHistory - Current password history
   * @returns {Array} Updated password history
   */
  addToPasswordHistory(passwordHash, currentHistory = []) {
    const newEntry = {
      hash: passwordHash,
      createdAt: new Date()
    };

    const updatedHistory = [newEntry, ...currentHistory];
    
    // Keep only the configured number of passwords
    return updatedHistory.slice(0, this.config.passwordHistoryCount);
  }

  /**
   * Check if password change is allowed based on minimum age
   * @param {Date} lastPasswordChange - Date of last password change
   * @returns {Object} Result with allowed status and time remaining
   */
  canChangePassword(lastPasswordChange) {
    if (!lastPasswordChange) {
      return { allowed: true, timeRemaining: 0 };
    }

    const timeSinceChange = Date.now() - lastPasswordChange.getTime();
    const timeRemaining = this.config.minPasswordAge - timeSinceChange;

    return {
      allowed: timeSinceChange >= this.config.minPasswordAge,
      timeRemaining: Math.max(0, timeRemaining),
      timeRemainingHours: Math.ceil(timeRemaining / (60 * 60 * 1000))
    };
  }

  /**
   * Check if password has expired
   * @param {Date} lastPasswordChange - Date of last password change
   * @returns {Object} Result with expired status and days until expiry
   */
  isPasswordExpired(lastPasswordChange) {
    if (!lastPasswordChange) {
      return { expired: false, daysUntilExpiry: null };
    }

    const timeSinceChange = Date.now() - lastPasswordChange.getTime();
    const timeUntilExpiry = this.config.maxPasswordAge - timeSinceChange;
    const daysUntilExpiry = Math.ceil(timeUntilExpiry / (24 * 60 * 60 * 1000));

    return {
      expired: timeSinceChange >= this.config.maxPasswordAge,
      daysUntilExpiry: Math.max(0, daysUntilExpiry)
    };
  }

  /**
   * Generate a secure random password
   * @param {number} length - Password length (default: 16)
   * @returns {string} Generated password
   */
  generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + specialChars;
    let password = '';

    // Ensure at least one character from each required type
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += specialChars[crypto.randomInt(specialChars.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Update password policy configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current password policy configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

module.exports = PasswordPolicyService;