/**
 * Unit Tests for Device Fingerprinting Service
 * Tests device information extraction, fingerprint generation, and suspicious activity detection
 */

const crypto = require('crypto');

// Mock dependencies before importing
jest.mock('../../services/security/redisService', () => ({
  isReady: jest.fn(() => true),
  getHash: jest.fn(() => Promise.resolve({})),
  setHashField: jest.fn(() => Promise.resolve(true)),
  getHashField: jest.fn(() => Promise.resolve(null)),
  setWithTTL: jest.fn(() => Promise.resolve(true)),
  get: jest.fn(() => Promise.resolve(null)),
  delete: jest.fn(() => Promise.resolve(true)),
  getSet: jest.fn(() => Promise.resolve(new Set())),
  addToSet: jest.fn(() => Promise.resolve(true)),
  storeSecurityEvent: jest.fn(() => Promise.resolve(true))
}));

jest.mock('../../services/notificationService', () => ({
  sendSuperAdminNotification: jest.fn(() => Promise.resolve(true)),
  sendAdminNotification: jest.fn(() => Promise.resolve(true))
}));

jest.mock('../../services/security/sessionService', () => ({
  invalidateAllUserSessions: jest.fn(() => Promise.resolve({
    invalidatedSessions: 2,
    blacklistedTokens: 2,
    success: true
  }))
}));

const deviceFingerprintService = require('../../services/security/deviceFingerprintService');
const redisService = require('../../services/security/redisService');
const NotificationService = require('../../services/notificationService');
const sessionService = require('../../services/security/sessionService');

describe('Device Fingerprinting Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractDeviceInfo', () => {
    it('should extract comprehensive device information from request', () => {
      const mockReq = {
        get: jest.fn((header) => {
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Connection': 'keep-alive',
            'DNT': '1',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'navigate',
            'Host': 'localhost:3000',
            'X-Forwarded-For': '192.168.1.100, 10.0.0.1',
            'X-Real-IP': '192.168.1.100'
          };
          return headers[header];
        }),
        ip: '127.0.0.1',
        method: 'POST',
        protocol: 'https',
        secure: true,
        connection: { remoteAddress: '127.0.0.1' }
      };

      const deviceInfo = deviceFingerprintService.extractDeviceInfo(mockReq);

      expect(deviceInfo).toEqual({
        ip: '192.168.1.100', // Should use X-Real-IP
        forwardedFor: '192.168.1.100, 10.0.0.1',
        realIP: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        acceptLanguage: 'en-US,en;q=0.9',
        acceptEncoding: 'gzip, deflate, br',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        connection: 'keep-alive',
        upgradeInsecureRequests: 'unknown',
        dnt: '1',
        secFetchSite: 'same-origin',
        secFetchMode: 'navigate',
        secFetchUser: 'unknown',
        secFetchDest: 'unknown',
        timestamp: expect.any(String),
        timezone: 'unknown',
        screenResolution: 'unknown',
        colorDepth: 'unknown',
        method: 'POST',
        protocol: 'https',
        secure: true,
        host: 'localhost:3000'
      });
    });

    it('should handle missing headers gracefully', () => {
      const mockReq = {
        get: jest.fn(() => null),
        ip: '127.0.0.1',
        method: 'GET',
        protocol: 'http',
        secure: false
      };

      const deviceInfo = deviceFingerprintService.extractDeviceInfo(mockReq);

      expect(deviceInfo.userAgent).toBe('unknown');
      expect(deviceInfo.acceptLanguage).toBe('unknown');
      expect(deviceInfo.ip).toBe('127.0.0.1');
      expect(deviceInfo.method).toBe('GET');
      expect(deviceInfo.protocol).toBe('http');
      expect(deviceInfo.secure).toBe(false);
    });

    it('should prioritize IP address sources correctly', () => {
      const mockReq1 = {
        get: jest.fn((header) => {
          if (header === 'X-Real-IP') return '192.168.1.100';
          if (header === 'X-Forwarded-For') return '10.0.0.1, 172.16.0.1';
          return null;
        }),
        ip: '127.0.0.1',
        method: 'GET',
        protocol: 'http',
        secure: false
      };

      const deviceInfo1 = deviceFingerprintService.extractDeviceInfo(mockReq1);
      expect(deviceInfo1.ip).toBe('192.168.1.100'); // X-Real-IP takes priority

      const mockReq2 = {
        get: jest.fn((header) => {
          if (header === 'X-Forwarded-For') return '10.0.0.1, 172.16.0.1';
          return null;
        }),
        ip: '127.0.0.1',
        method: 'GET',
        protocol: 'http',
        secure: false
      };

      const deviceInfo2 = deviceFingerprintService.extractDeviceInfo(mockReq2);
      expect(deviceInfo2.ip).toBe('10.0.0.1'); // First IP from X-Forwarded-For

      const mockReq3 = {
        get: jest.fn(() => null),
        ip: '127.0.0.1',
        method: 'GET',
        protocol: 'http',
        secure: false
      };

      const deviceInfo3 = deviceFingerprintService.extractDeviceInfo(mockReq3);
      expect(deviceInfo3.ip).toBe('127.0.0.1'); // Falls back to req.ip
    });
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate consistent fingerprint for same device info', () => {
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        acceptLanguage: 'en-US,en;q=0.9',
        acceptEncoding: 'gzip, deflate, br',
        accept: 'text/html,application/xhtml+xml',
        dnt: '1',
        timezone: 'America/New_York',
        screenResolution: '1920x1080',
        colorDepth: '24'
      };

      const fingerprint1 = deviceFingerprintService.generateDeviceFingerprint(deviceInfo);
      const fingerprint2 = deviceFingerprintService.generateDeviceFingerprint(deviceInfo);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
    });

    it('should generate different fingerprints for different device info', () => {
      const deviceInfo1 = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        acceptLanguage: 'en-US,en;q=0.9',
        acceptEncoding: 'gzip, deflate, br',
        accept: 'text/html',
        dnt: '1',
        timezone: 'America/New_York',
        screenResolution: '1920x1080',
        colorDepth: '24'
      };

      const deviceInfo2 = {
        ...deviceInfo1,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      };

      const fingerprint1 = deviceFingerprintService.generateDeviceFingerprint(deviceInfo1);
      const fingerprint2 = deviceFingerprintService.generateDeviceFingerprint(deviceInfo2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('generateNetworkFingerprint', () => {
    it('should generate consistent network fingerprint', () => {
      const deviceInfo = {
        ip: '192.168.1.100',
        connection: 'keep-alive',
        upgradeInsecureRequests: '1',
        secFetchSite: 'same-origin',
        secFetchMode: 'navigate'
      };

      const fingerprint1 = deviceFingerprintService.generateNetworkFingerprint(deviceInfo);
      const fingerprint2 = deviceFingerprintService.generateNetworkFingerprint(deviceInfo);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different fingerprints for different network info', () => {
      const deviceInfo1 = {
        ip: '192.168.1.100',
        connection: 'keep-alive',
        upgradeInsecureRequests: '1',
        secFetchSite: 'same-origin',
        secFetchMode: 'navigate'
      };

      const deviceInfo2 = {
        ...deviceInfo1,
        ip: '10.0.0.1'
      };

      const fingerprint1 = deviceFingerprintService.generateNetworkFingerprint(deviceInfo1);
      const fingerprint2 = deviceFingerprintService.generateNetworkFingerprint(deviceInfo2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('createDeviceProfile', () => {
    it('should create comprehensive device profile', () => {
      const mockReq = {
        get: jest.fn((header) => {
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          };
          return headers[header];
        }),
        ip: '127.0.0.1',
        method: 'POST',
        protocol: 'https',
        secure: true
      };

      const profile = deviceFingerprintService.createDeviceProfile(mockReq);

      expect(profile).toEqual({
        deviceInfo: expect.any(Object),
        deviceFingerprint: expect.any(String),
        networkFingerprint: expect.any(String),
        profileId: expect.any(String),
        createdAt: expect.any(String)
      });

      expect(profile.deviceFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(profile.networkFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(profile.profileId).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('trackDeviceSession', () => {
    it('should track new device session', async () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint-hash',
        networkFingerprint: 'network-fingerprint-hash',
        deviceInfo: {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 test'
        },
        createdAt: '2025-01-27T10:00:00Z'
      };

      redisService.getHash.mockResolvedValue({});

      const result = await deviceFingerprintService.trackDeviceSession(userId, sessionId, deviceProfile);

      expect(result).toEqual({
        sessionId,
        deviceFingerprint: 'device-fingerprint-hash',
        networkFingerprint: 'network-fingerprint-hash',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 test',
        firstSeen: '2025-01-27T10:00:00Z',
        lastSeen: '2025-01-27T10:00:00Z',
        sessionCount: 1,
        isActive: true
      });

      expect(redisService.setHashField).toHaveBeenCalledWith(
        'user_activity:user123:devices',
        'device-fingerprint-hash',
        expect.any(String),
        90 * 24 * 60 * 60
      );

      expect(redisService.setWithTTL).toHaveBeenCalledWith(
        'session:session456:device',
        expect.any(String),
        7 * 24 * 60 * 60
      );
    });

    it('should update existing device session count', async () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint-hash',
        networkFingerprint: 'network-fingerprint-hash',
        deviceInfo: {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 test'
        },
        createdAt: '2025-01-27T10:00:00Z'
      };

      const existingDevice = {
        firstSeen: '2025-01-26T10:00:00Z',
        sessionCount: 2
      };

      redisService.getHash.mockResolvedValue({
        'device-fingerprint-hash': JSON.stringify(existingDevice)
      });

      const result = await deviceFingerprintService.trackDeviceSession(userId, sessionId, deviceProfile);

      expect(result.firstSeen).toBe('2025-01-26T10:00:00Z');
      expect(result.sessionCount).toBe(3);
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect new device as suspicious', async () => {
      const userId = 'user123';
      const deviceProfile = {
        deviceFingerprint: 'new-device-fingerprint',
        deviceInfo: {
          ip: '8.8.8.8', // Use public IP to avoid suspicious IP flag
          userAgent: 'Mozilla/5.0 legitimate browser',
          timezone: 'America/New_York'
        }
      };

      redisService.getHash.mockResolvedValue({}); // No existing devices
      redisService.getSet.mockResolvedValue(new Set());

      const result = await deviceFingerprintService.detectSuspiciousActivity(userId, deviceProfile);

      expect(result.isSuspicious).toBe(false); // New device alone shouldn't be suspicious (score 30)
      expect(result.suspicionScore).toBe(30);
      expect(result.riskLevel).toBe('low');
      expect(result.factors).toContain('new_device');
    });

    it('should detect suspicious IP patterns', async () => {
      const userId = 'user123';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '10.0.0.1', // Private IP (suspicious for external access)
          userAgent: 'Mozilla/5.0 legitimate browser',
          timezone: 'America/New_York'
        }
      };

      redisService.getHash.mockResolvedValue({
        'existing-device': JSON.stringify({
          ip: '203.0.113.1', // Different IP
          lastSeen: new Date().toISOString()
        })
      });

      const result = await deviceFingerprintService.detectSuspiciousActivity(userId, deviceProfile);

      expect(result.isSuspicious).toBe(true);
      expect(result.factors).toContain('new_device');
      expect(result.factors).toContain('new_ip_address');
      expect(result.factors).toContain('suspicious_ip');
      expect(result.suspicionScore).toBeGreaterThanOrEqual(90); // 30 + 20 + 40
    });

    it('should detect suspicious user agents', async () => {
      const userId = 'user123';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '192.168.1.100',
          userAgent: 'python-requests/2.25.1', // Bot user agent
          timezone: 'America/New_York'
        }
      };

      redisService.getHash.mockResolvedValue({});

      const result = await deviceFingerprintService.detectSuspiciousActivity(userId, deviceProfile);

      expect(result.factors).toContain('suspicious_user_agent');
      expect(result.suspicionScore).toBeGreaterThanOrEqual(55); // 30 + 25
    });

    it('should detect rapid device switching', async () => {
      const userId = 'user123';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 legitimate browser',
          timezone: 'America/New_York'
        }
      };

      // Mock multiple recent devices
      const recentTime = new Date().toISOString();
      redisService.getHash.mockResolvedValue({
        'device1': JSON.stringify({ lastSeen: recentTime }),
        'device2': JSON.stringify({ lastSeen: recentTime }),
        'device3': JSON.stringify({ lastSeen: recentTime }),
        'device4': JSON.stringify({ lastSeen: recentTime })
      });

      const result = await deviceFingerprintService.detectSuspiciousActivity(userId, deviceProfile);

      expect(result.factors).toContain('rapid_device_switching');
      expect(result.suspicionScore).toBeGreaterThanOrEqual(65); // 30 + 35
    });

    it('should calculate correct risk levels', async () => {
      const userId = 'user123';
      
      // Test critical risk level
      const criticalProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '10.0.0.1', // Suspicious IP
          userAgent: 'curl/7.68.0', // Bot user agent
          timezone: 'America/New_York'
        }
      };

      redisService.getHash.mockResolvedValue({
        'existing-device': JSON.stringify({
          ip: '203.0.113.1',
          lastSeen: new Date().toISOString()
        })
      });

      const criticalResult = await deviceFingerprintService.detectSuspiciousActivity(userId, criticalProfile);
      expect(criticalResult.riskLevel).toBe('critical');
      expect(criticalResult.suspicionScore).toBeGreaterThanOrEqual(80);
    });

    it('should log suspicious activity events', async () => {
      const userId = 'user123';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '10.0.0.1',
          userAgent: 'curl/7.68.0',
          timezone: 'America/New_York'
        }
      };

      redisService.getHash.mockResolvedValue({});

      const result = await deviceFingerprintService.detectSuspiciousActivity(userId, deviceProfile);

      if (result.isSuspicious) {
        expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
          expect.stringMatching(/^suspicious_device_user123_\d+$/),
          expect.objectContaining({
            eventType: 'suspicious_activity',
            userId: 'user123',
            details: expect.objectContaining({
              suspicionScore: expect.any(Number),
              riskLevel: expect.any(String),
              factors: expect.any(Array)
            })
          })
        );
      }
    });
  });

  describe('isSuspiciousIP', () => {
    it('should detect private network IPs as suspicious', () => {
      expect(deviceFingerprintService.isSuspiciousIP('10.0.0.1')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousIP('192.168.1.1')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousIP('172.16.0.1')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousIP('127.0.0.1')).toBe(true);
    });

    it('should detect invalid IPs as suspicious', () => {
      expect(deviceFingerprintService.isSuspiciousIP('0.0.0.1')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousIP('169.254.1.1')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousIP('224.0.0.1')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousIP('255.255.255.255')).toBe(true);
    });

    it('should not flag legitimate public IPs as suspicious', () => {
      expect(deviceFingerprintService.isSuspiciousIP('8.8.8.8')).toBe(false);
      expect(deviceFingerprintService.isSuspiciousIP('203.0.113.1')).toBe(false);
      expect(deviceFingerprintService.isSuspiciousIP('198.51.100.1')).toBe(false);
    });
  });

  describe('isSuspiciousUserAgent', () => {
    it('should detect bot user agents as suspicious', () => {
      expect(deviceFingerprintService.isSuspiciousUserAgent('Googlebot/2.1')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousUserAgent('python-requests/2.25.1')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousUserAgent('curl/7.68.0')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousUserAgent('wget/1.20.3')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousUserAgent('PostmanRuntime/7.26.8')).toBe(true);
    });

    it('should detect missing or unknown user agents as suspicious', () => {
      expect(deviceFingerprintService.isSuspiciousUserAgent('')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousUserAgent('unknown')).toBe(true);
      expect(deviceFingerprintService.isSuspiciousUserAgent(null)).toBe(true);
      expect(deviceFingerprintService.isSuspiciousUserAgent(undefined)).toBe(true);
    });

    it('should not flag legitimate browser user agents as suspicious', () => {
      expect(deviceFingerprintService.isSuspiciousUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      )).toBe(false);
      
      expect(deviceFingerprintService.isSuspiciousUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      )).toBe(false);
    });
  });

  describe('getRecentDeviceCount', () => {
    it('should count recent devices correctly', async () => {
      const userId = 'user123';
      const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
      
      const now = new Date();
      const recentTime = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago
      const oldTime = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago

      redisService.getHash.mockResolvedValue({
        'device1': JSON.stringify({ lastSeen: recentTime }),
        'device2': JSON.stringify({ lastSeen: recentTime }),
        'device3': JSON.stringify({ lastSeen: oldTime }) // Should not be counted
      });

      const count = await deviceFingerprintService.getRecentDeviceCount(userId, timeWindow);
      expect(count).toBe(2);
    });

    it('should handle invalid device data gracefully', async () => {
      const userId = 'user123';
      const timeWindow = 24 * 60 * 60 * 1000;

      redisService.getHash.mockResolvedValue({
        'device1': 'invalid-json',
        'device2': JSON.stringify({ lastSeen: new Date().toISOString() })
      });

      const count = await deviceFingerprintService.getRecentDeviceCount(userId, timeWindow);
      expect(count).toBe(1); // Should skip invalid JSON
    });
  });

  describe('invalidateDeviceSession', () => {
    it('should invalidate device session successfully', async () => {
      const sessionId = 'session123';
      const deviceData = {
        deviceFingerprint: 'device-fingerprint',
        userId: 'user123'
      };

      redisService.get.mockResolvedValue(JSON.stringify(deviceData));
      redisService.getHashField.mockResolvedValue(JSON.stringify({
        sessionId,
        isActive: true,
        sessionCount: 1
      }));

      const result = await deviceFingerprintService.invalidateDeviceSession(sessionId);

      expect(result).toBe(true);
      expect(redisService.setHashField).toHaveBeenCalledWith(
        'user_activity:user123:devices',
        'device-fingerprint',
        expect.stringContaining('"isActive":false'),
        90 * 24 * 60 * 60
      );
      expect(redisService.delete).toHaveBeenCalledWith('session:session123:device');
    });

    it('should handle non-existent session gracefully', async () => {
      const sessionId = 'nonexistent-session';
      redisService.get.mockResolvedValue(null);

      const result = await deviceFingerprintService.invalidateDeviceSession(sessionId);
      expect(result).toBe(true);
      expect(redisService.setHashField).not.toHaveBeenCalled();
    });
  });

  describe('Service initialization and readiness', () => {
    it('should initialize successfully', async () => {
      await deviceFingerprintService.initialize();
      expect(deviceFingerprintService.isReady()).toBe(true);
    });

    it('should check readiness correctly', () => {
      redisService.isReady.mockReturnValue(true);
      expect(deviceFingerprintService.isReady()).toBe(true);

      redisService.isReady.mockReturnValue(false);
      expect(deviceFingerprintService.isReady()).toBe(false);
    });
  });

  describe('handleCriticalSuspiciousActivity', () => {
    it('should invalidate all user sessions for critical suspicious activity', async () => {
      const userId = 'user123';
      const suspicionResult = {
        suspicionScore: 95,
        riskLevel: 'critical',
        factors: ['new_device', 'suspicious_ip', 'suspicious_user_agent']
      };
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '10.0.0.1',
          userAgent: 'curl/7.68.0'
        }
      };

      const result = await deviceFingerprintService.handleCriticalSuspiciousActivity(userId, suspicionResult, deviceProfile);

      expect(sessionService.invalidateAllUserSessions).toHaveBeenCalledWith(
        userId,
        'critical_suspicious_device_activity',
        true
      );

      expect(result).toEqual({
        invalidatedSessions: 2,
        blacklistedTokens: 2,
        success: true
      });

      expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^critical_auto_invalidation_user123_\d+$/),
        expect.objectContaining({
          eventType: 'session_invalidated',
          severity: 'critical',
          userId: 'user123',
          details: expect.objectContaining({
            reason: 'automatic_invalidation_critical_suspicious_activity',
            suspicionScore: 95,
            riskLevel: 'critical',
            factors: ['new_device', 'suspicious_ip', 'suspicious_user_agent'],
            invalidatedSessions: 2,
            blacklistedTokens: '[REDACTED]' // This field gets sanitized in logging
          })
        })
      );
    });

    it('should handle session invalidation errors gracefully', async () => {
      const userId = 'user123';
      const suspicionResult = {
        suspicionScore: 95,
        riskLevel: 'critical',
        factors: ['new_device']
      };
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: { ip: '10.0.0.1', userAgent: 'curl/7.68.0' }
      };

      sessionService.invalidateAllUserSessions.mockRejectedValue(new Error('Session invalidation failed'));

      await expect(deviceFingerprintService.handleCriticalSuspiciousActivity(userId, suspicionResult, deviceProfile))
        .rejects.toThrow('Session invalidation failed');
    });
  });

  describe('sendSuspiciousActivityAlert', () => {
    it('should send alerts to super admins for critical risk level', async () => {
      const userId = 'user123';
      const suspicionResult = {
        suspicionScore: 95,
        riskLevel: 'critical',
        factors: ['new_device', 'suspicious_ip']
      };
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '10.0.0.1',
          userAgent: 'curl/7.68.0'
        }
      };

      const result = await deviceFingerprintService.sendSuspiciousActivityAlert(userId, suspicionResult, deviceProfile);

      expect(result).toBe(true);
      
      expect(NotificationService.sendSuperAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('🔴 Suspicious device activity detected for user user123'),
        'critical',
        null
      );

      expect(NotificationService.sendAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('🔴 Suspicious device activity detected for user user123'),
        'critical',
        null
      );

      expect(redisService.storeSecurityEvent).toHaveBeenCalledWith(
        expect.stringMatching(/^suspicious_alert_user123_\d+$/),
        expect.objectContaining({
          eventType: 'suspicious_activity_alert_sent',
          severity: 'critical',
          userId: 'user123'
        })
      );
    });

    it('should send alerts to super admins for high risk level', async () => {
      const userId = 'user123';
      const suspicionResult = {
        suspicionScore: 75,
        riskLevel: 'high',
        factors: ['new_device', 'new_ip_address']
      };
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '8.8.8.8',
          userAgent: 'Mozilla/5.0 legitimate browser'
        }
      };

      const result = await deviceFingerprintService.sendSuspiciousActivityAlert(userId, suspicionResult, deviceProfile);

      expect(result).toBe(true);
      
      expect(NotificationService.sendSuperAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Suspicious device activity detected for user user123'),
        'high',
        null
      );

      expect(NotificationService.sendAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Suspicious device activity detected for user user123'),
        'high',
        null
      );
    });

    it('should send alerts only to admins for medium risk level', async () => {
      const userId = 'user123';
      const suspicionResult = {
        suspicionScore: 50,
        riskLevel: 'medium',
        factors: ['new_device']
      };
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '8.8.8.8',
          userAgent: 'Mozilla/5.0 legitimate browser'
        }
      };

      const result = await deviceFingerprintService.sendSuspiciousActivityAlert(userId, suspicionResult, deviceProfile);

      expect(result).toBe(true);
      
      expect(NotificationService.sendSuperAdminNotification).not.toHaveBeenCalled();
      
      expect(NotificationService.sendAdminNotification).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Suspicious device activity detected for user user123'),
        'medium',
        null
      );
    });

    it('should not send alerts for low risk level', async () => {
      const userId = 'user123';
      const suspicionResult = {
        suspicionScore: 30,
        riskLevel: 'low',
        factors: ['new_device']
      };
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '8.8.8.8',
          userAgent: 'Mozilla/5.0 legitimate browser'
        }
      };

      const result = await deviceFingerprintService.sendSuspiciousActivityAlert(userId, suspicionResult, deviceProfile);

      expect(result).toBe(true);
      
      expect(NotificationService.sendSuperAdminNotification).not.toHaveBeenCalled();
      expect(NotificationService.sendAdminNotification).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      const userId = 'user123';
      const suspicionResult = {
        suspicionScore: 95,
        riskLevel: 'critical',
        factors: ['new_device']
      };
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: { ip: '10.0.0.1', userAgent: 'curl/7.68.0' }
      };

      NotificationService.sendSuperAdminNotification.mockRejectedValue(new Error('Notification failed'));

      const result = await deviceFingerprintService.sendSuspiciousActivityAlert(userId, suspicionResult, deviceProfile);

      expect(result).toBe(false); // Should return false but not throw
    });
  });

  describe('Automatic session invalidation integration', () => {
    beforeEach(() => {
      // Reset mocks before each test in this describe block
      sessionService.invalidateAllUserSessions.mockResolvedValue({
        invalidatedSessions: 2,
        blacklistedTokens: 2,
        success: true
      });
    });

    it('should automatically invalidate sessions for critical suspicious activity', async () => {
      const userId = 'user123';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '10.0.0.1', // Suspicious IP
          userAgent: 'curl/7.68.0', // Bot user agent
          timezone: 'America/New_York'
        }
      };

      redisService.getHash.mockResolvedValue({});

      const result = await deviceFingerprintService.detectSuspiciousActivity(userId, deviceProfile);

      // Should detect as critical and trigger automatic session invalidation
      expect(result.riskLevel).toBe('critical');
      expect(sessionService.invalidateAllUserSessions).toHaveBeenCalledWith(
        userId,
        'critical_suspicious_device_activity',
        true
      );
    });

    it('should send alerts for suspicious activity', async () => {
      const userId = 'user123';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: {
          ip: '8.8.8.8',
          userAgent: 'python-requests/2.25.1', // Bot user agent
          timezone: 'America/New_York'
        }
      };

      redisService.getHash.mockResolvedValue({});

      const result = await deviceFingerprintService.detectSuspiciousActivity(userId, deviceProfile);

      // Should detect as suspicious and send alerts
      expect(result.isSuspicious).toBe(true);
      expect(NotificationService.sendAdminNotification).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle Redis errors gracefully in trackDeviceSession', async () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        networkFingerprint: 'network-fingerprint',
        deviceInfo: { ip: '192.168.1.100', userAgent: 'test' },
        createdAt: '2025-01-27T10:00:00Z'
      };

      redisService.getHash.mockRejectedValue(new Error('Redis connection failed'));

      await expect(deviceFingerprintService.trackDeviceSession(userId, sessionId, deviceProfile))
        .rejects.toThrow('Redis connection failed');
    });

    it('should handle Redis errors gracefully in detectSuspiciousActivity', async () => {
      const userId = 'user123';
      const deviceProfile = {
        deviceFingerprint: 'device-fingerprint',
        deviceInfo: { ip: '192.168.1.100', userAgent: 'test', timezone: 'UTC' }
      };

      redisService.getHash.mockRejectedValue(new Error('Redis connection failed'));

      await expect(deviceFingerprintService.detectSuspiciousActivity(userId, deviceProfile))
        .rejects.toThrow('Redis connection failed');
    });
  });
});