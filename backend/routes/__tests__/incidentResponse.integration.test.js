/**
 * Integration tests for Incident Response workflows
 * Tests end-to-end incident response scenarios including detection, notification, and management
 */

const request = require('supertest');
const express = require('express');
const incidentResponseService = require('../../services/security/incidentResponseService');
const securityMonitorService = require('../../services/security/securityMonitorService');
const redisService = require('../../services/security/redisService');
const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS 
} = require('../../services/security/utils/constants');

// Create test app
const app = express();
app.use(express.json());

// Mock route for testing incident response integration
app.post('/api/security/simulate-event', async (req, res) => {
  try {
    const { eventType, severity, details, userId } = req.body;
    
    // Create security event
    const securityEvent = await securityMonitorService.logSecurityEvent(
      eventType,
      severity,
      details,
      userId,
      req
    );

    // Detect incidents
    const incidents = await incidentResponseService.detectIncident(securityEvent);

    res.json({
      success: true,
      securityEvent,
      incidents: incidents || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/security/incidents', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    const incidents = await incidentResponseService.getIncidents(
      new Date(startDate),
      new Date(endDate),
      type
    );

    res.json({
      success: true,
      incidents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/security/incidents/:id', async (req, res) => {
  try {
    const incident = await incidentResponseService.getIncident(req.params.id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
    }

    res.json({
      success: true,
      incident
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/security/incidents/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    await incidentResponseService.updateIncidentStatus(
      req.params.id,
      status,
      notes
    );

    res.json({
      success: true,
      message: 'Incident status updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mock external dependencies
jest.mock('../../services/security/redisService');
jest.mock('../../services/security/configService');

describe('Incident Response Integration Tests', () => {
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

    // Initialize services
    await securityMonitorService.initialize();
    await incidentResponseService.initialize();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Breach Incident Workflow', () => {
    test('should detect and process data breach incident end-to-end', async () => {
      // Setup mock data for data breach scenario
      const mockEventIds = Array.from({ length: 150 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.DATA_ACCESS,
              timestamp: new Date(Date.now() - (index * 1000)).toISOString(),
              details: { recordId: `record${index}` }
            }));
          }
          return Promise.resolve(null);
        });
      });

      // Simulate data access event that triggers breach detection
      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.DATA_ACCESS,
          severity: SEVERITY_LEVELS.MEDIUM,
          details: { 
            recordId: 'sensitive-record-123',
            dataType: 'personal_data'
          },
          userId: 'user123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].type).toBe('data_breach');
      expect(response.body.incidents[0].severity).toBe('high');
      expect(response.body.incidents[0].details.requiresNotification).toBe(true);

      // Verify incident was stored
      expect(mockRedisClient.setWithTTL).toHaveBeenCalledWith(
        expect.stringMatching(/^security_incident:/),
        expect.any(String),
        expect.any(Number)
      );
    });

    test('should handle data breach notification workflow', async () => {
      // Mock notification sending
      const sendNotificationSpy = jest.spyOn(incidentResponseService, 'sendBreachNotifications');
      sendNotificationSpy.mockResolvedValue({
        id: 'notification-123',
        channels: [
          { type: 'email', status: 'sent', sentAt: new Date().toISOString() },
          { type: 'webhook', status: 'sent', sentAt: new Date().toISOString() }
        ]
      });

      // Setup data breach scenario
      const mockEventIds = Array.from({ length: 200 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.DATA_ACCESS,
              timestamp: new Date(Date.now() - (index * 1000)).toISOString(),
              details: { recordId: `record${index}` }
            }));
          }
          return Promise.resolve(null);
        });
      });

      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.DATA_ACCESS,
          severity: SEVERITY_LEVELS.HIGH,
          details: { 
            recordId: 'critical-record-456',
            dataType: 'financial_data'
          },
          userId: 'user456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(sendNotificationSpy).toHaveBeenCalled();
    });
  });

  describe('Brute Force Attack Incident Workflow', () => {
    test('should detect brute force attack and trigger appropriate response', async () => {
      // Setup mock data for brute force scenario
      const mockEventIds = Array.from({ length: 60 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.LOGIN_FAILURE,
              timestamp: new Date(Date.now() - (index * 1000)).toISOString(),
              details: { email: `target${index % 5}@example.com` }
            }));
          }
          return Promise.resolve(null);
        });
      });

      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.LOGIN_FAILURE,
          severity: SEVERITY_LEVELS.MEDIUM,
          details: { 
            email: 'target@example.com',
            reason: 'invalid_password'
          },
          userId: null
        })
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].type).toBe('brute_force_attack');
      expect(response.body.incidents[0].details.sourceIP).toBe('192.168.1.100');
      expect(response.body.incidents[0].details.failedAttempts).toBeGreaterThanOrEqual(50);
    });

    test('should not trigger notification for moderate brute force attacks', async () => {
      // Setup moderate brute force scenario (below notification threshold)
      const mockEventIds = Array.from({ length: 30 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.LOGIN_FAILURE,
              timestamp: new Date(Date.now() - (index * 1000)).toISOString(),
              details: { email: `target${index % 3}@example.com` }
            }));
          }
          return Promise.resolve(null);
        });
      });

      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.LOGIN_FAILURE,
          severity: SEVERITY_LEVELS.MEDIUM,
          details: { 
            email: 'target@example.com',
            reason: 'invalid_password'
          },
          userId: null
        })
        .set('X-Forwarded-For', '192.168.1.200')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents[0].details.requiresNotification).toBe(false);
    });
  });

  describe('Privilege Escalation Incident Workflow', () => {
    test('should detect privilege escalation and require immediate notification', async () => {
      // Setup privilege escalation scenario
      const mockEventIds = Array.from({ length: 8 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.PRIVILEGE_ESCALATION,
              timestamp: new Date(Date.now() - (index * 5 * 60 * 1000)).toISOString(),
              details: { targetPrivilege: 'admin' }
            }));
          }
          return Promise.resolve(null);
        });
      });

      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.PRIVILEGE_ESCALATION,
          severity: SEVERITY_LEVELS.HIGH,
          details: { 
            targetPrivilege: 'admin',
            currentPrivilege: 'user',
            method: 'role_manipulation'
          },
          userId: 'user789'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].type).toBe('privilege_escalation');
      expect(response.body.incidents[0].severity).toBe('critical');
      expect(response.body.incidents[0].details.requiresNotification).toBe(true);
    });
  });

  describe('Account Takeover Incident Workflow', () => {
    test('should detect account takeover based on suspicious login patterns', async () => {
      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
          severity: SEVERITY_LEVELS.MEDIUM,
          details: { 
            flags: ['new_device', 'new_location', 'unusual_time'],
            riskScore: 0.85,
            previousLocation: 'New York, US',
            currentLocation: 'Moscow, RU'
          },
          userId: 'user456'
        })
        .set('User-Agent', 'Unknown Browser/1.0')
        .set('X-Forwarded-For', '203.0.113.100')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].type).toBe('account_takeover');
      expect(response.body.incidents[0].severity).toBe('high');
      expect(response.body.incidents[0].details.riskScore).toBe(0.85);
      expect(response.body.incidents[0].details.requiresNotification).toBe(true);
    });

    test('should not detect account takeover with low risk score', async () => {
      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
          severity: SEVERITY_LEVELS.LOW,
          details: { 
            flags: ['new_device'],
            riskScore: 0.3
          },
          userId: 'user456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(0);
    });
  });

  describe('Data Exfiltration Incident Workflow', () => {
    test('should detect data exfiltration based on suspicious patterns', async () => {
      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.DATA_ACCESS,
          severity: SEVERITY_LEVELS.HIGH,
          details: { 
            pattern: 'bulk_download',
            dataType: 'user_records',
            accessVolume: 5000,
            downloadSize: '500MB'
          },
          userId: 'user789'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].type).toBe('data_exfiltration');
      expect(response.body.incidents[0].severity).toBe('critical');
      expect(response.body.incidents[0].details.suspiciousPattern).toBe('bulk_download');
      expect(response.body.incidents[0].details.requiresNotification).toBe(true);
    });
  });

  describe('Incident Management Workflow', () => {
    test('should retrieve incident by ID', async () => {
      const incidentId = 'test-incident-123';
      const mockIncident = {
        id: incidentId,
        type: 'data_breach',
        severity: 'high',
        status: 'investigating',
        createdAt: new Date().toISOString(),
        details: {
          userId: 'user123',
          dataAccessCount: 150
        }
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockIncident));

      const response = await request(app)
        .get(`/api/security/incidents/${incidentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incident).toEqual(mockIncident);
    });

    test('should return 404 for non-existent incident', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/security/incidents/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Incident not found');
    });

    test('should update incident status', async () => {
      const incidentId = 'test-incident-456';
      const mockIncident = {
        id: incidentId,
        type: 'brute_force_attack',
        status: 'detected',
        createdAt: new Date().toISOString()
      };

      // Add incident to active incidents
      incidentResponseService.activeIncidents.set(incidentId, mockIncident);

      const response = await request(app)
        .put(`/api/security/incidents/${incidentId}/status`)
        .send({
          status: 'contained',
          notes: 'IP address blocked and rate limits adjusted'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Incident status updated');

      // Verify incident was updated
      const updatedIncident = incidentResponseService.activeIncidents.get(incidentId);
      expect(updatedIncident.status).toBe('contained');
      expect(updatedIncident.notes).toBeDefined();
    });

    test('should retrieve incidents for date range', async () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      // Mock time-series data
      mockRedisClient.getSet.mockResolvedValue(['incident1', 'incident2']);
      
      const mockIncidents = [
        {
          id: 'incident1',
          type: 'data_breach',
          severity: 'high',
          createdAt: '2025-01-15T10:00:00Z'
        },
        {
          id: 'incident2',
          type: 'brute_force_attack',
          severity: 'medium',
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

      const response = await request(app)
        .get('/api/security/incidents')
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(2);
      expect(response.body.incidents[0].id).toBe('incident2'); // Sorted by date descending
    });

    test('should filter incidents by type', async () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

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

      const response = await request(app)
        .get('/api/security/incidents')
        .query({ startDate, endDate, type: 'data_breach' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].type).toBe('data_breach');
    });
  });

  describe('Multiple Incident Detection', () => {
    test('should detect multiple incident types from single event', async () => {
      // Setup scenario where a single event could trigger multiple incident types
      const mockEventIds = Array.from({ length: 200 }, (_, i) => `event${i}`);
      mockRedisClient.getSet.mockResolvedValue(mockEventIds);
      
      mockEventIds.forEach((eventId, index) => {
        mockRedisClient.get.mockImplementation((key) => {
          if (key === `security_event:${eventId}`) {
            return Promise.resolve(JSON.stringify({
              eventType: SECURITY_EVENTS.DATA_ACCESS,
              timestamp: new Date(Date.now() - (index * 1000)).toISOString(),
              details: { 
                recordId: `record${index}`,
                pattern: 'bulk_download' // This could trigger both data breach and exfiltration
              }
            }));
          }
          return Promise.resolve(null);
        });
      });

      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.DATA_ACCESS,
          severity: SEVERITY_LEVELS.HIGH,
          details: { 
            recordId: 'sensitive-record-789',
            pattern: 'bulk_download',
            dataType: 'personal_data',
            accessVolume: 1000
          },
          userId: 'user789'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents.length).toBeGreaterThanOrEqual(1);
      
      // Should detect both data breach and data exfiltration
      const incidentTypes = response.body.incidents.map(i => i.type);
      expect(incidentTypes).toContain('data_breach');
      expect(incidentTypes).toContain('data_exfiltration');
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      // Mock service error
      jest.spyOn(incidentResponseService, 'detectIncident')
        .mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/security/simulate-event')
        .send({
          eventType: SECURITY_EVENTS.DATA_ACCESS,
          severity: SEVERITY_LEVELS.MEDIUM,
          details: { recordId: 'test-record' },
          userId: 'user123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service unavailable');
    });

    test('should handle invalid incident status update', async () => {
      const response = await request(app)
        .put('/api/security/incidents/non-existent/status')
        .send({
          status: 'investigating',
          notes: 'Test notes'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Incident not found');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high volume of incident detection requests', async () => {
      const promises = [];
      
      // Simulate 10 concurrent incident detection requests
      for (let i = 0; i < 10; i++) {
        const promise = request(app)
          .post('/api/security/simulate-event')
          .send({
            eventType: SECURITY_EVENTS.LOGIN_FAILURE,
            severity: SEVERITY_LEVELS.MEDIUM,
            details: { email: `test${i}@example.com` },
            userId: null
          });
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});