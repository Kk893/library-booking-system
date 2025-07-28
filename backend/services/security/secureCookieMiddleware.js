const crypto = require('crypto');

/**
 * Secure Cookie Configuration and Management Middleware
 * Handles secure cookie settings, encryption, and session management
 */
class SecureCookieMiddleware {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.cookieSecret = process.env.COOKIE_SECRET || this.generateCookieSecret();
    this.encryptionKey = process.env.COOKIE_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.domain = process.env.COOKIE_DOMAIN || null;
    this.maxAge = parseInt(process.env.COOKIE_MAX_AGE) || (7 * 24 * 60 * 60 * 1000); // 7 days default
  }

  /**
   * Generate a secure cookie secret if not provided
   * @returns {string} Generated cookie secret
   */
  generateCookieSecret() {
    if (this.isProduction) {
      throw new Error('COOKIE_SECRET environment variable is required in production');
    }
    console.warn('Using generated cookie secret for development. Set COOKIE_SECRET in production.');
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate encryption key for cookie encryption
   * @returns {string} Generated encryption key
   */
  generateEncryptionKey() {
    if (this.isProduction) {
      throw new Error('COOKIE_ENCRYPTION_KEY environment variable is required in production');
    }
    console.warn('Using generated encryption key for development. Set COOKIE_ENCRYPTION_KEY in production.');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get secure cookie configuration
   * @param {Object} options - Additional cookie options
   * @returns {Object} Cookie configuration object
   */
  getSecureCookieConfig(options = {}) {
    const baseConfig = {
      httpOnly: true, // Prevent XSS attacks
      secure: this.isProduction, // HTTPS only in production
      sameSite: this.isProduction ? 'strict' : 'lax', // CSRF protection
      maxAge: options.maxAge || this.maxAge,
      path: options.path || '/',
      signed: true // Enable cookie signing
    };

    // Add domain restriction if configured
    if (this.domain) {
      baseConfig.domain = this.domain;
    }

    // Override with custom options
    return { ...baseConfig, ...options };
  }

  /**
   * Encrypt sensitive cookie data
   * @param {string} data - Data to encrypt
   * @returns {string} Encrypted data
   */
  encryptCookieData(data) {
    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(this.encryptionKey, 'hex');
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      cipher.setAAD(Buffer.from('cookie-data'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Cookie encryption failed:', error.message);
      throw new Error('Failed to encrypt cookie data');
    }
  }

  /**
   * Decrypt cookie data
   * @param {string} encryptedData - Encrypted cookie data
   * @returns {string} Decrypted data
   */
  decryptCookieData(encryptedData) {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted cookie format');
      }
      
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(this.encryptionKey, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from('cookie-data'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Cookie decryption failed:', error.message);
      throw new Error('Failed to decrypt cookie data');
    }
  }

  /**
   * Set secure cookie with encryption
   * @param {Object} res - Express response object
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {Object} options - Cookie options
   */
  setSecureCookie(res, name, value, options = {}) {
    try {
      const cookieConfig = this.getSecureCookieConfig(options);
      
      // Encrypt sensitive cookies
      const sensitiveFields = ['refreshToken', 'sessionId', 'userId'];
      const shouldEncrypt = options.encrypt || sensitiveFields.includes(name);
      
      const cookieValue = shouldEncrypt ? this.encryptCookieData(value) : value;
      
      res.cookie(name, cookieValue, cookieConfig);
      
      // Log cookie setting for security monitoring
      console.log(`Secure cookie set: ${name}`, {
        encrypted: shouldEncrypt,
        secure: cookieConfig.secure,
        httpOnly: cookieConfig.httpOnly,
        sameSite: cookieConfig.sameSite,
        maxAge: cookieConfig.maxAge
      });
    } catch (error) {
      console.error(`Failed to set secure cookie ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get secure cookie with decryption
   * @param {Object} req - Express request object
   * @param {string} name - Cookie name
   * @param {Object} options - Options including encryption flag
   * @returns {string|null} Cookie value or null if not found
   */
  getSecureCookie(req, name, options = {}) {
    try {
      // Get signed cookie value
      const cookieValue = req.signedCookies[name] || req.cookies[name];
      
      if (!cookieValue) {
        return null;
      }
      
      // Decrypt if necessary
      const sensitiveFields = ['refreshToken', 'sessionId', 'userId'];
      const shouldDecrypt = options.encrypted || sensitiveFields.includes(name);
      
      if (shouldDecrypt && cookieValue.includes(':')) {
        return this.decryptCookieData(cookieValue);
      }
      
      return cookieValue;
    } catch (error) {
      console.error(`Failed to get secure cookie ${name}:`, error.message);
      return null;
    }
  }

  /**
   * Clear secure cookie
   * @param {Object} res - Express response object
   * @param {string} name - Cookie name
   * @param {Object} options - Cookie options
   */
  clearSecureCookie(res, name, options = {}) {
    const cookieConfig = this.getSecureCookieConfig({
      ...options,
      maxAge: 0,
      expires: new Date(0)
    });
    
    res.clearCookie(name, cookieConfig);
    
    console.log(`Secure cookie cleared: ${name}`);
  }

  /**
   * Get cookie parser middleware configuration
   * @returns {Object} Cookie parser configuration
   */
  getCookieParserConfig() {
    return {
      secret: this.cookieSecret,
      signed: true
    };
  }

  /**
   * Get session cookie configuration for express-session
   * @returns {Object} Session cookie configuration
   */
  getSessionCookieConfig() {
    return {
      name: 'sessionId',
      secret: this.cookieSecret,
      resave: false,
      saveUninitialized: false,
      cookie: this.getSecureCookieConfig({
        maxAge: 24 * 60 * 60 * 1000 // 24 hours for session cookies
      }),
      rolling: true // Reset expiration on activity
    };
  }

  /**
   * Middleware to set secure cookie defaults
   * @returns {Function} Express middleware function
   */
  getSecureCookieMiddleware() {
    return (req, res, next) => {
      // Override res.cookie to use secure defaults
      const originalCookie = res.cookie.bind(res);
      
      res.cookie = (name, value, options = {}) => {
        const secureOptions = this.getSecureCookieConfig(options);
        return originalCookie(name, value, secureOptions);
      };

      // Add helper methods to response object
      res.setSecureCookie = (name, value, options = {}) => {
        return this.setSecureCookie(res, name, value, options);
      };

      res.clearSecureCookie = (name, options = {}) => {
        return this.clearSecureCookie(res, name, options);
      };

      // Add helper methods to request object
      req.getSecureCookie = (name, options = {}) => {
        return this.getSecureCookie(req, name, options);
      };

      next();
    };
  }

  /**
   * Validate cookie security configuration
   * @returns {Object} Validation result
   */
  validateCookieConfig() {
    const issues = [];
    const warnings = [];

    // Check for production requirements
    if (this.isProduction) {
      if (!process.env.COOKIE_SECRET) {
        issues.push('COOKIE_SECRET environment variable is required in production');
      }
      
      if (!process.env.COOKIE_ENCRYPTION_KEY) {
        issues.push('COOKIE_ENCRYPTION_KEY environment variable is required in production');
      }
      
      if (!this.domain) {
        warnings.push('COOKIE_DOMAIN should be set in production for security');
      }
    }

    // Check cookie secret strength
    if (this.cookieSecret.length < 32) {
      warnings.push('Cookie secret should be at least 32 characters long');
    }

    // Check encryption key format
    try {
      const key = Buffer.from(this.encryptionKey, 'hex');
      if (key.length !== 32) {
        issues.push('Cookie encryption key must be 32 bytes (64 hex characters)');
      }
    } catch (error) {
      issues.push('Cookie encryption key must be valid hex string');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      config: {
        production: this.isProduction,
        domain: this.domain,
        maxAge: this.maxAge,
        secretLength: this.cookieSecret.length,
        encryptionKeyLength: this.encryptionKey.length
      }
    };
  }

  /**
   * Get cookie security headers middleware
   * @returns {Function} Express middleware function
   */
  getCookieSecurityHeaders() {
    return (req, res, next) => {
      // Set cookie-related security headers
      if (this.isProduction) {
        res.setHeader('Set-Cookie-SameSite', 'Strict');
        res.setHeader('Set-Cookie-Secure', 'true');
      }
      
      // Prevent cookie tampering
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      next();
    };
  }

  /**
   * Get complete secure cookie middleware stack
   * @returns {Array} Array of middleware functions
   */
  getMiddlewareStack() {
    return [
      this.getCookieSecurityHeaders(),
      this.getSecureCookieMiddleware()
    ];
  }
}

module.exports = SecureCookieMiddleware;