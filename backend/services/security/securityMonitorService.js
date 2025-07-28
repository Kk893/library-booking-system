/**
 * Security Monitoring Service
 * Handles security event logging, anomaly detection, and real-time alerting
 */

const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS, 
  ERROR_CODES,
  TIMEOUTS 
} = require('./utils/constants');
const { 
  formatSecurityEvent, 
  generateCorrelationId, 
  sanitizeForLogging,
  extractDeviceInfo,
  isValidIP
} = require('./utils/securityHelpers');
const redisService = require('./redisService');
const configService = require('./configService');

class SecurityMonitorService {
  constructor() {
    this.isInitialized = false;
    this.config = null;
    this.alertThresholds = {
      failedLogins: { count: 5, windowMs: 15 * 60 * 1000 }, // 5 failures in 15 minutes
      suspiciousActivity: { count: 10, windowMs: 60 * 60 * 1000 }, // 10 events in 1 hour
      privilegeEscalation: { count: 3, windowMs: 30 * 60 * 1000 }, // 3 attempts in 30 minutes
      dataAccess: { count: 100, windowMs: 60 * 60 * 1000 }, // 100 accesses in 1 hour
    };
    this.anomalyPatterns = new Map();
  }

  /**
   * Initialize the security monitoring service
   * @param {Object} customConfig - Optional custom configuration
   */
  async initialize(customConfig = {}) {
    try {
      if (!configService.isInitialized) {
        await configService.initialize();
      }
      
      this.config = configService.getMonitoringConfig();
      
      // Override with custom configuration
      if (customConfig.alertThresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...customConfig.alertThresholds };
      }

      this.isInitialized = true;
      console.log('Security monitoring service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize security monitoring service:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Log a security event with structured logging
   * @param {string} eventType - Type of security event
   * @param {string} severity - Event severity level
   * @param {Object} details - Event details
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   * @returns {Object} Logged event with correlation ID
   */
  async logSecurityEvent(eventType, severity, details, userId = null, req = null) {
    try {
      // Validate inputs
      if (!Object.values(SECURITY_EVENTS).includes(eventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }
      
      if (!Object.values(SEVERITY_LEVELS).includes(severity)) {
        throw new Error(`Invalid severity level: ${severity}`);
      }

      // Extract device and request information if available
      const deviceInfo = req ? extractDeviceInfo(req) : {};
      const correlationId = generateCorrelationId();

      // Create structured security event
      const securityEvent = {
        ...formatSecurityEvent(eventType, severity, details, userId),
        correlationId,
        deviceInfo,
        metadata: {
          service: 'security-monitor',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        }
      };

      // Store event in Redis for real-time processing
      await this.storeSecurityEvent(securityEvent);

      // Log to console with appropriate level
      this.logToConsole(securityEvent);

      // Check for anomalies and trigger alerts if necessary
      await this.checkForAnomalies(securityEvent);

      // Send to external SIEM if configured
      await this.sendToSIEM(securityEvent);

      return securityEvent;
    } catch (error) {
      console.error('Failed to log security event:', sanitizeForLogging({ 
        eventType, 
        severity, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Store security event in Redis for processing
   * @param {Object} securityEvent - Security event object
   */
  async storeSecurityEvent(securityEvent) {
    try {
      const eventKey = `security_event:${securityEvent.correlationId}`;
      const ttl = Math.floor(TIMEOUTS.SECURITY_EVENT_TTL / 1000);
      
      await redisService.setWithTTL(eventKey, JSON.stringify(securityEvent), ttl);

      // Also store in time-series format for analytics
      const timeSeriesKey = `security_events:${securityEvent.eventType}:${new Date().toISOString().split('T')[0]}`;
      await redisService.addToSet(timeSeriesKey, securityEvent.correlationId, ttl);

      // Store user-specific events for behavioral analysis
      if (securityEvent.userId) {
        const userEventKey = `user_events:${securityEvent.userId}`;
        await redisService.addToSet(userEventKey, securityEvent.correlationId, ttl);
      }

      // Store IP-specific events for reputation tracking
      if (securityEvent.deviceInfo.ip && isValidIP(securityEvent.deviceInfo.ip)) {
        const ipEventKey = `ip_events:${securityEvent.deviceInfo.ip}`;
        await redisService.addToSet(ipEventKey, securityEvent.correlationId, ttl);
      }
    } catch (error) {
      console.error('Failed to store security event in Redis:', sanitizeForLogging({ 
        correlationId: securityEvent.correlationId,
        error: error.message 
      }));
      // Don't throw here to avoid breaking the main logging flow
    }
  }

  /**
   * Log security event to console with appropriate formatting
   * @param {Object} securityEvent - Security event object
   */
  logToConsole(securityEvent) {
    const logLevel = this.config?.logLevel || 'info';
    const logMessage = {
      timestamp: securityEvent.timestamp,
      level: securityEvent.severity.toUpperCase(),
      event: securityEvent.eventType,
      correlationId: securityEvent.correlationId,
      userId: securityEvent.userId,
      ip: securityEvent.deviceInfo.ip,
      details: securityEvent.details,
    };

    // Log based on severity and configured log level
    switch (securityEvent.severity) {
      case SEVERITY_LEVELS.CRITICAL:
        console.error('🚨 CRITICAL SECURITY EVENT:', JSON.stringify(logMessage, null, 2));
        break;
      case SEVERITY_LEVELS.HIGH:
        console.warn('⚠️  HIGH SECURITY EVENT:', JSON.stringify(logMessage, null, 2));
        break;
      case SEVERITY_LEVELS.MEDIUM:
        if (['info', 'debug'].includes(logLevel)) {
          console.warn('⚡ MEDIUM SECURITY EVENT:', JSON.stringify(logMessage, null, 2));
        }
        break;
      case SEVERITY_LEVELS.LOW:
        if (logLevel === 'debug') {
          console.info('ℹ️  LOW SECURITY EVENT:', JSON.stringify(logMessage, null, 2));
        }
        break;
      default:
        console.log('📊 SECURITY EVENT:', JSON.stringify(logMessage, null, 2));
    }
  }

  /**
   * Check for anomalous behavior patterns
   * @param {Object} securityEvent - Security event to analyze
   */
  async checkForAnomalies(securityEvent) {
    try {
      const anomalies = [];

      // Check for rapid failed login attempts
      if (securityEvent.eventType === SECURITY_EVENTS.LOGIN_FAILURE) {
        const failedLoginAnomaly = await this.detectFailedLoginAnomaly(securityEvent);
        if (failedLoginAnomaly) {
          anomalies.push(failedLoginAnomaly);
        }
      }

      // Check for privilege escalation attempts
      if (securityEvent.eventType === SECURITY_EVENTS.PRIVILEGE_ESCALATION) {
        const privilegeAnomaly = await this.detectPrivilegeEscalationAnomaly(securityEvent);
        if (privilegeAnomaly) {
          anomalies.push(privilegeAnomaly);
        }
      }

      // Check for suspicious activity patterns
      if (securityEvent.eventType === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY) {
        const suspiciousAnomaly = await this.detectSuspiciousActivityAnomaly(securityEvent);
        if (suspiciousAnomaly) {
          anomalies.push(suspiciousAnomaly);
        }
      }

      // Check for unusual data access patterns
      if (securityEvent.eventType === SECURITY_EVENTS.DATA_ACCESS) {
        const dataAccessAnomaly = await this.detectDataAccessAnomaly(securityEvent);
        if (dataAccessAnomaly) {
          anomalies.push(dataAccessAnomaly);
        }
      }

      // Trigger alerts for detected anomalies
      for (const anomaly of anomalies) {
        await this.triggerAlert(anomaly.type, anomaly.details);
      }

    } catch (error) {
      console.error('Failed to check for anomalies:', sanitizeForLogging({ 
        correlationId: securityEvent.correlationId,
        error: error.message 
      }));
    }
  }

  /**
   * Detect failed login anomalies
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Anomaly details or null
   */
  async detectFailedLoginAnomaly(securityEvent) {
    try {
      const threshold = this.alertThresholds.failedLogins;
      const windowStart = Date.now() - threshold.windowMs;
      
      // Count failed login attempts from this IP in the time window
      const ipEventKey = `ip_events:${securityEvent.deviceInfo.ip}`;
      const recentEvents = await redisService.getSet(ipEventKey);
      
      let failedLoginCount = 0;
      for (const eventId of recentEvents) {
        const eventData = await redisService.get(`security_event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.eventType === SECURITY_EVENTS.LOGIN_FAILURE && 
              new Date(event.timestamp).getTime() > windowStart) {
            failedLoginCount++;
          }
        }
      }

      if (failedLoginCount >= threshold.count) {
        return {
          type: 'brute_force_attack',
          details: {
            ip: securityEvent.deviceInfo.ip,
            failedAttempts: failedLoginCount,
            timeWindow: threshold.windowMs,
            severity: SEVERITY_LEVELS.HIGH,
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect failed login anomaly:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect privilege escalation anomalies
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Anomaly details or null
   */
  async detectPrivilegeEscalationAnomaly(securityEvent) {
    try {
      const threshold = this.alertThresholds.privilegeEscalation;
      const windowStart = Date.now() - threshold.windowMs;
      
      if (!securityEvent.userId) return null;

      // Count privilege escalation attempts from this user in the time window
      const userEventKey = `user_events:${securityEvent.userId}`;
      const recentEvents = await redisService.getSet(userEventKey);
      
      let escalationCount = 0;
      for (const eventId of recentEvents) {
        const eventData = await redisService.get(`security_event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.eventType === SECURITY_EVENTS.PRIVILEGE_ESCALATION && 
              new Date(event.timestamp).getTime() > windowStart) {
            escalationCount++;
          }
        }
      }

      if (escalationCount >= threshold.count) {
        return {
          type: 'privilege_escalation_attack',
          details: {
            userId: securityEvent.userId,
            attempts: escalationCount,
            timeWindow: threshold.windowMs,
            severity: SEVERITY_LEVELS.CRITICAL,
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect privilege escalation anomaly:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect suspicious activity anomalies
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Anomaly details or null
   */
  async detectSuspiciousActivityAnomaly(securityEvent) {
    try {
      const threshold = this.alertThresholds.suspiciousActivity;
      const windowStart = Date.now() - threshold.windowMs;
      
      // Count suspicious activities from this IP in the time window
      const ipEventKey = `ip_events:${securityEvent.deviceInfo.ip}`;
      const recentEvents = await redisService.getSet(ipEventKey);
      
      let suspiciousCount = 0;
      for (const eventId of recentEvents) {
        const eventData = await redisService.get(`security_event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.eventType === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY && 
              new Date(event.timestamp).getTime() > windowStart) {
            suspiciousCount++;
          }
        }
      }

      if (suspiciousCount >= threshold.count) {
        return {
          type: 'suspicious_activity_pattern',
          details: {
            ip: securityEvent.deviceInfo.ip,
            suspiciousEvents: suspiciousCount,
            timeWindow: threshold.windowMs,
            severity: SEVERITY_LEVELS.HIGH,
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect suspicious activity anomaly:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect data access anomalies
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Anomaly details or null
   */
  async detectDataAccessAnomaly(securityEvent) {
    try {
      const threshold = this.alertThresholds.dataAccess;
      const windowStart = Date.now() - threshold.windowMs;
      
      if (!securityEvent.userId) return null;

      // Count data access events from this user in the time window
      const userEventKey = `user_events:${securityEvent.userId}`;
      const recentEvents = await redisService.getSet(userEventKey);
      
      let accessCount = 0;
      for (const eventId of recentEvents) {
        const eventData = await redisService.get(`security_event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.eventType === SECURITY_EVENTS.DATA_ACCESS && 
              new Date(event.timestamp).getTime() > windowStart) {
            accessCount++;
          }
        }
      }

      if (accessCount >= threshold.count) {
        return {
          type: 'data_exfiltration_attempt',
          details: {
            userId: securityEvent.userId,
            accessCount: accessCount,
            timeWindow: threshold.windowMs,
            severity: SEVERITY_LEVELS.CRITICAL,
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect data access anomaly:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Trigger security alert
   * @param {string} alertType - Type of alert
   * @param {Object} alertDetails - Alert details
   */
  async triggerAlert(alertType, alertDetails) {
    try {
      const alert = {
        type: alertType,
        severity: alertDetails.severity,
        details: alertDetails,
        timestamp: new Date().toISOString(),
        correlationId: generateCorrelationId(),
      };

      // Log critical alert
      console.error('🚨 SECURITY ALERT TRIGGERED:', JSON.stringify(alert, null, 2));

      // Send webhook notification if configured
      if (this.config?.alertWebhookUrl) {
        await this.sendWebhookAlert(alert);
      }

      // Store alert for dashboard
      await this.storeAlert(alert);

      return alert;
    } catch (error) {
      console.error('Failed to trigger security alert:', sanitizeForLogging({ 
        alertType, 
        error: error.message 
      }));
    }
  }

  /**
   * Send alert via webhook
   * @param {Object} alert - Alert object
   */
  async sendWebhookAlert(alert) {
    try {
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = url.parse(this.config.alertWebhookUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const postData = JSON.stringify({
        text: `🚨 Security Alert: ${alert.type}`,
        attachments: [{
          color: alert.severity === SEVERITY_LEVELS.CRITICAL ? 'danger' : 'warning',
          fields: [
            {
              title: 'Alert Type',
              value: alert.type,
              short: true,
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Timestamp',
              value: alert.timestamp,
              short: true,
            },
            {
              title: 'Details',
              value: JSON.stringify(alert.details, null, 2),
              short: false,
            },
          ],
        }],
      });

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 5000,
      };

      await new Promise((resolve, reject) => {
        const req = client.request(options, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Webhook request failed: ${res.statusCode} ${res.statusMessage}`));
          }
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Webhook request timeout')));
        req.write(postData);
        req.end();
      });

      console.log('Security alert sent via webhook successfully');
    } catch (error) {
      console.error('Failed to send webhook alert:', sanitizeForLogging({ 
        error: error.message 
      }));
    }
  }

  /**
   * Store alert for dashboard and reporting
   * @param {Object} alert - Alert object
   */
  async storeAlert(alert) {
    try {
      const alertKey = `security_alert:${alert.correlationId}`;
      const ttl = Math.floor(TIMEOUTS.SECURITY_EVENT_TTL / 1000);
      
      await redisService.setWithTTL(alertKey, JSON.stringify(alert), ttl);

      // Store in time-series for dashboard
      const alertTimeSeriesKey = `security_alerts:${new Date().toISOString().split('T')[0]}`;
      await redisService.addToSet(alertTimeSeriesKey, alert.correlationId, ttl);
    } catch (error) {
      console.error('Failed to store security alert:', sanitizeForLogging({ 
        correlationId: alert.correlationId,
        error: error.message 
      }));
    }
  }

  /**
   * Send security event to external SIEM
   * @param {Object} securityEvent - Security event
   */
  async sendToSIEM(securityEvent) {
    try {
      if (!this.config?.siemEndpoint) {
        return; // SIEM not configured
      }

      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = url.parse(this.config.siemEndpoint);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const postData = JSON.stringify(securityEvent);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SIEM_API_KEY || ''}`,
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 5000,
      };

      await new Promise((resolve, reject) => {
        const req = client.request(options, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`SIEM request failed: ${res.statusCode} ${res.statusMessage}`));
          }
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('SIEM request timeout')));
        req.write(postData);
        req.end();
      });

      console.log('Security event sent to SIEM successfully');
    } catch (error) {
      console.error('Failed to send event to SIEM:', sanitizeForLogging({ 
        correlationId: securityEvent.correlationId,
        error: error.message 
      }));
    }
  }

  /**
   * Get security events for a specific time range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} eventType - Optional event type filter
   * @returns {Array} Array of security events
   */
  async getSecurityEvents(startDate, endDate, eventType = null) {
    try {
      const events = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Generate date range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        
        if (eventType) {
          const timeSeriesKey = `security_events:${eventType}:${dateKey}`;
          const eventIds = await redisService.getSet(timeSeriesKey);
          
          for (const eventId of eventIds) {
            const eventData = await redisService.get(`security_event:${eventId}`);
            if (eventData) {
              const event = JSON.parse(eventData);
              const eventTime = new Date(event.timestamp);
              if (eventTime >= start && eventTime <= end) {
                events.push(event);
              }
            }
          }
        } else {
          // Get all event types for this date
          for (const type of Object.values(SECURITY_EVENTS)) {
            const timeSeriesKey = `security_events:${type}:${dateKey}`;
            const eventIds = await redisService.getSet(timeSeriesKey);
            
            for (const eventId of eventIds) {
              const eventData = await redisService.get(`security_event:${eventId}`);
              if (eventData) {
                const event = JSON.parse(eventData);
                const eventTime = new Date(event.timestamp);
                if (eventTime >= start && eventTime <= end) {
                  events.push(event);
                }
              }
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Sort by timestamp
      return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Failed to get security events:', sanitizeForLogging({ 
        startDate, 
        endDate, 
        eventType, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get security alerts for a specific time range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Array of security alerts
   */
  async getSecurityAlerts(startDate, endDate) {
    try {
      const alerts = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Generate date range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const alertTimeSeriesKey = `security_alerts:${dateKey}`;
        const alertIds = await redisService.getSet(alertTimeSeriesKey);
        
        for (const alertId of alertIds) {
          const alertData = await redisService.get(`security_alert:${alertId}`);
          if (alertData) {
            const alert = JSON.parse(alertData);
            const alertTime = new Date(alert.timestamp);
            if (alertTime >= start && alertTime <= end) {
              alerts.push(alert);
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Sort by timestamp
      return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Failed to get security alerts:', sanitizeForLogging({ 
        startDate, 
        endDate, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Update alert thresholds
   * @param {Object} newThresholds - New threshold configuration
   */
  updateAlertThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    console.log('Alert thresholds updated:', sanitizeForLogging(this.alertThresholds));
  }

  /**
   * Get current alert thresholds
   * @returns {Object} Current alert thresholds
   */
  getAlertThresholds() {
    return { ...this.alertThresholds };
  }

  /**
   * Get recent security events for a user
   * @param {string} userId - User ID
   * @param {string} eventType - Type of event to filter by
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {Promise<Array>} Array of recent events
   */
  async getRecentEvents(userId, eventType, timeWindowMs = 24 * 60 * 60 * 1000) {
    try {
      const key = `security_events:${userId}:${eventType}`;
      const cutoffTime = Date.now() - timeWindowMs;
      
      // Get events from Redis
      const events = await redisService.getClient().zrangebyscore(
        key,
        cutoffTime,
        '+inf',
        'WITHSCORES'
      );
      
      // Parse events
      const recentEvents = [];
      for (let i = 0; i < events.length; i += 2) {
        try {
          const eventData = JSON.parse(events[i]);
          const timestamp = parseInt(events[i + 1]);
          recentEvents.push({
            ...eventData,
            timestamp: new Date(timestamp)
          });
        } catch (parseError) {
          console.error('Error parsing security event:', parseError);
        }
      }
      
      return recentEvents;
    } catch (error) {
      console.error('Error getting recent events:', error);
      return [];
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      redisConnected: redisService.isReady(),
      configLoaded: !!this.config,
      alertThresholds: this.alertThresholds,
    };
  }
}

// Export singleton instance
module.exports = new SecurityMonitorService();