const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class PasswordHashingService {
  constructor() {
    // Enhanced security configuration
    this.config = {
      // Higher cost factor for enhanced security (14 rounds = ~1.5 seconds on modern hardware)
      saltRounds: process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS) : 14,
      // Minimum timing for constant-time operations (prevents timing attacks)
      minTimingMs: 100,
      // Maximum allowed cost factor to prevent DoS
      maxSaltRounds: 16,
      // Salt generation settings
      saltLength: 16
    };

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate configuration settings
   * @private
   */
  validateConfig() {
    if (this.config.saltRounds < 10) {
      console.warn('⚠️  SECURITY WARNING: bcrypt salt rounds below 10 is not recommended for production');
    }

    if (this.config.saltRounds > this.config.maxSaltRounds) {
      throw new Error(`Salt rounds (${this.config.saltRounds}) exceeds maximum allowed (${this.config.maxSaltRounds})`);
    }

    if (this.config.minTimingMs < 50) {
      console.warn('⚠️  SECURITY WARNING: Minimum timing below 50ms may not provide adequate timing attack protection');
    }
  }

  /**
   * Hash a password with enhanced security measures
   * @param {string} password - Plain text password to hash
   * @param {Object} options - Optional hashing options
   * @returns {Promise<Object>} Hash result with metadata
   */
  async hashPassword(password, options = {}) {
    const startTime = process.hrtime.bigint();

    try {
      // Validate input
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      if (password.length > 72) {
        // bcrypt has a 72 character limit
        throw new Error('Password exceeds maximum length of 72 characters');
      }

      // Use custom salt rounds if provided
      const saltRounds = options.saltRounds || this.config.saltRounds;
      
      if (saltRounds < 10 || saltRounds > this.config.maxSaltRounds) {
        throw new Error(`Salt rounds must be between 10 and ${this.config.maxSaltRounds}`);
      }

      // Generate salt and hash
      const salt = await bcrypt.genSalt(saltRounds);
      const hash = await bcrypt.hash(password, salt);

      // Ensure consistent timing
      await this.ensureMinimumTiming(startTime);

      return {
        hash,
        salt: salt,
        saltRounds,
        algorithm: 'bcrypt',
        timestamp: new Date(),
        version: '1.0'
      };

    } catch (error) {
      // Ensure consistent timing even on error
      await this.ensureMinimumTiming(startTime);
      throw error;
    }
  }

  /**
   * Verify a password against a hash with timing attack protection
   * @param {string} password - Plain text password to verify
   * @param {string} hash - Hash to verify against
   * @param {Object} options - Optional verification options
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash, options = {}) {
    const startTime = process.hrtime.bigint();

    try {
      // Validate inputs
      if (!password || typeof password !== 'string') {
        await this.ensureMinimumTiming(startTime);
        return false;
      }

      if (!hash || typeof hash !== 'string') {
        await this.ensureMinimumTiming(startTime);
        return false;
      }

      // Perform bcrypt comparison
      const isMatch = await bcrypt.compare(password, hash);

      // Ensure consistent timing regardless of result
      await this.ensureMinimumTiming(startTime);

      return isMatch;

    } catch (error) {
      // Ensure consistent timing even on error
      await this.ensureMinimumTiming(startTime);
      
      // Log error but don't expose details
      console.error('Password verification error:', error.message);
      return false;
    }
  }

  /**
   * Generate a cryptographically secure salt
   * @param {number} length - Salt length in bytes
   * @returns {string} Generated salt in hex format
   */
  generateSalt(length = null) {
    const saltLength = length || this.config.saltLength;
    
    if (saltLength < 8 || saltLength > 64) {
      throw new Error('Salt length must be between 8 and 64 bytes');
    }

    return crypto.randomBytes(saltLength).toString('hex');
  }

  /**
   * Check if a hash needs to be upgraded (rehashed with higher cost)
   * @param {string} hash - Hash to check
   * @param {number} targetRounds - Target salt rounds
   * @returns {boolean} True if hash needs upgrading
   */
  needsRehash(hash, targetRounds = null) {
    try {
      const rounds = targetRounds || this.config.saltRounds;
      
      // Extract rounds from bcrypt hash
      const hashRounds = this.extractRoundsFromHash(hash);
      
      return hashRounds < rounds;
    } catch (error) {
      // If we can't parse the hash, assume it needs upgrading
      return true;
    }
  }

  /**
   * Extract salt rounds from a bcrypt hash
   * @param {string} hash - bcrypt hash
   * @returns {number} Number of salt rounds used
   * @private
   */
  extractRoundsFromHash(hash) {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Invalid hash format');
    }

    // bcrypt hash format: $2a$rounds$salthash
    const parts = hash.split('$');
    
    if (parts.length < 4 || parts[1] !== '2a' && parts[1] !== '2b') {
      throw new Error('Invalid bcrypt hash format');
    }

    const rounds = parseInt(parts[2], 10);
    
    if (isNaN(rounds) || rounds < 4 || rounds > 31) {
      throw new Error('Invalid salt rounds in hash');
    }

    return rounds;
  }

  /**
   * Ensure minimum timing to prevent timing attacks
   * @param {bigint} startTime - Start time from process.hrtime.bigint()
   * @private
   */
  async ensureMinimumTiming(startTime) {
    const endTime = process.hrtime.bigint();
    const elapsedMs = Number(endTime - startTime) / 1000000;
    const remainingMs = this.config.minTimingMs - elapsedMs;

    if (remainingMs > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingMs));
    }
  }

  /**
   * Generate password hash with custom parameters for testing
   * @param {string} password - Password to hash
   * @param {number} rounds - Custom salt rounds
   * @returns {Promise<string>} Generated hash
   */
  async hashPasswordWithRounds(password, rounds) {
    const result = await this.hashPassword(password, { saltRounds: rounds });
    return result.hash;
  }

  /**
   * Benchmark hashing performance
   * @param {string} password - Test password
   * @param {number} rounds - Salt rounds to test
   * @returns {Promise<Object>} Performance metrics
   */
  async benchmarkHashing(password = 'test-password-123', rounds = this.config.saltRounds) {
    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      await this.hashPasswordWithRounds(password, rounds);
      const endTime = process.hrtime.bigint();
      
      times.push(Number(endTime - startTime) / 1000000); // Convert to milliseconds
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      rounds,
      iterations,
      averageTimeMs: Math.round(avgTime),
      minTimeMs: Math.round(minTime),
      maxTimeMs: Math.round(maxTime),
      times
    };
  }

  /**
   * Get current configuration
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
    this.validateConfig();
  }

  /**
   * Get security recommendations based on current configuration
   * @returns {Array} Array of security recommendations
   */
  getSecurityRecommendations() {
    const recommendations = [];

    if (this.config.saltRounds < 12) {
      recommendations.push({
        type: 'warning',
        message: 'Consider increasing salt rounds to 12+ for enhanced security',
        priority: 'medium'
      });
    }

    if (this.config.minTimingMs < 100) {
      recommendations.push({
        type: 'warning',
        message: 'Consider increasing minimum timing to 100ms+ for better timing attack protection',
        priority: 'low'
      });
    }

    if (process.env.NODE_ENV === 'production' && this.config.saltRounds < 14) {
      recommendations.push({
        type: 'critical',
        message: 'Production environments should use salt rounds of 14 or higher',
        priority: 'high'
      });
    }

    return recommendations;
  }
}

module.exports = PasswordHashingService;