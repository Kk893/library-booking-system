# API Security Implementation Guide

## Overview

This document provides comprehensive guidelines for implementing and maintaining API security in the Library Booking Application. It covers authentication methods, security best practices, and implementation details for developers.

## Authentication Methods

### 1. JWT Token Authentication

**Primary authentication method for web application users.**

```javascript
// Request Headers
Authorization: Bearer <jwt_token>

// Example Usage
const response = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Token Lifecycle:**
- Access Token: 15 minutes expiration
- Refresh Token: 7 days expiration
- Automatic refresh via `/api/auth/refresh` endpoint

### 2. API Key Authentication

**For external integrations and programmatic access.**

```javascript
// Request Headers (Preferred)
Authorization: Bearer <api_key>
// OR
X-API-Key: <api_key>

// Example Usage
const response = await fetch('/api/books', {
  headers: {
    'X-API-Key': 'lba_1234567890abcdef.keyid123.secret456',
    'Content-Type': 'application/json'
  }
});
```

**API Key Format:**
```
lba_<prefix>.<keyId>.<secret>
```

## API Key Management

### Creating API Keys

```javascript
POST /api/api-keys
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "name": "External Integration",
  "permissions": ["read:books", "read:libraries"],
  "rateLimit": {
    "requestsPerHour": 1000,
    "requestsPerDay": 10000
  },
  "restrictions": {
    "allowedIPs": ["192.168.1.100"],
    "allowedDomains": ["example.com"]
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### API Key Permissions

| Permission | Description | Scope |
|------------|-------------|-------|
| `read:books` | Read book information | Books catalog |
| `write:books` | Create/update books | Books management |
| `read:bookings` | Read booking data | Booking information |
| `write:bookings` | Create/modify bookings | Booking management |
| `read:users` | Read user profiles | User data |
| `write:users` | Modify user accounts | User management |
| `read:libraries` | Read library information | Library data |
| `write:libraries` | Modify library settings | Library management |
| `admin:all` | Full administrative access | All operations |

### Rate Limiting

API keys are subject to rate limiting:

```javascript
// Response Headers
X-RateLimit-Limit-Hour: 1000
X-RateLimit-Limit-Day: 10000
X-RateLimit-Remaining-Hour: 950
X-RateLimit-Remaining-Day: 9500
X-RateLimit-Reset-Hour: 2024-01-27T15:00:00Z
X-RateLimit-Reset-Day: 2024-01-28T00:00:00Z
```

**Rate Limit Exceeded Response:**
```javascript
HTTP 429 Too Many Requests
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Hourly rate limit exceeded",
    "retryAfter": 3600
  }
}
```

## Security Middleware Implementation

### 1. API Key Middleware

```javascript
const { apiKeyAuth, requirePermissions } = require('../services/security/apiKeyMiddleware');

// Basic API key authentication
router.get('/api/books', 
  apiKeyAuth({ required: false, allowUserAuth: true }),
  getBooksController
);

// Required API key with specific permissions
router.post('/api/books',
  apiKeyAuth({ permissions: ['write:books'] }),
  createBookController
);

// Multiple permission requirements
router.delete('/api/books/:id',
  apiKeyAuth(),
  requirePermissions(['write:books', 'admin:all']),
  deleteBookController
);
```

### 2. Step-Up Authentication

For sensitive operations requiring additional authentication:

```javascript
const { requireStepUp, requireOperationPermission } = require('../services/security/stepUpAuthMiddleware');

// Require recent password authentication
router.delete('/api/user/:id',
  authenticateToken,
  requireStepUp({ level: 'password', maxAge: 300 }),
  deleteUserController
);

// Require MFA for admin operations
router.put('/api/admin/system/settings',
  authenticateToken,
  requireStepUp({ level: 'mfa', maxAge: 900 }),
  requireOperationPermission(['admin:all']),
  updateSystemSettingsController
);
```

## Field-Level Encryption

### Encrypting Sensitive Data

```javascript
const { encryptionService } = require('../services/security/encryptionService');

// Encrypt single field
const encryptedEmail = await encryptionService.encryptField(
  user.email, 
  'email'
);

// Encrypt multiple fields
const encryptedUser = await encryptionService.encryptFields(user, [
  { field: 'email', type: 'email' },
  { field: 'phone', type: 'phoneNumber' },
  { field: 'ssn', type: 'ssn' }
]);
```

### Decrypting Data

```javascript
// Decrypt single field
const decryptedEmail = await encryptionService.decryptField(
  encryptedEmail, 
  'email'
);

// Decrypt multiple fields
const decryptedUser = await encryptionService.decryptFields(encryptedUser, [
  { field: 'email', type: 'email' },
  { field: 'phone', type: 'phoneNumber' },
  { field: 'ssn', type: 'ssn' }
]);
```

## Security Headers

All API responses include security headers:

```javascript
// Automatic security headers
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
```

## Error Handling

### Security Error Responses

```javascript
// Authentication Error
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication required for this endpoint"
  }
}

// Authorization Error
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "API key does not have required permissions",
    "required": ["write:books"],
    "granted": ["read:books"]
  }
}

// Step-Up Required
{
  "success": false,
  "error": {
    "code": "STEP_UP_REQUIRED",
    "message": "Additional authentication required for this operation",
    "stepUpRequired": {
      "level": "mfa",
      "reason": "mfa_auth_expired",
      "maxAge": 900
    }
  }
}
```

## Security Testing

### Unit Tests

```javascript
// Test API key authentication
describe('API Key Authentication', () => {
  it('should authenticate valid API key', async () => {
    const response = await request(app)
      .get('/api/books')
      .set('X-API-Key', validApiKey)
      .expect(200);
  });

  it('should reject invalid API key', async () => {
    const response = await request(app)
      .get('/api/books')
      .set('X-API-Key', 'invalid-key')
      .expect(401);
  });
});
```

### Integration Tests

```javascript
// Test complete authentication flow
describe('Authentication Flow', () => {
  it('should handle token refresh', async () => {
    // Login and get tokens
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    // Use refresh token
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', loginResponse.headers['set-cookie']);

    expect(refreshResponse.status).toBe(200);
  });
});
```

## Security Monitoring

### Security Events

The system logs various security events:

- `api_key_created` - New API key generated
- `api_key_used` - API key authentication
- `api_key_revoked` - API key revoked
- `step_up_required` - Step-up authentication required
- `unauthorized_operation` - Unauthorized access attempt
- `rate_limit_exceeded` - Rate limit violation

### Monitoring Queries

```javascript
// Get failed authentication attempts
const failedAttempts = await SecurityEvent.find({
  eventType: 'api_key_auth_failed',
  timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});

// Get rate limit violations
const rateLimitViolations = await SecurityEvent.find({
  eventType: 'api_key_rate_limit_exceeded',
  timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
});
```

## Best Practices

### 1. API Key Security

- **Never expose API keys in client-side code**
- **Use environment variables for key storage**
- **Implement key rotation policies**
- **Monitor key usage patterns**
- **Revoke unused or compromised keys**

### 2. Permission Management

- **Follow principle of least privilege**
- **Use specific permissions instead of admin:all**
- **Regularly audit API key permissions**
- **Implement time-based access controls**

### 3. Rate Limiting

- **Set appropriate limits based on use case**
- **Monitor rate limit violations**
- **Implement progressive delays for abuse**
- **Use different limits for different operations**

### 4. Encryption

- **Encrypt all PII and sensitive data**
- **Use field-specific encryption keys**
- **Implement key rotation procedures**
- **Monitor encryption/decryption operations**

## Configuration

### Environment Variables

```bash
# API Security Configuration
API_KEY_ENCRYPTION_KEY=your-32-byte-encryption-key
FIELD_ENCRYPTION_KEY=your-field-encryption-key
RATE_LIMIT_REDIS_URL=redis://localhost:6379
SECURITY_MONITORING_ENABLED=true

# Step-Up Authentication
STEP_UP_PASSWORD_MAX_AGE=300
STEP_UP_MFA_MAX_AGE=900
STEP_UP_ADMIN_MAX_AGE=1800
```

### Security Configuration

```javascript
// config/security.js
module.exports = {
  apiKeys: {
    defaultRateLimit: {
      requestsPerHour: 1000,
      requestsPerDay: 10000
    },
    maxKeysPerUser: 10,
    keyRotationInterval: 90 // days
  },
  stepUp: {
    levels: {
      password: 300, // 5 minutes
      mfa: 900,      // 15 minutes
      admin: 1800    // 30 minutes
    }
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotationInterval: 365 // days
  }
};
```

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Check key format and validity
   - Verify permissions and restrictions
   - Check rate limits
   - Ensure key is not expired or revoked

2. **Step-Up Authentication Failing**
   - Verify recent authentication timestamps
   - Check MFA status for MFA-required operations
   - Ensure user has required privileges

3. **Encryption/Decryption Errors**
   - Verify encryption keys are configured
   - Check field type mappings
   - Ensure data format is correct

### Debug Mode

Enable debug logging:

```bash
DEBUG=security:* npm start
```

This will provide detailed logs for all security operations.

## Support

For security-related issues or questions:

1. Check the security logs in the monitoring dashboard
2. Review the security event history
3. Consult this documentation
4. Contact the security team for critical issues

---

**Last Updated:** January 27, 2025
**Version:** 1.0.0