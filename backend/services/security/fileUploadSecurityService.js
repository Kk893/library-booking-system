const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

/**
 * Comprehensive file upload security service
 * Provides advanced file validation, virus scanning, and secure storage
 */
class FileUploadSecurityService {
  constructor() {
    this.initializeConfiguration();
  }

  /**
   * Initialize security configuration
   */
  initializeConfiguration() {
    // Allowed MIME types with their corresponding file extensions
    this.allowedMimeTypes = {
      // Images
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],
      
      // Documents
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      
      // Archives
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z']
    };

    // File size limits (in bytes)
    this.fileSizeLimits = {
      'image/*': 10 * 1024 * 1024, // 10MB for images
      'application/pdf': 50 * 1024 * 1024, // 50MB for PDFs
      'text/*': 1 * 1024 * 1024, // 1MB for text files
      'application/*': 25 * 1024 * 1024, // 25MB for other documents
      'default': 10 * 1024 * 1024 // 10MB default
    };

    // Dangerous file extensions to always reject
    this.dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.run', '.bin',
      '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.psd1',
      '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.cgi'
    ];

    // Magic number signatures for file type verification
    this.magicNumbers = {
      'image/jpeg': [
        [0xFF, 0xD8, 0xFF, 0xE0],
        [0xFF, 0xD8, 0xFF, 0xE1],
        [0xFF, 0xD8, 0xFF, 0xE2],
        [0xFF, 0xD8, 0xFF, 0xE3],
        [0xFF, 0xD8, 0xFF, 0xE8]
      ],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
      ],
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
      'application/zip': [
        [0x50, 0x4B, 0x03, 0x04],
        [0x50, 0x4B, 0x05, 0x06],
        [0x50, 0x4B, 0x07, 0x08]
      ]
    };

    // Virus scanning patterns (basic signature detection)
    this.virusSignatures = [
      // EICAR test signature
      Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
      // Common malware patterns
      Buffer.from('MZ'), // PE executable header
      Buffer.from('TVqQAAMAAAAEAAAA'), // Base64 encoded PE header
      Buffer.from('<script'), // Embedded scripts
      Buffer.from('javascript:'),
      Buffer.from('vbscript:')
    ];
  }

  /**
   * Comprehensive file validation
   * @param {Object} file - File object from multer
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateFile(file, options = {}) {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {},
      securityScore: 100
    };

    try {
      // Basic file validation
      await this.validateBasicFileProperties(file, validationResult, options);
      
      // MIME type validation
      await this.validateMimeType(file, validationResult, options);
      
      // File extension validation
      await this.validateFileExtension(file, validationResult, options);
      
      // File size validation
      await this.validateFileSize(file, validationResult, options);
      
      // Magic number validation (file signature)
      await this.validateFileSignature(file, validationResult, options);
      
      // Content analysis
      await this.analyzeFileContent(file, validationResult, options);
      
      // Virus scanning
      await this.scanForViruses(file, validationResult, options);
      
      // Calculate final security score
      this.calculateSecurityScore(validationResult);
      
      return validationResult;
    } catch (error) {
      validationResult.isValid = false;
      validationResult.errors.push({
        type: 'VALIDATION_ERROR',
        message: 'File validation failed',
        details: error.message
      });
      return validationResult;
    }
  }

  /**
   * Validate basic file properties
   */
  async validateBasicFileProperties(file, result, options) {
    if (!file) {
      result.isValid = false;
      result.errors.push({
        type: 'MISSING_FILE',
        message: 'No file provided'
      });
      return;
    }

    if (!file.originalname || file.originalname.trim() === '') {
      result.isValid = false;
      result.errors.push({
        type: 'INVALID_FILENAME',
        message: 'File name is required'
      });
    }

    // Check for dangerous characters in filename
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(file.originalname)) {
      result.isValid = false;
      result.errors.push({
        type: 'DANGEROUS_FILENAME',
        message: 'Filename contains dangerous characters'
      });
    }

    // Check filename length
    if (file.originalname.length > 255) {
      result.isValid = false;
      result.errors.push({
        type: 'FILENAME_TOO_LONG',
        message: 'Filename exceeds maximum length of 255 characters'
      });
    }

    result.metadata.originalName = file.originalname;
    result.metadata.fieldName = file.fieldname;
  }

  /**
   * Validate MIME type
   */
  async validateMimeType(file, result, options) {
    const allowedTypes = options.allowedMimeTypes || Object.keys(this.allowedMimeTypes);
    
    if (!file.mimetype) {
      result.isValid = false;
      result.errors.push({
        type: 'MISSING_MIMETYPE',
        message: 'File MIME type is required'
      });
      return;
    }

    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.mimetype.startsWith(type.slice(0, -1));
      }
      return file.mimetype === type;
    });

    if (!isAllowed) {
      result.isValid = false;
      result.errors.push({
        type: 'INVALID_MIMETYPE',
        message: `MIME type '${file.mimetype}' is not allowed`,
        allowedTypes
      });
    }

    result.metadata.mimeType = file.mimetype;
  }

  /**
   * Validate file extension
   */
  async validateFileExtension(file, result, options) {
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (!fileExt) {
      result.warnings.push({
        type: 'MISSING_EXTENSION',
        message: 'File has no extension'
      });
      result.securityScore -= 10;
    }

    // Check against dangerous extensions
    if (this.dangerousExtensions.includes(fileExt)) {
      result.isValid = false;
      result.errors.push({
        type: 'DANGEROUS_EXTENSION',
        message: `File extension '${fileExt}' is not allowed for security reasons`
      });
    }

    // Verify extension matches MIME type
    if (file.mimetype && this.allowedMimeTypes[file.mimetype]) {
      const expectedExtensions = this.allowedMimeTypes[file.mimetype];
      if (!expectedExtensions.includes(fileExt)) {
        result.warnings.push({
          type: 'EXTENSION_MISMATCH',
          message: `File extension '${fileExt}' does not match MIME type '${file.mimetype}'`,
          expectedExtensions
        });
        result.securityScore -= 20;
      }
    }

    result.metadata.extension = fileExt;
  }

  /**
   * Validate file size
   */
  async validateFileSize(file, result, options) {
    if (!file.size && file.size !== 0) {
      result.warnings.push({
        type: 'MISSING_SIZE',
        message: 'File size information is missing'
      });
      return;
    }

    const maxSize = options.maxSize || this.getMaxSizeForMimeType(file.mimetype);
    
    if (file.size > maxSize) {
      result.isValid = false;
      result.errors.push({
        type: 'FILE_TOO_LARGE',
        message: `File size (${file.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
        fileSize: file.size,
        maxSize
      });
    }

    if (file.size === 0) {
      result.isValid = false;
      result.errors.push({
        type: 'EMPTY_FILE',
        message: 'File is empty'
      });
    }

    result.metadata.size = file.size;
  }

  /**
   * Validate file signature using magic numbers
   */
  async validateFileSignature(file, result, options) {
    if (!file.buffer && !file.path) {
      result.warnings.push({
        type: 'NO_CONTENT_ACCESS',
        message: 'Cannot access file content for signature validation'
      });
      return;
    }

    try {
      let fileBuffer;
      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.path) {
        const fileData = await fs.readFile(file.path);
        fileBuffer = fileData;
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        result.warnings.push({
          type: 'EMPTY_BUFFER',
          message: 'File buffer is empty'
        });
        return;
      }

      const signatures = this.magicNumbers[file.mimetype];
      if (signatures) {
        const isValidSignature = signatures.some(signature => {
          if (fileBuffer.length < signature.length) return false;
          return signature.every((byte, index) => fileBuffer[index] === byte);
        });

        if (!isValidSignature) {
          result.warnings.push({
            type: 'INVALID_SIGNATURE',
            message: `File signature does not match declared MIME type '${file.mimetype}'`
          });
          result.securityScore -= 30;
        }
      }

      result.metadata.signatureValidated = true;
    } catch (error) {
      result.warnings.push({
        type: 'SIGNATURE_VALIDATION_ERROR',
        message: 'Could not validate file signature',
        details: error.message
      });
    }
  }

  /**
   * Analyze file content for suspicious patterns
   */
  async analyzeFileContent(file, result, options) {
    if (!file.buffer && !file.path) {
      return;
    }

    try {
      let fileBuffer;
      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.path) {
        const fileData = await fs.readFile(file.path);
        fileBuffer = fileData;
      }

      // Check for embedded scripts in images
      if (file.mimetype.startsWith('image/')) {
        const suspiciousPatterns = [
          /<script/i,
          /javascript:/i,
          /vbscript:/i,
          /<iframe/i,
          /<object/i,
          /<embed/i
        ];

        const content = fileBuffer.toString('utf8');
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(content)) {
            result.warnings.push({
              type: 'SUSPICIOUS_CONTENT',
              message: 'File contains potentially malicious script content'
            });
            result.securityScore -= 40;
            break;
          }
        }
      }

      // Check for polyglot files (files that are valid in multiple formats)
      if (this.detectPolyglotFile(fileBuffer)) {
        result.warnings.push({
          type: 'POLYGLOT_FILE',
          message: 'File appears to be a polyglot (valid in multiple formats)'
        });
        result.securityScore -= 25;
      }

      result.metadata.contentAnalyzed = true;
    } catch (error) {
      result.warnings.push({
        type: 'CONTENT_ANALYSIS_ERROR',
        message: 'Could not analyze file content',
        details: error.message
      });
    }
  }

  /**
   * Basic virus scanning using signature detection
   */
  async scanForViruses(file, result, options) {
    if (!file.buffer && !file.path) {
      return;
    }

    try {
      let fileBuffer;
      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.path) {
        const fileData = await fs.readFile(file.path);
        fileBuffer = fileData;
      }

      // Check against known virus signatures
      for (const signature of this.virusSignatures) {
        if (fileBuffer.includes(signature)) {
          result.isValid = false;
          result.errors.push({
            type: 'VIRUS_DETECTED',
            message: 'File contains known malicious signature',
            severity: 'CRITICAL'
          });
          result.securityScore = 0;
          break;
        }
      }

      // Additional heuristic checks
      if (this.performHeuristicAnalysis(fileBuffer)) {
        result.warnings.push({
          type: 'SUSPICIOUS_HEURISTICS',
          message: 'File exhibits suspicious characteristics'
        });
        result.securityScore -= 50;
      }

      result.metadata.virusScanned = true;
    } catch (error) {
      result.warnings.push({
        type: 'VIRUS_SCAN_ERROR',
        message: 'Could not perform virus scan',
        details: error.message
      });
    }
  }

  /**
   * Detect polyglot files
   */
  detectPolyglotFile(buffer) {
    // Check for common polyglot patterns
    const polyglotPatterns = [
      // GIF/HTML polyglot
      /GIF8[79]a.*<html/i,
      // JPEG/HTML polyglot
      /\xFF\xD8\xFF.*<html/i,
      // PNG/HTML polyglot
      /\x89PNG.*<html/i
    ];

    const content = buffer.toString('binary');
    return polyglotPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Perform heuristic analysis for suspicious content
   */
  performHeuristicAnalysis(buffer) {
    const content = buffer.toString('utf8');
    
    // High entropy check (possible encrypted/packed content)
    const entropy = this.calculateEntropy(buffer);
    if (entropy > 7.5) {
      return true;
    }

    // Suspicious string patterns
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /document\.write/i,
      /window\.location/i,
      /XMLHttpRequest/i,
      /ActiveXObject/i,
      /WScript\.Shell/i,
      /cmd\.exe/i,
      /powershell/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Calculate Shannon entropy of file content
   */
  calculateEntropy(buffer) {
    const frequencies = new Map();
    
    for (const byte of buffer) {
      frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
    }

    let entropy = 0;
    const length = buffer.length;

    for (const count of frequencies.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Calculate security score based on validation results
   */
  calculateSecurityScore(result) {
    // Start with base score
    let score = result.securityScore;

    // Deduct points for errors
    score -= result.errors.length * 50;

    // Deduct points for warnings based on severity
    result.warnings.forEach(warning => {
      switch (warning.type) {
        case 'VIRUS_DETECTED':
          score = 0;
          break;
        case 'SUSPICIOUS_CONTENT':
        case 'SUSPICIOUS_HEURISTICS':
          score -= 40;
          break;
        case 'INVALID_SIGNATURE':
        case 'EXTENSION_MISMATCH':
          score -= 20;
          break;
        default:
          score -= 10;
      }
    });

    result.securityScore = Math.max(0, Math.min(100, score));
  }

  /**
   * Get maximum file size for MIME type
   */
  getMaxSizeForMimeType(mimeType) {
    for (const [pattern, size] of Object.entries(this.fileSizeLimits)) {
      if (pattern === 'default') continue;
      
      if (pattern.endsWith('/*')) {
        if (mimeType.startsWith(pattern.slice(0, -1))) {
          return size;
        }
      } else if (mimeType === pattern) {
        return size;
      }
    }
    
    return this.fileSizeLimits.default;
  }

  /**
   * Generate secure filename
   */
  generateSecureFilename(originalName, options = {}) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    
    const prefix = options.prefix || 'upload';
    const secureFilename = `${prefix}_${timestamp}_${randomBytes}${ext}`;
    
    return {
      secureFilename,
      originalName,
      timestamp,
      hash: crypto.createHash('sha256').update(secureFilename).digest('hex').substring(0, 16)
    };
  }

  /**
   * Create secure storage path
   */
  createSecureStoragePath(filename, options = {}) {
    const baseDir = options.baseDir || 'uploads';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return path.join(baseDir, 'secure', String(year), month, day, filename);
  }

  /**
   * Sanitize file for safe storage
   */
  async sanitizeFile(file, options = {}) {
    const validation = await this.validateFile(file, options);
    
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    if (validation.securityScore < (options.minSecurityScore || 70)) {
      throw new Error(`File security score (${validation.securityScore}) below minimum threshold`);
    }

    const secureFilename = this.generateSecureFilename(file.originalname, options);
    const storagePath = this.createSecureStoragePath(secureFilename.secureFilename, options);

    return {
      validation,
      secureFilename: secureFilename.secureFilename,
      originalName: file.originalname,
      storagePath,
      metadata: {
        ...validation.metadata,
        ...secureFilename,
        securityScore: validation.securityScore,
        sanitizedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = FileUploadSecurityService;