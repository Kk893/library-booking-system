/**
 * Security Constants
 * Defines constants used across security services
 */

module.exports = {
  // Security Event Types
  SECURITY_EVENTS: {
    LOGIN_ATTEMPT: 'login_attempt',
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    PASSWORD_CHANGE: 'password_change',
    PRIVILEGE_ESCALATION: 'privilege_escalation',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    DATA_ACCESS: 'data_access',
    ACCOUNT_LOCKOUT: 'account_lockout',
    TOKEN_REFRESH: 'token_refresh',
    SESSION_INVALIDATED: 'session_invalidated',
    MFA_ENABLED: 'mfa_enabled',
    MFA_DISABLED: 'mfa_disabled',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    BULK_SESSION_INVALIDATION: 'bulk_session_invalidation',
    SECURITY_INCIDENT: 'security_incident',
    INCIDENT_STATUS_CHANGE: 'incident_status_change',
  },

  // Security Event Severity Levels
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },

  // Rate Limit Keys
  RATE_LIMIT_KEYS: {
    GENERAL_API: 'api:general',
    AUTH_ATTEMPT: 'auth:attempt',
    PASSWORD_RESET: 'auth:password_reset',
    FILE_UPLOAD: 'api:file_upload',
    MFA_ATTEMPT: 'auth:mfa_attempt',
  },

  // Redis Key Prefixes
  REDIS_PREFIXES: {
    SESSION: 'session:',
    RATE_LIMIT: 'rate_limit:',
    TOKEN_BLACKLIST: 'token_blacklist:',
    SECURITY_EVENT: 'security_event:',
    IP_REPUTATION: 'ip_reputation:',
    USER_ACTIVITY: 'user_activity:',
  },

  // Token Types
  TOKEN_TYPES: {
    ACCESS: 'access',
    REFRESH: 'refresh',
    PASSWORD_RESET: 'password_reset',
    EMAIL_VERIFICATION: 'email_verification',
  },

  // Security Headers
  SECURITY_HEADERS: {
    HSTS: 'Strict-Transport-Security',
    CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
    FRAME_OPTIONS: 'X-Frame-Options',
    XSS_PROTECTION: 'X-XSS-Protection',
    REFERRER_POLICY: 'Referrer-Policy',
    CSP: 'Content-Security-Policy',
    PERMISSIONS_POLICY: 'Permissions-Policy',
  },

  // Error Codes
  ERROR_CODES: {
    AUTH_FAILED: 'AUTH_FAILED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
    MFA_REQUIRED: 'MFA_REQUIRED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    INSUFFICIENT_PRIVILEGES: 'INSUFFICIENT_PRIVILEGES',
  },

  // Default Timeouts (in milliseconds)
  TIMEOUTS: {
    TOKEN_BLACKLIST_TTL: 15 * 60 * 1000, // 15 minutes
    SESSION_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    IP_BLOCK_TTL: 60 * 60 * 1000, // 1 hour
    SECURITY_EVENT_TTL: 90 * 24 * 60 * 60 * 1000, // 90 days
  },
};