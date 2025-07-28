/**
 * Security Monitor Service Tests
 * Comprehensive unit tests for security event logging and monitoring
 */

const securityMonitorService = require('../securityMonitorService');
const redisService = require('../redisService');
const configService = require('../configService');
const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS, 
  TIMEOUTS 
} = require('../utils/constants');

// Mock dependencies
jest.mock('../redisService');
jest.mock('../configService');
jest.mock('https');
jest.mock('http');

describe('SecurityMonitorService', () => {
  let mockReq;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock request object
    mockReq = {
      get: jest.fn((header) => {
        const headers = {
          'User-Agent': 'Mozilla/5.0 Test Browser',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
        };
        return headers[header];
      }),
      ip: '192.168.1.100',
      connection: { remoteAddress: '192.168.1.100' },
    };

    // Mock config service
    configService.isInitialized = true;
    configService.initialize = jest.fn().mockResolvedValue({});
    configService.getMonitoringConfig = jest.fn().mockReturnValue({
      logLevel: 'info',
      alertWebhookUrl: 'https://hooks.slack.com/test',
      siemEndpoint: 'https://siem.example.com/api/events',
    });

    // Mock redis service
    redisService.isReady = jest.fn().mockReturnValue(true);
    redisService.setWithTTL = jest.fn().mockResolvedValue(true);
    redisService.addToSet = jest.fn().mockResolvedValue(true);
    redisService.getSet = jest.fn().mockResolvedValue(new Set());
    redisService.get = jest.fn().mockResolvedValue(null);
  });

  describe('Initialization', () => {
    test('should initialize successfully with default configuration', async () => {
      // Reset initialization state
      securityMonitorService.isInitialized = false;
      configService.isInitialized = false;
      
      await securityMonitorService.initialize();
      
      expect(securityMonitorService.isInitialized).toBe(true);
      expect(configService.initialize).toHaveBeenCalled();
      expect(configService.getMonitoringConfig).toHaveBeenCalled();
    });

    test('should initialize with custom alert thresholds', async () => {
      // Reset initialization state
      securityMonitorService.isInitialized = false;
      
      const customConfig = {
        alertThresholds: {
          failedLogins: { count: 3, windowMs: 10 * 60 * 1000 },
        },
      };

      await securityMonitorService.initialize(customConfig);
      
      const thresholds = securityMonitorService.getAlertThresholds();
      expect(thresholds.failedLogins.count).toBe(3);
      expect(thresholds.failedLogins.windowMs).toBe(10 * 60 * 1000);
    });

    test('should handle initialization failure', async () => {
      // Reset initialization state
      securityMonitorService.isInitialized = false;
      configService.isInitialized = false;
      configService.initialize.mockRejectedValue(new Error('Config failed'));
      
      await expect(securityMonitorService.initialize()).rejects.toThrow('Config failed');
    });
  });

  describe('Security Event Logging', () => {
    beforeEach(async () => {
      await securityMonitorService.initialize();
    });

    test('should log security event successfully', async () => {
      const eventDetails = {
        action: 'login_attempt',
        username: 'testuser',
        success: false,
      };

      const result = await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILURE,
        SEVERITY_LEVELS.MEDIUM,
        eventDetails,
        'user123',
        mockReq
      );

      expect(result).toHaveProperty('correlationId');
      expect(result).toHaveProperty('timestamp');
      expect(result.eventType).toBe(SECURITY_EVENTS.LOGIN_FAILURE);
      expect(result.severity).toBe(SEVERITY_LEVELS.MEDIUM);
      expect(result.userId).toBe('user123');
      expect(result.deviceInfo).toHaveProperty('ip', '192.168.1.100');
      expect(result.deviceInfo).toHaveProperty('userAgent', 'Mozilla/5.0 Test Browser');

      expect(redisService.setWithTTL).toHaveBeenCalled();
      expect(redisService.addToSet).toHaveBeenCalledTimes(3); // time-series, user events, IP events
    });

    test('should validate event type', async () => {
      await expect(
        securityMonitorService.logSecurityEvent(
          'invalid_event_type',
          SEVERITY_LEVELS.LOW,
          {}
        )
      ).rejects.toThrow('Invalid event type');
    });

    test('should validate severity level', async () => {
      await expect(
        securityMonitorService.logSecurityEvent(
          SECURITY_EVENTS.LOGIN_SUCCESS,
          'invalid_severity',
          {}
        )
      ).rejects.toThrow('Invalid severity level');
    });

    test('should handle missing request object', async () => {
      const result = await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.LOGIN_SUCCESS,
        SEVERITY_LEVELS.LOW,
        { action: 'test' }
      );

      expect(result.deviceInfo).toEqual({});
    });

    test('should handle Redis storage failure gracefully', async () => {
      redisService.setWithTTL.mockRejectedValue(new Error('Redis error'));
      
      // Should not throw, but should still return the event
      const result = await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.LOGIN_SUCCESS,
        SEVERITY_LEVELS.LOW,
        { action: 'test' }
      );

      expect(result).toHaveProperty('correlationId');
    });
  });

  describe('Anomaly Detection', () => {
    beforeEach(async () => {
      await securityMonitorService.initialize();
    });

    test('should detect brute force attack anomaly', async () => {
      // Mock multiple failed login events from same IP
      const mockEvents = [];
      for (let i = 0; i < 6; i++) {
        mockEvents.push({
          eventType: SECURITY_EVENTS.LOGIN_FAILURE,
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // 1 minute apart
        });
      }

      redisService.getSet.mockResolvedValue(new Set(['event1', 'event2', 'event3', 'event4', 'event5', 'event6']));
      redisService.get.mockImplementation((key) => {
        if (key.startsWith('security_event:')) {
          const index = parseInt(key.split(':')[1].replace('event', '')) - 1;
          return Promise.resolve(JSON.stringify(mockEvents[index] || null));
        }
        return Promise.resolve(null);
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILURE,
        SEVERITY_LEVELS.MEDIUM,
        { username: 'testuser' },
        null,
        mockReq
      );

      // Should trigger brute force alert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ALERT TRIGGERED:'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    test('should detect privilege escalation anomaly', async () => {
      // Mock multiple privilege escalation events from same user
      const mockEvents = [];
      for (let i = 0; i < 4; i++) {
        mockEvents.push({
          eventType: SECURITY_EVENTS.PRIVILEGE_ESCALATION,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
        });
      }

      redisService.getSet.mockResolvedValue(new Set(['event1', 'event2', 'event3', 'event4']));
      redisService.get.mockImplementation((key) => {
        if (key.startsWith('security_event:')) {
          const index = parseInt(key.split(':')[1].replace('event', '')) - 1;
          return Promise.resolve(JSON.stringify(mockEvents[index] || null));
        }
        return Promise.resolve(null);
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.PRIVILEGE_ESCALATION,
        SEVERITY_LEVELS.HIGH,
        { action: 'admin_access_attempt' },
        'user123',
        mockReq
      );

      // Should trigger privilege escalation alert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ALERT TRIGGERED:'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    test('should detect suspicious activity anomaly', async () => {
      // Mock multiple suspicious activity events from same IP
      const mockEvents = [];
      for (let i = 0; i < 11; i++) {
        mockEvents.push({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
        });
      }

      redisService.getSet.mockResolvedValue(new Set(Array.from({ length: 11 }, (_, i) => `event${i + 1}`)));
      redisService.get.mockImplementation((key) => {
        if (key.startsWith('security_event:')) {
          const index = parseInt(key.split(':')[1].replace('event', '')) - 1;
          return Promise.resolve(JSON.stringify(mockEvents[index] || null));
        }
        return Promise.resolve(null);
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        SEVERITY_LEVELS.MEDIUM,
        { pattern: 'unusual_request_pattern' },
        null,
        mockReq
      );

      // Should trigger suspicious activity alert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ALERT TRIGGERED:'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    test('should detect data access anomaly', async () => {
      // Create a spy to capture the triggerAlert call
      const triggerAlertSpy = jest.spyOn(securityMonitorService, 'triggerAlert').mockResolvedValue({});
      
      // Mock excessive data access events from same user
      const mockEvents = [];
      for (let i = 0; i < 101; i++) {
        mockEvents.push({
          eventType: SECURITY_EVENTS.DATA_ACCESS,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
        });
      }

      // Mock getSet to return events for user_events key
      redisService.getSet.mockImplementation((key) => {
        if (key.includes('user_events:user123')) {
          return Promise.resolve(new Set(Array.from({ length: 101 }, (_, i) => `event${i + 1}`)));
        }
        return Promise.resolve(new Set());
      });

      redisService.get.mockImplementation((key) => {
        if (key.startsWith('security_event:')) {
          const index = parseInt(key.split(':')[1].replace('event', '')) - 1;
          return Promise.resolve(JSON.stringify(mockEvents[index] || null));
        }
        return Promise.resolve(null);
      });

      // Mock HTTPS to avoid SIEM errors
      const https = require('https');
      const mockHttpReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };
      const mockHttpRes = {
        statusCode: 200,
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockHttpRes);
        return mockHttpReq;
      });

      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.DATA_ACCESS,
        SEVERITY_LEVELS.LOW,
        { resource: 'user_data' },
        'user123'
      );

      // Should trigger data exfiltration alert
      expect(triggerAlertSpy).toHaveBeenCalledWith(
        'data_exfiltration_attempt',
        expect.objectContaining({
          userId: 'user123',
          accessCount: 101,
          severity: SEVERITY_LEVELS.CRITICAL,
        })
      );

      triggerAlertSpy.mockRestore();
    });

    test('should handle anomaly detection errors gracefully', async () => {
      redisService.getSet.mockRejectedValue(new Error('Redis error'));
      
      // Mock HTTPS to avoid SIEM errors
      const https = require('https');
      const mockHttpsReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };
      const mockHttpsRes = {
        statusCode: 200,
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockHttpsRes);
        return mockHttpsReq;
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILURE,
        SEVERITY_LEVELS.MEDIUM,
        { username: 'testuser' },
        null,
        mockReq
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to detect failed login anomaly:'),
        expect.objectContaining({ error: 'Redis error' })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Alert Management', () => {
    beforeEach(async () => {
      await securityMonitorService.initialize();
    });

    test('should trigger alert successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const alert = await securityMonitorService.triggerAlert('test_alert', {
        severity: SEVERITY_LEVELS.HIGH,
        details: { test: 'data' },
      });

      expect(alert).toHaveProperty('type', 'test_alert');
      expect(alert).toHaveProperty('severity', SEVERITY_LEVELS.HIGH);
      expect(alert).toHaveProperty('correlationId');
      expect(alert).toHaveProperty('timestamp');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ALERT TRIGGERED:'),
        expect.any(String)
      );

      expect(redisService.setWithTTL).toHaveBeenCalled();
      expect(redisService.addToSet).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should send webhook alert when configured', async () => {
      const https = require('https');
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };
      const mockRes = {
        statusCode: 200,
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockRes);
        return mockReq;
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await securityMonitorService.triggerAlert('webhook_test', {
        severity: SEVERITY_LEVELS.CRITICAL,
        details: { test: 'webhook' },
      });

      expect(https.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
        expect.any(Function)
      );

      expect(consoleSpy).toHaveBeenCalledWith('Security alert sent via webhook successfully');

      consoleSpy.mockRestore();
    });

    test('should handle webhook failure gracefully', async () => {
      const https = require('https');
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };
      const mockRes = {
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockRes);
        return mockReq;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await securityMonitorService.triggerAlert('webhook_fail_test', {
        severity: SEVERITY_LEVELS.HIGH,
        details: { test: 'fail' },
      });

      // Check that both the alert trigger and webhook failure were logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ALERT TRIGGERED:'),
        expect.any(String)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send webhook alert:'),
        expect.objectContaining({ error: 'Webhook request failed: 500 Internal Server Error' })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(async () => {
      await securityMonitorService.initialize();
    });

    test('should retrieve security events for date range', async () => {
      const mockEvents = [
        {
          eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
          timestamp: '2025-01-27T10:00:00Z',
          correlationId: 'event1',
        },
        {
          eventType: SECURITY_EVENTS.LOGIN_FAILURE,
          timestamp: '2025-01-27T11:00:00Z',
          correlationId: 'event2',
        },
      ];

      // Mock getSet to return different sets for different event types
      redisService.getSet.mockImplementation((key) => {
        if (key.includes('login_success')) {
          return Promise.resolve(new Set(['event1']));
        }
        if (key.includes('login_failure')) {
          return Promise.resolve(new Set(['event2']));
        }
        return Promise.resolve(new Set());
      });

      redisService.get.mockImplementation((key) => {
        if (key === 'security_event:event1') {
          return Promise.resolve(JSON.stringify(mockEvents[0]));
        }
        if (key === 'security_event:event2') {
          return Promise.resolve(JSON.stringify(mockEvents[1]));
        }
        return Promise.resolve(null);
      });

      const startDate = new Date('2025-01-27T00:00:00Z');
      const endDate = new Date('2025-01-27T23:59:59Z');

      const events = await securityMonitorService.getSecurityEvents(startDate, endDate);

      expect(events).toHaveLength(2);
      expect(events[0].correlationId).toBe('event2'); // Should be sorted by timestamp desc
      expect(events[1].correlationId).toBe('event1');
    });

    test('should retrieve security events filtered by type', async () => {
      const mockEvent = {
        eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
        timestamp: '2025-01-27T10:00:00Z',
        correlationId: 'event1',
      };

      redisService.getSet.mockResolvedValue(new Set(['event1']));
      redisService.get.mockResolvedValue(JSON.stringify(mockEvent));

      const startDate = new Date('2025-01-27T00:00:00Z');
      const endDate = new Date('2025-01-27T23:59:59Z');

      const events = await securityMonitorService.getSecurityEvents(
        startDate, 
        endDate, 
        SECURITY_EVENTS.LOGIN_SUCCESS
      );

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(SECURITY_EVENTS.LOGIN_SUCCESS);
    });

    test('should retrieve security alerts for date range', async () => {
      const mockAlert = {
        type: 'brute_force_attack',
        timestamp: '2025-01-27T10:00:00Z',
        correlationId: 'alert1',
      };

      redisService.getSet.mockResolvedValue(new Set(['alert1']));
      redisService.get.mockResolvedValue(JSON.stringify(mockAlert));

      const startDate = new Date('2025-01-27T00:00:00Z');
      const endDate = new Date('2025-01-27T23:59:59Z');

      const alerts = await securityMonitorService.getSecurityAlerts(startDate, endDate);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('brute_force_attack');
    });

    test('should handle retrieval errors', async () => {
      redisService.getSet.mockRejectedValue(new Error('Redis error'));

      const startDate = new Date('2025-01-27T00:00:00Z');
      const endDate = new Date('2025-01-27T23:59:59Z');

      await expect(
        securityMonitorService.getSecurityEvents(startDate, endDate)
      ).rejects.toThrow('Redis error');
    });
  });

  describe('Configuration Management', () => {
    test('should update alert thresholds', () => {
      const newThresholds = {
        failedLogins: { count: 3, windowMs: 10 * 60 * 1000 },
      };

      securityMonitorService.updateAlertThresholds(newThresholds);
      
      const thresholds = securityMonitorService.getAlertThresholds();
      expect(thresholds.failedLogins.count).toBe(3);
      expect(thresholds.failedLogins.windowMs).toBe(10 * 60 * 1000);
    });

    test('should get current alert thresholds', () => {
      const thresholds = securityMonitorService.getAlertThresholds();
      
      expect(thresholds).toHaveProperty('failedLogins');
      expect(thresholds).toHaveProperty('suspiciousActivity');
      expect(thresholds).toHaveProperty('privilegeEscalation');
      expect(thresholds).toHaveProperty('dataAccess');
    });

    test('should get health status', async () => {
      await securityMonitorService.initialize();
      
      const health = securityMonitorService.getHealthStatus();
      
      expect(health).toHaveProperty('initialized', true);
      expect(health).toHaveProperty('redisConnected', true);
      expect(health).toHaveProperty('configLoaded', true);
      expect(health).toHaveProperty('alertThresholds');
    });
  });

  describe('SIEM Integration', () => {
    beforeEach(async () => {
      await securityMonitorService.initialize();
    });

    test('should send event to SIEM when configured', async () => {
      const https = require('https');
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };
      const mockRes = {
        statusCode: 200,
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockRes);
        return mockReq;
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.LOGIN_SUCCESS,
        SEVERITY_LEVELS.LOW,
        { username: 'testuser' }
      );

      expect(https.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ',
          }),
        }),
        expect.any(Function)
      );

      expect(consoleSpy).toHaveBeenCalledWith('Security event sent to SIEM successfully');

      consoleSpy.mockRestore();
    });

    test('should handle SIEM failure gracefully', async () => {
      const https = require('https');
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };
      const mockRes = {
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockRes);
        return mockReq;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.LOGIN_SUCCESS,
        SEVERITY_LEVELS.LOW,
        { username: 'testuser' }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send event to SIEM:'),
        expect.objectContaining({ 
          correlationId: expect.any(String),
          error: 'SIEM request failed: 500 Internal Server Error' 
        })
      );

      consoleSpy.mockRestore();
    });

    test('should skip SIEM when not configured', async () => {
      // Reconfigure without SIEM endpoint
      configService.getMonitoringConfig.mockReturnValue({
        logLevel: 'info',
        alertWebhookUrl: 'https://hooks.slack.com/test',
        siemEndpoint: null,
      });

      await securityMonitorService.initialize();

      const https = require('https');
      https.request.mockClear();

      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.LOGIN_SUCCESS,
        SEVERITY_LEVELS.LOW,
        { username: 'testuser' }
      );

      expect(https.request).not.toHaveBeenCalled();
    });
  });
});