/**
 * CORS Security Configuration Middleware
 * Handles secure CORS configuration with environment-based restrictions
 */
class CORSSecurityMiddleware {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.allowedOrigins = this.parseAllowedOrigins();
    this.allowedMethods = this.parseAllowedMethods();
    this.allowedHeaders = this.parseAllowedHeaders();
    this.maxAge = parseInt(process.env.CORS_MAX_AGE) || 86400; // 24 hours default
  }

  /**
   * Parse allowed origins from environment variables
   * @returns {Array} Array of allowed origins
   */
  parseAllowedOrigins() {
    const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
    
    if (envOrigins) {
      return envOrigins.split(',').map(origin => origin.trim());
    }

    // Default origins based on environment
    if (this.isProduction) {
      // In production, be restrictive - only allow specific domains
      return [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
        'https://app.yourdomain.com'
      ];
    } else {
      // In development, allow common development origins
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080'
      ];
    }
  }

  /**
   * Parse allowed HTTP methods from environment variables
   * @returns {Array} Array of allowed HTTP methods
   */
  parseAllowedMethods() {
    const envMethods = process.env.CORS_ALLOWED_METHODS;
    
    if (envMethods) {
      return envMethods.split(',').map(method => method.trim().toUpperCase());
    }

    // Default methods - be restrictive in production
    if (this.isProduction) {
      return ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    } else {
      return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    }
  }

  /**
   * Parse allowed headers from environment variables
   * @returns {Array} Array of allowed headers
   */
  parseAllowedHeaders() {
    const envHeaders = process.env.CORS_ALLOWED_HEADERS;
    
    if (envHeaders) {
      return envHeaders.split(',').map(header => header.trim());
    }

    // Default headers
    return [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'X-Refresh-Token'
    ];
  }

  /**
   * Check if origin is allowed
   * @param {string} origin - Origin to check
   * @returns {boolean} Whether origin is allowed
   */
  isOriginAllowed(origin) {
    if (!origin) {
      return false;
    }

    // Exact match
    if (this.allowedOrigins.includes(origin)) {
      return true;
    }

    // Pattern matching for development
    if (this.isDevelopment) {
      // Allow localhost with any port in development
      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return true;
      }
    }

    // Wildcard matching for subdomains (only if explicitly configured)
    for (const allowedOrigin of this.allowedOrigins) {
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2);
        if (origin.endsWith(domain)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get CORS configuration object
   * @returns {Object} CORS configuration
   */
  getCORSConfig() {
    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin && !this.isProduction) {
          return callback(null, true);
        }

        if (this.isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          console.warn(`CORS: Blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      methods: this.allowedMethods,
      allowedHeaders: this.allowedHeaders,
      credentials: true, // Allow cookies and authorization headers
      maxAge: this.maxAge,
      preflightContinue: false,
      optionsSuccessStatus: 204 // For legacy browser support
    };
  }

  /**
   * Get dynamic CORS configuration based on request
   * @param {Object} req - Express request object
   * @returns {Object} Dynamic CORS configuration
   */
  getDynamicCORSConfig(req) {
    const baseConfig = this.getCORSConfig();
    
    // Adjust configuration based on request characteristics
    const userAgent = req.get('User-Agent') || '';
    const origin = req.get('Origin');

    // Special handling for API requests
    if (req.path.startsWith('/api/')) {
      // More restrictive for API endpoints
      baseConfig.methods = baseConfig.methods.filter(method => 
        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'].includes(method)
      );
    }

    // Special handling for authentication endpoints
    if (req.path.startsWith('/api/auth/')) {
      // Even more restrictive for auth endpoints
      baseConfig.methods = ['POST', 'OPTIONS'];
      
      // Additional security headers for auth endpoints
      baseConfig.exposedHeaders = ['X-Request-ID'];
    }

    // Log CORS requests for monitoring
    if (origin) {
      console.log(`CORS request from ${origin} to ${req.method} ${req.path}`);
    }

    return baseConfig;
  }

  /**
   * Get CORS middleware with security validation
   * @returns {Function} Express middleware function
   */
  getCORSMiddleware() {
    return (req, res, next) => {
      const origin = req.get('Origin');
      const method = req.method;

      // Handle preflight requests
      if (method === 'OPTIONS') {
        return this.handlePreflightRequest(req, res);
      }

      // Apply CORS headers for actual requests
      this.applyCORSHeaders(req, res);
      
      next();
    };
  }

  /**
   * Handle preflight OPTIONS requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  handlePreflightRequest(req, res) {
    const origin = req.get('Origin');
    const requestMethod = req.get('Access-Control-Request-Method');
    const requestHeaders = req.get('Access-Control-Request-Headers');

    // Validate origin
    if (!this.isOriginAllowed(origin)) {
      console.warn(`CORS Preflight: Blocked request from origin: ${origin}`);
      return res.status(403).json({ error: 'CORS policy violation' });
    }

    // Validate method
    if (requestMethod && !this.allowedMethods.includes(requestMethod.toUpperCase())) {
      console.warn(`CORS Preflight: Method ${requestMethod} not allowed`);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate headers
    if (requestHeaders) {
      const headers = requestHeaders.split(',').map(h => h.trim());
      const invalidHeaders = headers.filter(header => 
        !this.allowedHeaders.some(allowed => 
          allowed.toLowerCase() === header.toLowerCase()
        )
      );
      
      if (invalidHeaders.length > 0) {
        console.warn(`CORS Preflight: Headers not allowed: ${invalidHeaders.join(', ')}`);
        return res.status(400).json({ error: 'Headers not allowed' });
      }
    }

    // Set preflight response headers
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', this.allowedMethods.join(', '));
    res.header('Access-Control-Allow-Headers', this.allowedHeaders.join(', '));
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', this.maxAge.toString());
    
    // Additional security headers for preflight
    res.header('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    
    res.status(204).end();
  }

  /**
   * Apply CORS headers to actual requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  applyCORSHeaders(req, res) {
    const origin = req.get('Origin');

    if (this.isOriginAllowed(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Vary', 'Origin');
      
      // Expose specific headers to the client
      const exposedHeaders = ['X-Request-ID', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'];
      res.header('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }
  }

  /**
   * Get CORS security validation middleware
   * @returns {Function} Express middleware function
   */
  getCORSSecurityMiddleware() {
    return (req, res, next) => {
      const origin = req.get('Origin');
      
      // Additional security checks
      if (origin) {
        // Check for suspicious origins
        if (this.isSuspiciousOrigin(origin)) {
          console.warn(`CORS Security: Suspicious origin detected: ${origin}`);
          return res.status(403).json({ error: 'Access denied' });
        }

        // Rate limiting for CORS requests (basic implementation)
        this.trackCORSRequest(origin, req.ip);
      }

      next();
    };
  }

  /**
   * Check if origin is suspicious
   * @param {string} origin - Origin to check
   * @returns {boolean} Whether origin is suspicious
   */
  isSuspiciousOrigin(origin) {
    const suspiciousPatterns = [
      /^https?:\/\/\d+\.\d+\.\d+\.\d+/, // Direct IP addresses
      /localhost:\d{5,}/, // High port numbers
      /[<>'"]/, // Script injection attempts
      /javascript:/i, // JavaScript protocol
      /data:/i, // Data protocol
      /file:/i // File protocol
    ];

    return suspiciousPatterns.some(pattern => pattern.test(origin));
  }

  /**
   * Track CORS requests for rate limiting and monitoring
   * @param {string} origin - Request origin
   * @param {string} ip - Request IP address
   */
  trackCORSRequest(origin, ip) {
    // Simple in-memory tracking (in production, use Redis or database)
    if (!this.corsRequestTracker) {
      this.corsRequestTracker = new Map();
    }

    const key = `${origin}:${ip}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100; // Max requests per window

    if (!this.corsRequestTracker.has(key)) {
      this.corsRequestTracker.set(key, { count: 1, firstRequest: now });
    } else {
      const tracker = this.corsRequestTracker.get(key);
      
      // Reset if window expired
      if (now - tracker.firstRequest > windowMs) {
        tracker.count = 1;
        tracker.firstRequest = now;
      } else {
        tracker.count++;
        
        // Log if approaching limit
        if (tracker.count > maxRequests * 0.8) {
          console.warn(`CORS: High request rate from ${origin} (${ip}): ${tracker.count} requests`);
        }
      }
    }
  }

  /**
   * Validate CORS configuration
   * @returns {Object} Validation result
   */
  validateCORSConfig() {
    const issues = [];
    const warnings = [];

    // Check for wildcard origins in production
    if (this.isProduction && this.allowedOrigins.includes('*')) {
      issues.push('Wildcard origin (*) should not be used in production');
    }

    // Check for insecure origins in production
    if (this.isProduction) {
      const insecureOrigins = this.allowedOrigins.filter(origin => 
        origin.startsWith('http://') && !origin.includes('localhost')
      );
      
      if (insecureOrigins.length > 0) {
        warnings.push(`Insecure HTTP origins in production: ${insecureOrigins.join(', ')}`);
      }
    }

    // Check for overly permissive methods
    const dangerousMethods = ['TRACE', 'CONNECT'];
    const foundDangerous = this.allowedMethods.filter(method => 
      dangerousMethods.includes(method)
    );
    
    if (foundDangerous.length > 0) {
      warnings.push(`Potentially dangerous HTTP methods allowed: ${foundDangerous.join(', ')}`);
    }

    // Check max age
    if (this.maxAge > 86400) { // More than 24 hours
      warnings.push('CORS max age is very high, consider reducing for better security');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      config: {
        environment: process.env.NODE_ENV || 'development',
        allowedOrigins: this.allowedOrigins,
        allowedMethods: this.allowedMethods,
        allowedHeaders: this.allowedHeaders,
        maxAge: this.maxAge
      }
    };
  }

  /**
   * Get complete CORS security middleware stack
   * @returns {Array} Array of middleware functions
   */
  getMiddlewareStack() {
    return [
      this.getCORSSecurityMiddleware(),
      this.getCORSMiddleware()
    ];
  }

  /**
   * Get CORS status and configuration info
   * @returns {Object} CORS status information
   */
  getCORSStatus() {
    return {
      enabled: true,
      environment: process.env.NODE_ENV || 'development',
      allowedOrigins: this.allowedOrigins,
      allowedMethods: this.allowedMethods,
      allowedHeaders: this.allowedHeaders,
      maxAge: this.maxAge,
      credentialsAllowed: true,
      validation: this.validateCORSConfig()
    };
  }
}

module.exports = CORSSecurityMiddleware;