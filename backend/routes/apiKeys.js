const express = require('express');
const router = express.Router();
const apiKeyService = require('../services/security/apiKeyService');
const { apiKeyAuth, requirePermissions } = require('../services/security/apiKeyMiddleware');
const { auth: authenticateToken } = require('../middleware/auth');
const { validationService } = require('../services/security/validationService');
const Joi = require('joi');

// Validation schemas
const createApiKeySchema = Joi.object({
  name: Joi.string().required().min(1).max(100).trim(),
  permissions: Joi.array().items(
    Joi.string().valid(
      'read:books', 'write:books',
      'read:bookings', 'write:bookings',
      'read:users', 'write:users',
      'read:libraries', 'write:libraries',
      'admin:all'
    )
  ).default(['read:books', 'read:bookings', 'read:libraries']),
  scopes: Joi.array().items(Joi.string().trim()).default([]),
  rateLimit: Joi.object({
    requestsPerHour: Joi.number().integer().min(1).max(10000).default(1000),
    requestsPerDay: Joi.number().integer().min(1).max(100000).default(10000)
  }).default(),
  restrictions: Joi.object({
    allowedIPs: Joi.array().items(Joi.string().ip()).default([]),
    allowedDomains: Joi.array().items(Joi.string().domain()).default([]),
    allowedUserAgents: Joi.array().items(Joi.string()).default([])
  }).default({}),
  expiresAt: Joi.date().greater('now').allow(null).default(null),
  metadata: Joi.object({
    application: Joi.string().trim().allow(''),
    description: Joi.string().trim().allow(''),
    tags: Joi.array().items(Joi.string().trim()).default([])
  }).default({})
});

const updateApiKeySchema = Joi.object({
  name: Joi.string().min(1).max(100).trim(),
  permissions: Joi.array().items(
    Joi.string().valid(
      'read:books', 'write:books',
      'read:bookings', 'write:bookings',
      'read:users', 'write:users',
      'read:libraries', 'write:libraries',
      'admin:all'
    )
  ),
  scopes: Joi.array().items(Joi.string().trim()),
  rateLimit: Joi.object({
    requestsPerHour: Joi.number().integer().min(1).max(10000),
    requestsPerDay: Joi.number().integer().min(1).max(100000)
  }),
  restrictions: Joi.object({
    allowedIPs: Joi.array().items(Joi.string().ip()),
    allowedDomains: Joi.array().items(Joi.string().domain()),
    allowedUserAgents: Joi.array().items(Joi.string())
  }),
  expiresAt: Joi.date().greater('now').allow(null),
  metadata: Joi.object({
    application: Joi.string().trim().allow(''),
    description: Joi.string().trim().allow(''),
    tags: Joi.array().items(Joi.string().trim())
  })
}).min(1);

/**
 * @route POST /api/api-keys
 * @desc Create a new API key
 * @access Private (JWT required)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createApiKeySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      });
    }

    // Check if user can create API keys with requested permissions
    const userRole = req.user.role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      // Regular users can only create keys with basic read permissions
      const allowedPermissions = ['read:books', 'read:bookings', 'read:libraries'];
      const hasRestrictedPermissions = value.permissions.some(perm => 
        !allowedPermissions.includes(perm)
      );
      
      if (hasRestrictedPermissions) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'You can only create API keys with read permissions',
            allowedPermissions
          }
        });
      }
    }

    // Create API key
    const result = await apiKeyService.createApiKey({
      ...value,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: {
        apiKey: result.apiKey,
        fullKey: result.fullKey,
        warning: 'Store this key securely. It will not be shown again.'
      }
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create API key'
      }
    });
  }
});

/**
 * @route GET /api/api-keys
 * @desc List user's API keys
 * @access Private (JWT required)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      includeRevoked = 'false',
      limit = '50',
      offset = '0',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      includeRevoked: includeRevoked === 'true',
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0,
      sortBy,
      sortOrder
    };

    const apiKeys = await apiKeyService.listApiKeys(req.user.id, options);

    res.json({
      success: true,
      data: {
        apiKeys,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: apiKeys.length
        }
      }
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list API keys'
      }
    });
  }
});

/**
 * @route GET /api/api-keys/:id
 * @desc Get API key details
 * @access Private (JWT required)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const apiKeys = await apiKeyService.listApiKeys(req.user.id);
    const apiKey = apiKeys.find(key => key.id === req.params.id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    res.json({
      success: true,
      data: { apiKey }
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get API key'
      }
    });
  }
});

/**
 * @route PUT /api/api-keys/:id
 * @desc Update API key
 * @access Private (JWT required)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateApiKeySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      });
    }

    // Check if API key belongs to user
    const apiKeys = await apiKeyService.listApiKeys(req.user.id);
    const existingKey = apiKeys.find(key => key.id === req.params.id);

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    // Check permissions for permission updates
    if (value.permissions) {
      const userRole = req.user.role;
      if (userRole !== 'admin' && userRole !== 'superadmin') {
        const allowedPermissions = ['read:books', 'read:bookings', 'read:libraries'];
        const hasRestrictedPermissions = value.permissions.some(perm => 
          !allowedPermissions.includes(perm)
        );
        
        if (hasRestrictedPermissions) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PRIVILEGES',
              message: 'You can only set read permissions',
              allowedPermissions
            }
          });
        }
      }
    }

    const updatedApiKey = await apiKeyService.updateApiKey(req.params.id, value);

    res.json({
      success: true,
      data: { apiKey: updatedApiKey }
    });
  } catch (error) {
    console.error('Update API key error:', error);
    
    if (error.message === 'API key not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    if (error.message === 'Cannot update revoked API key') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'API_KEY_REVOKED',
          message: 'Cannot update revoked API key'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update API key'
      }
    });
  }
});

/**
 * @route DELETE /api/api-keys/:id
 * @desc Revoke API key
 * @access Private (JWT required)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { reason = 'Manual revocation by user' } = req.body;

    // Check if API key belongs to user
    const apiKeys = await apiKeyService.listApiKeys(req.user.id);
    const existingKey = apiKeys.find(key => key.id === req.params.id);

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    const revokedApiKey = await apiKeyService.revokeApiKey(
      req.params.id, 
      req.user.id, 
      reason
    );

    res.json({
      success: true,
      data: { 
        apiKey: revokedApiKey,
        message: 'API key revoked successfully'
      }
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    
    if (error.message === 'API key not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    if (error.message === 'API key is already revoked') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'API_KEY_ALREADY_REVOKED',
          message: 'API key is already revoked'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to revoke API key'
      }
    });
  }
});

/**
 * @route POST /api/api-keys/:id/rotate
 * @desc Rotate API key
 * @access Private (JWT required)
 */
router.post('/:id/rotate', authenticateToken, async (req, res) => {
  try {
    // Check if API key belongs to user
    const apiKeys = await apiKeyService.listApiKeys(req.user.id);
    const existingKey = apiKeys.find(key => key.id === req.params.id);

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    const result = await apiKeyService.rotateApiKey(req.params.id, req.user.id);

    res.json({
      success: true,
      data: {
        apiKey: result.apiKey,
        fullKey: result.fullKey,
        message: 'API key rotated successfully',
        warning: 'Store the new key securely. The old key has been revoked.'
      }
    });
  } catch (error) {
    console.error('Rotate API key error:', error);
    
    if (error.message === 'API key not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    if (error.message === 'Cannot rotate invalid API key') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Cannot rotate invalid or expired API key'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to rotate API key'
      }
    });
  }
});

/**
 * @route GET /api/api-keys/:id/usage
 * @desc Get API key usage statistics
 * @access Private (JWT required)
 */
router.get('/:id/usage', authenticateToken, async (req, res) => {
  try {
    const { includeEvents = 'false', eventLimit = '100' } = req.query;

    // Check if API key belongs to user
    const apiKeys = await apiKeyService.listApiKeys(req.user.id);
    const existingKey = apiKeys.find(key => key.id === req.params.id);

    if (!existingKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }

    const usage = await apiKeyService.getApiKeyUsage(req.params.id, {
      includeSecurityEvents: includeEvents === 'true',
      eventLimit: Math.min(parseInt(eventLimit) || 100, 1000)
    });

    res.json({
      success: true,
      data: { usage }
    });
  } catch (error) {
    console.error('Get API key usage error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get API key usage'
      }
    });
  }
});

/**
 * @route GET /api/api-keys/rotation/due
 * @desc Get API keys that need rotation (Admin only)
 * @access Private (Admin required)
 */
router.get('/rotation/due', authenticateToken, async (req, res) => {
  try {
    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PRIVILEGES',
          message: 'Admin privileges required'
        }
      });
    }

    const keysNeedingRotation = await apiKeyService.checkRotationDue();

    res.json({
      success: true,
      data: {
        keysNeedingRotation,
        count: keysNeedingRotation.length
      }
    });
  } catch (error) {
    console.error('Check rotation due error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check rotation status'
      }
    });
  }
});

module.exports = router;