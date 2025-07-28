/**
 * Validation Schemas for Security Configuration
 * Joi schemas for validating security configuration and environment variables
 */

const Joi = require('joi');

const environmentSchema = Joi.object({
  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_TLS_ENABLED: Joi.boolean().default(false),
  REDIS_DB: Joi.number().min(0).max(15).default(0),

  // Encryption Configuration
  ENCRYPTION_KEY: Joi.string().min(32).required(),
  FIELD_ENCRYPTION_KEY: Joi.string().min(32).required(),

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW: Joi.number().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().positive().default(200),
  AUTH_RATE_LIMIT_MAX: Joi.number().positive().default(10),

  // Security Monitoring
  SECURITY_LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  ALERT_WEBHOOK_URL: Joi.string().uri().optional(),
  SIEM_ENDPOINT: Joi.string().uri().optional(),

  // MFA Configuration
  TOTP_ISSUER: Joi.string().default('LibraryBookingApp'),
  SMS_API_KEY: Joi.string().optional(),
  SMS_FROM_NUMBER: Joi.string().optional(),

  // Database Security
  DB_ENCRYPTION_ENABLED: Joi.boolean().default(false),
  DB_SSL_ENABLED: Joi.boolean().default(false),
  DB_SSL_CERT_PATH: Joi.string().optional(),

  // General Security
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  HTTPS_ENABLED: Joi.boolean().default(false),
  SECURITY_HEADERS_ENABLED: Joi.boolean().default(true),
});

const securityConfigSchema = Joi.object({
  jwt: Joi.object({
    secret: Joi.string().min(32).required(),
    refreshSecret: Joi.string().min(32).required(),
    accessTokenExpiry: Joi.string().required(),
    refreshTokenExpiry: Joi.string().required(),
    algorithm: Joi.string().valid('HS256', 'HS384', 'HS512').default('HS256'),
  }).required(),

  redis: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    password: Joi.string().optional(),
    db: Joi.number().min(0).max(15).default(0),
    tls: Joi.boolean().default(false),
    retryDelayOnFailover: Joi.number().positive().default(100),
    maxRetriesPerRequest: Joi.number().positive().default(3),
  }).required(),

  rateLimit: Joi.object({
    windowMs: Joi.number().positive().required(),
    maxRequests: Joi.number().positive().required(),
    authMaxRequests: Joi.number().positive().required(),
    progressiveDelayBase: Joi.number().positive().default(1000),
  }).required(),

  encryption: Joi.object({
    encryptionKey: Joi.string().min(32).required(),
    fieldEncryptionKey: Joi.string().min(32).required(),
    algorithm: Joi.string().default('aes-256-gcm'),
    keyDerivation: Joi.string().default('pbkdf2'),
    iterations: Joi.number().positive().default(100000),
  }).required(),

  monitoring: Joi.object({
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
    alertWebhookUrl: Joi.string().uri().optional(),
    siemEndpoint: Joi.string().uri().optional(),
  }).required(),
});

module.exports = {
  environmentSchema,
  securityConfigSchema,
};