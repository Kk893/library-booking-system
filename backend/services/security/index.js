/**
 * Security Services Index
 * Central export point for all security-related services
 */

// Core security services
const configService = require('./configService');
const redisService = require('./redisService');

// Authentication and session services
const sessionService = require('./sessionService');
const deviceFingerprintService = require('./deviceFingerprintService');
const apiKeyService = require('./apiKeyService');
// const mfaService = require('./mfaService');

// Protection and validation services
// const rateLimitService = require('./rateLimitService');
// const validationService = require('./validationService');
const encryptionService = require('./encryptionService');

// Monitoring and logging services
const securityMonitorService = require('./securityMonitorService');
const incidentResponseService = require('./incidentResponseService');

module.exports = {
  // Core services
  configService,
  redisService,
  
  // Authentication services
  sessionService,
  deviceFingerprintService,
  apiKeyService,
  // mfaService,
  
  // Protection services (to be implemented)
  // rateLimitService,
  // validationService,
  encryptionService,
  
  // Monitoring services
  securityMonitorService,
  incidentResponseService,
};