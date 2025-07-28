/**
 * Unit tests for Audit Trail Service
 */

const auditTrailService = require('../auditTrailService');
const redisService = require('../redisService');
const configService = require('../configService');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../redisService');
jest.mock('../configService', () => ({
  isInitialized: true,
  initialize: jest.fn(),
  getAuditConfig: jest.fn()
}));
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    stat: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn()
  }
}));

// Mock constants
jest.mock('../utils/constants', () => ({
  SECURITY_EVENTS: {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    PRIVILEGE_ESCALATION: 'privilege_escalation',
    DATA_ACCESS: 'data_access',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity'
  },
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },
  TIMEOUTS: {
    AUDIT_ENTRY_TTL: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Mock security helpers
jest.mock('../utils/securityHelpers', () => ({
  generateCorrelationId: jest.fn(() => 'test-correlation-id'),
  sanitizeForLogging: jest.fn(data => data),
  formatSecurityEvent: jest.fn((eventType, severity, details, userId) => ({
    eventType,
    severity,
    details,
    userId,
    timestamp: new Date().toISOString()
  }))
}));

describe('AuditTrailService', () => {
  let mockConfig;
  let testLogPath;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      logLevel: 'info',
      auditRetentionDays: 30,
      encryptionEnabled: true
    };

    testLogPath = path.join(process.cwd(), 'test-logs', 'audit');

    configService.isInitialized = true;
    configService.getAuditConfig.mockReturnValue(mockConfig);
    
    redisService.isReady.mockReturnValue(true);
    redisService.setWithTTL.mockResolvedValue(true);
    redisService.addToSet.mockResolvedValue(true);
    redisService.getSet.mockResolvedValue(['test-id']);
    redisService.get.mockResolvedValue(JSON.stringify({
      correlationId: 'test-id',
      timestamp: '2025-01-27T10:00:00.000Z',
      eventType: 'login_success',
      severity: 'low'
    }));

    // Mock file system operations
    fs.mkdir.mockResolvedValue();
    fs.readFile.mockRejectedValue({ code: 'ENOENT' }); // Hash chain file doesn't exist initially
    fs.writeFile.mockResolvedValue();
    fs.appendFile.mockResolvedValue();
    fs.stat.mockResolvedValue({ size: 1000, mtime: new Date() });
    fs.readdir.mockResolvedValue([]);

    // Reset service state
    auditTrailService.isInitialized = false;
    auditTrailService.hashChain = null;
    auditTrailService.config = null;
    auditTrailService.auditLogPath = null;
    auditTrailService.encryptionKey = null;
  });

  describe('initialize', () => {
    it('should initialize audit trail service successfully', async () => {
      await auditTrailService.initialize({ auditLogPath: testLogPath });

      expect(auditTrailService.isInitialized).toBe(true);
      expect(auditTrailService.auditLogPath).toBe(testLogPath);
      expect(fs.mkdir).toHaveBeenCalledWith(testLogPath, { recursive: true });
      expect(auditTrailService.hashChain).toBeDefined();
      expect(auditTrailService.hashChain.genesis).toBeDefined();
      expect(auditTrailService.hashChain.lastHash).toBeDefined();
      expect(auditTrailService.hashChain.sequence).toBe(0);
    });

    it('should load existing hash chain if available', async () => {
      const existingHashChain = {
        genesis: 'existing-genesis',
        lastHash: 'existing-hash',
        sequence: 100
      };

      fs.readFile.mockResolvedValueOnce(JSON.stringify(existingHashChain));

      await auditTrailService.initialize({ auditLogPath: testLogPath });

      expect(auditTrailService.hashChain).toEqual(existingHashChain);
    });

    it('should handle initialization errors', async () => {
      configService.getAuditConfig.mockImplementation(() => {
        throw new Error('Config error');
      });

      await expect(auditTrailService.initialize()).rejects.toThrow('Config error');
    });
  });

  describe('createAuditEntry', () => {
    beforeEach(async () => {
      await auditTrailService.initialize({ auditLogPath: testLogPath });
    });

    it('should create audit entry with integrity hash', async () => {
      const eventType = 'login_success';
      const severity = 'low';
      const details = { username: 'testuser' };
      const userId = 'user123';

      const auditEntry = await auditTrailService.createAuditEntry(
        eventType, severity, details, userId
      );

      expect(auditEntry).toBeDefined();
      expect(auditEntry.eventType).toBe(eventType);
      expect(auditEntry.severity).toBe(severity);
      expect(auditEntry.details).toEqual(details);
      expect(auditEntry.userId).toBe(userId);
      expect(auditEntry.correlationId).toBe('test-correlation-id');
      expect(auditEntry.sequence).toBe(1);
      expect(auditEntry.previousHash).toBeDefined();
      expect(auditEntry.integrityHash).toBeDefined();
      expect(auditEntry.timestamp).toBeDefined();
    });

    it('should include request information when provided', async () => {
      const mockReq = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        method: 'POST',
        originalUrl: '/api/login',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'authorization': 'Bearer token123'
        }
      };

      const auditEntry = await auditTrailService.createAuditEntry(
        'login_success', 'low', {}, 'user123', mockReq
      );

      expect(auditEntry.requestInfo).toBeDefined();
      expect(auditEntry.requestInfo.ip).toBe('192.168.1.1');
      expect(auditEntry.requestInfo.method).toBe('POST');
      expect(auditEntry.requestInfo.url).toBe('/api/login');
      expect(auditEntry.requestInfo.headers.authorization).toBe('[REDACTED]');
    });

    it('should encrypt sensitive data', async () => {
      const sensitiveDetails = { password: 'secret123', token: 'abc123' };

      const auditEntry = await auditTrailService.createAuditEntry(
        'login_failure', 'medium', sensitiveDetails, 'user123'
      );

      expect(auditEntry.encrypted).toBe(true);
      expect(auditEntry.encryptedData).toBeDefined();
      expect(auditEntry.encryptedData.iv).toBeDefined();
      expect(auditEntry.encryptedData.data).toBeDefined();
      expect(auditEntry.encryptedData.authTag).toBeDefined();
    });

    it('should update hash chain sequence', async () => {
      const initialSequence = auditTrailService.hashChain.sequence;

      await auditTrailService.createAuditEntry('login_success', 'low', {}, 'user123');

      expect(auditTrailService.hashChain.sequence).toBe(initialSequence + 1);
    });

    it('should store audit entry in Redis', async () => {
      await auditTrailService.createAuditEntry('login_success', 'low', {}, 'user123');

      expect(redisService.setWithTTL).toHaveBeenCalledWith(
        'audit_entry:test-correlation-id',
        expect.any(String),
        expect.any(Number)
      );
      expect(redisService.addToSet).toHaveBeenCalledTimes(3); // time-series, user, event type
    });

    it('should write audit entry to log file', async () => {
      await auditTrailService.createAuditEntry('login_success', 'low', {}, 'user123');

      expect(fs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('audit-'),
        expect.stringContaining('"eventType":"login_success"')
      );
    });

    it('should handle errors gracefully', async () => {
      fs.appendFile.mockRejectedValueOnce(new Error('File write error'));

      await expect(
        auditTrailService.createAuditEntry('login_success', 'low', {}, 'user123')
      ).rejects.toThrow('File write error');
    });
  });

  describe('calculateEntryHash', () => {
    beforeEach(async () => {
      await auditTrailService.initialize({ auditLogPath: testLogPath });
    });

    it('should calculate consistent hash for same entry', () => {
      const auditEntry = {
        sequence: 1,
        previousHash: 'prev-hash',
        timestamp: '2025-01-27T10:00:00.000Z',
        eventType: 'login_success',
        severity: 'low',
        userId: 'user123',
        details: { test: 'data' },
        correlationId: 'test-id'
      };

      const hash1 = auditTrailService.calculateEntryHash(auditEntry);
      const hash2 = auditTrailService.calculateEntryHash(auditEntry);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });

    it('should produce different hashes for different entries', () => {
      const entry1 = {
        sequence: 1,
        previousHash: 'prev-hash',
        timestamp: '2025-01-27T10:00:00.000Z',
        eventType: 'login_success',
        severity: 'low',
        userId: 'user123',
        details: { test: 'data1' },
        correlationId: 'test-id-1'
      };

      const entry2 = {
        ...entry1,
        details: { test: 'data2' },
        correlationId: 'test-id-2'
      };

      const hash1 = auditTrailService.calculateEntryHash(entry1);
      const hash2 = auditTrailService.calculateEntryHash(entry2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyAuditTrailIntegrity', () => {
    beforeEach(async () => {
      await auditTrailService.initialize({ auditLogPath: testLogPath });
    });

    it('should verify integrity of valid audit trail', async () => {
      // Mock valid audit entries
      const mockEntries = [
        {
          sequence: 1,
          previousHash: auditTrailService.hashChain.lastHash,
          integrityHash: 'hash1',
          correlationId: 'id1',
          timestamp: '2025-01-27T10:00:00.000Z',
          eventType: 'login_success',
          severity: 'low',
          details: {}
        },
        {
          sequence: 2,
          previousHash: 'hash1',
          integrityHash: 'hash2',
          correlationId: 'id2',
          timestamp: '2025-01-27T10:01:00.000Z',
          eventType: 'login_success',
          severity: 'low',
          details: {}
        }
      ];

      // Mock getAuditEntries to return test entries
      jest.spyOn(auditTrailService, 'getAuditEntries').mockResolvedValue(mockEntries);
      
      // Mock calculateEntryHash to return expected hashes
      jest.spyOn(auditTrailService, 'calculateEntryHash')
        .mockReturnValueOnce('hash1')
        .mockReturnValueOnce('hash2');

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const result = await auditTrailService.verifyAuditTrailIntegrity(startDate, endDate);

      expect(result.verified).toBe(true);
      expect(result.totalEntries).toBe(2);
      expect(result.verifiedEntries).toBe(2);
      expect(result.failedEntries).toHaveLength(0);
      expect(result.hashChainValid).toBe(true);
    });

    it('should detect hash mismatch', async () => {
      const mockEntries = [
        {
          sequence: 1,
          previousHash: auditTrailService.hashChain.lastHash,
          integrityHash: 'wrong-hash',
          correlationId: 'id1',
          timestamp: '2025-01-27T10:00:00.000Z',
          eventType: 'login_success',
          severity: 'low',
          details: {}
        }
      ];

      jest.spyOn(auditTrailService, 'getAuditEntries').mockResolvedValue(mockEntries);
      jest.spyOn(auditTrailService, 'calculateEntryHash').mockReturnValue('correct-hash');

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const result = await auditTrailService.verifyAuditTrailIntegrity(startDate, endDate);

      expect(result.verified).toBe(false);
      expect(result.failedEntries).toHaveLength(1);
      expect(result.failedEntries[0].reason).toBe('Hash mismatch');
      expect(result.failedEntries[0].expected).toBe('wrong-hash');
      expect(result.failedEntries[0].calculated).toBe('correct-hash');
    });

    it('should detect hash chain break', async () => {
      const mockEntries = [
        {
          sequence: 1,
          previousHash: auditTrailService.hashChain.lastHash,
          integrityHash: 'hash1',
          correlationId: 'id1',
          timestamp: '2025-01-27T10:00:00.000Z',
          eventType: 'login_success',
          severity: 'low',
          details: {}
        },
        {
          sequence: 2,
          previousHash: 'wrong-previous-hash',
          integrityHash: 'hash2',
          correlationId: 'id2',
          timestamp: '2025-01-27T10:01:00.000Z',
          eventType: 'login_success',
          severity: 'low',
          details: {}
        }
      ];

      jest.spyOn(auditTrailService, 'getAuditEntries').mockResolvedValue(mockEntries);
      jest.spyOn(auditTrailService, 'calculateEntryHash')
        .mockReturnValueOnce('hash1')
        .mockReturnValueOnce('hash2');

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const result = await auditTrailService.verifyAuditTrailIntegrity(startDate, endDate);

      expect(result.verified).toBe(false);
      expect(result.hashChainValid).toBe(false);
      expect(result.failedEntries).toHaveLength(1);
      expect(result.failedEntries[0].reason).toBe('Hash chain break');
    });
  });

  describe('getAuditEntries', () => {
    beforeEach(async () => {
      await auditTrailService.initialize({ auditLogPath: testLogPath });
    });

    it('should retrieve audit entries for date range', async () => {
      const mockEntryData = JSON.stringify({
        correlationId: 'test-id',
        timestamp: '2025-01-27T10:00:00.000Z',
        eventType: 'login_success',
        severity: 'low'
      });

      redisService.getSet.mockResolvedValueOnce(['test-id']);
      redisService.get.mockResolvedValueOnce(mockEntryData);

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const entries = await auditTrailService.getAuditEntries(startDate, endDate);

      expect(entries).toHaveLength(1);
      expect(entries[0].correlationId).toBe('test-id');
      expect(entries[0].eventType).toBe('login_success');
    });

    it('should filter by event type', async () => {
      const mockEntryData = JSON.stringify({
        correlationId: 'test-id',
        timestamp: '2025-01-27T10:00:00.000Z',
        eventType: 'login_failure',
        severity: 'medium'
      });

      // Clear previous mocks and set new ones
      redisService.getSet.mockClear();
      redisService.get.mockClear();
      
      redisService.getSet.mockResolvedValueOnce(['test-id']);
      redisService.get.mockResolvedValueOnce(mockEntryData);

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const entries = await auditTrailService.getAuditEntries(
        startDate, endDate, 'login_failure'
      );

      expect(redisService.getSet).toHaveBeenCalledWith(
        expect.stringContaining('audit_events:login_failure:')
      );
      expect(entries).toHaveLength(1);
    });

    it('should filter by user ID', async () => {
      const mockEntryData = JSON.stringify({
        correlationId: 'test-id',
        timestamp: '2025-01-27T10:00:00.000Z',
        eventType: 'login_success',
        severity: 'low',
        userId: 'user123'
      });

      // Clear previous mocks and set new ones
      redisService.getSet.mockClear();
      redisService.get.mockClear();
      
      redisService.getSet.mockResolvedValueOnce(['test-id']);
      redisService.get.mockResolvedValueOnce(mockEntryData);

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const entries = await auditTrailService.getAuditEntries(
        startDate, endDate, null, 'user123'
      );

      expect(redisService.getSet).toHaveBeenCalledWith('user_audit:user123');
      expect(entries).toHaveLength(1);
    });

    it('should decrypt encrypted entries', async () => {
      const mockEntryData = JSON.stringify({
        correlationId: 'test-id',
        timestamp: '2025-01-27T10:00:00.000Z',
        eventType: 'login_success',
        severity: 'low',
        encrypted: true,
        encryptedData: {
          iv: 'test-iv',
          data: 'encrypted-data',
          authTag: 'auth-tag'
        }
      });

      // Clear previous mocks and set new ones
      redisService.getSet.mockClear();
      redisService.get.mockClear();
      
      redisService.getSet.mockResolvedValueOnce(['test-id']);
      redisService.get.mockResolvedValueOnce(mockEntryData);

      // Mock decryption
      jest.spyOn(auditTrailService, 'decryptSensitiveData').mockResolvedValue({
        details: { decrypted: 'data' },
        requestInfo: { ip: '192.168.1.1' }
      });

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const entries = await auditTrailService.getAuditEntries(startDate, endDate);

      expect(entries).toHaveLength(1);
      expect(entries[0].details).toEqual({ decrypted: 'data' });
      expect(entries[0].requestInfo).toEqual({ ip: '192.168.1.1' });
      expect(entries[0].encrypted).toBeUndefined();
      expect(entries[0].encryptedData).toBeUndefined();
    });
  });

  describe('generateAuditReport', () => {
    beforeEach(async () => {
      await auditTrailService.initialize({ auditLogPath: testLogPath });
    });

    it('should generate JSON audit report', async () => {
      const mockEntries = [
        {
          correlationId: 'id1',
          timestamp: '2025-01-27T10:00:00.000Z',
          eventType: 'login_success',
          severity: 'low',
          userId: 'user1'
        },
        {
          correlationId: 'id2',
          timestamp: '2025-01-27T10:01:00.000Z',
          eventType: 'login_failure',
          severity: 'medium',
          userId: 'user2'
        }
      ];

      jest.spyOn(auditTrailService, 'getAuditEntries').mockResolvedValue(mockEntries);
      jest.spyOn(auditTrailService, 'verifyAuditTrailIntegrity').mockResolvedValue({
        verified: true,
        totalEntries: 2,
        verifiedEntries: 2,
        failedEntries: [],
        hashChainValid: true
      });

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const report = await auditTrailService.generateAuditReport(startDate, endDate);

      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.period.startDate).toBe(startDate.toISOString());
      expect(report.period.endDate).toBe(endDate.toISOString());
      expect(report.summary.totalEntries).toBe(2);
      expect(report.summary.eventTypes).toEqual({
        login_success: 1,
        login_failure: 1
      });
      expect(report.summary.severityDistribution).toEqual({
        low: 1,
        medium: 1
      });
      expect(report.entries).toEqual(mockEntries);
    });

    it('should generate CSV audit report', async () => {
      const mockEntries = [
        {
          correlationId: 'id1',
          timestamp: '2025-01-27T10:00:00.000Z',
          eventType: 'login_success',
          severity: 'low',
          userId: 'user1',
          details: { test: 'data' },
          integrityHash: 'hash1',
          requestInfo: { ip: '192.168.1.1' }
        }
      ];

      jest.spyOn(auditTrailService, 'getAuditEntries').mockResolvedValue(mockEntries);
      jest.spyOn(auditTrailService, 'verifyAuditTrailIntegrity').mockResolvedValue({
        verified: true,
        totalEntries: 1,
        verifiedEntries: 1,
        failedEntries: [],
        hashChainValid: true
      });

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      const csvReport = await auditTrailService.generateAuditReport(
        startDate, endDate, 'csv'
      );

      expect(typeof csvReport).toBe('string');
      expect(csvReport).toContain('Timestamp,Event Type,Severity');
      expect(csvReport).toContain('login_success');
      expect(csvReport).toContain('user1');
    });

    it('should handle report generation errors', async () => {
      jest.spyOn(auditTrailService, 'getAuditEntries').mockRejectedValue(
        new Error('Database error')
      );

      const startDate = new Date('2025-01-27T09:00:00.000Z');
      const endDate = new Date('2025-01-27T11:00:00.000Z');

      await expect(
        auditTrailService.generateAuditReport(startDate, endDate)
      ).rejects.toThrow('Database error');
    });
  });

  describe('log rotation', () => {
    beforeEach(async () => {
      await auditTrailService.initialize({ 
        auditLogPath: testLogPath,
        logRotationSize: 1000 // Small size for testing
      });
    });

    it('should rotate log file when size limit exceeded', async () => {
      // Mock file size exceeding limit
      fs.stat.mockResolvedValue({ size: 2000, mtime: new Date() });

      await auditTrailService.createAuditEntry('login_success', 'low', {}, 'user123');

      expect(fs.rename).toHaveBeenCalled();
    });

    it('should clean up old log files', async () => {
      const oldFiles = Array.from({ length: 150 }, (_, i) => `audit-2025-01-${String(i + 1).padStart(2, '0')}.log`);
      fs.readdir.mockResolvedValue(oldFiles);
      
      // Mock file stats for all files
      fs.stat.mockResolvedValue({ size: 1000, mtime: new Date() });

      jest.spyOn(auditTrailService, 'cleanupOldLogFiles');
      await auditTrailService.cleanupOldLogFiles();

      expect(fs.unlink).toHaveBeenCalledTimes(50); // Should remove 50 excess files
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      await auditTrailService.initialize({ auditLogPath: testLogPath });

      const status = auditTrailService.getHealthStatus();

      expect(status.initialized).toBe(true);
      expect(status.auditLogPath).toBe(testLogPath);
      expect(status.hashChainSequence).toBe(0);
      expect(status.redisConnected).toBe(true);
      expect(status.configLoaded).toBe(true);
    });
  });
});