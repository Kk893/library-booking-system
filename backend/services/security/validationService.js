const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Comprehensive input validation service with Joi schemas
 * Provides validation for all user inputs with security-focused rules
 */
class ValidationService {
  constructor() {
    this.initializeSchemas();
  }

  /**
   * Initialize all validation schemas
   */
  initializeSchemas() {
    // Common validation patterns
    this.commonPatterns = {
      email: Joi.string()
        .email({ minDomainSegments: 2, tlds: { allow: true } })
        .max(254)
        .lowercase()
        .trim(),
      
      password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
      
      name: Joi.string()
        .min(1)
        .max(100)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .trim()
        .message('Name can only contain letters, spaces, hyphens, and apostrophes'),
      
      phone: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .message('Phone number must be in valid international format'),
      
      objectId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .message('Invalid ID format'),
      
      url: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .max(2048),
      
      safeString: Joi.string()
        .max(1000)
        .pattern(/^[^<>{}]*$/)
        .trim()
        .message('String contains potentially unsafe characters')
    };

    // User registration schema
    this.userRegistrationSchema = Joi.object({
      email: this.commonPatterns.email.required(),
      password: this.commonPatterns.password.required(),
      confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({ 'any.only': 'Passwords do not match' }),
      firstName: this.commonPatterns.name.required(),
      lastName: this.commonPatterns.name.required(),
      phone: this.commonPatterns.phone.optional(),
      dateOfBirth: Joi.date()
        .max('now')
        .min('1900-01-01')
        .optional(),
      address: Joi.object({
        street: this.commonPatterns.safeString.max(200).optional(),
        city: this.commonPatterns.safeString.max(100).optional(),
        state: this.commonPatterns.safeString.max(100).optional(),
        zipCode: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).optional(),
        country: this.commonPatterns.safeString.max(100).optional()
      }).optional(),
      termsAccepted: Joi.boolean().valid(true).required(),
      marketingConsent: Joi.boolean().default(false)
    }).with('password', 'confirmPassword');

    // User login schema
    this.userLoginSchema = Joi.object({
      email: this.commonPatterns.email.required(),
      password: Joi.string().min(1).max(128).required(),
      rememberMe: Joi.boolean().default(false),
      captchaToken: Joi.string().optional(),
      mfaToken: Joi.string().pattern(/^[0-9]{6}$/).optional()
    });

    // Profile update schema
    this.profileUpdateSchema = Joi.object({
      firstName: this.commonPatterns.name.optional(),
      lastName: this.commonPatterns.name.optional(),
      phone: this.commonPatterns.phone.optional(),
      dateOfBirth: Joi.date()
        .max('now')
        .min('1900-01-01')
        .optional(),
      address: Joi.object({
        street: this.commonPatterns.safeString.max(200).optional(),
        city: this.commonPatterns.safeString.max(100).optional(),
        state: this.commonPatterns.safeString.max(100).optional(),
        zipCode: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).optional(),
        country: this.commonPatterns.safeString.max(100).optional()
      }).optional(),
      bio: this.commonPatterns.safeString.max(500).optional(),
      preferences: Joi.object({
        notifications: Joi.boolean().default(true),
        newsletter: Joi.boolean().default(false),
        language: Joi.string().valid('en', 'es', 'fr', 'de').default('en')
      }).optional()
    });

    // Password change schema
    this.passwordChangeSchema = Joi.object({
      currentPassword: Joi.string().min(1).max(128).required(),
      newPassword: this.commonPatterns.password.required(),
      confirmNewPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({ 'any.only': 'New passwords do not match' })
    }).with('newPassword', 'confirmNewPassword');

    // Password reset request schema
    this.passwordResetRequestSchema = Joi.object({
      email: this.commonPatterns.email.required(),
      captchaToken: Joi.string().optional()
    });

    // Password reset schema
    this.passwordResetSchema = Joi.object({
      token: Joi.string().required(),
      newPassword: this.commonPatterns.password.required(),
      confirmNewPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({ 'any.only': 'Passwords do not match' })
    }).with('newPassword', 'confirmNewPassword');

    // Book search/filter schema
    this.bookSearchSchema = Joi.object({
      query: this.commonPatterns.safeString.max(200).optional(),
      category: this.commonPatterns.safeString.max(50).optional(),
      author: this.commonPatterns.safeString.max(100).optional(),
      isbn: Joi.string().pattern(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/).optional(),
      availability: Joi.boolean().optional(),
      page: Joi.number().integer().min(1).max(1000).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().valid('title', 'author', 'publishedDate', 'rating', 'availability').default('title'),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc')
    });

    // Booking schema
    this.bookingSchema = Joi.object({
      bookId: this.commonPatterns.objectId.required(),
      startDate: Joi.date().min('now').required(),
      endDate: Joi.date().greater(Joi.ref('startDate')).required(),
      notes: this.commonPatterns.safeString.max(500).optional()
    });

    // Review schema
    this.reviewSchema = Joi.object({
      bookId: this.commonPatterns.objectId.required(),
      rating: Joi.number().integer().min(1).max(5).required(),
      comment: this.commonPatterns.safeString.max(1000).optional(),
      anonymous: Joi.boolean().default(false)
    });

    // File upload schema
    this.fileUploadSchema = Joi.object({
      fieldname: Joi.string().required(),
      originalname: Joi.string().max(255).required(),
      mimetype: Joi.string().valid(
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ).required(),
      size: Joi.number().max(10 * 1024 * 1024).required() // 10MB max
    });

    // API request structure schema
    this.apiRequestSchema = Joi.object({
      method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').required(),
      path: Joi.string().pattern(/^\/[a-zA-Z0-9\/_-]*$/).required(),
      headers: Joi.object().pattern(
        Joi.string().pattern(/^[a-zA-Z0-9-]+$/),
        Joi.string().max(1000)
      ).optional(),
      query: Joi.object().pattern(
        Joi.string().pattern(/^[a-zA-Z0-9_-]+$/),
        Joi.alternatives().try(
          Joi.string().max(1000),
          Joi.number(),
          Joi.boolean()
        )
      ).optional(),
      body: Joi.object().optional()
    });
  }

  /**
   * Validate input against a specific schema
   * @param {Object} data - Data to validate
   * @param {Joi.Schema} schema - Joi schema to validate against
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateInput(data, schema, options = {}) {
    const defaultOptions = {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      allowUnknown: false
    };

    const validationOptions = { ...defaultOptions, ...options };

    try {
      const { error, value } = schema.validate(data, validationOptions);
      
      if (error) {
        const formattedErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));

        return {
          isValid: false,
          errors: formattedErrors,
          value: null
        };
      }

      return {
        isValid: true,
        errors: [],
        value: value
      };
    } catch (err) {
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Validation error occurred', type: 'validation.error' }],
        value: null
      };
    }
  }

  /**
   * Validate user registration data
   */
  async validateUserRegistration(data) {
    return this.validateInput(data, this.userRegistrationSchema);
  }

  /**
   * Validate user login data
   */
  async validateUserLogin(data) {
    return this.validateInput(data, this.userLoginSchema);
  }

  /**
   * Validate profile update data
   */
  async validateProfileUpdate(data) {
    return this.validateInput(data, this.profileUpdateSchema);
  }

  /**
   * Validate password change data
   */
  async validatePasswordChange(data) {
    return this.validateInput(data, this.passwordChangeSchema);
  }

  /**
   * Validate password reset request
   */
  async validatePasswordResetRequest(data) {
    return this.validateInput(data, this.passwordResetRequestSchema);
  }

  /**
   * Validate password reset
   */
  async validatePasswordReset(data) {
    return this.validateInput(data, this.passwordResetSchema);
  }

  /**
   * Validate book search parameters
   */
  async validateBookSearch(data) {
    return this.validateInput(data, this.bookSearchSchema);
  }

  /**
   * Validate booking data
   */
  async validateBooking(data) {
    return this.validateInput(data, this.bookingSchema);
  }

  /**
   * Validate review data
   */
  async validateReview(data) {
    return this.validateInput(data, this.reviewSchema);
  }

  /**
   * Validate file upload
   */
  async validateFileUpload(file) {
    return this.validateInput(file, this.fileUploadSchema);
  }

  /**
   * Validate API request structure
   */
  async validateApiRequest(request) {
    return this.validateInput(request, this.apiRequestSchema);
  }

  /**
   * Sanitize HTML content to prevent XSS
   * @param {string} input - HTML content to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized HTML
   */
  sanitizeHTML(input, options = {}) {
    if (typeof input !== 'string') {
      return '';
    }

    // Default strict configuration for XSS prevention
    const defaultConfig = {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SANITIZE_DOM: true,
      WHOLE_DOCUMENT: false
    };

    // Merge with custom options
    const config = { ...defaultConfig, ...options };

    // Additional XSS pattern detection before sanitization
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
      /<embed[\s\S]*?>/gi,
      /<form[\s\S]*?>[\s\S]*?<\/form>/gi
    ];

    // Check for suspicious patterns
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        console.warn('XSS attempt detected and blocked:', {
          pattern: pattern.toString(),
          input: input.substring(0, 100) + '...'
        });
      }
    }

    return DOMPurify.sanitize(input, config);
  }

  /**
   * Sanitize string for safe database queries and prevent injection attacks
   * @param {string} input - Input to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized input
   */
  sanitizeQuery(input, options = {}) {
    if (typeof input !== 'string') {
      return '';
    }

    const defaultOptions = {
      allowWildcards: false,
      maxLength: 1000,
      preserveSpaces: true
    };

    const opts = { ...defaultOptions, ...options };

    // SQL injection patterns to detect and remove
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?)/gi,
      /(\/\*[\s\S]*?\*\/)/g, // SQL comments
      /(--[\s\S]*$)/gm, // SQL line comments
      /(\bxp_\w+)/gi, // SQL Server extended procedures
      /(\bsp_\w+)/gi, // SQL Server stored procedures
      /(\bINTO\s+OUTFILE)/gi,
      /(\bLOAD_FILE)/gi,
      /(\bCHAR\s*\()/gi,
      /(\bCONCAT\s*\()/gi,
      /(\bSUBSTRING\s*\()/gi
    ];

    // NoSQL injection patterns
    const noSqlInjectionPatterns = [
      /\$where/gi,
      /\$ne/gi,
      /\$gt/gi,
      /\$lt/gi,
      /\$regex/gi,
      /\$or/gi,
      /\$and/gi,
      /\$in/gi,
      /\$nin/gi,
      /\$exists/gi,
      /\$eval/gi,
      /\$expr/gi
    ];

    // Check for injection attempts
    const allPatterns = [...sqlInjectionPatterns, ...noSqlInjectionPatterns];
    for (const pattern of allPatterns) {
      if (pattern.test(input)) {
        console.warn('Injection attempt detected and blocked:', {
          pattern: pattern.toString(),
          input: input.substring(0, 100) + '...'
        });
        // Return empty string for detected injection attempts
        return '';
      }
    }

    let sanitized = input;

    // Remove dangerous characters
    sanitized = sanitized
      .replace(/[<>{}]/g, '') // Remove angle brackets and braces
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;\\]/g, '') // Remove semicolons and backslashes
      .replace(/--/g, '') // Remove SQL comment markers
      .replace(/\/\*/g, '') // Remove SQL comment start
      .replace(/\*\//g, '') // Remove SQL comment end
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/\x1a/g, ''); // Remove substitute character

    // Handle wildcards
    if (!opts.allowWildcards) {
      sanitized = sanitized.replace(/[%_*]/g, '');
    }

    // Preserve or normalize spaces
    if (opts.preserveSpaces) {
      sanitized = sanitized.replace(/\s+/g, ' ');
    } else {
      sanitized = sanitized.replace(/\s/g, '');
    }

    // Limit length
    if (sanitized.length > opts.maxLength) {
      sanitized = sanitized.substring(0, opts.maxLength);
    }

    return sanitized.trim();
  }

  /**
   * Validate Content Security Policy directives
   * @param {string} content - Content to validate against CSP
   * @param {Object} cspConfig - CSP configuration
   * @returns {Object} Validation result
   */
  validateCSP(content, cspConfig = {}) {
    const defaultCSP = {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'child-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"]
    };

    const csp = { ...defaultCSP, ...cspConfig };
    const violations = [];

    // Check for inline scripts
    const inlineScriptPattern = /<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi;
    if (inlineScriptPattern.test(content) && !csp['script-src'].includes("'unsafe-inline'")) {
      violations.push({
        directive: 'script-src',
        violation: 'inline-script',
        message: 'Inline scripts are not allowed by CSP'
      });
    }

    // Check for inline styles
    const inlineStylePattern = /<style[^>]*>[\s\S]*?<\/style>|style\s*=/gi;
    if (inlineStylePattern.test(content) && !csp['style-src'].includes("'unsafe-inline'")) {
      violations.push({
        directive: 'style-src',
        violation: 'inline-style',
        message: 'Inline styles are not allowed by CSP'
      });
    }

    // Check for eval usage
    const evalPattern = /\beval\s*\(/gi;
    if (evalPattern.test(content) && !csp['script-src'].includes("'unsafe-eval'")) {
      violations.push({
        directive: 'script-src',
        violation: 'unsafe-eval',
        message: 'eval() usage is not allowed by CSP'
      });
    }

    // Check for external resources
    const externalResourcePatterns = [
      { pattern: /<script[^>]*src\s*=\s*["']([^"']+)["']/gi, directive: 'script-src' },
      { pattern: /<link[^>]*href\s*=\s*["']([^"']+)["']/gi, directive: 'style-src' },
      { pattern: /<img[^>]*src\s*=\s*["']([^"']+)["']/gi, directive: 'img-src' }
    ];

    externalResourcePatterns.forEach(({ pattern, directive }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const url = match[1];
        if (!this.isAllowedByCSP(url, csp[directive])) {
          violations.push({
            directive,
            violation: 'external-resource',
            message: `External resource ${url} is not allowed by CSP`,
            url
          });
        }
      }
    });

    return {
      isValid: violations.length === 0,
      violations,
      cspHeader: this.generateCSPHeader(csp)
    };
  }

  /**
   * Check if URL is allowed by CSP directive
   * @param {string} url - URL to check
   * @param {Array} allowedSources - Allowed sources for the directive
   * @returns {boolean} Whether URL is allowed
   */
  isAllowedByCSP(url, allowedSources) {
    if (allowedSources.includes("'none'")) {
      return false;
    }

    if (allowedSources.includes('*')) {
      return true;
    }

    if (allowedSources.includes("'self'") && (url.startsWith('/') || url.startsWith('./'))) {
      return true;
    }

    // Check for protocol matches
    for (const source of allowedSources) {
      if (source.endsWith(':') && url.startsWith(source)) {
        return true;
      }
      if (url.startsWith(source)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate CSP header string from configuration
   * @param {Object} cspConfig - CSP configuration
   * @returns {string} CSP header string
   */
  generateCSPHeader(cspConfig) {
    return Object.entries(cspConfig)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }

  /**
   * Validate and sanitize user input for safe processing
   * @param {string} input - User input to process
   * @param {string} type - Type of input (text, html, query)
   * @param {Object} options - Processing options
   * @returns {string} Processed input
   */
  processUserInput(input, type = 'text', options = {}) {
    if (typeof input !== 'string') {
      return '';
    }

    switch (type) {
      case 'html':
        return this.sanitizeHTML(input, options);
      case 'query':
        return this.sanitizeQuery(input, options);
      case 'text':
      default:
        const maxLength = options.maxLength || 1000;
        return input.trim().substring(0, maxLength);
    }
  }

  /**
   * Create custom validation schema
   * @param {Object} schemaDefinition - Joi schema definition
   * @returns {Joi.Schema} Compiled Joi schema
   */
  createCustomSchema(schemaDefinition) {
    return Joi.object(schemaDefinition);
  }

  /**
   * Comprehensive injection attack detection and prevention
   * @param {string} input - Input to analyze
   * @param {Object} options - Detection options
   * @returns {Object} Detection result
   */
  detectInjectionAttacks(input, options = {}) {
    if (typeof input !== 'string') {
      return { isClean: true, threats: [] };
    }

    const defaultOptions = {
      checkSQL: true,
      checkNoSQL: true,
      checkXSS: true,
      checkLDAP: true,
      checkXPath: true,
      checkCommandInjection: true
    };

    const opts = { ...defaultOptions, ...options };
    const threats = [];

    // SQL Injection Detection
    if (opts.checkSQL) {
      const sqlPatterns = [
        { pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/gi, type: 'SQL_KEYWORD' },
        { pattern: /(\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/gi, type: 'SQL_TAUTOLOGY' },
        { pattern: /('.*'|".*")\s*=\s*('.*'|".*")/gi, type: 'SQL_STRING_COMPARISON' },
        { pattern: /(\/\*[\s\S]*?\*\/|--[\s\S]*$)/gm, type: 'SQL_COMMENT' },
        { pattern: /(\bxp_\w+|\bsp_\w+)/gi, type: 'SQL_PROCEDURE' },
        { pattern: /('.*'|".*")\s*(;|\||&)/gi, type: 'SQL_STRING_MANIPULATION' }
      ];

      sqlPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(input)) {
          threats.push({ type, severity: 'HIGH', description: 'SQL injection attempt detected' });
        }
      });
    }

    // NoSQL Injection Detection
    if (opts.checkNoSQL) {
      const noSqlPatterns = [
        { pattern: /\$where|\$ne|\$gt|\$lt|\$regex|\$or|\$and|\$in|\$nin|\$exists|\$eval|\$expr/gi, type: 'NOSQL_OPERATOR' },
        { pattern: /\{\s*\$\w+\s*:/gi, type: 'NOSQL_QUERY_OBJECT' }
      ];

      noSqlPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(input)) {
          threats.push({ type, severity: 'HIGH', description: 'NoSQL injection attempt detected' });
        }
      });
    }

    // XSS Detection
    if (opts.checkXSS) {
      const xssPatterns = [
        { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, type: 'XSS_SCRIPT_TAG' },
        { pattern: /javascript:|vbscript:|data:text\/html/gi, type: 'XSS_PROTOCOL' },
        { pattern: /on\w+\s*=/gi, type: 'XSS_EVENT_HANDLER' },
        { pattern: /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, type: 'XSS_IFRAME' },
        { pattern: /expression\s*\(/gi, type: 'XSS_CSS_EXPRESSION' }
      ];

      xssPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(input)) {
          threats.push({ type, severity: 'HIGH', description: 'XSS attempt detected' });
        }
      });
    }

    // LDAP Injection Detection
    if (opts.checkLDAP) {
      const ldapPatterns = [
        { pattern: /[()&|!*]/g, type: 'LDAP_SPECIAL_CHARS' },
        { pattern: /\*\)|&\(|\|\(/gi, type: 'LDAP_FILTER_MANIPULATION' }
      ];

      ldapPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(input)) {
          threats.push({ type, severity: 'MEDIUM', description: 'LDAP injection attempt detected' });
        }
      });
    }

    // XPath Injection Detection
    if (opts.checkXPath) {
      const xpathPatterns = [
        { pattern: /\[|\]|\/\/|\.\.|@/g, type: 'XPATH_SPECIAL_CHARS' },
        { pattern: /\bor\b|\band\b/gi, type: 'XPATH_LOGICAL_OPERATORS' }
      ];

      xpathPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(input)) {
          threats.push({ type, severity: 'MEDIUM', description: 'XPath injection attempt detected' });
        }
      });
    }

    // Command Injection Detection
    if (opts.checkCommandInjection) {
      const commandPatterns = [
        { pattern: /[;&|`$(){}[\]]/g, type: 'COMMAND_SPECIAL_CHARS' },
        { pattern: /\b(cat|ls|dir|type|echo|ping|wget|curl|nc|netcat|rm|del|format|fdisk)\b/gi, type: 'COMMAND_KEYWORDS' },
        { pattern: /\.\.|\/\.\.|\\\.\.|\.\.\\/gi, type: 'PATH_TRAVERSAL' }
      ];

      commandPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(input)) {
          threats.push({ type, severity: 'HIGH', description: 'Command injection attempt detected' });
        }
      });
    }

    return {
      isClean: threats.length === 0,
      threats,
      riskScore: this.calculateRiskScore(threats)
    };
  }

  /**
   * Calculate risk score based on detected threats
   * @param {Array} threats - Detected threats
   * @returns {number} Risk score (0-100)
   */
  calculateRiskScore(threats) {
    if (threats.length === 0) return 0;

    const severityWeights = {
      LOW: 10,
      MEDIUM: 25,
      HIGH: 50,
      CRITICAL: 100
    };

    const totalScore = threats.reduce((score, threat) => {
      return score + (severityWeights[threat.severity] || 0);
    }, 0);

    return Math.min(100, totalScore);
  }

  /**
   * Get validation error message in user-friendly format
   * @param {Array} errors - Validation errors
   * @returns {string} Formatted error message
   */
  formatValidationErrors(errors) {
    if (!errors || errors.length === 0) {
      return '';
    }

    return errors.map(error => `${error.field}: ${error.message}`).join('; ');
  }
}

module.exports = ValidationService;