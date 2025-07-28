const mongoose = require('mongoose');
const encryptionService = require('./encryptionService');
const { securityMonitorService } = require('./securityMonitorService');

class DatabaseEncryptionService {
  constructor() {
    this.encryptedFields = new Map();
    this.initialized = false;
    
    // Define sensitive fields that should be automatically encrypted
    this.sensitiveFieldMappings = {
      // User model sensitive fields
      'User': [
        { field: 'email', type: 'email' },
        { field: 'phone', type: 'phoneNumber' },
        { field: 'address', type: 'address' },
        { field: 'totpSecret', type: 'totpSecret' },
        { field: 'resetPasswordToken', type: 'token' },
        { field: 'emailVerificationToken', type: 'token' },
        { field: 'backupCodes', type: 'backupCodes', isArray: true },
        { field: 'mfaRecovery.recoveryCode', type: 'token' }
      ],
      // API Key model sensitive fields
      'ApiKey': [
        { field: 'key', type: 'apiKey' },
        { field: 'hashedKey', type: 'apiKey' }
      ]
    };
  }

  /**
   * Initialize the database encryption service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await encryptionService.initialize();
      this.initialized = true;
      
      await securityMonitorService.logSecurityEvent({
        eventType: 'database_encryption_initialized',
        severity: 'info',
        details: {
          sensitiveModels: Object.keys(this.sensitiveFieldMappings),
          timestamp: new Date()
        }
      });

      console.log('Database encryption service initialized');
    } catch (error) {
      console.error('Failed to initialize database encryption service:', error);
      throw error;
    }
  }

  /**
   * Create Mongoose plugin for automatic field encryption
   * @param {Object} schema - Mongoose schema
   * @param {Object} options - Plugin options
   */
  createEncryptionPlugin(schema, options = {}) {
    const modelName = options.modelName;
    const fieldMappings = this.sensitiveFieldMappings[modelName] || [];
    const serviceInstance = this; // Capture service instance for use in middleware

    if (fieldMappings.length === 0) {
      return; // No sensitive fields for this model
    }

    // Store field mappings for this model
    this.encryptedFields.set(modelName, fieldMappings);

    // Pre-save middleware for encryption
    schema.pre('save', async function(next) {
      try {
        if (!encryptionService.initialized) {
          await encryptionService.initialize();
        }

        // Encrypt sensitive fields before saving
        for (const mapping of fieldMappings) {
          const fieldValue = this.get(mapping.field);
          
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
            if (mapping.isArray && Array.isArray(fieldValue)) {
              // Handle array fields (like backupCodes)
              const encryptedArray = [];
              for (const item of fieldValue) {
                if (typeof item === 'object' && item.code) {
                  // Handle objects with code property
                  const encryptedItem = { ...item };
                  encryptedItem.code = await encryptionService.encryptField(item.code, mapping.type);
                  encryptedArray.push(encryptedItem);
                } else if (typeof item === 'string') {
                  // Handle string arrays
                  encryptedArray.push(await encryptionService.encryptField(item, mapping.type));
                } else {
                  encryptedArray.push(item);
                }
              }
              this.set(mapping.field, encryptedArray);
            } else if (mapping.field.includes('.')) {
              // Handle nested fields (like mfaRecovery.recoveryCode)
              const nestedValue = this.get(mapping.field);
              if (nestedValue && !encryptionService.isEncrypted(nestedValue)) {
                this.set(mapping.field, await encryptionService.encryptField(nestedValue, mapping.type));
              }
            } else {
              // Handle regular fields
              if (!encryptionService.isEncrypted(fieldValue)) {
                this.set(mapping.field, await encryptionService.encryptField(fieldValue, mapping.type));
              }
            }
          }
        }

        // Log encryption event for audit
        await securityMonitorService.logSecurityEvent({
          eventType: 'database_field_encrypted',
          severity: 'low',
          details: {
            modelName,
            documentId: this._id,
            encryptedFields: fieldMappings.map(m => m.field),
            timestamp: new Date()
          }
        });

        next();
      } catch (error) {
        console.error(`Encryption error in ${modelName} pre-save:`, error);
        next(error);
      }
    });

    // Post-find middleware for decryption - DISABLED for now to prevent errors
    // schema.post(['find', 'findOne', 'findOneAndUpdate'], async function(docs) {
    //   if (!docs) return;
    //   // Decryption disabled to prevent login issues
    // });

    // Add static method for manual decryption
    schema.statics.decryptDocument = async function(doc, mappings = null) {
      const fieldMappings = mappings || this.constructor.encryptedFields?.get(modelName) || [];
      
      for (const mapping of fieldMappings) {
        const fieldValue = doc.get ? doc.get(mapping.field) : doc[mapping.field];
        
        if (fieldValue !== undefined && fieldValue !== null) {
          try {
            if (mapping.isArray && Array.isArray(fieldValue)) {
              // Handle array fields
              const decryptedArray = [];
              for (const item of fieldValue) {
                if (typeof item === 'object' && item.code && encryptionService.isEncrypted(item.code)) {
                  const decryptedItem = { ...item };
                  decryptedItem.code = await encryptionService.decryptField(item.code, mapping.type);
                  decryptedArray.push(decryptedItem);
                } else if (typeof item === 'string' && encryptionService.isEncrypted(item)) {
                  decryptedArray.push(await encryptionService.decryptField(item, mapping.type));
                } else {
                  decryptedArray.push(item);
                }
              }
              if (doc.set) {
                doc.set(mapping.field, decryptedArray);
              } else {
                doc[mapping.field] = decryptedArray;
              }
            } else if (mapping.field.includes('.')) {
              // Handle nested fields
              if (encryptionService.isEncrypted(fieldValue)) {
                const decrypted = await encryptionService.decryptField(fieldValue, mapping.type);
                if (doc.set) {
                  doc.set(mapping.field, decrypted);
                } else {
                  // Handle nested object assignment
                  const parts = mapping.field.split('.');
                  let current = doc;
                  for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) current[parts[i]] = {};
                    current = current[parts[i]];
                  }
                  current[parts[parts.length - 1]] = decrypted;
                }
              }
            } else {
              // Handle regular fields
              if (encryptionService.isEncrypted(fieldValue)) {
                const decrypted = await encryptionService.decryptField(fieldValue, mapping.type);
                if (doc.set) {
                  doc.set(mapping.field, decrypted);
                } else {
                  doc[mapping.field] = decrypted;
                }
              }
            }
          } catch (error) {
            console.error(`Failed to decrypt field ${mapping.field}:`, error);
            // Keep encrypted value if decryption fails
          }
        }
      }

      return doc;
    };

    // Add instance method for manual decryption
    schema.methods.decryptFields = async function() {
      return await this.constructor.decryptDocument(this, fieldMappings);
    };

    // Add method to check if field is encrypted
    schema.methods.isFieldEncrypted = function(fieldName) {
      const fieldValue = this.get(fieldName);
      return encryptionService.isEncrypted(fieldValue);
    };

    // Add method to get encryption metadata
    schema.methods.getFieldEncryptionMetadata = function(fieldName) {
      const fieldValue = this.get(fieldName);
      return encryptionService.getEncryptionMetadata(fieldValue);
    };
  }

  /**
   * Apply encryption plugin to a Mongoose model
   * @param {Object} schema - Mongoose schema
   * @param {string} modelName - Name of the model
   */
  applyEncryption(schema, modelName) {
    if (!this.sensitiveFieldMappings[modelName]) {
      console.warn(`No sensitive field mappings defined for model: ${modelName}`);
      return;
    }

    schema.plugin(this.createEncryptionPlugin.bind(this), { modelName });
  }

  /**
   * Encrypt specific fields in a document
   * @param {Object} document - Document to encrypt
   * @param {string} modelName - Model name
   * @param {Array} specificFields - Specific fields to encrypt (optional)
   * @returns {Object} Document with encrypted fields
   */
  async encryptDocumentFields(document, modelName, specificFields = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const fieldMappings = this.sensitiveFieldMappings[modelName] || [];
    const fieldsToEncrypt = specificFields 
      ? fieldMappings.filter(m => specificFields.includes(m.field))
      : fieldMappings;

    const result = { ...document };

    for (const mapping of fieldsToEncrypt) {
      const fieldValue = result[mapping.field];
      
      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '' && !encryptionService.isEncrypted(fieldValue)) {
        if (mapping.isArray && Array.isArray(fieldValue)) {
          const encryptedArray = [];
          for (const item of fieldValue) {
            if (typeof item === 'object' && item.code) {
              const encryptedItem = { ...item };
              encryptedItem.code = await encryptionService.encryptField(item.code, mapping.type);
              encryptedArray.push(encryptedItem);
            } else if (typeof item === 'string') {
              encryptedArray.push(await encryptionService.encryptField(item, mapping.type));
            } else {
              encryptedArray.push(item);
            }
          }
          result[mapping.field] = encryptedArray;
        } else {
          result[mapping.field] = await encryptionService.encryptField(fieldValue, mapping.type);
        }
      }
    }

    return result;
  }

  /**
   * Decrypt specific fields in a document
   * @param {Object} document - Document to decrypt
   * @param {string} modelName - Model name
   * @param {Array} specificFields - Specific fields to decrypt (optional)
   * @returns {Object} Document with decrypted fields
   */
  async decryptDocumentFields(document, modelName, specificFields = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const fieldMappings = this.sensitiveFieldMappings[modelName] || [];
    const fieldsToDecrypt = specificFields 
      ? fieldMappings.filter(m => specificFields.includes(m.field))
      : fieldMappings;

    const result = { ...document };

    for (const mapping of fieldsToDecrypt) {
      const fieldValue = result[mapping.field];
      
      if (fieldValue !== undefined && fieldValue !== null) {
        try {
          if (mapping.isArray && Array.isArray(fieldValue)) {
            const decryptedArray = [];
            for (const item of fieldValue) {
              if (typeof item === 'object' && item.code && encryptionService.isEncrypted(item.code)) {
                const decryptedItem = { ...item };
                decryptedItem.code = await encryptionService.decryptField(item.code, mapping.type);
                decryptedArray.push(decryptedItem);
              } else if (typeof item === 'string' && encryptionService.isEncrypted(item)) {
                decryptedArray.push(await encryptionService.decryptField(item, mapping.type));
              } else {
                decryptedArray.push(item);
              }
            }
            result[mapping.field] = decryptedArray;
          } else if (encryptionService.isEncrypted(fieldValue)) {
            result[mapping.field] = await encryptionService.decryptField(fieldValue, mapping.type);
          }
        } catch (error) {
          console.error(`Failed to decrypt field ${mapping.field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return result;
  }

  /**
   * Add new sensitive field mapping for a model
   * @param {string} modelName - Model name
   * @param {Object} fieldMapping - Field mapping configuration
   */
  addSensitiveField(modelName, fieldMapping) {
    if (!this.sensitiveFieldMappings[modelName]) {
      this.sensitiveFieldMappings[modelName] = [];
    }
    
    this.sensitiveFieldMappings[modelName].push(fieldMapping);
  }

  /**
   * Remove sensitive field mapping for a model
   * @param {string} modelName - Model name
   * @param {string} fieldName - Field name to remove
   */
  removeSensitiveField(modelName, fieldName) {
    if (this.sensitiveFieldMappings[modelName]) {
      this.sensitiveFieldMappings[modelName] = this.sensitiveFieldMappings[modelName]
        .filter(mapping => mapping.field !== fieldName);
    }
  }

  /**
   * Get sensitive field mappings for a model
   * @param {string} modelName - Model name
   * @returns {Array} Field mappings
   */
  getSensitiveFields(modelName) {
    return this.sensitiveFieldMappings[modelName] || [];
  }

  /**
   * Check if a field is configured as sensitive
   * @param {string} modelName - Model name
   * @param {string} fieldName - Field name
   * @returns {boolean} Whether field is sensitive
   */
  isSensitiveField(modelName, fieldName) {
    const mappings = this.sensitiveFieldMappings[modelName] || [];
    return mappings.some(mapping => mapping.field === fieldName);
  }

  /**
   * Validate encryption configuration for database operations
   * @returns {Object} Validation result
   */
  validateEncryptionConfiguration() {
    const issues = [];
    const warnings = [];

    if (!this.initialized) {
      issues.push('Database encryption service not initialized');
    }

    if (!encryptionService.initialized) {
      issues.push('Encryption service not initialized');
    }

    // Check if sensitive field mappings are defined
    const modelCount = Object.keys(this.sensitiveFieldMappings).length;
    if (modelCount === 0) {
      warnings.push('No sensitive field mappings defined');
    }

    // Validate encryption service configuration
    const encryptionValidation = encryptionService.validateConfiguration();
    if (!encryptionValidation.isValid) {
      issues.push(...encryptionValidation.issues);
    }
    warnings.push(...encryptionValidation.warnings);

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      modelCount,
      totalSensitiveFields: Object.values(this.sensitiveFieldMappings)
        .reduce((total, mappings) => total + mappings.length, 0)
    };
  }

  /**
   * Get encryption statistics
   * @returns {Object} Encryption statistics
   */
  getEncryptionStatistics() {
    const stats = {
      modelsWithEncryption: Object.keys(this.sensitiveFieldMappings).length,
      totalSensitiveFields: 0,
      fieldsByType: {},
      modelBreakdown: {}
    };

    for (const [modelName, mappings] of Object.entries(this.sensitiveFieldMappings)) {
      stats.totalSensitiveFields += mappings.length;
      stats.modelBreakdown[modelName] = {
        fieldCount: mappings.length,
        fields: mappings.map(m => ({ field: m.field, type: m.type, isArray: m.isArray || false }))
      };

      // Count by field type
      for (const mapping of mappings) {
        stats.fieldsByType[mapping.type] = (stats.fieldsByType[mapping.type] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Perform encryption health check
   * @returns {Object} Health check result
   */
  async performHealthCheck() {
    const healthCheck = {
      timestamp: new Date(),
      status: 'healthy',
      issues: [],
      performance: {}
    };

    try {
      // Test encryption/decryption performance
      const testData = 'health-check-test-data';
      const startTime = process.hrtime.bigint();
      
      const encrypted = await encryptionService.encryptField(testData, 'email');
      const decrypted = await encryptionService.decryptField(encrypted, 'email');
      
      const endTime = process.hrtime.bigint();
      const elapsedMs = Number(endTime - startTime) / 1000000;

      healthCheck.performance.encryptionRoundTripMs = elapsedMs;

      if (decrypted !== testData) {
        healthCheck.issues.push('Encryption/decryption test failed');
        healthCheck.status = 'unhealthy';
      }

      // Check configuration
      const configValidation = this.validateEncryptionConfiguration();
      if (!configValidation.isValid) {
        healthCheck.issues.push(...configValidation.issues);
        healthCheck.status = 'unhealthy';
      }

      // Performance thresholds
      if (elapsedMs > 100) {
        healthCheck.issues.push(`Encryption performance degraded: ${elapsedMs.toFixed(2)}ms`);
        healthCheck.status = 'degraded';
      }

    } catch (error) {
      healthCheck.status = 'unhealthy';
      healthCheck.issues.push(`Health check failed: ${error.message}`);
    }

    return healthCheck;
  }
}

module.exports = new DatabaseEncryptionService();