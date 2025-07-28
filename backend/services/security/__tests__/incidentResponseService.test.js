/**
 * Integration tests for Incident Response Service
 * Tests incident detection, classification, and notification workflows
 */

const incidentResponseService = require('../incidentResponseService');
const securityMonitorService = require('../securityMonitorService');
const redisService = require('../redisService');
const configService = require('../configService');
const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS 
} = require('../utils/constants');

// Mock external dependencies
jest.mock('../redisService');
jest.mock('../configService');
jest.mock('../securityMonitorService');
jest.mock('../auditTrailService');

describe('IncidentResponseService Integration Tests', () => {
  let mockRedisClient;

  beforeAll(async () => {
    // Setup mock Redis client
    mockRedisClient = {
      setWithTTL: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      addToSet: jest.fn().mockResolvedValue(1),
      getSet: jest.fn().mockResolvedValue([]),
      isReady: jest.fn().mockReturnValue(true)
    };

    redisService.setWithTTL = mockRedisClient.setWithTTL;
    redisService.get = mockRedisClient.get;
    redisService.addToSet = mockRedisClient.addToSet;
    redisService.getSet = mockRedisClient.getSet;
    redisService.isReady = mockRedisClient.isReady;

    // Setup mock config service
    configService.isInitialized = true;
    configService.getIncidentResponseConfig = jest.fn().mockReturnValue({
      email: { enabled: true, smtp: 'test' },
      webhook: { enabled: true, url: 'http://test.com' },
      alertWebhookUrl: 'http://alerts.test.com'
    });

    // Setup mock security monitor service
    securityMonitorService.logSecurityEvent = jest.fn().mockResolvedValue({
      correlationId: 'test-correlation-id',
      timestamp: new Date().toISOString()
    });

    // Initialize the service
    await incidentResponseService.initialize();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize successfully with default configuration', async () => {
      const service = require('../incidentResponseService');
      await service.initialize();
      
      const healthStatus = service.getHealthStatus();
      expect(healthStatus.initialized).toBe(true);
      expect(healthStatus.notificationChannels).toBeGreaterThan(0);
      expect(healthStatus.incidentHandlers).toBeGreaterThan(0);
    });

    test('should initialize with custom configuration', async () => {
      const customConfig = {
        breachThresholds: {
          dataAccess: { recordCount: 50, timeWindowMs: 30 * 60 * 1000 }
        }
      };

      const service = require('../incidentResponseService');
      await service.initialize(customConfig);
      
      const healthStatus = service.getHealthStatus();
      expect(healthStatus.breachThresholds.dataAccess.recordCount).toBe(50);
    });
  });

  describe('Data Breach Detection', () => {
    test('should detect data breach incident when threshold exceeded', async () => {
      // Setup mock data for data breach detection
      const securityEvent = {
        eventType: SECURITY_EVENTS.DATA_ACCESS,
        severity: SEVERITY_LEVELS.MEDIUM,
        userId: 'user123',
        correlationId: 'event-123',
        deviceInfo: { ip: '192.168.1.100' },
        details: { recordId: 'record123' },
        timestamp: new Date().toISOString()
      };

      // Mock Redis responses for data access events
      const mockEventIds = ['event1', 'event2', 'event3'];
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      // Mock individual event data
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.DATA_ACCESS,
              timestamp: new Date(Date.now() - (index * 10 * 60 * 1000)).toISOString(), // 10 minutes apart
              details: { recordId: `record${index}` }
            }));
          }
          return Promise.resolve(null);
        });
      });

      // Set threshold to trigger detection
      await incidentResponseService.initialize({
        breachThresholds: {
          dataAccess: { recordCount: 2, timeWindowMs: 60 * 60 * 1000 }
        }
      });

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeTruthy();
      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].type).toBe('data_breach');
      expect(incidents[0].severity).toBe('high');
      expect(incidents[0].details.requiresNotification).toBe(true);
    });

    test('should not detect data breach when threshold not exceeded', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.DATA_ACCESS,
        severity: SEVERITY_LEVELS.LOW,
        userId: 'user123',
        correlationId: 'event-123',
        deviceInfo: { ip: '192.168.1.100' },
        details: { recordId: 'record123' },
        timestamp: new Date().toISOString()
      };

      // Mock minimal Redis responses
      mockRedisClient.getSet.mockResolvedValue(['event1']);
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        eventType: SECURITY_EVENTS.DATA_ACCESS,
        timestamp: new Date().toISOString(),
        details: { recordId: 'record1' }
      }));

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeNull();
    });
  });

  describe('Brute Force Attack Detection', () => {
    test('should detect brute force attack when threshold exceeded', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.LOGIN_FAILURE,
        severity: SEVERITY_LEVELS.MEDIUM,
        userId: null,
        correlationId: 'event-456',
        deviceInfo: { ip: '192.168.1.200' },
        details: { email: 'test@example.com' },
        timestamp: new Date().toISOString()
      };

      // Mock Redis responses for failed login events
      const mockEventIds = Array.from({ length: 15 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.LOGIN_FAILURE,
              timestamp: new Date(Date.now() - (index * 1000)).toISOString(), // 1 second apart
              details: { email: `test${index}@example.com` }
            }));
          }
          return Promise.resolve(null);
        });
      });

      // Set threshold to trigger detection
      await incidentResponseService.initialize({
        breachThresholds: {
          failedLogins: { attemptCount: 10, timeWindowMs: 15 * 60 * 1000 }
        }
      });

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeTruthy();
      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].type).toBe('brute_force_attack');
      expect(incidents[0].details.sourceIP).toBe('192.168.1.200');
      expect(incidents[0].details.failedAttempts).toBeGreaterThanOrEqual(10);
    });

    test('should require high threshold for breach notification', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.LOGIN_FAILURE,
        severity: SEVERITY_LEVELS.MEDIUM,
        userId: null,
        correlationId: 'event-456',
        deviceInfo: { ip: '192.168.1.200' },
        details: { email: 'test@example.com' },
        timestamp: new Date().toISOString()
      };

      // Mock moderate number of failed attempts (below notification threshold)
      const mockEventIds = Array.from({ length: 20 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.LOGIN_FAILURE,
              timestamp: new Date(Date.now() - (index * 1000)).toISOString(),
              details: { email: `test${index}@example.com` }
            }));
          }
          return Promise.resolve(null);
        });
      });

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeTruthy();
      expect(incidents[0].details.requiresNotification).toBe(false); // Below 100 threshold
    });
  });

  describe('Privilege Escalation Detection', () => {
    test('should detect privilege escalation incident', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.PRIVILEGE_ESCALATION,
        severity: SEVERITY_LEVELS.HIGH,
        userId: 'user789',
        correlationId: 'event-789',
        deviceInfo: { ip: '192.168.1.300' },
        details: { targetPrivilege: 'admin' },
        timestamp: new Date().toISOString()
      };

      // Mock Redis responses for privilege escalation events
      const mockEventIds = Array.from({ length: 6 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.PRIVILEGE_ESCALATION,
              timestamp: new Date(Date.now() - (index * 5 * 60 * 1000)).toISOString(), // 5 minutes apart
              details: { targetPrivilege: 'admin' }
            }));
          }
          return Promise.resolve(null);
        });
      });

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeTruthy();
      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].type).toBe('privilege_escalation');
      expect(incidents[0].severity).toBe('critical');
      expect(incidents[0].details.requiresNotification).toBe(true);
    });
  });

  describe('Data Exfiltration Detection', () => {
    test('should detect data exfiltration based on suspicious patterns', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.DATA_ACCESS,
        severity: SEVERITY_LEVELS.HIGH,
        userId: 'user456',
        correlationId: 'event-456',
        deviceInfo: { ip: '192.168.1.400' },
        details: { 
          pattern: 'bulk_download',
          dataType: 'user_records',
          accessVolume: 1000
        },
        timestamp: new Date().toISOString()
      };

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeTruthy();
      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].type).toBe('data_exfiltration');
      expect(incidents[0].severity).toBe('critical');
      expect(incidents[0].details.suspiciousPattern).toBe('bulk_download');
      expect(incidents[0].details.requiresNotification).toBe(true);
    });

    test('should detect data exfiltration based on flags', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.DATA_ACCESS,
        severity: SEVERITY_LEVELS.HIGH,
        userId: 'user456',
        correlationId: 'event-456',
        deviceInfo: { ip: '192.168.1.400' },
        details: { 
          flags: ['rapid_access', 'sensitive_data_access'],
          dataType: 'personal_data',
          accessVolume: 500
        },
        timestamp: new Date().toISOString()
      };

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeTruthy();
      expect(incidents[0].type).toBe('data_exfiltration');
    });
  });

  describe('Account Takeover Detection', () => {
    test('should detect account takeover based on risk score and flags', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
        severity: SEVERITY_LEVELS.MEDIUM,
        userId: 'user789',
        correlationId: 'event-789',
        deviceInfo: { 
          ip: '192.168.1.500',
          userAgent: 'Unknown Browser'
        },
        details: { 
          flags: ['new_device', 'new_location'],
          riskScore: 0.8
        },
        timestamp: new Date().toISOString()
      };

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeTruthy();
      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].type).toBe('account_takeover');
      expect(incidents[0].severity).toBe('high');
      expect(incidents[0].details.riskScore).toBe(0.8);
      expect(incidents[0].details.requiresNotification).toBe(true);
    });

    test('should not detect account takeover with low risk score', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
        severity: SEVERITY_LEVELS.LOW,
        userId: 'user789',
        correlationId: 'event-789',
        deviceInfo: { ip: '192.168.1.500' },
        details: { 
          flags: ['new_device'],
          riskScore: 0.3
        },
        timestamp: new Date().toISOString()
      };

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeNull();
    });
  });

  describe('Incident Processing', () => {
    test('should process incident and store it correctly', async () => {
      const incident = {
        type: 'data_breach',
        severity: 'high',
        status: 'detected',
        details: {
          userId: 'user123',
          dataAccessCount: 150,
          requiresNotification: true
        }
      };

      const processedIncident = await incidentResponseService.processIncident(incident);
      
      expect(processedIncident.id).toBeDefined();
      expect(processedIncident.createdAt).toBeDefined();
      expect(processedIncident.updatedAt).toBeDefined();
      
      // Verify Redis storage calls
      expect(mockRedisClient.setWithTTL).toHaveBeenCalledWith(
        `security_incident:${processedIncident.id}`,
        expect.any(String),
        expect.any(Number)
      );
      
      // Verify security event logging
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        SECURITY_EVENTS.SECURITY_INCIDENT,
        SEVERITY_LEVELS.HIGH,
        expect.objectContaining({
          incidentId: processedIncident.id,
          incidentType: 'data_breach'
        })
      );
    });

    test('should send notifications for incidents requiring notification', async () => {
      const incident = {
        type: 'privilege_escalation',
        severity: 'critical',
        status: 'detected',
        details: {
          userId: 'user456',
          escalationAttempts: 5,
          requiresNotification: true
        }
      };

      // Mock notification sending
      const sendNotificationSpy = jest.spyOn(incidentResponseService, 'sendBreachNotifications');
      sendNotificationSpy.mockResolvedValue({
        id: 'notification-123',
        channels: [{ type: 'email', status: 'sent' }]
      });

      await incidentResponseService.processIncident(incident);
      
      expect(sendNotificationSpy).toHaveBeenCalled();
    });
  });

  describe('Incident Status Management', () => {
    test('should update incident status correctly', async () => {
      const incidentId = 'incident-123';
      const mockIncident = {
        id: incidentId,
        type: 'brute_force_attack',
        status: 'detected',
        createdAt: new Date().toISOString()
      };

      // Add incident to active incidents
      incidentResponseService.activeIncidents.set(incidentId, mockIncident);

      await incidentResponseService.updateIncidentStatus(
        incidentId, 
        'investigating', 
        'Investigation started'
      );

      const updatedIncident = incidentResponseService.activeIncidents.get(incidentId);
      expect(updatedIncident.status).toBe('investigating');
      expect(updatedIncident.notes).toBeDefined();
      expect(updatedIncident.notes[0].note).toBe('Investigation started');
    });

    test('should throw error for non-existent incident', async () => {
      await expect(
        incidentResponseService.updateIncidentStatus('non-existent', 'investigating')
      ).rejects.toThrow('Incident not found: non-existent');
    });
  });

  describe('Incident Retrieval', () => {
    test('should retrieve incident by ID', async () => {
      const incidentId = 'incident-456';
      const mockIncidentData = {
        id: incidentId,
        type: 'data_breach',
        severity: 'high',
        createdAt: new Date().toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockIncidentData));

      const incident = await incidentResponseService.getIncident(incidentId);
      
      expect(incident).toEqual(mockIncidentData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`security_incident:${incidentId}`);
    });

    test('should return null for non-existent incident', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const incident = await incidentResponseService.getIncident('non-existent');
      
      expect(incident).toBeNull();
    });

    test('should retrieve incidents for date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      // Mock time-series data
      mockRedisClient.getSet.mockResolvedValue(['incident1', 'incident2']);
      
      const mockIncidents = [
        {
          id: 'incident1',
          type: 'data_breach',
          createdAt: '2025-01-15T10:00:00Z'
        },
        {
          id: 'incident2',
          type: 'brute_force_attack',
          createdAt: '2025-01-20T15:30:00Z'
        }
      ];

      mockRedisClient.get.mockImplementation((key) => {
        if (key === 'security_incident:incident1') {
          return Promise.resolve(JSON.stringify(mockIncidents[0]));
        }
        if (key === 'security_incident:incident2') {
          return Promise.resolve(JSON.stringify(mockIncidents[1]));
        }
        return Promise.resolve(null);
      });

      const incidents = await incidentResponseService.getIncidents(startDate, endDate);
      
      expect(incidents).toHaveLength(2);
      expect(incidents[0].id).toBe('incident2'); // Should be sorted by date descending
      expect(incidents[1].id).toBe('incident1');
    });

    test('should filter incidents by type', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      mockRedisClient.getSet.mockResolvedValue(['incident1', 'incident2']);
      
      const mockIncidents = [
        {
          id: 'incident1',
          type: 'data_breach',
          createdAt: '2025-01-15T10:00:00Z'
        },
        {
          id: 'incident2',
          type: 'brute_force_attack',
          createdAt: '2025-01-20T15:30:00Z'
        }
      ];

      mockRedisClient.get.mockImplementation((key) => {
        if (key === 'security_incident:incident1') {
          return Promise.resolve(JSON.stringify(mockIncidents[0]));
        }
        if (key === 'security_incident:incident2') {
          return Promise.resolve(JSON.stringify(mockIncidents[1]));
        }
        return Promise.resolve(null);
      });

      const incidents = await incidentResponseService.getIncidents(
        startDate, 
        endDate, 
        'data_breach'
      );
      
      expect(incidents).toHaveLength(1);
      expect(incidents[0].type).toBe('data_breach');
    });
  });

  describe('Notification Generation', () => {
    test('should generate appropriate notification message for data breach', () => {
      const incident = {
        id: 'incident-123',
        type: 'data_breach',
        severity: 'high',
        status: 'detected',
        createdAt: new Date().toISOString(),
        details: {
          dataAccessCount: 150,
          uniqueRecordsAccessed: 75
        }
      };

      const message = incidentResponseService.generateNotificationMessage(incident);
      
      expect(message).toContain('SECURITY INCIDENT DETECTED');
      expect(message).toContain('DATA BREACH');
      expect(message).toContain('Data Access Count: 150');
      expect(message).toContain('Unique Records: 75');
    });

    test('should generate appropriate notification message for brute force attack', () => {
      const incident = {
        id: 'incident-456',
        type: 'brute_force_attack',
        severity: 'medium',
        status: 'detected',
        createdAt: new Date().toISOString(),
        details: {
          sourceIP: '192.168.1.100',
          failedAttempts: 25,
          targetedAccounts: ['user1@test.com', 'user2@test.com']
        }
      };

      const message = incidentResponseService.generateNotificationMessage(incident);
      
      expect(message).toContain('BRUTE FORCE ATTACK');
      expect(message).toContain('Source IP: 192.168.1.100');
      expect(message).toContain('Failed Attempts: 25');
      expect(message).toContain('Targeted Accounts: 2');
    });
  });

  describe('Service Health', () => {
    test('should return correct health status', () => {
      const healthStatus = incidentResponseService.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('initialized');
      expect(healthStatus).toHaveProperty('activeIncidents');
      expect(healthStatus).toHaveProperty('notificationChannels');
      expect(healthStatus).toHaveProperty('incidentHandlers');
      expect(healthStatus).toHaveProperty('breachThresholds');
      
      expect(typeof healthStatus.initialized).toBe('boolean');
      expect(typeof healthStatus.activeIncidents).toBe('number');
      expect(typeof healthStatus.notificationChannels).toBe('number');
      expect(typeof healthStatus.incidentHandlers).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis errors gracefully during incident detection', async () => {
      const securityEvent = {
        eventType: SECURITY_EVENTS.DATA_ACCESS,
        severity: SEVERITY_LEVELS.MEDIUM,
        userId: 'user123',
        correlationId: 'event-123',
        deviceInfo: { ip: '192.168.1.100' },
        details: { recordId: 'record123' },
        timestamp: new Date().toISOString()
      };

      // Mock Redis error
      mockRedisClient.getSet.mockRejectedValue(new Error('Redis connection failed'));

      const incidents = await incidentResponseService.detectIncident(securityEvent);
      
      expect(incidents).toBeNull();
    });

    test('should handle notification failures gracefully', async () => {
      const incident = {
        type: 'data_breach',
        severity: 'high',
        status: 'detected',
        details: {
          userId: 'user123',
          requiresNotification: true
        }
      };

      // Mock notification failure
      const sendNotificationSpy = jest.spyOn(incidentResponseService, 'sendBreachNotifications');
      sendNotificationSpy.mockRejectedValue(new Error('Notification service unavailable'));

      // Should not throw error
      await expect(incidentResponseService.processIncident(incident)).resolves.toBeDefined();
    });
  });

  describe('Integration with Security Monitor Service', () => {
    test('should integrate with security monitor service for event logging', async () => {
      const incident = {
        type: 'privilege_escalation',
        severity: 'critical',
        status: 'detected',
        details: {
          userId: 'user456',
          requiresNotification: false
        }
      };

      await incidentResponseService.processIncident(incident);
      
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith(
        SECURITY_EVENTS.SECURITY_INCIDENT,
        SEVERITY_LEVELS.HIGH,
        expect.objectContaining({
          incidentType: 'privilege_escalation'
        })
      );
    });
  });
});