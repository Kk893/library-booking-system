/**
 * Default Security Configuration
 * Defines default values for all security-related settings
 */

module.exports = {
  // JWT Configuration
  jwt: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256',
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
    authMaxRequests: 10,
    progressiveDelayBase: 1000, // 1 second base delay
  },

  // Session Configuration
  session: {
    maxActiveSessions: 5,
    sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
    deviceFingerprintEnabled: true,
  },

  // Password Security
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxHistory: 5,
    bcryptRounds: 12,
  },

  // MFA Configuration
  mfa: {
    totpWindow: 1, // Allow 1 time step tolerance
    backupCodesCount: 10,
    backupCodeLength: 8,
  },

  // Security Headers
  headers: {
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },

  // Monitoring Configuration
  monitoring: {
    logLevel: 'info',
    alertThresholds: {
      failedLogins: 5,
      suspiciousActivity: 3,
      rateLimitViolations: 10,
    },
    retentionDays: 90,
  },

  // Encryption Configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,
  },
};