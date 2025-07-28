# Security Configuration Guide

This document provides comprehensive guidance on configuring the enhanced security features of the Library Booking System.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Security Services Configuration](#security-services-configuration)
3. [Database Security](#database-security)
4. [Redis Configuration](#redis-configuration)
5. [Rate Limiting Configuration](#rate-limiting-configuration)
6. [Authentication Configuration](#authentication-configuration)
7. [Encryption Configuration](#encryption-configuration)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Security Headers](#security-headers)
10. [File Upload Security](#file-upload-security)

## Environment Variables

### Core Security Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
JWT_REFRESH_SECRET=different-refresh-secret-256-bits-minimum
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption Keys (32 bytes each, base64 encoded)
ENCRYPTION_KEY=base64-encoded-32-byte-encryption-key
FIELD_ENCRYPTION_KEY=base64-encoded-field-encryption-key
PASSWORD_ENCRYPTION_KEY=base64-encoded-password-encryption-key

# Database Security
DB_ENCRYPTION_ENABLED=true
DB_SSL_ENABLED=true
DB_SSL_CERT_PATH=/path/to/mongodb-cert.pem
MONGODB_URI=mongodb://username:password@host:port/database?ssl=true

# Redis Security
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secure-redis-password
REDIS_TLS_ENABLED=true
REDIS_TLS_CERT_PATH=/path/to/redis-cert.pem

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS_PREFIX=rate_limit:
RATE_LIMIT_DEFAULT_WINDOW=900000  # 15 minutes
RATE_LIMIT_DEFAULT_MAX=200

# Security Monitoring
SECURITY_LOG_LEVEL=info
SECURITY_LOG_FILE=/var/log/security.log
ALERT_WEBHOOK_URL=https://your-monitoring-system.com/webhook
SIEM_ENDPOINT=https://your-siem-system.com/api/events

# MFA Configuration
TOTP_ISSUER=LibraryBookingApp
TOTP_WINDOW=1
SMS_API_KEY=your-sms-provider-api-key
SMS_FROM_NUMBER=+1234567890

# CAPTCHA Configuration
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
CAPTCHA_THRESHOLD=3  # Failed attempts before CAPTCHA required

# File Upload Security
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
VIRUS_SCAN_ENABLED=true
VIRUS_SCAN_API_KEY=your-virus-scan-api-key

# HTTPS Configuration
HTTPS_ENABLED=true
SSL_CERT_PATH=/path/to/ssl-cert.pem
SSL_KEY_PATH=/path/to/ssl-key.pem
FORCE_HTTPS=true

# CORS Configuration
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=true

# Session Configuration
SESSION_TIMEOUT=900000  # 15 minutes
SESSION_CLEANUP_INTERVAL=3600000  # 1 hour
MAX_CONCURRENT_SESSIONS=5
```

### Development vs Production

#### Development Environment
```bash
NODE_ENV=development
HTTPS_ENABLED=false
FORCE_HTTPS=false
DB_SSL_ENABLED=false
REDIS_TLS_ENABLED=false
SECURITY_LOG_LEVEL=debug
CORS_ORIGIN=*
```

#### Production Environment
```bash
NODE_ENV=production
HTTPS_ENABLED=true
FORCE_HTTPS=true
DB_SSL_ENABLED=true
REDIS_TLS_ENABLED=true
SECURITY_LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
```

## Security Services Configuration

### Configuration Service

The configuration service validates and loads all security settings:

```javascript
// backend/services/security/config/security.config.js
module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    keys: {
      primary: process.env.ENCRYPTION_KEY,
      field: process.env.FIELD_ENCRYPTION_KEY,
      password: process.env.PASSWORD_ENCRYPTION_KEY
    }
  },
  
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    redis: {
      prefix: process.env.RATE_LIMIT_REDIS_PREFIX || 'rate_limit:',
      ttl: 86400 // 24 hours
    },
    endpoints: {
      '/api/auth/login': { window: 900000, max: 10 },
      '/api/auth/register': { window: 3600000, max: 5 },
      '/api/auth/forgot-password': { window: 3600000, max: 3 },
      '/api/images/upload': { window: 3600000, max: 20 },
      default: { window: 900000, max: 200 }
    }
  },
  
  monitoring: {
    logLevel: process.env.SECURITY_LOG_LEVEL || 'info',
    logFile: process.env.SECURITY_LOG_FILE,
    alertWebhook: process.env.ALERT_WEBHOOK_URL,
    siemEndpoint: process.env.SIEM_ENDPOINT,
    anomalyThresholds: {
      low: 0.3,
      medium: 0.6,
      high: 0.8
    }
  }
};
```

## Database Security

### MongoDB Security Configuration

```javascript
// Secure connection options
const mongoOptions = {
  ssl: process.env.DB_SSL_ENABLED === 'true',
  sslCert: process.env.DB_SSL_CERT_PATH,
  sslValidate: true,
  authSource: 'admin',
  retryWrites: true,
  w: 'majority',
  readPreference: 'primary',
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  useNewUrlParser: true,
  useUnifiedTopology: true
};
```

### Field-Level Encryption

Configure which fields should be encrypted:

```javascript
// backend/services/security/config/encryption.config.js
module.exports = {
  encryptedFields: {
    User: [
      'email',
      'phone',
      'address',
      'totpSecret',
      'backupCodes'
    ],
    SecurityEvent: [
      'details.sensitiveData'
    ]
  },
  
  encryptionOptions: {
    algorithm: 'aes-256-gcm',
    keyRotationInterval: 2592000000, // 30 days
    compressionEnabled: true
  }
};
```

## Redis Configuration

### Security Settings

```javascript
// Redis security configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  
  // TLS Configuration
  tls: process.env.REDIS_TLS_ENABLED === 'true' ? {
    cert: fs.readFileSync(process.env.REDIS_TLS_CERT_PATH),
    rejectUnauthorized: true
  } : undefined,
  
  // Connection settings
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  
  // Security settings
  db: 0,
  keyPrefix: 'library_app:',
  
  // Connection pool
  family: 4,
  keepAlive: true,
  lazyConnect: true
};
```

## Rate Limiting Configuration

### Endpoint-Specific Limits

```javascript
// Rate limiting configuration by endpoint
const rateLimitConfig = {
  // Authentication endpoints
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    keyGenerator: (req) => `${req.ip}:${req.body.email}`,
    skipSuccessfulRequests: true,
    progressiveDelay: true
  },
  
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registrations per hour per IP
    keyGenerator: (req) => req.ip,
    skipSuccessfulRequests: false
  },
  
  '/api/auth/forgot-password': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    keyGenerator: (req) => `${req.ip}:${req.body.email}`,
    skipSuccessfulRequests: false
  },
  
  // File upload endpoints
  '/api/images/upload': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour per user
    keyGenerator: (req) => req.user?.id || req.ip,
    skipSuccessfulRequests: true
  },
  
  // Admin endpoints
  '/api/admin': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    keyGenerator: (req) => req.user?.id,
    skipSuccessfulRequests: true
  },
  
  // Default for all other endpoints
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window per IP
    keyGenerator: (req) => req.ip,
    skipSuccessfulRequests: true
  }
};
```

### Progressive Delay Configuration

```javascript
// Progressive delay for brute force protection
const progressiveDelayConfig = {
  enabled: true,
  delays: [1000, 2000, 4000, 8000, 16000], // Delays in milliseconds
  maxDelay: 30000, // Maximum delay
  resetAfter: 3600000, // Reset after 1 hour
  blockAfter: 10 // Block IP after 10 consecutive failures
};
```

## Authentication Configuration

### Password Policy

```javascript
// Password policy configuration
const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  
  // Password history
  preventReuse: true,
  historyLength: 5,
  
  // Breach detection
  checkBreaches: true,
  breachApiUrl: 'https://api.pwnedpasswords.com/range/',
  
  // Strength scoring
  minStrengthScore: 3, // Out of 5
  strengthChecks: {
    length: true,
    complexity: true,
    commonPatterns: true,
    dictionary: true
  }
};
```

### Multi-Factor Authentication

```javascript
// MFA configuration
const mfaConfig = {
  totp: {
    enabled: true,
    issuer: process.env.TOTP_ISSUER || 'LibraryBookingApp',
    window: parseInt(process.env.TOTP_WINDOW) || 1,
    step: 30, // 30 seconds
    digits: 6,
    algorithm: 'sha1'
  },
  
  sms: {
    enabled: true,
    provider: 'twilio', // or 'aws-sns'
    apiKey: process.env.SMS_API_KEY,
    fromNumber: process.env.SMS_FROM_NUMBER,
    messageTemplate: 'Your verification code is: {code}'
  },
  
  backupCodes: {
    enabled: true,
    count: 10,
    length: 8,
    oneTimeUse: true
  },
  
  recovery: {
    enabled: true,
    emailRequired: true,
    adminApprovalRequired: false
  }
};
```

## Encryption Configuration

### Key Management

```javascript
// Encryption key configuration
const encryptionConfig = {
  keys: {
    primary: {
      key: process.env.ENCRYPTION_KEY,
      algorithm: 'aes-256-gcm',
      keyId: 'primary-v1'
    },
    field: {
      key: process.env.FIELD_ENCRYPTION_KEY,
      algorithm: 'aes-256-gcm',
      keyId: 'field-v1'
    }
  },
  
  rotation: {
    enabled: true,
    interval: 2592000000, // 30 days
    retainOldKeys: 3, // Keep 3 previous versions
    notificationThreshold: 604800000 // Notify 7 days before rotation
  },
  
  storage: {
    keyDerivation: 'pbkdf2',
    iterations: 100000,
    saltLength: 32,
    keyLength: 32
  }
};
```

## Monitoring and Logging

### Security Event Configuration

```javascript
// Security monitoring configuration
const monitoringConfig = {
  events: {
    // Authentication events
    login_attempt: { severity: 'low', retention: 90 },
    login_success: { severity: 'low', retention: 30 },
    login_failed: { severity: 'medium', retention: 90 },
    logout: { severity: 'low', retention: 30 },
    
    // Authorization events
    privilege_escalation_attempt: { severity: 'high', retention: 365 },
    access_denied: { severity: 'medium', retention: 90 },
    
    // Security violations
    rate_limit_exceeded: { severity: 'medium', retention: 90 },
    input_validation_failed: { severity: 'medium', retention: 90 },
    suspicious_activity: { severity: 'high', retention: 365 },
    
    // System events
    security_error: { severity: 'high', retention: 365 },
    configuration_change: { severity: 'medium', retention: 180 }
  },
  
  alerting: {
    enabled: true,
    webhook: process.env.ALERT_WEBHOOK_URL,
    thresholds: {
      high_severity_events: 1, // Alert immediately
      medium_severity_events: 10, // Alert after 10 events in 1 hour
      failed_logins: 5, // Alert after 5 failed logins from same IP
      rate_limit_violations: 20 // Alert after 20 rate limit violations
    }
  },
  
  reporting: {
    enabled: true,
    schedule: '0 0 * * *', // Daily at midnight
    recipients: ['security@yourdomain.com'],
    includeMetrics: true,
    includeTrends: true
  }
};
```

### Log Configuration

```javascript
// Logging configuration
const loggingConfig = {
  level: process.env.SECURITY_LOG_LEVEL || 'info',
  
  transports: [
    {
      type: 'file',
      filename: process.env.SECURITY_LOG_FILE || '/var/log/security.log',
      maxSize: '100MB',
      maxFiles: 10,
      format: 'json'
    },
    {
      type: 'console',
      format: 'simple',
      level: 'debug'
    }
  ],
  
  structured: {
    enabled: true,
    includeStack: true,
    includeContext: true,
    sanitizeFields: ['password', 'token', 'secret']
  },
  
  correlation: {
    enabled: true,
    headerName: 'X-Correlation-ID',
    generateIfMissing: true
  }
};
```

## Security Headers

### Comprehensive Header Configuration

```javascript
// Security headers configuration
const securityHeaders = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.yourdomain.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    },
    reportOnly: false,
    reportUri: '/api/security/csp-report'
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Other security headers
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  xXssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    speaker: []
  }
};
```

## File Upload Security

### Upload Validation Configuration

```javascript
// File upload security configuration
const fileUploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  
  allowedTypes: {
    images: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    documents: ['pdf', 'doc', 'docx', 'txt'],
    archives: ['zip', 'rar']
  },
  
  validation: {
    mimeTypeCheck: true,
    fileSignatureCheck: true,
    filenameValidation: true,
    contentScan: true
  },
  
  virusScanning: {
    enabled: process.env.VIRUS_SCAN_ENABLED === 'true',
    provider: 'clamav', // or 'virustotal'
    apiKey: process.env.VIRUS_SCAN_API_KEY,
    timeout: 30000,
    quarantineOnDetection: true
  },
  
  storage: {
    path: './uploads',
    createDirectories: true,
    permissions: 0o644,
    encryption: true
  }
};
```

## Best Practices

### Security Checklist

1. **Environment Variables**
   - [ ] All secrets are stored in environment variables
   - [ ] No hardcoded credentials in code
   - [ ] Different secrets for different environments
   - [ ] Regular secret rotation schedule

2. **Database Security**
   - [ ] SSL/TLS enabled for database connections
   - [ ] Field-level encryption for sensitive data
   - [ ] Database user with minimal privileges
   - [ ] Regular security updates

3. **Authentication & Authorization**
   - [ ] Strong password policy enforced
   - [ ] Multi-factor authentication available
   - [ ] Session management properly configured
   - [ ] Role-based access control implemented

4. **Network Security**
   - [ ] HTTPS enforced in production
   - [ ] Security headers configured
   - [ ] CORS properly configured
   - [ ] Rate limiting implemented

5. **Monitoring & Logging**
   - [ ] Security events logged
   - [ ] Anomaly detection enabled
   - [ ] Alert system configured
   - [ ] Regular security reports generated

### Common Pitfalls

1. **Weak Configuration**
   - Using default passwords
   - Insufficient key lengths
   - Disabled security features in production

2. **Poor Secret Management**
   - Hardcoded secrets
   - Shared secrets across environments
   - No secret rotation

3. **Inadequate Monitoring**
   - Missing security event logging
   - No anomaly detection
   - Delayed incident response

4. **Misconfigured Headers**
   - Missing security headers
   - Overly permissive CSP
   - Disabled HTTPS enforcement

## Troubleshooting

### Common Issues

1. **Redis Connection Issues**
   ```bash
   # Check Redis connectivity
   redis-cli -h localhost -p 6379 ping
   
   # Check TLS configuration
   redis-cli -h localhost -p 6379 --tls ping
   ```

2. **Database Encryption Issues**
   ```bash
   # Verify encryption keys
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   
   # Test database connection
   mongosh "mongodb://localhost:27017/test?ssl=true"
   ```

3. **Rate Limiting Issues**
   ```bash
   # Check Redis rate limit keys
   redis-cli --scan --pattern "rate_limit:*"
   
   # Clear rate limits for testing
   redis-cli --eval "return redis.call('del', unpack(redis.call('keys', 'rate_limit:*')))" 0
   ```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
SECURITY_LOG_LEVEL=debug
DEBUG=security:*
NODE_ENV=development
```

This comprehensive configuration guide ensures that all security features are properly configured and maintained for optimal protection of the Library Booking System.