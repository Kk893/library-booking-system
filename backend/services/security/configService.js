/**
 * Security Configuration Service
 * Centralized security configuration management with environment variable validation
 */

const Joi = require('joi');
const { environmentSchema, securityConfigSchema } = require('./config/validationSchemas');
const securityDefaults = require('./config/securityDefaults');
const { sanitizeForLogging } = require('./utils/securityHelpers');

class SecurityConfigService {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.validationErrors = [];
  }

  /**
   * Initialize security configuration with environment validation
   * @param {Object} customConfig - Optional custom configuration overrides
   * @returns {Object} Validated security configuration
   */
  async initialize(customConfig = {}) {
    try {
      // Validate environment variables
      const envValidation = this.validateEnvironment();
      if (!envValidation.isValid) {
        throw new Error(`Environment validation failed: ${envValidation.errors.join(', ')}`);
      }

      // Build configuration from environment and defaults
      const baseConfig = this.buildConfigFromEnvironment();
      
      // Merge with custom configuration
      const mergedConfig = this.mergeConfigurations(baseConfig, customConfig);
      
      // Validate final configuration
      const configValidation = this.validateConfiguration(mergedConfig);
      if (!configValidation.isValid) {
        throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
      }

      this.config = mergedConfig;
      this.isInitialized = true;

      console.log('Security configuration initialized successfully');
      return this.config;
    } catch (error) {
      console.error('Security configuration initialization failed:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Validate environment variables against schema
   * @returns {Object} Validation result with errors if any
   */
  validateEnvironment() {
    const { error, value } = environmentSchema.validate(process.env, {
      allowUnknown: true,
      stripUnknown: false,
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      this.validationErrors = errors;
      return { isValid: false, errors, value: null };
    }

    return { isValid: true, errors: [], value };
  }

  /**
   * Build configuration object from environment variables and defaults
   * @returns {Object} Configuration object
   */
  buildConfigFromEnvironment() {
    const env = process.env;

    return {
      // JWT Configuration
      jwt: {
        secret: env.JWT_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessTokenExpiry: env.JWT_ACCESS_EXPIRY || securityDefaults.jwt.accessTokenExpiry,
        refreshTokenExpiry: env.JWT_REFRESH_EXPIRY || securityDefaults.jwt.refreshTokenExpiry,
        algorithm: securityDefaults.jwt.algorithm,
      },

      // Redis Configuration
      redis: {
        host: env.REDIS_HOST || 'localhost',
        port: parseInt(env.REDIS_PORT, 10) || 6379,
        password: env.REDIS_PASSWORD,
        db: parseInt(env.REDIS_DB, 10) || 0,
        tls: env.REDIS_TLS_ENABLED === 'true',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      },

      // Rate Limiting Configuration
      rateLimit: {
        windowMs: parseInt(env.RATE_LIMIT_WINDOW, 10) || securityDefaults.rateLimit.windowMs,
        maxRequests: parseInt(env.RATE_LIMIT_MAX, 10) || securityDefaults.rateLimit.maxRequests,
        authMaxRequests: parseInt(env.AUTH_RATE_LIMIT_MAX, 10) || securityDefaults.rateLimit.authMaxRequests,
        progressiveDelayBase: securityDefaults.rateLimit.progressiveDelayBase,
      },

      // Encryption Configuration
      encryption: {
        encryptionKey: env.ENCRYPTION_KEY,
        fieldEncryptionKey: env.FIELD_ENCRYPTION_KEY,
        algorithm: securityDefaults.encryption.algorithm,
        keyDerivation: securityDefaults.encryption.keyDerivation,
        iterations: securityDefaults.encryption.iterations,
      },

      // Security Monitoring Configuration
      monitoring: {
        logLevel: env.SECURITY_LOG_LEVEL || securityDefaults.monitoring.logLevel,
        alertWebhookUrl: env.ALERT_WEBHOOK_URL,
        siemEndpoint: env.SIEM_ENDPOINT,
      },

      // Password Security Configuration
      password: {
        ...securityDefaults.password,
      },

      // MFA Configuration
      mfa: {
        ...securityDefaults.mfa,
        issuer: env.TOTP_ISSUER || securityDefaults.mfa.issuer,
        smsApiKey: env.SMS_API_KEY,
        smsFromNumber: env.SMS_FROM_NUMBER,
      },

      // Session Configuration
      session: {
        ...securityDefaults.session,
      },

      // Security Headers Configuration
      headers: {
        ...securityDefaults.headers,
      },

      // Environment-specific settings
      environment: {
        nodeEnv: env.NODE_ENV || 'development',
        httpsEnabled: env.HTTPS_ENABLED === 'true',
        securityHeadersEnabled: env.SECURITY_HEADERS_ENABLED !== 'false',
      },

      // Database Security Configuration
      database: {
        encryptionEnabled: env.DB_ENCRYPTION_ENABLED === 'true',
        sslEnabled: env.DB_SSL_ENABLED === 'true',
        sslCertPath: env.DB_SSL_CERT_PATH,
      },
    };
  }

  /**
   * Merge base configuration with custom overrides
   * @param {Object} baseConfig - Base configuration
   * @param {Object} customConfig - Custom configuration overrides
   * @returns {Object} Merged configuration
   */
  mergeConfigurations(baseConfig, customConfig) {
    const merged = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    function deepMerge(target, source) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') {
              target[key] = {};
            }
            deepMerge(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      }
    }

    deepMerge(merged, customConfig);
    return merged;
  }

  /**
   * Validate final configuration against schema
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfiguration(config) {
    const { error } = securityConfigSchema.validate(config, {
      allowUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Get current security configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    if (!this.isInitialized) {
      throw new Error('Security configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Get specific configuration section
   * @param {string} section - Configuration section name
   * @returns {Object} Configuration section
   */
  getSection(section) {
    const config = this.getConfig();
    if (!config[section]) {
      throw new Error(`Configuration section '${section}' not found`);
    }
    return config[section];
  }

  /**
   * Get JWT configuration
   * @returns {Object} JWT configuration
   */
  getJWTConfig() {
    return this.getSection('jwt');
  }

  /**
   * Get Redis configuration
   * @returns {Object} Redis configuration
   */
  getRedisConfig() {
    return this.getSection('redis');
  }

  /**
   * Get encryption configuration
   * @returns {Object} Encryption configuration
   */
  getEncryptionConfig() {
    return this.getSection('encryption');
  }

  /**
   * Get rate limiting configuration
   * @returns {Object} Rate limiting configuration
   */
  getRateLimitConfig() {
    return this.getSection('rateLimit');
  }

  /**
   * Get encryption configuration
   * @returns {Object} Encryption configuration
   */
  getEncryptionConfig() {
    return this.getSection('encryption');
  }

  /**
   * Get monitoring configuration
   * @returns {Object} Monitoring configuration
   */
  getMonitoringConfig() {
    return this.getSection('monitoring');
  }

  /**
   * Get password security configuration
   * @returns {Object} Password configuration
   */
  getPasswordConfig() {
    return this.getSection('password');
  }

  /**
   * Get MFA configuration
   * @returns {Object} MFA configuration
   */
  getMFAConfig() {
    return this.getSection('mfa');
  }

  /**
   * Get session configuration
   * @returns {Object} Session configuration
   */
  getSessionConfig() {
    return this.getSection('session');
  }

  /**
   * Get security headers configuration
   * @returns {Object} Security headers configuration
   */
  getHeadersConfig() {
    return this.getSection('headers');
  }

  /**
   * Get audit configuration
   * @returns {Object} Audit configuration
   */
  getAuditConfig() {
    const config = this.getConfig();
    return {
      logLevel: config.monitoring.logLevel,
      auditRetentionDays: 30,
      encryptionEnabled: true,
      ...config.audit
    };
  }

  /**
   * Get incident response configuration
   * @returns {Object} Incident response configuration
   */
  getIncidentResponseConfig() {
    const config = this.getConfig();
    return {
      email: {
        enabled: !!process.env.INCIDENT_EMAIL_ENABLED,
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT, 10) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        },
        recipients: (process.env.INCIDENT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
      },
      sms: {
        enabled: !!process.env.INCIDENT_SMS_ENABLED,
        apiKey: process.env.SMS_API_KEY,
        fromNumber: process.env.SMS_FROM_NUMBER,
        recipients: (process.env.INCIDENT_SMS_RECIPIENTS || '').split(',').filter(Boolean)
      },
      webhook: {
        enabled: !!process.env.INCIDENT_WEBHOOK_ENABLED,
        url: process.env.INCIDENT_WEBHOOK_URL,
        secret: process.env.INCIDENT_WEBHOOK_SECRET
      },
      slack: {
        enabled: !!process.env.INCIDENT_SLACK_ENABLED,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#security-alerts'
      },
      alertWebhookUrl: config.monitoring.alertWebhookUrl,
      ...config.incidentResponse
    };
  }

  /**
   * Check if running in production environment
   * @returns {boolean} True if production environment
   */
  isProduction() {
    const config = this.getConfig();
    return config.environment.nodeEnv === 'production';
  }

  /**
   * Check if running in development environment
   * @returns {boolean} True if development environment
   */
  isDevelopment() {
    const config = this.getConfig();
    return config.environment.nodeEnv === 'development';
  }

  /**
   * Check if HTTPS is enabled
   * @returns {boolean} True if HTTPS is enabled
   */
  isHTTPSEnabled() {
    const config = this.getConfig();
    return config.environment.httpsEnabled;
  }

  /**
   * Get configuration validation errors
   * @returns {Array} Array of validation error messages
   */
  getValidationErrors() {
    return [...this.validationErrors];
  }

  /**
   * Reload configuration (useful for configuration updates)
   * @param {Object} customConfig - Optional custom configuration overrides
   */
  async reload(customConfig = {}) {
    this.isInitialized = false;
    this.config = null;
    this.validationErrors = [];
    
    return await this.initialize(customConfig);
  }

  /**
   * Get configuration summary for logging (with sensitive data redacted)
   * @returns {Object} Sanitized configuration summary
   */
  getConfigSummary() {
    if (!this.isInitialized) {
      return { initialized: false };
    }

    const config = this.getConfig();
    return {
      initialized: true,
      environment: config.environment.nodeEnv,
      httpsEnabled: config.environment.httpsEnabled,
      redisHost: config.redis.host,
      redisPort: config.redis.port,
      redisTLS: config.redis.tls,
      rateLimitWindow: config.rateLimit.windowMs,
      rateLimitMax: config.rateLimit.maxRequests,
      monitoringLogLevel: config.monitoring.logLevel,
      hasAlertWebhook: !!config.monitoring.alertWebhookUrl,
      hasSiemEndpoint: !!config.monitoring.siemEndpoint,
      mfaIssuer: config.mfa.issuer,
      hasSmsConfig: !!(config.mfa.smsApiKey && config.mfa.smsFromNumber),
      databaseEncryption: config.database.encryptionEnabled,
      databaseSSL: config.database.sslEnabled,
    };
  }
}

// Export singleton instance
module.exports = new SecurityConfigService();