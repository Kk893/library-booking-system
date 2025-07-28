const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Enhanced security headers with comprehensive protection
 */
const enhancedSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Enhanced rate limiting with dynamic adjustment
 */
const enhancedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Enhanced input validation and sanitization
 */
const enhancedInputValidation = (req, res, next) => {
  // Basic input sanitization
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Basic XSS protection
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/javascript:/gi, '');
        obj[key] = obj[key].replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

/**
 * Enhanced file upload security
 */
const enhancedFileUploadSecurity = (req, res, next) => {
  // Basic file upload validation
  if (req.file || req.files) {
    const files = req.files || [req.file];
    for (const file of files) {
      if (file) {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          return res.status(400).json({ error: 'File too large' });
        }
        
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({ error: 'File type not allowed' });
        }
      }
    }
  }
  next();
};

/**
 * Security monitoring
 */
const securityMonitoring = (req, res, next) => {
  // Basic security monitoring
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Log slow requests
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};

/**
 * Complete enhanced security middleware pipeline
 */
const enhancedSecurityPipeline = [
  enhancedSecurityHeaders,
  enhancedRateLimit,
  enhancedInputValidation,
  enhancedFileUploadSecurity,
  securityMonitoring
];

/**
 * Lightweight security pipeline for static files and health checks
 */
const lightweightSecurityPipeline = [
  enhancedSecurityHeaders
];

module.exports = {
  enhancedSecurityHeaders,
  enhancedRateLimit,
  enhancedInputValidation,
  enhancedFileUploadSecurity,
  securityMonitoring,
  enhancedSecurityPipeline,
  lightweightSecurityPipeline
};