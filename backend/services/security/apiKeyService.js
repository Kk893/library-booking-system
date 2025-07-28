const ApiKey = require('../../models/ApiKey');
const User = require('../../models/User');
const crypto = require('crypto');
const { securityMonitorService } = require('./securityMonitorService');

class ApiKeyService {
  constructor() {
    this.defaultPermissions = [
      'read:books',
      'read:bookings',
      'read:libraries'
    ];
    
    this.permissionHierarchy = {
      'read:books': ['read:books'],
      'write:books': ['read:books', 'write:books'],
      'read:bookings': ['read:bookings'],
      'write:bookings': ['read:bookings', 'write:bookings'],
      'read:users': ['read:users'],
      'write:users': ['read:users', 'write:users'],
      'read:libraries': ['read:libraries'],
      'write:libraries': ['read:libraries', 'write:libraries'],
      'admin:all': ['*']
    };
  }

  /**
   * Create a new API key for a user
   * @param {Object} options - API key creation options
   * @returns {Object} Created API key with full key string
   */
  async createApiKey(options) {
    const {
      userId,
      name,
      permissions = this.defaultPermissions,
      scopes = [],
      rateLimit = { requestsPerHour: 1000, requestsPerDay: 10000 },
      restrictions = {},
      expiresAt = null,
      metadata = {}
    } = options;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate permissions
    this.validatePermissions(permissions);

    // Generate key pair
    const keyPair = ApiKey.generateKeyPair();

    // Create API key document
    const apiKey = new ApiKey({
      name,
      keyId: keyPair.keyId,
      hashedKey: keyPair.hashedKey,
      prefix: keyPair.prefix,
      userId,
      permissions,
      scopes,
      rateLimit,
      restrictions,
      expiresAt,
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV || 'development'
      }
    });

    // Add creation security event
    apiKey.securityEvents.push({
      eventType: 'created',
      timestamp: new Date(),
      details: {
        createdBy: userId,
        permissions: permissions,
        restrictions: restrictions
      }
    });

    await apiKey.save();

    // Log security event
    await securityMonitorService.logSecurityEvent({
      eventType: 'api_key_created',
      severity: 'medium',
      userId: userId,
      details: {
        apiKeyId: apiKey._id,
        keyId: keyPair.keyId,
        permissions: permissions,
        name: name
      }
    });

    return {
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        keyId: apiKey.keyId,
        prefix: apiKey.prefix,
        permissions: apiKey.permissions,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        restrictions: apiKey.restrictions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      },
      fullKey: keyPair.fullKey // Only returned once during creation
    };
  }

  /**
   * Validate API key and return key details
   * @param {string} fullKey - Full API key string
   * @param {Object} requestContext - Request context for validation
   * @returns {Object} Validated API key or null
   */
  async validateApiKey(fullKey, requestContext = {}) {
    try {
      // Parse key components
      const keyParts = fullKey.split('.');
      if (keyParts.length !== 3) {
        return null;
      }

      const [prefix, keyId, secret] = keyParts;

      // Find API key by keyId and prefix
      const apiKey = await ApiKey.findOne({ 
        keyId, 
        prefix,
        isActive: true 
      }).populate('userId', 'name email role');

      if (!apiKey) {
        return null;
      }

      // Verify the secret
      if (!apiKey.verifyKey(secret)) {
        await this.recordSuspiciousActivity(apiKey, 'invalid_secret', requestContext);
        return null;
      }

      // Check if key is valid (not expired, not revoked)
      if (!apiKey.isValid()) {
        return null;
      }

      // Check IP restrictions
      if (requestContext.ip && !apiKey.checkIPRestriction(requestContext.ip)) {
        await this.recordSuspiciousActivity(apiKey, 'ip_restriction_violation', requestContext);
        return null;
      }

      // Check domain restrictions
      if (requestContext.origin && !apiKey.checkDomainRestriction(requestContext.origin)) {
        await this.recordSuspiciousActivity(apiKey, 'domain_restriction_violation', requestContext);
        return null;
      }

      // Check rate limits
      const rateLimitCheck = apiKey.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        await this.recordRateLimitExceeded(apiKey, rateLimitCheck.reason, requestContext);
        return { error: 'rate_limit_exceeded', reason: rateLimitCheck.reason };
      }

      // Record usage
      await apiKey.recordUsage({
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
        endpoint: requestContext.endpoint
      });

      return {
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          keyId: apiKey.keyId,
          userId: apiKey.userId._id,
          user: apiKey.userId,
          permissions: apiKey.permissions,
          scopes: apiKey.scopes,
          rateLimit: apiKey.rateLimit,
          usage: apiKey.usage
        }
      };
    } catch (error) {
      console.error('API key validation error:', error);
      return null;
    }
  }

  /**
   * Check if API key has required permission
   * @param {Object} apiKey - API key object
   * @param {string} requiredPermission - Required permission
   * @returns {boolean} Whether permission is granted
   */
  hasPermission(apiKey, requiredPermission) {
    if (!apiKey || !apiKey.permissions) {
      return false;
    }

    // Check for admin permission
    if (apiKey.permissions.includes('admin:all')) {
      return true;
    }

    // Check direct permission
    if (apiKey.permissions.includes(requiredPermission)) {
      return true;
    }

    return false;
  }

  /**
   * List API keys for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} List of API keys
   */
  async listApiKeys(userId, options = {}) {
    const {
      includeRevoked = false,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const query = { userId };
    if (!includeRevoked) {
      query.revokedAt = null;
    }

    const apiKeys = await ApiKey.find(query)
      .select('-hashedKey -securityEvents')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit)
      .skip(offset)
      .populate('userId', 'name email');

    return apiKeys.map(key => ({
      id: key._id,
      name: key.name,
      keyId: key.keyId,
      prefix: key.prefix,
      permissions: key.permissions,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
      usage: key.usage,
      restrictions: key.restrictions,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      revokedAt: key.revokedAt,
      revokedBy: key.revokedBy,
      revokedReason: key.revokedReason,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt
    }));
  }

  /**
   * Revoke an API key
   * @param {string} apiKeyId - API key ID
   * @param {string} revokedBy - User ID who revoked the key
   * @param {string} reason - Revocation reason
   * @returns {Object} Revoked API key
   */
  async revokeApiKey(apiKeyId, revokedBy, reason = 'Manual revocation') {
    const apiKey = await ApiKey.findById(apiKeyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    if (apiKey.revokedAt) {
      throw new Error('API key is already revoked');
    }

    await apiKey.revoke(revokedBy, reason);

    // Log security event
    await securityMonitorService.logSecurityEvent({
      eventType: 'api_key_revoked',
      severity: 'medium',
      userId: apiKey.userId,
      details: {
        apiKeyId: apiKey._id,
        keyId: apiKey.keyId,
        revokedBy: revokedBy,
        reason: reason
      }
    });

    return {
      id: apiKey._id,
      name: apiKey.name,
      keyId: apiKey.keyId,
      revokedAt: apiKey.revokedAt,
      revokedBy: apiKey.revokedBy,
      revokedReason: apiKey.revokedReason
    };
  }

  /**
   * Rotate an API key
   * @param {string} apiKeyId - API key ID
   * @param {string} rotatedBy - User ID who rotated the key
   * @returns {Object} New API key with full key string
   */
  async rotateApiKey(apiKeyId, rotatedBy) {
    const oldApiKey = await ApiKey.findById(apiKeyId);
    if (!oldApiKey) {
      throw new Error('API key not found');
    }

    if (!oldApiKey.isValid()) {
      throw new Error('Cannot rotate invalid API key');
    }

    // Create new API key with same settings
    const newKeyOptions = {
      userId: oldApiKey.userId,
      name: oldApiKey.name,
      permissions: oldApiKey.permissions,
      scopes: oldApiKey.scopes,
      rateLimit: oldApiKey.rateLimit,
      restrictions: oldApiKey.restrictions,
      expiresAt: oldApiKey.expiresAt,
      metadata: oldApiKey.metadata
    };

    const newApiKeyResult = await this.createApiKey(newKeyOptions);

    // Revoke old API key
    await oldApiKey.revoke(rotatedBy, 'Key rotation');

    // Log security event
    await securityMonitorService.logSecurityEvent({
      eventType: 'api_key_rotated',
      severity: 'medium',
      userId: oldApiKey.userId,
      details: {
        oldApiKeyId: oldApiKey._id,
        newApiKeyId: newApiKeyResult.apiKey.id,
        rotatedBy: rotatedBy
      }
    });

    return newApiKeyResult;
  }

  /**
   * Update API key permissions and settings
   * @param {string} apiKeyId - API key ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated API key
   */
  async updateApiKey(apiKeyId, updates) {
    const apiKey = await ApiKey.findById(apiKeyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    if (apiKey.revokedAt) {
      throw new Error('Cannot update revoked API key');
    }

    // Validate permissions if being updated
    if (updates.permissions) {
      this.validatePermissions(updates.permissions);
    }

    // Apply updates
    const allowedUpdates = [
      'name', 'permissions', 'scopes', 'rateLimit', 
      'restrictions', 'expiresAt', 'metadata'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        apiKey[field] = updates[field];
      }
    });

    await apiKey.save();

    // Log security event
    await securityMonitorService.logSecurityEvent({
      eventType: 'api_key_updated',
      severity: 'low',
      userId: apiKey.userId,
      details: {
        apiKeyId: apiKey._id,
        updates: Object.keys(updates)
      }
    });

    return {
      id: apiKey._id,
      name: apiKey.name,
      keyId: apiKey.keyId,
      permissions: apiKey.permissions,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      restrictions: apiKey.restrictions,
      expiresAt: apiKey.expiresAt,
      updatedAt: apiKey.updatedAt
    };
  }

  /**
   * Get API key usage statistics
   * @param {string} apiKeyId - API key ID
   * @param {Object} options - Query options
   * @returns {Object} Usage statistics
   */
  async getApiKeyUsage(apiKeyId, options = {}) {
    const apiKey = await ApiKey.findById(apiKeyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    const {
      includeSecurityEvents = false,
      eventLimit = 100
    } = options;

    const usage = {
      totalRequests: apiKey.usage.totalRequests,
      requestsToday: apiKey.usage.requestsToday,
      requestsThisHour: apiKey.usage.requestsThisHour,
      lastUsed: apiKey.usage.lastUsed,
      rateLimit: apiKey.rateLimit,
      rateLimitStatus: apiKey.checkRateLimit()
    };

    if (includeSecurityEvents) {
      usage.securityEvents = apiKey.securityEvents
        .slice(-eventLimit)
        .map(event => ({
          eventType: event.eventType,
          timestamp: event.timestamp,
          details: event.details
        }));
    }

    return usage;
  }

  /**
   * Check for API keys that need rotation
   * @returns {Array} API keys that need rotation
   */
  async checkRotationDue() {
    const apiKeys = await ApiKey.find({
      isActive: true,
      revokedAt: null,
      'rotationSchedule.enabled': true,
      'rotationSchedule.nextRotation': { $lte: new Date() }
    });

    return apiKeys.map(key => ({
      id: key._id,
      name: key.name,
      keyId: key.keyId,
      userId: key.userId,
      nextRotation: key.rotationSchedule.nextRotation,
      intervalDays: key.rotationSchedule.intervalDays
    }));
  }

  /**
   * Validate permissions array
   * @param {Array} permissions - Permissions to validate
   */
  validatePermissions(permissions) {
    const validPermissions = Object.keys(this.permissionHierarchy);
    
    for (const permission of permissions) {
      if (!validPermissions.includes(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }
  }

  /**
   * Record suspicious activity
   * @param {Object} apiKey - API key object
   * @param {string} activityType - Type of suspicious activity
   * @param {Object} requestContext - Request context
   */
  async recordSuspiciousActivity(apiKey, activityType, requestContext) {
    apiKey.securityEvents.push({
      eventType: 'suspicious_activity',
      timestamp: new Date(),
      details: {
        activityType,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
        endpoint: requestContext.endpoint
      }
    });

    await apiKey.save();

    // Log to security monitoring
    await securityMonitorService.logSecurityEvent({
      eventType: 'api_key_suspicious_activity',
      severity: 'high',
      userId: apiKey.userId,
      details: {
        apiKeyId: apiKey._id,
        activityType,
        requestContext
      }
    });
  }

  /**
   * Record rate limit exceeded event
   * @param {Object} apiKey - API key object
   * @param {string} reason - Rate limit reason
   * @param {Object} requestContext - Request context
   */
  async recordRateLimitExceeded(apiKey, reason, requestContext) {
    apiKey.securityEvents.push({
      eventType: 'rate_limit_exceeded',
      timestamp: new Date(),
      details: {
        reason,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
        endpoint: requestContext.endpoint
      }
    });

    await apiKey.save();

    // Log to security monitoring
    await securityMonitorService.logSecurityEvent({
      eventType: 'api_key_rate_limit_exceeded',
      severity: 'medium',
      userId: apiKey.userId,
      details: {
        apiKeyId: apiKey._id,
        reason,
        requestContext
      }
    });
  }
}

module.exports = new ApiKeyService();