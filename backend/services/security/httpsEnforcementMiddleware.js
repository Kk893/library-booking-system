const fs = require('fs');
const https = require('https');
const path = require('path');

/**
 * HTTPS Enforcement and SSL Configuration Middleware
 * Handles HTTPS redirection, SSL/TLS configuration, and mixed content protection
 */
class HTTPSEnforcementMiddleware {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.forceHTTPS = process.env.FORCE_HTTPS === 'true' || this.isProduction;
    this.httpsPort = process.env.HTTPS_PORT || 443;
    this.httpPort = process.env.HTTP_PORT || 80;
  }

  /**
   * Get HTTPS redirect middleware
   * Redirects HTTP requests to HTTPS in production
   * @returns {Function} Express middleware function
   */
  getHTTPSRedirectMiddleware() {
    return (req, res, next) => {
      // Skip HTTPS enforcement in development unless explicitly forced
      if (!this.forceHTTPS) {
        return next();
      }

      // Check if request is already secure
      const isSecure = req.secure || 
                      req.headers['x-forwarded-proto'] === 'https' ||
                      req.headers['x-forwarded-ssl'] === 'on' ||
                      req.connection.encrypted;

      if (!isSecure) {
        // Construct HTTPS URL
        const httpsUrl = this.constructHTTPSUrl(req);
        
        // Log redirect for monitoring
        console.log(`HTTPS redirect: ${req.method} ${req.originalUrl} -> ${httpsUrl}`);
        
        // Perform redirect with 301 (permanent) status
        return res.redirect(301, httpsUrl);
      }

      next();
    };
  }

  /**
   * Construct HTTPS URL from request
   * @param {Object} req - Express request object
   * @returns {string} HTTPS URL
   */
  constructHTTPSUrl(req) {
    const host = req.get('host');
    let httpsHost = host;

    // Handle port mapping for development/testing
    if (host && host.includes(':')) {
      const [hostname, port] = host.split(':');
      if (port == this.httpPort) {
        httpsHost = this.httpsPort == 443 ? hostname : `${hostname}:${this.httpsPort}`;
      }
    }

    return `https://${httpsHost}${req.originalUrl}`;
  }

  /**
   * Get mixed content protection middleware
   * Upgrades insecure requests and blocks mixed content
   * @returns {Function} Express middleware function
   */
  getMixedContentProtectionMiddleware() {
    return (req, res, next) => {
      // Only apply in production or when HTTPS is enforced
      if (!this.forceHTTPS) {
        return next();
      }

      // Set Content Security Policy to upgrade insecure requests
      const existingCSP = res.getHeader('Content-Security-Policy') || '';
      const upgradeDirective = 'upgrade-insecure-requests';
      
      if (!existingCSP.includes(upgradeDirective)) {
        const newCSP = existingCSP ? `${existingCSP}; ${upgradeDirective}` : upgradeDirective;
        res.setHeader('Content-Security-Policy', newCSP);
      }

      // Add additional security headers for mixed content protection
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');

      next();
    };
  }

  /**
   * Get SSL/TLS configuration for HTTPS server
   * @returns {Object} SSL configuration object
   */
  getSSLConfig() {
    const sslConfig = {
      // Default SSL options for security
      secureProtocol: 'TLSv1_2_method', // Minimum TLS 1.2
      ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES256-SHA256',
        'ECDHE-RSA-AES128-SHA',
        'ECDHE-RSA-AES256-SHA',
        'AES128-GCM-SHA256',
        'AES256-GCM-SHA384',
        'AES128-SHA256',
        'AES256-SHA256',
        'AES128-SHA',
        'AES256-SHA'
      ].join(':'),
      honorCipherOrder: true,
      secureOptions: require('constants').SSL_OP_NO_SSLv2 | 
                     require('constants').SSL_OP_NO_SSLv3 |
                     require('constants').SSL_OP_NO_TLSv1 |
                     require('constants').SSL_OP_NO_TLSv1_1
    };

    // Load SSL certificates if available
    const certPath = process.env.SSL_CERT_PATH;
    const keyPath = process.env.SSL_KEY_PATH;
    const caPath = process.env.SSL_CA_PATH;

    try {
      if (certPath && keyPath) {
        sslConfig.cert = fs.readFileSync(path.resolve(certPath));
        sslConfig.key = fs.readFileSync(path.resolve(keyPath));
        
        // Add CA certificate if provided
        if (caPath) {
          sslConfig.ca = fs.readFileSync(path.resolve(caPath));
        }
        
        console.log('SSL certificates loaded successfully');
      } else if (this.isProduction) {
        console.warn('SSL certificates not configured in production environment');
      }
    } catch (error) {
      console.error('Failed to load SSL certificates:', error.message);
      if (this.isProduction) {
        throw new Error('SSL certificates are required in production');
      }
    }

    return sslConfig;
  }

  /**
   * Create HTTPS server with SSL configuration
   * @param {Object} app - Express application
   * @returns {Object} HTTPS server instance
   */
  createHTTPSServer(app) {
    const sslConfig = this.getSSLConfig();
    
    if (!sslConfig.cert || !sslConfig.key) {
      if (this.isProduction) {
        throw new Error('SSL certificates are required to create HTTPS server in production');
      }
      
      // Return null in development if no certificates
      console.warn('No SSL certificates found, HTTPS server not created');
      return null;
    }

    return https.createServer(sslConfig, app);
  }

  /**
   * Get security headers for HTTPS responses
   * @returns {Function} Express middleware function
   */
  getHTTPSSecurityHeaders() {
    return (req, res, next) => {
      // Only apply to HTTPS requests
      const isSecure = req.secure || 
                      req.headers['x-forwarded-proto'] === 'https' ||
                      req.headers['x-forwarded-ssl'] === 'on';

      if (isSecure) {
        // Strict Transport Security (HSTS)
        if (this.isProduction) {
          res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        // Additional HTTPS-specific headers
        res.setHeader('X-Forwarded-Proto', 'https');
        res.setHeader('X-Secure-Connection', 'true');
      }

      next();
    };
  }

  /**
   * Validate SSL certificate
   * @param {string} certPath - Path to certificate file
   * @returns {Object} Validation result
   */
  validateSSLCertificate(certPath) {
    try {
      if (!fs.existsSync(certPath)) {
        return {
          valid: false,
          error: 'Certificate file not found'
        };
      }

      const cert = fs.readFileSync(certPath, 'utf8');
      
      // Basic certificate format validation
      if (!cert.includes('-----BEGIN CERTIFICATE-----') || 
          !cert.includes('-----END CERTIFICATE-----')) {
        return {
          valid: false,
          error: 'Invalid certificate format'
        };
      }

      // Additional validation could be added here
      // (e.g., expiration date, domain validation)

      return {
        valid: true,
        message: 'Certificate format is valid'
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get complete HTTPS enforcement middleware stack
   * @returns {Array} Array of middleware functions
   */
  getMiddlewareStack() {
    return [
      this.getHTTPSRedirectMiddleware(),
      this.getMixedContentProtectionMiddleware(),
      this.getHTTPSSecurityHeaders()
    ];
  }

  /**
   * Check if HTTPS is properly configured
   * @returns {Object} Configuration status
   */
  getHTTPSStatus() {
    const status = {
      httpsEnforced: this.forceHTTPS,
      environment: process.env.NODE_ENV || 'development',
      sslConfigured: false,
      certificatesFound: false,
      errors: []
    };

    try {
      const sslConfig = this.getSSLConfig();
      status.sslConfigured = true;
      
      if (sslConfig.cert && sslConfig.key) {
        status.certificatesFound = true;
      }
    } catch (error) {
      status.errors.push(error.message);
    }

    return status;
  }
}

module.exports = HTTPSEnforcementMiddleware;