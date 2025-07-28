/**
 * Audit Trail Service
 * Provides tamper-proof logging with cryptographic integrity
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS,
  TIMEOUTS 
} = require('./utils/constants');
const { 
  generateCorrelationId, 
  sanitizeForLogging,
  formatSecurityEvent
} = require('./utils/securityHelpers');
const redisService = require('./redisService');
const configService = require('./configService');

class AuditTrailService {
  constructor() {
    this.isInitialized = false;
    this.config = null;
    this.auditLogPath = null;
    this.currentLogFile = null;
    this.logRotationSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 100;
    this.hashChain = null; // For tamper-proof logging
    this.encryptionKey = null;
  }

  /**
   * Initialize the audit trail service
   * @param {Object} customConfig - Optional custom configuration
   */
  async initialize(customConfig = {}) {
    try {
      if (!configService.isInitialized) {
        await configService.initialize();
      }
      
      this.config = configService.getAuditConfig();
      
      // Set up audit log directory
      this.auditLogPath = customConfig.auditLogPath || 
        path.join(process.cwd(), 'logs', 'audit');
      
      await this.ensureLogDirectory();
      
      // Initialize encryption key for sensitive data
      this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 
        crypto.randomBytes(32);
      
      // Initialize hash chain for tamper-proof logging
      await this.initializeHashChain();
      
      // Set up log rotation parameters
      this.logRotationSize = customConfig.logRotationSize || this.logRotationSize;
      this.maxLogFiles = customConfig.maxLogFiles || this.maxLogFiles;
      
      this.isInitialized = true;
      console.log('Audit trail service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audit trail service:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Ensure audit log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.auditLogPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Initialize hash chain for tamper-proof logging
   */
  async initializeHashChain() {
    try {
      const hashChainFile = path.join(this.auditLogPath, '.hash_chain');
      
      try {
        const chainData = await fs.readFile(hashChainFile, 'utf8');
        this.hashChain = JSON.parse(chainData);
      } catch (error) {
        // Initialize new hash chain
        this.hashChain = {
          genesis: crypto.randomBytes(32).toString('hex'),
          lastHash: null,
          sequence: 0
        };
        
        // Set genesis hash as the first hash
        this.hashChain.lastHash = crypto
          .createHash('sha256')
          .update(this.hashChain.genesis)
          .digest('hex');
        
        await this.saveHashChain();
      }
    } catch (error) {
      console.error('Failed to initialize hash chain:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Save hash chain to file
   */
  async saveHashChain() {
    try {
      const hashChainFile = path.join(this.auditLogPath, '.hash_chain');
      await fs.writeFile(hashChainFile, JSON.stringify(this.hashChain, null, 2));
    } catch (error) {
      console.error('Failed to save hash chain:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Create tamper-proof audit log entry
   * @param {string} eventType - Type of audit event
   * @param {string} severity - Event severity level
   * @param {Object} details - Event details
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   * @returns {Object} Audit log entry with integrity hash
   */
  async createAuditEntry(eventType, severity, details, userId = null, req = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('Audit trail service not initialized');
      }

      // Create base audit entry
      const auditEntry = {
        ...formatSecurityEvent(eventType, severity, details, userId),
        correlationId: generateCorrelationId(),
        sequence: this.hashChain.sequence + 1,
        previousHash: this.hashChain.lastHash,
        timestamp: new Date().toISOString(),
        metadata: {
          service: 'audit-trail',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          nodeId: process.env.NODE_ID || 'unknown'
        }
      };

      // Add request information if available
      if (req) {
        auditEntry.requestInfo = {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          method: req.method,
          url: req.originalUrl,
          headers: this.sanitizeHeaders(req.headers)
        };
      }

      // Encrypt sensitive data
      if (this.containsSensitiveData(auditEntry)) {
        auditEntry.encryptedData = await this.encryptSensitiveData(auditEntry);
        auditEntry.encrypted = true;
      }

      // Calculate integrity hash
      const entryHash = this.calculateEntryHash(auditEntry);
      auditEntry.integrityHash = entryHash;

      // Update hash chain
      this.hashChain.lastHash = entryHash;
      this.hashChain.sequence = auditEntry.sequence;
      await this.saveHashChain();

      // Write to audit log file
      await this.writeAuditEntry(auditEntry);

      // Store in Redis for quick access
      await this.storeAuditEntry(auditEntry);

      return auditEntry;
    } catch (error) {
      console.error('Failed to create audit entry:', sanitizeForLogging({ 
        eventType, 
        severity, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Calculate cryptographic hash for audit entry
   * @param {Object} auditEntry - Audit entry object
   * @returns {string} SHA-256 hash
   */
  calculateEntryHash(auditEntry) {
    // Create deterministic string representation
    const hashData = {
      sequence: auditEntry.sequence,
      previousHash: auditEntry.previousHash,
      timestamp: auditEntry.timestamp,
      eventType: auditEntry.eventType,
      severity: auditEntry.severity,
      userId: auditEntry.userId,
      details: auditEntry.details,
      correlationId: auditEntry.correlationId
    };

    const hashString = JSON.stringify(hashData, Object.keys(hashData).sort());
    
    return crypto
      .createHash('sha256')
      .update(hashString)
      .update(this.hashChain.genesis) // Include genesis for additional security
      .digest('hex');
  }

  /**
   * Check if audit entry contains sensitive data
   * @param {Object} auditEntry - Audit entry object
   * @returns {boolean} True if contains sensitive data
   */
  containsSensitiveData(auditEntry) {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'credit'];
    const entryString = JSON.stringify(auditEntry).toLowerCase();
    
    return sensitiveFields.some(field => entryString.includes(field));
  }

  /**
   * Encrypt sensitive data in audit entry
   * @param {Object} auditEntry - Audit entry object
   * @returns {string} Encrypted data
   */
  async encryptSensitiveData(auditEntry) {
    try {
      const sensitiveData = {
        details: auditEntry.details,
        requestInfo: auditEntry.requestInfo
      };

      const iv = crypto.randomBytes(16);
      const key = Buffer.from(this.encryptionKey.toString().padEnd(32, '0').slice(0, 32));
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(JSON.stringify(sensitiveData), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        iv: iv.toString('hex'),
        data: encrypted,
        authTag: 'placeholder' // For compatibility
      };
    } catch (error) {
      console.error('Failed to encrypt sensitive data:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Decrypt sensitive data from audit entry
   * @param {Object} encryptedData - Encrypted data object
   * @returns {Object} Decrypted data
   */
  async decryptSensitiveData(encryptedData) {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const key = Buffer.from(this.encryptionKey.toString().padEnd(32, '0').slice(0, 32));
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt sensitive data:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Sanitize HTTP headers for logging
   * @param {Object} headers - HTTP headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Write audit entry to log file
   * @param {Object} auditEntry - Audit entry object
   */
  async writeAuditEntry(auditEntry) {
    try {
      const logFileName = this.getCurrentLogFileName();
      const logFilePath = path.join(this.auditLogPath, logFileName);
      
      // Check if log rotation is needed
      await this.checkLogRotation(logFilePath);
      
      // Write audit entry as JSON line
      const logLine = JSON.stringify(auditEntry) + '\n';
      await fs.appendFile(logFilePath, logLine);
      
    } catch (error) {
      console.error('Failed to write audit entry:', sanitizeForLogging({ 
        correlationId: auditEntry.correlationId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get current log file name based on date
   * @returns {string} Log file name
   */
  getCurrentLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return `audit-${date}.log`;
  }

  /**
   * Check if log rotation is needed and perform rotation
   * @param {string} logFilePath - Current log file path
   */
  async checkLogRotation(logFilePath) {
    try {
      let stats;
      try {
        stats = await fs.stat(logFilePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return; // File doesn't exist, no rotation needed
        }
        throw error;
      }

      if (stats.size >= this.logRotationSize) {
        await this.rotateLogFile(logFilePath);
      }
    } catch (error) {
      console.error('Failed to check log rotation:', sanitizeForLogging({ 
        logFilePath,
        error: error.message 
      }));
    }
  }

  /**
   * Rotate log file when size limit is reached
   * @param {string} logFilePath - Current log file path
   */
  async rotateLogFile(logFilePath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = logFilePath.replace('.log', `-${timestamp}.log`);
      
      // Move current log to rotated name
      await fs.rename(logFilePath, rotatedPath);
      
      // Compress rotated log file
      await this.compressLogFile(rotatedPath);
      
      // Clean up old log files
      await this.cleanupOldLogFiles();
      
      console.log('Log file rotated successfully:', sanitizeForLogging({ 
        original: logFilePath,
        rotated: rotatedPath 
      }));
    } catch (error) {
      console.error('Failed to rotate log file:', sanitizeForLogging({ 
        logFilePath,
        error: error.message 
      }));
    }
  }

  /**
   * Compress log file using gzip
   * @param {string} filePath - File path to compress
   */
  async compressLogFile(filePath) {
    try {
      const zlib = require('zlib');
      const fsSync = require('fs');
      
      const gzipPath = filePath + '.gz';
      
      await new Promise((resolve, reject) => {
        const readStream = fsSync.createReadStream(filePath);
        const writeStream = fsSync.createWriteStream(gzipPath);
        const gzip = zlib.createGzip();
        
        readStream
          .pipe(gzip)
          .pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });
      
      // Remove original file after compression
      await fs.unlink(filePath);
      
    } catch (error) {
      console.error('Failed to compress log file:', sanitizeForLogging({ 
        filePath,
        error: error.message 
      }));
    }
  }

  /**
   * Clean up old log files beyond retention limit
   */
  async cleanupOldLogFiles() {
    try {
      const files = await fs.readdir(this.auditLogPath);
      const logFiles = files
        .filter(file => file.startsWith('audit-') && (file.endsWith('.log') || file.endsWith('.log.gz')))
        .map(file => ({
          name: file,
          path: path.join(this.auditLogPath, file),
          stats: null
        }));

      // Get file stats
      for (const file of logFiles) {
        try {
          file.stats = await fs.stat(file.path);
        } catch (error) {
          console.error('Failed to get file stats:', sanitizeForLogging({ 
            file: file.name,
            error: error.message 
          }));
        }
      }

      // Sort by modification time (oldest first)
      const sortedFiles = logFiles
        .filter(file => file.stats)
        .sort((a, b) => a.stats.mtime - b.stats.mtime);

      // Remove excess files
      if (sortedFiles.length > this.maxLogFiles) {
        const filesToRemove = sortedFiles.slice(0, sortedFiles.length - this.maxLogFiles);
        
        for (const file of filesToRemove) {
          try {
            await fs.unlink(file.path);
            console.log('Removed old audit log file:', sanitizeForLogging({ 
              file: file.name 
            }));
          } catch (error) {
            console.error('Failed to remove old log file:', sanitizeForLogging({ 
              file: file.name,
              error: error.message 
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', sanitizeForLogging({ 
        error: error.message 
      }));
    }
  }

  /**
   * Store audit entry in Redis for quick access
   * @param {Object} auditEntry - Audit entry object
   */
  async storeAuditEntry(auditEntry) {
    try {
      const entryKey = `audit_entry:${auditEntry.correlationId}`;
      const ttl = Math.floor(TIMEOUTS.AUDIT_ENTRY_TTL / 1000);
      
      // Store full entry
      await redisService.setWithTTL(entryKey, JSON.stringify(auditEntry), ttl);

      // Store in time-series for quick retrieval
      const dateKey = auditEntry.timestamp.split('T')[0];
      const timeSeriesKey = `audit_entries:${dateKey}`;
      await redisService.addToSet(timeSeriesKey, auditEntry.correlationId, ttl);

      // Store user-specific entries
      if (auditEntry.userId) {
        const userAuditKey = `user_audit:${auditEntry.userId}`;
        await redisService.addToSet(userAuditKey, auditEntry.correlationId, ttl);
      }

      // Store by event type
      const eventTypeKey = `audit_events:${auditEntry.eventType}:${dateKey}`;
      await redisService.addToSet(eventTypeKey, auditEntry.correlationId, ttl);

    } catch (error) {
      console.error('Failed to store audit entry in Redis:', sanitizeForLogging({ 
        correlationId: auditEntry.correlationId,
        error: error.message 
      }));
      // Don't throw here to avoid breaking the audit logging flow
    }
  }

  /**
   * Verify audit trail integrity
   * @param {Date} startDate - Start date for verification
   * @param {Date} endDate - End date for verification
   * @returns {Object} Verification result
   */
  async verifyAuditTrailIntegrity(startDate, endDate) {
    try {
      const verificationResult = {
        verified: true,
        totalEntries: 0,
        verifiedEntries: 0,
        failedEntries: [],
        hashChainValid: true,
        errors: []
      };

      // Get audit entries for the specified period
      const auditEntries = await this.getAuditEntries(startDate, endDate);
      verificationResult.totalEntries = auditEntries.length;

      // Sort entries by sequence number
      auditEntries.sort((a, b) => a.sequence - b.sequence);

      let previousHash = null;
      
      for (const entry of auditEntries) {
        try {
          // Verify individual entry hash
          const calculatedHash = this.calculateEntryHash(entry);
          
          if (calculatedHash !== entry.integrityHash) {
            verificationResult.verified = false;
            verificationResult.failedEntries.push({
              correlationId: entry.correlationId,
              sequence: entry.sequence,
              reason: 'Hash mismatch',
              expected: entry.integrityHash,
              calculated: calculatedHash
            });
            continue;
          }

          // Verify hash chain continuity
          if (previousHash && entry.previousHash !== previousHash) {
            verificationResult.verified = false;
            verificationResult.hashChainValid = false;
            verificationResult.failedEntries.push({
              correlationId: entry.correlationId,
              sequence: entry.sequence,
              reason: 'Hash chain break',
              expected: previousHash,
              actual: entry.previousHash
            });
            continue;
          }

          previousHash = entry.integrityHash;
          verificationResult.verifiedEntries++;

        } catch (error) {
          verificationResult.verified = false;
          verificationResult.errors.push({
            correlationId: entry.correlationId,
            error: error.message
          });
        }
      }

      return verificationResult;
    } catch (error) {
      console.error('Failed to verify audit trail integrity:', sanitizeForLogging({ 
        startDate, 
        endDate, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get audit entries for a specific time range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} eventType - Optional event type filter
   * @param {string} userId - Optional user ID filter
   * @returns {Array} Array of audit entries
   */
  async getAuditEntries(startDate, endDate, eventType = null, userId = null) {
    try {
      const entries = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Generate date range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        let entryIds = [];

        if (userId) {
          // Get user-specific entries
          const userAuditKey = `user_audit:${userId}`;
          entryIds = await redisService.getSet(userAuditKey);
        } else if (eventType) {
          // Get entries by event type
          const eventTypeKey = `audit_events:${eventType}:${dateKey}`;
          entryIds = await redisService.getSet(eventTypeKey);
        } else {
          // Get all entries for the date
          const timeSeriesKey = `audit_entries:${dateKey}`;
          entryIds = await redisService.getSet(timeSeriesKey);
        }
        
        for (const entryId of entryIds) {
          const entryData = await redisService.get(`audit_entry:${entryId}`);
          if (entryData) {
            const entry = JSON.parse(entryData);
            const entryTime = new Date(entry.timestamp);
            
            if (entryTime >= start && entryTime <= end) {
              // Decrypt sensitive data if needed and authorized
              if (entry.encrypted && entry.encryptedData) {
                try {
                  const decryptedData = await this.decryptSensitiveData(entry.encryptedData);
                  entry.details = decryptedData.details;
                  entry.requestInfo = decryptedData.requestInfo;
                  delete entry.encryptedData;
                  delete entry.encrypted;
                } catch (error) {
                  console.error('Failed to decrypt audit entry:', sanitizeForLogging({ 
                    correlationId: entry.correlationId,
                    error: error.message 
                  }));
                }
              }
              
              entries.push(entry);
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Sort by timestamp
      return entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      console.error('Failed to get audit entries:', sanitizeForLogging({ 
        startDate, 
        endDate, 
        eventType, 
        userId, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Generate compliance audit report
   * @param {Date} startDate - Start date for report
   * @param {Date} endDate - End date for report
   * @param {string} format - Report format ('json', 'csv', 'pdf')
   * @returns {Object} Audit report
   */
  async generateAuditReport(startDate, endDate, format = 'json') {
    try {
      const auditEntries = await this.getAuditEntries(startDate, endDate);
      const integrityCheck = await this.verifyAuditTrailIntegrity(startDate, endDate);
      
      const report = {
        reportId: generateCorrelationId(),
        generatedAt: new Date().toISOString(),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        summary: {
          totalEntries: auditEntries.length,
          eventTypes: this.summarizeEventTypes(auditEntries),
          severityDistribution: this.summarizeSeverityDistribution(auditEntries),
          userActivity: this.summarizeUserActivity(auditEntries),
          integrityStatus: integrityCheck
        },
        entries: format === 'summary' ? [] : auditEntries,
        metadata: {
          format,
          version: '1.0.0',
          generator: 'audit-trail-service'
        }
      };

      // Format report based on requested format
      switch (format) {
        case 'csv':
          return this.formatReportAsCSV(report);
        case 'pdf':
          return this.formatReportAsPDF(report);
        default:
          return report;
      }
    } catch (error) {
      console.error('Failed to generate audit report:', sanitizeForLogging({ 
        startDate, 
        endDate, 
        format, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Summarize event types in audit entries
   * @param {Array} auditEntries - Array of audit entries
   * @returns {Object} Event type summary
   */
  summarizeEventTypes(auditEntries) {
    const eventTypes = {};
    
    auditEntries.forEach(entry => {
      eventTypes[entry.eventType] = (eventTypes[entry.eventType] || 0) + 1;
    });
    
    return eventTypes;
  }

  /**
   * Summarize severity distribution in audit entries
   * @param {Array} auditEntries - Array of audit entries
   * @returns {Object} Severity distribution
   */
  summarizeSeverityDistribution(auditEntries) {
    const severities = {};
    
    auditEntries.forEach(entry => {
      severities[entry.severity] = (severities[entry.severity] || 0) + 1;
    });
    
    return severities;
  }

  /**
   * Summarize user activity in audit entries
   * @param {Array} auditEntries - Array of audit entries
   * @returns {Object} User activity summary
   */
  summarizeUserActivity(auditEntries) {
    const userActivity = {};
    
    auditEntries.forEach(entry => {
      if (entry.userId) {
        if (!userActivity[entry.userId]) {
          userActivity[entry.userId] = {
            totalEvents: 0,
            eventTypes: {},
            lastActivity: entry.timestamp
          };
        }
        
        userActivity[entry.userId].totalEvents++;
        userActivity[entry.userId].eventTypes[entry.eventType] = 
          (userActivity[entry.userId].eventTypes[entry.eventType] || 0) + 1;
        
        if (new Date(entry.timestamp) > new Date(userActivity[entry.userId].lastActivity)) {
          userActivity[entry.userId].lastActivity = entry.timestamp;
        }
      }
    });
    
    return userActivity;
  }

  /**
   * Format report as CSV
   * @param {Object} report - Report object
   * @returns {string} CSV formatted report
   */
  formatReportAsCSV(report) {
    const headers = [
      'Timestamp', 'Event Type', 'Severity', 'User ID', 'Correlation ID', 
      'IP Address', 'Details', 'Integrity Hash'
    ];
    
    let csv = headers.join(',') + '\n';
    
    report.entries.forEach(entry => {
      const row = [
        entry.timestamp,
        entry.eventType,
        entry.severity,
        entry.userId || '',
        entry.correlationId,
        entry.requestInfo?.ip || '',
        JSON.stringify(entry.details).replace(/"/g, '""'),
        entry.integrityHash
      ];
      
      csv += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    return csv;
  }

  /**
   * Format report as PDF (placeholder - would need PDF library)
   * @param {Object} report - Report object
   * @returns {Object} PDF report metadata
   */
  formatReportAsPDF(report) {
    // This would require a PDF generation library like PDFKit
    // For now, return metadata about the PDF that would be generated
    return {
      format: 'pdf',
      pages: Math.ceil(report.entries.length / 50),
      size: 'A4',
      entries: report.entries.length,
      note: 'PDF generation requires additional PDF library implementation'
    };
  }

  /**
   * Get service health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      auditLogPath: this.auditLogPath,
      hashChainSequence: this.hashChain?.sequence || 0,
      redisConnected: redisService.isReady(),
      configLoaded: !!this.config,
    };
  }
}

// Export singleton instance
module.exports = new AuditTrailService();