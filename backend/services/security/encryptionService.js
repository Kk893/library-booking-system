const crypto = require('crypto');
const { configService } = require('./configService');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Field-specific encryption keys
    this.fieldKeys = new Map();
    
    // Sensitive field types that should always be encrypted
    this.sensitiveFields = new Set([
      'ssn',
      'creditCard',
      'bankAccount',
      'passport',
      'driverLicense',
      'taxId',
      'medicalRecord',
      'personalId',
      'phoneNumber',
      'email',
      'address',
      'totpSecret',
      'backupCodes',
      'apiKey',
      'password',
      'token'
    ]);
    
    this.initialized = false;
  }

  /**
   * Initialize the encryption service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await configService.initialize();
      const config = configService.getEncryptionConfig();
      
      // Set master encryption key
      this.masterKey = this.deriveMasterKey(config.encryptionKey || config.key);
      
      // Initialize field-specific keys
      await this.initializeFieldKeys();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw new Error('Encryption service initialization failed');
    }
  }

  /**
   * Derive master key from configuration
   * @param {string} configKey - Configuration key
   * @returns {Buffer} Derived master key
   */
  deriveMasterKey(configKey) {
    if (!configKey) {
      throw new Error('Encryption key not configured');
    }
    
    // Use PBKDF2 to derive a consistent key from the config
    const salt = Buffer.from('library-booking-salt', 'utf8');
    return crypto.pbkdf2Sync(configKey, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Initialize field-specific encryption keys
   */
  async initializeFieldKeys() {
    for (const fieldType of this.sensitiveFields) {
      const fieldKey = this.deriveFieldKey(fieldType);
      this.fieldKeys.set(fieldType, fieldKey);
    }
  }

  /**
   * Derive field-specific encryption key
   * @param {string} fieldType - Type of field
   * @returns {Buffer} Field-specific key
   */
  deriveFieldKey(fieldType) {
    const salt = Buffer.from(`field-${fieldType}-salt`, 'utf8');
    return crypto.pbkdf2Sync(this.masterKey, salt, 50000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt sensitive field data
   * @param {any} data - Data to encrypt
   * @param {string} fieldType - Type of field being encrypted
   * @returns {string} Encrypted data with metadata
   */
  async encryptField(data, fieldType) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (data === null || data === undefined) {
      return data;
    }

    // Don't encrypt empty strings for certain field types
    if (data === '' && ['email', 'phone', 'address'].includes(fieldType)) {
      return data;
    }

    try {
      const fieldKey = this.fieldKeys.get(fieldType) || this.masterKey;
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, fieldKey, iv);
      
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Create encrypted payload with metadata
      const payload = {
        algorithm: this.algorithm,
        fieldType,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted,
        timestamp: Date.now()
      };
      
      // Return base64 encoded payload with prefix
      return 'enc:' + Buffer.from(JSON.stringify(payload)).toString('base64');
    } catch (error) {
      console.error(`Field encryption error for ${fieldType}:`, error);
      throw new Error(`Failed to encrypt ${fieldType} field`);
    }
  }

  /**
   * Decrypt sensitive field data
   * @param {string} encryptedData - Encrypted data string
   * @param {string} fieldType - Type of field being decrypted
   * @returns {any} Decrypted data
   */
  async decryptField(encryptedData, fieldType) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!encryptedData || typeof encryptedData !== 'string') {
      return encryptedData;
    }

    // Check if data is encrypted
    if (!encryptedData.startsWith('enc:')) {
      return encryptedData; // Not encrypted
    }

    try {
      // Parse encrypted payload
      const payloadBase64 = encryptedData.substring(4);
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      
      // Validate payload structure
      if (!payload.algorithm || !payload.iv || !payload.tag || !payload.data) {
        throw new Error('Invalid encrypted payload structure');
      }
      
      // Get appropriate key
      const fieldKey = this.fieldKeys.get(payload.fieldType || fieldType) || this.masterKey;
      
      // Decrypt data
      const iv = Buffer.from(payload.iv, 'hex');
      const tag = Buffer.from(payload.tag, 'hex');
      const decipher = crypto.createDecipheriv(payload.algorithm, fieldKey, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(payload.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error(`Field decryption error for ${fieldType}:`, error);
      throw new Error(`Failed to decrypt ${fieldType} field`);
    }
  }

  /**
   * Encrypt multiple fields in an object
   * @param {Object} data - Object containing fields to encrypt
   * @param {Array} fieldMappings - Array of {field, type} mappings
   * @returns {Object} Object with encrypted fields
   */
  async encryptFields(data, fieldMappings) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const result = { ...data };
    
    for (const { field, type } of fieldMappings) {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = await this.encryptField(result[field], type);
      }
    }
    
    return result;
  }

  /**
   * Decrypt multiple fields in an object
   * @param {Object} data - Object containing encrypted fields
   * @param {Array} fieldMappings - Array of {field, type} mappings
   * @returns {Object} Object with decrypted fields
   */
  async decryptFields(data, fieldMappings) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const result = { ...data };
    
    for (const { field, type } of fieldMappings) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          result[field] = await this.decryptField(result[field], type);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }
    
    return result;
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Hex-encoded random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random string with specific character set
   * @param {number} length - String length
   * @param {string} charset - Character set to use
   * @returns {string} Random string
   */
  generateSecureString(length = 16, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    const charsetLength = charset.length;
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charsetLength);
      result += charset[randomIndex];
    }
    
    return result;
  }

  /**
   * Hash sensitive data with salt
   * @param {string} data - Data to hash
   * @param {number} saltRounds - Number of salt rounds (default: 12)
   * @returns {Object} Hash and salt
   */
  async hashData(data, saltRounds = 12) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, salt, Math.pow(2, saltRounds), 64, 'sha256').toString('hex');
    
    return {
      hash: `${saltRounds}:${salt}:${hash}`,
      salt
    };
  }

  /**
   * Verify data against hash
   * @param {string} data - Data to verify
   * @param {string} hash - Hash to verify against
   * @returns {boolean} Whether data matches hash
   */
  async verifyHash(data, hash) {
    try {
      const [saltRounds, salt, originalHash] = hash.split(':');
      const verifyHash = crypto.pbkdf2Sync(data, salt, Math.pow(2, parseInt(saltRounds)), 64, 'sha256').toString('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(originalHash, 'hex'),
        Buffer.from(verifyHash, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify data integrity using HMAC
   * @param {string} data - Data to verify
   * @param {string} signature - HMAC signature
   * @param {string} key - HMAC key
   * @returns {boolean} Whether data integrity is valid
   */
  verifyDataIntegrity(data, signature, key = null) {
    try {
      const hmacKey = key || this.masterKey;
      const expectedSignature = crypto.createHmac('sha256', hmacKey)
        .update(data)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Create HMAC signature for data
   * @param {string} data - Data to sign
   * @param {string} key - HMAC key
   * @returns {string} HMAC signature
   */
  createDataSignature(data, key = null) {
    const hmacKey = key || this.masterKey;
    return crypto.createHmac('sha256', hmacKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Encrypt large data with streaming
   * @param {Buffer} data - Data to encrypt
   * @param {string} fieldType - Field type for key derivation
   * @returns {Object} Encrypted data with metadata
   */
  async encryptLargeData(data, fieldType = 'default') {
    if (!this.initialized) {
      await this.initialize();
    }

    const fieldKey = this.fieldKeys.get(fieldType) || this.masterKey;
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, fieldKey, iv);
    
    const chunks = [];
    chunks.push(cipher.update(data));
    chunks.push(cipher.final());
    
    const encrypted = Buffer.concat(chunks);
    const tag = cipher.getAuthTag();
    
    return {
      algorithm: this.algorithm,
      fieldType,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted.toString('hex'),
      size: data.length,
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt large data
   * @param {Object} encryptedPayload - Encrypted payload
   * @returns {Buffer} Decrypted data
   */
  async decryptLargeData(encryptedPayload) {
    if (!this.initialized) {
      await this.initialize();
    }

    const fieldKey = this.fieldKeys.get(encryptedPayload.fieldType) || this.masterKey;
    const iv = Buffer.from(encryptedPayload.iv, 'hex');
    const tag = Buffer.from(encryptedPayload.tag, 'hex');
    const encryptedData = Buffer.from(encryptedPayload.data, 'hex');
    
    const decipher = crypto.createDecipheriv(encryptedPayload.algorithm, fieldKey, iv);
    decipher.setAuthTag(tag);
    
    const chunks = [];
    chunks.push(decipher.update(encryptedData));
    chunks.push(decipher.final());
    
    return Buffer.concat(chunks);
  }

  /**
   * Rotate encryption keys
   * @param {string} newMasterKey - New master key
   * @returns {Object} Key rotation result
   */
  async rotateKeys(newMasterKey) {
    if (!this.initialized) {
      await this.initialize();
    }

    const oldMasterKey = this.masterKey;
    const newDerivedKey = this.deriveMasterKey(newMasterKey);
    
    // Store old key for decryption during transition
    const rotationInfo = {
      timestamp: Date.now(),
      oldKeyHash: crypto.createHash('sha256').update(oldMasterKey).digest('hex'),
      newKeyHash: crypto.createHash('sha256').update(newDerivedKey).digest('hex')
    };
    
    // Update master key
    this.masterKey = newDerivedKey;
    
    // Regenerate field keys
    await this.initializeFieldKeys();
    
    return rotationInfo;
  }

  /**
   * Check if data is encrypted
   * @param {any} data - Data to check
   * @returns {boolean} Whether data is encrypted
   */
  isEncrypted(data) {
    return typeof data === 'string' && data.startsWith('enc:');
  }

  /**
   * Get encryption metadata from encrypted data
   * @param {string} encryptedData - Encrypted data
   * @returns {Object} Encryption metadata
   */
  getEncryptionMetadata(encryptedData) {
    if (!this.isEncrypted(encryptedData)) {
      return null;
    }

    try {
      const payloadBase64 = encryptedData.substring(4);
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      
      return {
        algorithm: payload.algorithm,
        fieldType: payload.fieldType,
        timestamp: payload.timestamp,
        hasTag: !!payload.tag,
        hasIv: !!payload.iv
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate encryption configuration
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const issues = [];
    const warnings = [];
    
    if (!this.masterKey) {
      issues.push('Master encryption key not configured');
    }
    
    if (this.masterKey && this.masterKey.length < this.keyLength) {
      issues.push('Master key length is insufficient');
    }
    
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.ENCRYPTION_KEY) {
        issues.push('ENCRYPTION_KEY environment variable not set in production');
      }
      
      if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 64) {
        warnings.push('Encryption key should be at least 64 characters in production');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      keyCount: this.fieldKeys.size,
      algorithm: this.algorithm
    };
  }
}

module.exports = new EncryptionService();