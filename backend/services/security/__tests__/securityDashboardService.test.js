/**
 * Unit tests for Security Dashboard Service
 */

const securityDashboardService = require('../securityDashboardService');
const securityMonitorService = require('../securityMonitorService');
const auditTrailService = require('../auditTrailService');
const redisService = require('../redisService');
const configService = require('../configService');

// Mock dependencies
jest.mock('../securityMonitorService');
jest.mock('../auditTrailService');
jest.mock('../redisService');
jest.mock('../configService');

describe('SecurityDashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock config service
    configService.isInitialized = true;
    configService.initialize = jest.fn().mockResolvedValue();
    configService.getMonitoringConfig = jest.fn().mockReturnValue({
      alertThresholds: {
        failedLogins: 5,
        suspiciousActivity: 3
      },
      cacheTimeout: 300000
    });

    // Mock redis service
    redisService.isReady = jest.fn().mockReturnValue(true);
    redisService.setWithTTL = jest.fn().mockResolvedValue();
    redisService.addToSet = jest.fn().mockResolvedValue();

    // Reset service state
    securityDashboardService.isInitialized = false;
    securityDashboardService.metricsCache = new Map();
  });

  describe('initialize', () => {
    it('should initialize successfully with default config', async () => {
      await securityDashboardService.initialize();

      expect(securityDashboardService.isInitialized).toBe(true);
      expect(configService.initialize).toHaveBeenCalled();
      expect(configService.getMonitoringConfig).toHaveBeenCalled();
    });

    it('should initialize with custom config', async () => {
      const customConfig = { cacheTimeout: 600000 };
      
      await securityDashboardService.initialize(customConfig);

      expect(securityDashboardService.isInitialized).toBe(true);
      expect(securityDashboardService.cacheTimeout).toBe(600000);
    });

    it('should handle initialization errors', async () => {
      configService.initialize.mockRejectedValue(new Error('Config error'));

      await expect(securityDashboardService.initialize()).rejects.toThrow('Config error');
    });
  });

  describe('getSecurityOverview', () => {
    beforeEach(async () => {
      await securityDashboardService.initialize();
    });

    it('should return security overview for 24h timeframe', async () => {
      const mockEvents = [
        {
          eventType: 'login_failure',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          userId: 'user1'
        }
      ];
      const mockAlerts = [
        {
          severity: 'high',
          timestamp: new Date().toISOString(),
          type: 'brute_force'
        }
      ];

      securityMonitorService.getSecurityEvents.mockResolvedValue(mockEvents);
      securityMonitorService.getSecurityAlerts.mockResolvedValue(mockAlerts);

      const overview = await securityDashboardService.getSecurityOverview('24h');

      expect(overview).toHaveProperty('timeframe', '24h');
      expect(overview).toHaveProperty('summary');
      expect(overview.summary.totalEvents).toBe(1);
      expect(overview.summary.totalAlerts).toBe(1);
      expect(overview.summary.highAlerts).toBe(1);
    });

    it('should use cached results when available', async () => {
      const cachedData = {
        timeframe: '24h',
        summary: { totalEvents: 5, totalAlerts: 2 }
      };

      securityDashboardService.metricsCache.set('security_overview_24h', {
        data: cachedData,
        timestamp: Date.now()
      });

      const overview = await securityDashboardService.getSecurityOverview('24h');

      expect(overview).toEqual(cachedData);
      expect(securityMonitorService.getSecurityEvents).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      securityMonitorService.getSecurityEvents.mockRejectedValue(new Error('Database error'));

      await expect(securityDashboardService.getSecurityOverview('24h')).rejects.toThrow('Database error');
    });
  });

  describe('getDetailedMetrics', () => {
    beforeEach(async () => {
      await securityDashboardService.initialize();
    });

    it('should return event metrics', async () => {
      const mockEvents = [
        {
          eventType: 'login_failure',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          userId: 'user1',
          deviceInfo: { ip: '192.168.1.1' }
        }
      ];

      securityMonitorService.getSecurityEvents.mockResolvedValue(mockEvents);

      const metrics = await securityDashboardService.getDetailedMetrics('events', '24h');

      expect(metrics).toHaveProperty('totalEvents', 1);
      expect(metrics).toHaveProperty('eventsByType');
      expect(metrics).toHaveProperty('eventsBySeverity');
      expect(metrics).toHaveProperty('topUsers');
      expect(metrics).toHaveProperty('topIPs');
    });

    it('should return alert metrics', async () => {
      const mockAlerts = [
        {
          severity: 'high',
          timestamp: new Date().toISOString(),
          type: 'brute_force'
        }
      ];

      securityMonitorService.getSecurityAlerts.mockResolvedValue(mockAlerts);

      const metrics = await securityDashboardService.getDetailedMetrics('alerts', '24h');

      expect(metrics).toHaveProperty('totalAlerts', 1);
      expect(metrics).toHaveProperty('alertsByType');
      expect(metrics).toHaveProperty('alertsBySeverity');
    });

    it('should return user metrics', async () => {
      const mockEvents = [
        {
          eventType: 'login_success',
          severity: 'low',
          timestamp: new Date().toISOString(),
          userId: 'user1'
        },
        {
          eventType: 'suspicious_activity',
          severity: 'high',
          timestamp: new Date().toISOString(),
          userId: 'user1'
        }
      ];

      securityMonitorService.getSecurityEvents.mockResolvedValue(mockEvents);

      const metrics = await securityDashboardService.getDetailedMetrics('users', '24h');

      expect(metrics).toHaveProperty('totalUsers', 1);
      expect(metrics).toHaveProperty('activeUsers', 1);
      expect(metrics).toHaveProperty('suspiciousUsers', 1);
      expect(metrics).toHaveProperty('topActiveUsers');
    });

    it('should return IP metrics', async () => {
      const mockEvents = [
        {
          eventType: 'login_failure',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          deviceInfo: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' }
        }
      ];

      securityMonitorService.getSecurityEvents.mockResolvedValue(mockEvents);

      const metrics = await securityDashboardService.getDetailedMetrics('ips', '24h');

      expect(metrics).toHaveProperty('totalIPs', 1);
      expect(metrics).toHaveProperty('topActiveIPs');
      expect(metrics.topActiveIPs[0]).toHaveProperty('ip', '192.168.1.1');
    });

    it('should return audit metrics', async () => {
      const mockAuditEntries = [
        {
          eventType: 'data_access',
          severity: 'low',
          timestamp: new Date().toISOString(),
          userId: 'user1'
        }
      ];

      auditTrailService.getAuditEntries.mockResolvedValue(mockAuditEntries);
      auditTrailService.verifyAuditTrailIntegrity.mockResolvedValue({ valid: true });

      const metrics = await securityDashboardService.getDetailedMetrics('audit', '24h');

      expect(metrics).toHaveProperty('totalEntries', 1);
      expect(metrics).toHaveProperty('entriesByType');
      expect(metrics).toHaveProperty('integrityStatus');
    });

    it('should throw error for unknown metric type', async () => {
      await expect(
        securityDashboardService.getDetailedMetrics('unknown', '24h')
      ).rejects.toThrow('Unknown metric type: unknown');
    });
  });

  describe('generateScheduledReport', () => {
    beforeEach(async () => {
      await securityDashboardService.initialize();
    });

    it('should generate daily report', async () => {
      const mockOverview = {
        timeframe: '24h',
        summary: { totalEvents: 10, totalAlerts: 2 }
      };

      securityMonitorService.getSecurityEvents.mockResolvedValue([]);
      securityMonitorService.getSecurityAlerts.mockResolvedValue([]);

      // Mock the getSecurityOverview method
      jest.spyOn(securityDashboardService, 'getSecurityOverview').mockResolvedValue(mockOverview);
      jest.spyOn(securityDashboardService, 'getDetailedMetrics').mockResolvedValue({});

      const report = await securityDashboardService.generateScheduledReport('daily');

      expect(report).toHaveProperty('reportType', 'daily');
      expect(report).toHaveProperty('timeframe', '24h');
      expect(report).toHaveProperty('overview');
      expect(report).toHaveProperty('detailedMetrics');
      expect(report).toHaveProperty('recommendations');
      expect(redisService.setWithTTL).toHaveBeenCalled();
    });

    it('should generate weekly report', async () => {
      securityMonitorService.getSecurityEvents.mockResolvedValue([]);
      securityMonitorService.getSecurityAlerts.mockResolvedValue([]);

      jest.spyOn(securityDashboardService, 'getSecurityOverview').mockResolvedValue({});
      jest.spyOn(securityDashboardService, 'getDetailedMetrics').mockResolvedValue({});

      const report = await securityDashboardService.generateScheduledReport('weekly');

      expect(report).toHaveProperty('reportType', 'weekly');
      expect(report).toHaveProperty('timeframe', '7d');
    });

    it('should handle report generation errors', async () => {
      jest.spyOn(securityDashboardService, 'getSecurityOverview').mockRejectedValue(new Error('Overview error'));

      await expect(
        securityDashboardService.generateScheduledReport('daily')
      ).rejects.toThrow('Overview error');
    });
  });

  describe('scheduleReport', () => {
    it('should schedule a report successfully', () => {
      const scheduleId = securityDashboardService.scheduleReport('daily', '0 0 * * *');

      expect(scheduleId).toBeDefined();
      expect(securityDashboardService.reportSchedules.has(scheduleId)).toBe(true);
    });

    it('should handle scheduling errors', () => {
      // Mock console.error to avoid test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Force an error by passing invalid parameters
      const result = securityDashboardService.scheduleReport(null, null);

      expect(result).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('getRealTimeStatus', () => {
    beforeEach(async () => {
      await securityDashboardService.initialize();
    });

    it('should return real-time security status', async () => {
      const mockEvents = [];
      const mockAlerts = [];

      securityMonitorService.getSecurityEvents.mockResolvedValue(mockEvents);
      securityMonitorService.getSecurityAlerts.mockResolvedValue(mockAlerts);

      const status = await securityDashboardService.getRealTimeStatus();

      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('recentActivity');
      expect(status).toHaveProperty('systemHealth');
      expect(status).toHaveProperty('activeThreats');
    });

    it('should handle real-time status errors', async () => {
      securityMonitorService.getSecurityEvents.mockRejectedValue(new Error('Status error'));

      await expect(securityDashboardService.getRealTimeStatus()).rejects.toThrow('Status error');
    });
  });

  describe('helper methods', () => {
    describe('getTimeRange', () => {
      it('should return correct time range for 1h', () => {
        const { startDate, endDate } = securityDashboardService.getTimeRange('1h');
        const diff = endDate.getTime() - startDate.getTime();
        expect(diff).toBe(60 * 60 * 1000); // 1 hour
      });

      it('should return correct time range for 24h', () => {
        const { startDate, endDate } = securityDashboardService.getTimeRange('24h');
        const diff = endDate.getTime() - startDate.getTime();
        expect(diff).toBe(24 * 60 * 60 * 1000); // 24 hours
      });

      it('should return correct time range for 7d', () => {
        const { startDate, endDate } = securityDashboardService.getTimeRange('7d');
        const diff = endDate.getTime() - startDate.getTime();
        expect(diff).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      });

      it('should default to 24h for unknown timeframe', () => {
        const { startDate, endDate } = securityDashboardService.getTimeRange('unknown');
        const diff = endDate.getTime() - startDate.getTime();
        expect(diff).toBe(24 * 60 * 60 * 1000); // 24 hours
      });
    });

    describe('calculateEventBreakdown', () => {
      it('should calculate event breakdown correctly', () => {
        const events = [
          { eventType: 'login_failure' },
          { eventType: 'login_failure' },
          { eventType: 'login_success' }
        ];

        const breakdown = securityDashboardService.calculateEventBreakdown(events);

        expect(breakdown).toEqual({
          login_failure: 2,
          login_success: 1
        });
      });
    });

    describe('groupBy', () => {
      it('should group array by property correctly', () => {
        const array = [
          { type: 'A', value: 1 },
          { type: 'B', value: 2 },
          { type: 'A', value: 3 }
        ];

        const grouped = securityDashboardService.groupBy(array, 'type');

        expect(grouped).toEqual({
          A: 2,
          B: 1
        });
      });
    });

    describe('calculateThreatScore', () => {
      it('should calculate threat score for critical event', () => {
        const event = {
          severity: 'critical',
          eventType: 'privilege_escalation'
        };

        const score = securityDashboardService.calculateThreatScore(event);

        expect(score).toBe(90); // 50 (critical) + 40 (privilege_escalation)
      });

      it('should calculate threat score for low severity event', () => {
        const event = {
          severity: 'low',
          eventType: 'login_failure'
        };

        const score = securityDashboardService.calculateThreatScore(event);

        expect(score).toBe(15); // 5 (low) + 10 (login_failure)
      });
    });
  });

  describe('system health', () => {
    beforeEach(async () => {
      await securityDashboardService.initialize();
    });

    it('should return system health metrics', async () => {
      securityMonitorService.getHealthStatus = jest.fn().mockReturnValue({ status: 'healthy' });
      auditTrailService.getHealthStatus = jest.fn().mockReturnValue({ status: 'healthy' });

      const health = await securityDashboardService.getSystemHealthMetrics();

      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('performance');
      expect(health).toHaveProperty('timestamp');
      expect(health.services.redis.connected).toBe(true);
    });

    it('should handle health check errors', async () => {
      securityMonitorService.getHealthStatus = jest.fn().mockImplementation(() => {
        throw new Error('Health check error');
      });

      const health = await securityDashboardService.getSystemHealthMetrics();

      expect(health).toHaveProperty('error');
      expect(health.error).toBe('Health check error');
    });
  });
});