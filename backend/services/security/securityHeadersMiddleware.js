const helmet = require('helmet');

/**
 * Security Headers Middleware Service
 * Implements comprehensive security headers using Helmet.js
 * Provides CSP, HSTS, and other security headers configuration
 */
class SecurityHeadersMiddleware {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Get Content Security Policy configuration
   * @returns {Object} CSP configuration object
   */
  getCSPConfig() {
    const baseConfig = {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some frontend frameworks
        "https://www.google.com", // For reCAPTCHA
        "https://www.gstatic.com" // For reCAPTCHA
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for inline styles
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://res.cloudinary.com", // For Cloudinary images
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://api.cloudinary.com" // For file uploads
      ],
      frameSrc: [
        "https://www.google.com" // For reCAPTCHA
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"]
    };

    // In development, allow more permissive policies for easier debugging
    if (this.isDevelopment) {
      baseConfig.scriptSrc.push("'unsafe-eval'");
      baseConfig.connectSrc.push("ws://localhost:*", "http://localhost:*");
    }

    return baseConfig;
  }

  /**
   * Get HSTS configuration
   * @returns {Object} HSTS configuration object
   */
  getHSTSConfig() {
    return {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    };
  }

  /**
   * Get comprehensive security headers middleware
   * @returns {Function} Express middleware function
   */
  getSecurityHeadersMiddleware() {
    return helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: this.getCSPConfig(),
        reportOnly: this.isDevelopment // Only report in development
      },

      // HTTP Strict Transport Security
      hsts: this.isProduction ? this.getHSTSConfig() : false,

      // X-Content-Type-Options
      noSniff: true,

      // X-Frame-Options
      frameguard: {
        action: 'deny'
      },

      // X-XSS-Protection (legacy but still useful)
      xssFilter: true,

      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      },

      // Permissions Policy (formerly Feature Policy)
      permissionsPolicy: {
        geolocation: [],
        microphone: [],
        camera: [],
        payment: [],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: []
      },

      // Cross-Origin-Embedder-Policy
      crossOriginEmbedderPolicy: false, // Disabled to avoid breaking existing functionality

      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups'
      },

      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: {
        policy: 'cross-origin'
      },

      // Hide X-Powered-By header
      hidePoweredBy: true,

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false
      },

      // Expect-CT (deprecated but still supported)
      expectCt: false,

      // IE No Open
      ieNoOpen: true,

      // Origin Agent Cluster
      originAgentCluster: true
    });
  }

  /**
   * Get additional custom security headers
   * @returns {Function} Express middleware function
   */
  getCustomSecurityHeaders() {
    return (req, res, next) => {
      // Additional security headers not covered by Helmet
      res.setHeader('X-Content-Security-Policy', res.getHeader('Content-Security-Policy') || '');
      res.setHeader('X-WebKit-CSP', res.getHeader('Content-Security-Policy') || '');
      
      // Cache control for sensitive endpoints
      if (req.path.includes('/api/auth') || req.path.includes('/api/admin')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // Security headers for API responses
      res.setHeader('X-API-Version', '1.0');
      res.setHeader('X-Request-ID', req.headers['x-request-id'] || 'unknown');

      next();
    };
  }

  /**
   * Get complete security headers middleware stack
   * @returns {Array} Array of middleware functions
   */
  getMiddlewareStack() {
    return [
      this.getSecurityHeadersMiddleware(),
      this.getCustomSecurityHeaders()
    ];
  }

  /**
   * Validate security headers in response
   * @param {Object} headers - Response headers object
   * @returns {Object} Validation result
   */
  validateSecurityHeaders(headers) {
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy',
      'content-security-policy'
    ];

    const productionHeaders = [
      'strict-transport-security'
    ];

    const missing = [];
    const present = [];

    // Check required headers
    requiredHeaders.forEach(header => {
      if (headers[header]) {
        present.push(header);
      } else {
        missing.push(header);
      }
    });

    // Check production-only headers
    if (this.isProduction) {
      productionHeaders.forEach(header => {
        if (headers[header]) {
          present.push(header);
        } else {
          missing.push(header);
        }
      });
    }

    return {
      valid: missing.length === 0,
      present,
      missing,
      score: (present.length / (requiredHeaders.length + (this.isProduction ? productionHeaders.length : 0))) * 100
    };
  }
}

module.exports = SecurityHeadersMiddleware;