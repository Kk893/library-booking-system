const mongoose = require('mongoose');
const fs = require('fs');
const databaseSecurityService = require('../databaseSecurityService');
const { securityMonitorService } = require('../securityMonitorService');
const databaseEncryptionService = require('../databaseEncryptionService');

// Mock dependencies
jest.mock('fs');
jest.mock('../securityMonitorService');
jest.mock('../databaseEncryptionService', () => ({
  initialize: jest.fn().mockResolvedValue(true)
}));

describe('DatabaseSecurityService', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    jest.clearAllMocks();
    
    // Reset mongoose connection state
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('initializeSecureConnection', () => {
    it('should initialize secure connection with TLS enabled', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.DB_SSL_ENABLED = 'true';
      process.env.DB_SSL_VALIDATE = 'true';
      process.env.DB_MAX_POOL_SIZE = '15';
      process.env.DB_MIN_POOL_SIZE = '3';

      // Mock certificate files
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock-certificate-content');

      // Mock mongoose connect
      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue();
      
      // Mock security monitor service
      securityMonitorService.logSecurityEvent.mockResolvedValue();

      await databaseSecurityService.initializeSecureConnection();

      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          ssl: true,
          sslValidate: true,
          maxPoolSize: 15,
          minPoolSize: 3,
          authSource: 'admin',
          retryWrites: true,
          w: 'majority'
        })
      );

      expect(databaseEncryptionService.initialize).toHaveBeenCalled();
      
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'database_connection',
        severity: 'info',
        details: expect.objectContaining({
          secure: true,
          poolSize: 15,
          encryptionEnabled: true
        })
      });
    });

    it('should initialize connection without TLS when disabled', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.DB_SSL_ENABLED = 'false';

      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue();
      securityMonitorService.logSecurityEvent.mockResolvedValue();

      await databaseSecurityService.initializeSecureConnection();

      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          ssl: false,
          sslValidate: false
        })
      );
    });

    it('should throw error when MONGODB_URI is missing', async () => {
      delete process.env.MONGODB_URI;

      await expect(databaseSecurityService.initializeSecureConnection())
        .rejects.toThrow('MONGODB_URI environment variable is required');
    });

    it('should handle connection errors and log security events', async () => {
      process.env.MONGODB_URI = 'mongodb://invalid:27017/test';
      
      const connectionError = new Error('Connection failed');
      jest.spyOn(mongoose, 'connect').mockRejectedValue(connectionError);
      securityMonitorService.logSecurityEvent.mockResolvedValue();

      await expect(databaseSecurityService.initializeSecureConnection())
        .rejects.toThrow('Connection failed');

      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'database_connection_failed',
        severity: 'high',
        details: {
          error: 'Connection failed',
          timestamp: expect.any(Date)
        }
      });
    });
  });

  describe('SSL Certificate Loading', () => {
    it('should load SSL certificate when path is provided', () => {
      process.env.DB_SSL_CERT_PATH = '/path/to/cert.pem';
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('certificate-content');

      const result = databaseSecurityService._loadSSLCertificate();

      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('cert.pem'));
      expect(result).toBe('certificate-content');
    });

    it('should return null when certificate path is not provided', () => {
      delete process.env.DB_SSL_CERT_PATH;

      const result = databaseSecurityService._loadSSLCertificate();

      expect(result).toBeNull();
    });

    it('should return null when certificate file does not exist', () => {
      process.env.DB_SSL_CERT_PATH = '/nonexistent/cert.pem';
      
      fs.existsSync.mockReturnValue(false);

      const result = databaseSecurityService._loadSSLCertificate();

      expect(result).toBeNull();
    });

    it('should handle certificate loading errors gracefully', () => {
      process.env.DB_SSL_CERT_PATH = '/path/to/cert.pem';
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = databaseSecurityService._loadSSLCertificate();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load SSL certificate:',
        'Permission denied'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('validateConnectionSecurity', () => {
    it('should validate secure connection successfully', async () => {
      // Mock mongoose connection
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        configurable: true
      });
      Object.defineProperty(mongoose.connection, 'host', {
        value: 'localhost',
        configurable: true
      });
      Object.defineProperty(mongoose.connection, 'port', {
        value: 27017,
        configurable: true
      });
      Object.defineProperty(mongoose.connection, 'name', {
        value: 'test',
        configurable: true
      });

      // Set secure connection
      databaseSecurityService.isSecureConnection = true;
      databaseSecurityService.connectionOptions = { monitorCommands: true };

      const result = await databaseSecurityService.validateConnectionSecurity();

      expect(result.valid).toBe(true);
      expect(result.connectionInfo).toEqual({
        isConnected: true,
        isSecure: true,
        host: 'localhost',
        port: 27017,
        name: 'test'
      });
      expect(result.securityFeatures).toEqual({
        ssl: true,
        authentication: true,
        connectionPooling: true,
        commandMonitoring: true
      });
    });

    it('should fail validation when connection is not ready', async () => {
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 0,
        configurable: true
      });

      securityMonitorService.logSecurityEvent.mockResolvedValue();

      const result = await databaseSecurityService.validateConnectionSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Database connection is not ready');
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'database_security_validation_failed',
        severity: 'high',
        details: {
          error: 'Database connection is not ready',
          timestamp: expect.any(Date)
        }
      });
    });

    it('should fail validation when SSL is enabled but connection is not secure', async () => {
      process.env.DB_SSL_ENABLED = 'true';
      
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        configurable: true
      });

      databaseSecurityService.isSecureConnection = false;
      securityMonitorService.logSecurityEvent.mockResolvedValue();

      const result = await databaseSecurityService.validateConnectionSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('SSL/TLS is enabled but connection is not secure');
    });
  });

  describe('Connection Pool Statistics', () => {
    it('should return connection pool statistics', () => {
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        configurable: true
      });
      Object.defineProperty(mongoose.connection, 'host', {
        value: 'localhost',
        configurable: true
      });
      Object.defineProperty(mongoose.connection, 'port', {
        value: 27017,
        configurable: true
      });
      Object.defineProperty(mongoose.connection, 'name', {
        value: 'test',
        configurable: true
      });

      databaseSecurityService.connectionOptions = {
        maxPoolSize: 10,
        minPoolSize: 2
      };
      databaseSecurityService.isSecureConnection = true;

      const stats = databaseSecurityService.getConnectionPoolStats();

      expect(stats).toEqual({
        readyState: 1,
        host: 'localhost',
        port: 27017,
        name: 'test',
        maxPoolSize: 10,
        minPoolSize: 2,
        isSecure: true
      });
    });
  });

  describe('Database Command Auditing', () => {
    it('should audit sensitive database commands', () => {
      const mockEvent = {
        requestId: 123,
        commandName: 'find',
        databaseName: 'test',
        connectionId: 'conn-1'
      };

      databaseSecurityService._auditDatabaseCommand(mockEvent);

      const auditLog = databaseSecurityService.getAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toEqual({
        commandId: 123,
        commandName: 'find',
        databaseName: 'test',
        timestamp: expect.any(Date),
        connectionId: 'conn-1'
      });
    });

    it('should log high-risk commands as security events', () => {
      const mockEvent = {
        requestId: 456,
        commandName: 'drop',
        databaseName: 'test',
        connectionId: 'conn-2'
      };

      securityMonitorService.logSecurityEvent.mockResolvedValue();

      databaseSecurityService._auditDatabaseCommand(mockEvent);

      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'high_risk_database_command',
        severity: 'high',
        details: {
          commandId: 456,
          commandName: 'drop',
          databaseName: 'test',
          timestamp: expect.any(Date),
          connectionId: 'conn-2'
        }
      });
    });

    it('should maintain audit log size limit', () => {
      // Add more than 1000 entries
      for (let i = 0; i < 1005; i++) {
        databaseSecurityService._auditDatabaseCommand({
          requestId: i,
          commandName: 'find',
          databaseName: 'test',
          connectionId: `conn-${i}`
        });
      }

      const auditLog = databaseSecurityService.getAuditLog();
      expect(auditLog.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('closeConnection', () => {
    it('should close connection securely and log event', async () => {
      const mockClose = jest.spyOn(mongoose.connection, 'close').mockResolvedValue();
      securityMonitorService.logSecurityEvent.mockResolvedValue();

      await databaseSecurityService.closeConnection();

      expect(mockClose).toHaveBeenCalled();
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'database_connection_closed',
        severity: 'info',
        details: { timestamp: expect.any(Date) }
      });
    });

    it('should handle connection close errors', async () => {
      const closeError = new Error('Close failed');
      jest.spyOn(mongoose.connection, 'close').mockRejectedValue(closeError);

      await expect(databaseSecurityService.closeConnection())
        .rejects.toThrow('Close failed');
    });
  });
});