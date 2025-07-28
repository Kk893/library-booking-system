/**
 * Security Dashboard Service
 * Provides security metrics collection, aggregation, and reporting endpoints
 */

const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS,
  TIMEOUTS 
} = require('./utils/constants');
const { 
  generateCorrelationId, 
  sanitizeForLogging
} = require('./utils/securityHelpers');
const redisService = require('./redisService');
const configService = require('./configService');
const securityMonitorService = require('./securityMonitorService');
const auditTrailService = require('./auditTrailService');

class SecurityDashboardService {
  constructor() {
    this.isInitialized = false;
    this.config = null;
    this.metricsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.reportSchedules = new Map();
  }

  /**
   * Initialize the security dashboard service
   * @param {Object} customConfig - Optional custom configuration
   */
  async initialize(customConfig = {}) {
    try {
      if (!configService.isInitialized) {
        await configService.initialize();
      }
      
      this.config = configService.getMonitoringConfig();
      
      // Override with custom configuration
      if (customConfig.cacheTimeout) {
        this.cacheTimeout = customConfig.cacheTimeout;
      }

      this.isInitialized = true;
      console.log('Security dashboard service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize security dashboard service:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get security metrics overview
   * @param {string} timeframe - Time frame for metrics ('1h', '24h', '7d', '30d')
   * @returns {Object} Security metrics overview
   */
  async getSecurityOverview(timeframe = '24h') {
    try {
      const cacheKey = `security_overview_${timeframe}`;
      
      // Check cache first
      if (this.metricsCache.has(cacheKey)) {
        const cached = this.metricsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const { startDate, endDate } = this.getTimeRange(timeframe);
      
      // Get security events and alerts
      const [securityEvents, securityAlerts] = await Promise.all([
        securityMonitorService.getSecurityEvents(startDate, endDate),
        securityMonitorService.getSecurityAlerts(startDate, endDate)
      ]);

      // Calculate metrics
      const overview = {
        timeframe,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        summary: {
          totalEvents: securityEvents.length,
          totalAlerts: securityAlerts.length,
          criticalAlerts: securityAlerts.filter(a => a.severity === SEVERITY_LEVELS.CRITICAL).length,
          highAlerts: securityAlerts.filter(a => a.severity === SEVERITY_LEVELS.HIGH).length,
          mediumAlerts: securityAlerts.filter(a => a.severity === SEVERITY_LEVELS.MEDIUM).length,
          lowAlerts: securityAlerts.filter(a => a.severity === SEVERITY_LEVELS.LOW).length
        },
        eventBreakdown: this.calculateEventBreakdown(securityEvents),
        alertTrends: this.calculateAlertTrends(securityAlerts, timeframe),
        topThreats: this.identifyTopThreats(securityEvents, securityAlerts),
        systemHealth: await this.getSystemHealthMetrics(),
        generatedAt: new Date().toISOString()
      };

      // Cache the result
      this.metricsCache.set(cacheKey, {
        data: overview,
        timestamp: Date.now()
      });

      return overview;
    } catch (error) {
      console.error('Failed to get security overview:', sanitizeForLogging({ 
        timeframe, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get detailed security metrics
   * @param {string} metricType - Type of metric ('events', 'alerts', 'users', 'ips')
   * @param {string} timeframe - Time frame for metrics
   * @param {Object} filters - Additional filters
   * @returns {Object} Detailed security metrics
   */
  async getDetailedMetrics(metricType, timeframe = '24h', filters = {}) {
    try {
      const { startDate, endDate } = this.getTimeRange(timeframe);
      
      switch (metricType) {
        case 'events':
          return await this.getEventMetrics(startDate, endDate, filters);
        case 'alerts':
          return await this.getAlertMetrics(startDate, endDate, filters);
        case 'users':
          return await this.getUserMetrics(startDate, endDate, filters);
        case 'ips':
          return await this.getIPMetrics(startDate, endDate, filters);
        case 'audit':
          return await this.getAuditMetrics(startDate, endDate, filters);
        default:
          throw new Error(`Unknown metric type: ${metricType}`);
      }
    } catch (error) {
      console.error('Failed to get detailed metrics:', sanitizeForLogging({ 
        metricType, 
        timeframe, 
        filters, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get event metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Filters
   * @returns {Object} Event metrics
   */
  async getEventMetrics(startDate, endDate, filters = {}) {
    try {
      const events = await securityMonitorService.getSecurityEvents(
        startDate, endDate, filters.eventType
      );

      const metrics = {
        totalEvents: events.length,
        eventsByType: this.groupBy(events, 'eventType'),
        eventsBySeverity: this.groupBy(events, 'severity'),
        eventsByHour: this.groupEventsByTimeInterval(events, 'hour'),
        eventsByDay: this.groupEventsByTimeInterval(events, 'day'),
        topUsers: this.getTopUsers(events),
        topIPs: this.getTopIPs(events),
        recentEvents: events.slice(0, 50) // Latest 50 events
      };

      return metrics;
    } catch (error) {
      console.error('Failed to get event metrics:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get alert metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Filters
   * @returns {Object} Alert metrics
   */
  async getAlertMetrics(startDate, endDate, filters = {}) {
    try {
      const alerts = await securityMonitorService.getSecurityAlerts(startDate, endDate);

      const filteredAlerts = filters.severity 
        ? alerts.filter(a => a.severity === filters.severity)
        : alerts;

      const metrics = {
        totalAlerts: filteredAlerts.length,
        alertsByType: this.groupBy(filteredAlerts, 'type'),
        alertsBySeverity: this.groupBy(filteredAlerts, 'severity'),
        alertsByHour: this.groupEventsByTimeInterval(filteredAlerts, 'hour'),
        alertsByDay: this.groupEventsByTimeInterval(filteredAlerts, 'day'),
        alertResolutionTime: this.calculateAlertResolutionTime(filteredAlerts),
        recentAlerts: filteredAlerts.slice(0, 20) // Latest 20 alerts
      };

      return metrics;
    } catch (error) {
      console.error('Failed to get alert metrics:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get user activity metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Filters
   * @returns {Object} User metrics
   */
  async getUserMetrics(startDate, endDate, filters = {}) {
    try {
      const events = await securityMonitorService.getSecurityEvents(startDate, endDate);
      const userEvents = events.filter(e => e.userId);

      const userActivity = {};
      userEvents.forEach(event => {
        if (!userActivity[event.userId]) {
          userActivity[event.userId] = {
            totalEvents: 0,
            eventTypes: {},
            severityBreakdown: {},
            firstSeen: event.timestamp,
            lastSeen: event.timestamp,
            suspiciousActivity: 0
          };
        }

        const user = userActivity[event.userId];
        user.totalEvents++;
        user.eventTypes[event.eventType] = (user.eventTypes[event.eventType] || 0) + 1;
        user.severityBreakdown[event.severity] = (user.severityBreakdown[event.severity] || 0) + 1;
        
        if (new Date(event.timestamp) < new Date(user.firstSeen)) {
          user.firstSeen = event.timestamp;
        }
        if (new Date(event.timestamp) > new Date(user.lastSeen)) {
          user.lastSeen = event.timestamp;
        }

        if (event.eventType === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY) {
          user.suspiciousActivity++;
        }
      });

      const metrics = {
        totalUsers: Object.keys(userActivity).length,
        activeUsers: Object.keys(userActivity).filter(userId => 
          userActivity[userId].totalEvents > 0
        ).length,
        suspiciousUsers: Object.keys(userActivity).filter(userId => 
          userActivity[userId].suspiciousActivity > 0
        ).length,
        topActiveUsers: Object.entries(userActivity)
          .sort(([,a], [,b]) => b.totalEvents - a.totalEvents)
          .slice(0, 10)
          .map(([userId, data]) => ({ userId, ...data })),
        userActivity
      };

      return metrics;
    } catch (error) {
      console.error('Failed to get user metrics:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get IP address metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Filters
   * @returns {Object} IP metrics
   */
  async getIPMetrics(startDate, endDate, filters = {}) {
    try {
      const events = await securityMonitorService.getSecurityEvents(startDate, endDate);
      const ipEvents = events.filter(e => e.deviceInfo && e.deviceInfo.ip);

      const ipActivity = {};
      ipEvents.forEach(event => {
        const ip = event.deviceInfo.ip;
        if (!ipActivity[ip]) {
          ipActivity[ip] = {
            totalEvents: 0,
            eventTypes: {},
            severityBreakdown: {},
            firstSeen: event.timestamp,
            lastSeen: event.timestamp,
            suspiciousActivity: 0,
            userAgents: new Set()
          };
        }

        const ipData = ipActivity[ip];
        ipData.totalEvents++;
        ipData.eventTypes[event.eventType] = (ipData.eventTypes[event.eventType] || 0) + 1;
        ipData.severityBreakdown[event.severity] = (ipData.severityBreakdown[event.severity] || 0) + 1;
        
        if (new Date(event.timestamp) < new Date(ipData.firstSeen)) {
          ipData.firstSeen = event.timestamp;
        }
        if (new Date(event.timestamp) > new Date(ipData.lastSeen)) {
          ipData.lastSeen = event.timestamp;
        }

        if (event.eventType === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY) {
          ipData.suspiciousActivity++;
        }

        if (event.deviceInfo.userAgent) {
          ipData.userAgents.add(event.deviceInfo.userAgent);
        }
      });

      // Convert Sets to arrays for JSON serialization
      Object.values(ipActivity).forEach(ipData => {
        ipData.userAgents = Array.from(ipData.userAgents);
      });

      const metrics = {
        totalIPs: Object.keys(ipActivity).length,
        suspiciousIPs: Object.keys(ipActivity).filter(ip => 
          ipActivity[ip].suspiciousActivity > 0
        ).length,
        topActiveIPs: Object.entries(ipActivity)
          .sort(([,a], [,b]) => b.totalEvents - a.totalEvents)
          .slice(0, 10)
          .map(([ip, data]) => ({ ip, ...data })),
        ipActivity
      };

      return metrics;
    } catch (error) {
      console.error('Failed to get IP metrics:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get audit trail metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Filters
   * @returns {Object} Audit metrics
   */
  async getAuditMetrics(startDate, endDate, filters = {}) {
    try {
      const auditEntries = await auditTrailService.getAuditEntries(
        startDate, endDate, filters.eventType, filters.userId
      );

      const integrityCheck = await auditTrailService.verifyAuditTrailIntegrity(
        startDate, endDate
      );

      const metrics = {
        totalEntries: auditEntries.length,
        entriesByType: this.groupBy(auditEntries, 'eventType'),
        entriesBySeverity: this.groupBy(auditEntries, 'severity'),
        entriesByDay: this.groupEventsByTimeInterval(auditEntries, 'day'),
        integrityStatus: integrityCheck,
        recentEntries: auditEntries.slice(0, 50) // Latest 50 entries
      };

      return metrics;
    } catch (error) {
      console.error('Failed to get audit metrics:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Generate scheduled security report
   * @param {string} reportType - Type of report ('daily', 'weekly', 'monthly')
   * @param {Object} options - Report options
   * @returns {Object} Generated report
   */
  async generateScheduledReport(reportType, options = {}) {
    try {
      const reportId = generateCorrelationId();
      const timeframe = this.getReportTimeframe(reportType);
      
      const report = {
        reportId,
        reportType,
        generatedAt: new Date().toISOString(),
        timeframe,
        overview: await this.getSecurityOverview(timeframe),
        detailedMetrics: {
          events: await this.getDetailedMetrics('events', timeframe),
          alerts: await this.getDetailedMetrics('alerts', timeframe),
          users: await this.getDetailedMetrics('users', timeframe),
          ips: await this.getDetailedMetrics('ips', timeframe),
          audit: await this.getDetailedMetrics('audit', timeframe)
        },
        recommendations: this.generateSecurityRecommendations(
          await this.getSecurityOverview(timeframe)
        ),
        metadata: {
          version: '1.0.0',
          generator: 'security-dashboard-service'
        }
      };

      // Store report for future reference
      await this.storeReport(report);

      return report;
    } catch (error) {
      console.error('Failed to generate scheduled report:', sanitizeForLogging({ 
        reportType, 
        options, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Schedule automated report generation
   * @param {string} reportType - Type of report
   * @param {string} schedule - Cron-like schedule
   * @param {Object} options - Report options
   * @returns {string} Schedule ID
   */
  scheduleReport(reportType, schedule, options = {}) {
    try {
      const scheduleId = generateCorrelationId();
      
      this.reportSchedules.set(scheduleId, {
        reportType,
        schedule,
        options,
        createdAt: new Date().toISOString(),
        lastRun: null,
        nextRun: this.calculateNextRun(schedule)
      });

      console.log('Report scheduled successfully:', sanitizeForLogging({ 
        scheduleId, 
        reportType, 
        schedule 
      }));

      return scheduleId;
    } catch (error) {
      console.error('Failed to schedule report:', sanitizeForLogging({ 
        reportType, 
        schedule, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get real-time security status
   * @returns {Object} Real-time security status
   */
  async getRealTimeStatus() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [recentEvents, recentAlerts, systemHealth] = await Promise.all([
        securityMonitorService.getSecurityEvents(oneHourAgo, now),
        securityMonitorService.getSecurityAlerts(oneHourAgo, now),
        this.getSystemHealthMetrics()
      ]);

      const status = {
        timestamp: now.toISOString(),
        status: this.calculateOverallStatus(recentEvents, recentAlerts, systemHealth),
        recentActivity: {
          events: recentEvents.length,
          alerts: recentAlerts.length,
          criticalAlerts: recentAlerts.filter(a => a.severity === SEVERITY_LEVELS.CRITICAL).length
        },
        systemHealth,
        activeThreats: this.identifyActiveThreats(recentEvents, recentAlerts),
        lastUpdated: now.toISOString()
      };

      return status;
    } catch (error) {
      console.error('Failed to get real-time status:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Helper method to get time range based on timeframe
   * @param {string} timeframe - Timeframe string
   * @returns {Object} Start and end dates
   */
  getTimeRange(timeframe) {
    const endDate = new Date();
    let startDate;

    switch (timeframe) {
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * Calculate event breakdown by type
   * @param {Array} events - Security events
   * @returns {Object} Event breakdown
   */
  calculateEventBreakdown(events) {
    const breakdown = {};
    events.forEach(event => {
      breakdown[event.eventType] = (breakdown[event.eventType] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Calculate alert trends
   * @param {Array} alerts - Security alerts
   * @param {string} timeframe - Timeframe
   * @returns {Object} Alert trends
   */
  calculateAlertTrends(alerts, timeframe) {
    const trends = {
      total: alerts.length,
      byHour: {},
      byDay: {},
      bySeverity: {}
    };

    alerts.forEach(alert => {
      const date = new Date(alert.timestamp);
      const hour = date.getHours();
      const day = date.toISOString().split('T')[0];

      trends.byHour[hour] = (trends.byHour[hour] || 0) + 1;
      trends.byDay[day] = (trends.byDay[day] || 0) + 1;
      trends.bySeverity[alert.severity] = (trends.bySeverity[alert.severity] || 0) + 1;
    });

    return trends;
  }

  /**
   * Identify top threats
   * @param {Array} events - Security events
   * @param {Array} alerts - Security alerts
   * @returns {Array} Top threats
   */
  identifyTopThreats(events, alerts) {
    const threats = {};

    // Analyze events for threat patterns
    events.forEach(event => {
      if (event.eventType === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY ||
          event.eventType === SECURITY_EVENTS.LOGIN_FAILURE ||
          event.eventType === SECURITY_EVENTS.PRIVILEGE_ESCALATION) {
        
        const key = event.deviceInfo?.ip || event.userId || 'unknown';
        if (!threats[key]) {
          threats[key] = {
            identifier: key,
            type: event.deviceInfo?.ip ? 'ip' : 'user',
            threatScore: 0,
            events: [],
            lastActivity: event.timestamp
          };
        }
        
        threats[key].events.push(event);
        threats[key].threatScore += this.calculateThreatScore(event);
        
        if (new Date(event.timestamp) > new Date(threats[key].lastActivity)) {
          threats[key].lastActivity = event.timestamp;
        }
      }
    });

    // Include critical alerts as threats
    alerts.forEach(alert => {
      if (alert.severity === SEVERITY_LEVELS.CRITICAL) {
        const key = `alert_${alert.type}`;
        if (!threats[key]) {
          threats[key] = {
            identifier: key,
            type: 'alert',
            threatScore: 100,
            events: [],
            lastActivity: alert.timestamp
          };
        }
        threats[key].threatScore += 50;
      }
    });

    return Object.values(threats)
      .sort((a, b) => b.threatScore - a.threatScore)
      .slice(0, 10);
  }

  /**
   * Calculate threat score for an event
   * @param {Object} event - Security event
   * @returns {number} Threat score
   */
  calculateThreatScore(event) {
    let score = 0;

    switch (event.severity) {
      case SEVERITY_LEVELS.CRITICAL:
        score += 50;
        break;
      case SEVERITY_LEVELS.HIGH:
        score += 30;
        break;
      case SEVERITY_LEVELS.MEDIUM:
        score += 15;
        break;
      case SEVERITY_LEVELS.LOW:
        score += 5;
        break;
    }

    switch (event.eventType) {
      case SECURITY_EVENTS.PRIVILEGE_ESCALATION:
        score += 40;
        break;
      case SECURITY_EVENTS.SUSPICIOUS_ACTIVITY:
        score += 25;
        break;
      case SECURITY_EVENTS.LOGIN_FAILURE:
        score += 10;
        break;
    }

    return score;
  }

  /**
   * Get system health metrics
   * @returns {Object} System health metrics
   */
  async getSystemHealthMetrics() {
    try {
      const health = {
        services: {
          securityMonitor: securityMonitorService.getHealthStatus(),
          auditTrail: auditTrailService.getHealthStatus(),
          redis: { connected: redisService.isReady() },
          config: { loaded: configService.isInitialized }
        },
        performance: {
          cacheHitRate: this.calculateCacheHitRate(),
          averageResponseTime: this.calculateAverageResponseTime(),
          memoryUsage: process.memoryUsage()
        },
        timestamp: new Date().toISOString()
      };

      return health;
    } catch (error) {
      console.error('Failed to get system health metrics:', sanitizeForLogging({ 
        error: error.message 
      }));
      return {
        services: {},
        performance: {},
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Group array by property
   * @param {Array} array - Array to group
   * @param {string} property - Property to group by
   * @returns {Object} Grouped object
   */
  groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property];
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Group events by time interval
   * @param {Array} events - Events to group
   * @param {string} interval - Time interval ('hour', 'day')
   * @returns {Object} Grouped events
   */
  groupEventsByTimeInterval(events, interval) {
    const groups = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      let key;
      
      if (interval === 'hour') {
        key = `${date.toISOString().split('T')[0]}_${date.getHours()}`;
      } else if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      }
      
      groups[key] = (groups[key] || 0) + 1;
    });
    
    return groups;
  }

  /**
   * Get top users from events
   * @param {Array} events - Security events
   * @returns {Array} Top users
   */
  getTopUsers(events) {
    const userCounts = {};
    events.forEach(event => {
      if (event.userId) {
        userCounts[event.userId] = (userCounts[event.userId] || 0) + 1;
      }
    });

    return Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, eventCount: count }));
  }

  /**
   * Get top IPs from events
   * @param {Array} events - Security events
   * @returns {Array} Top IPs
   */
  getTopIPs(events) {
    const ipCounts = {};
    events.forEach(event => {
      if (event.deviceInfo?.ip) {
        ipCounts[event.deviceInfo.ip] = (ipCounts[event.deviceInfo.ip] || 0) + 1;
      }
    });

    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, eventCount: count }));
  }

  /**
   * Calculate alert resolution time
   * @param {Array} alerts - Security alerts
   * @returns {Object} Resolution time metrics
   */
  calculateAlertResolutionTime(alerts) {
    const resolvedAlerts = alerts.filter(a => a.resolvedAt);
    
    if (resolvedAlerts.length === 0) {
      return { average: 0, median: 0, total: alerts.length, resolved: 0 };
    }

    const resolutionTimes = resolvedAlerts.map(alert => {
      return new Date(alert.resolvedAt) - new Date(alert.timestamp);
    });

    const average = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
    const sorted = resolutionTimes.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      average: Math.round(average / 1000 / 60), // minutes
      median: Math.round(median / 1000 / 60), // minutes
      total: alerts.length,
      resolved: resolvedAlerts.length
    };
  }

  /**
   * Generate security recommendations
   * @param {Object} overview - Security overview
   * @returns {Array} Security recommendations
   */
  generateSecurityRecommendations(overview) {
    const recommendations = [];

    // Check for high alert volume
    if (overview.summary.criticalAlerts > 5) {
      recommendations.push({
        priority: 'high',
        category: 'alerts',
        title: 'High Critical Alert Volume',
        description: `${overview.summary.criticalAlerts} critical alerts detected. Immediate investigation required.`,
        action: 'Review and investigate all critical alerts immediately'
      });
    }

    // Check for suspicious activity patterns
    if (overview.eventBreakdown[SECURITY_EVENTS.SUSPICIOUS_ACTIVITY] > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'threats',
        title: 'Elevated Suspicious Activity',
        description: 'Unusual patterns of suspicious activity detected.',
        action: 'Review user access patterns and implement additional monitoring'
      });
    }

    // Check for failed login attempts
    if (overview.eventBreakdown[SECURITY_EVENTS.LOGIN_FAILURE] > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'authentication',
        title: 'High Failed Login Attempts',
        description: 'Elevated number of failed login attempts may indicate brute force attacks.',
        action: 'Consider implementing additional rate limiting or CAPTCHA verification'
      });
    }

    // System health recommendations
    if (!overview.systemHealth.services.redis.connected) {
      recommendations.push({
        priority: 'high',
        category: 'infrastructure',
        title: 'Redis Connection Issue',
        description: 'Redis service is not connected, affecting security monitoring capabilities.',
        action: 'Check Redis service status and connection configuration'
      });
    }

    return recommendations;
  }

  /**
   * Store report for future reference
   * @param {Object} report - Report to store
   */
  async storeReport(report) {
    try {
      const reportKey = `security_report:${report.reportId}`;
      const ttl = 90 * 24 * 60 * 60; // 90 days
      
      await redisService.setWithTTL(reportKey, JSON.stringify(report), ttl);

      // Store in time-series for listing
      const dateKey = new Date().toISOString().split('T')[0];
      const timeSeriesKey = `security_reports:${dateKey}`;
      await redisService.addToSet(timeSeriesKey, report.reportId, ttl);

    } catch (error) {
      console.error('Failed to store report:', sanitizeForLogging({ 
        reportId: report.reportId,
        error: error.message 
      }));
    }
  }

  /**
   * Get report timeframe based on report type
   * @param {string} reportType - Report type
   * @returns {string} Timeframe
   */
  getReportTimeframe(reportType) {
    switch (reportType) {
      case 'daily':
        return '24h';
      case 'weekly':
        return '7d';
      case 'monthly':
        return '30d';
      default:
        return '24h';
    }
  }

  /**
   * Calculate next run time for scheduled report
   * @param {string} schedule - Schedule string
   * @returns {string} Next run time
   */
  calculateNextRun(schedule) {
    // Simple implementation - in production, use a proper cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
    return nextRun.toISOString();
  }

  /**
   * Calculate overall security status
   * @param {Array} events - Recent events
   * @param {Array} alerts - Recent alerts
   * @param {Object} systemHealth - System health
   * @returns {string} Overall status
   */
  calculateOverallStatus(events, alerts, systemHealth) {
    const criticalAlerts = alerts.filter(a => a.severity === SEVERITY_LEVELS.CRITICAL).length;
    const highAlerts = alerts.filter(a => a.severity === SEVERITY_LEVELS.HIGH).length;

    if (criticalAlerts > 0 || !systemHealth.services.redis.connected) {
      return 'critical';
    }
    
    if (highAlerts > 3 || events.length > 100) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Identify active threats
   * @param {Array} events - Recent events
   * @param {Array} alerts - Recent alerts
   * @returns {Array} Active threats
   */
  identifyActiveThreats(events, alerts) {
    const threats = [];

    // Check for ongoing brute force attacks
    const failedLogins = events.filter(e => e.eventType === SECURITY_EVENTS.LOGIN_FAILURE);
    if (failedLogins.length > 10) {
      threats.push({
        type: 'brute_force',
        severity: 'high',
        description: `${failedLogins.length} failed login attempts in the last hour`,
        affectedResources: [...new Set(failedLogins.map(e => e.deviceInfo?.ip).filter(Boolean))]
      });
    }

    // Check for privilege escalation attempts
    const privilegeEscalations = events.filter(e => e.eventType === SECURITY_EVENTS.PRIVILEGE_ESCALATION);
    if (privilegeEscalations.length > 0) {
      threats.push({
        type: 'privilege_escalation',
        severity: 'critical',
        description: `${privilegeEscalations.length} privilege escalation attempts detected`,
        affectedResources: [...new Set(privilegeEscalations.map(e => e.userId).filter(Boolean))]
      });
    }

    return threats;
  }

  /**
   * Calculate cache hit rate
   * @returns {number} Cache hit rate percentage
   */
  calculateCacheHitRate() {
    // Simple implementation - in production, track actual cache hits/misses
    return Math.random() * 20 + 80; // 80-100%
  }

  /**
   * Calculate average response time
   * @returns {number} Average response time in milliseconds
   */
  calculateAverageResponseTime() {
    // Simple implementation - in production, track actual response times
    return Math.random() * 100 + 50; // 50-150ms
  }

  /**
   * Get service health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      cacheSize: this.metricsCache.size,
      scheduledReports: this.reportSchedules.size,
      configLoaded: !!this.config,
    };
  }
}

// Export singleton instance
module.exports = new SecurityDashboardService();