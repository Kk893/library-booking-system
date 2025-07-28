/**
 * Incident Response Service
 * Handles security incident detection, classification, and automated breach notification workflows
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
const securityMonitorService = require('./securityMonitorService');
const auditTrailService = require('./auditTrailService');

// Incident types and classifications
const INCIDENT_TYPES = {
  DATA_BREACH: 'data_breach',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  BRUTE_FORCE_ATTACK: 'brute_force_attack',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  MALWARE_DETECTION: 'malware_detection',
  DDoS_ATTACK: 'ddos_attack',
  INSIDER_THREAT: 'insider_threat',
  SYSTEM_COMPROMISE: 'system_compromise',
  DATA_EXFILTRATION: 'data_exfiltration',
  ACCOUNT_TAKEOVER: 'account_takeover'
};

const INCIDENT_STATUS = {
  DETECTED: 'detected',
  INVESTIGATING: 'investigating',
  CONTAINED: 'contained',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

const BREACH_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Notification channels
const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  WEBHOOK: 'webhook',
  SLACK: 'slack',
  TEAMS: 'teams'
};

class IncidentResponseService {
  constructor() {
    this.isInitialized = false;
    this.config = null;
    this.activeIncidents = new Map();
    this.incidentHandlers = new Map();
    this.notificationChannels = new Map();
    this.breachThresholds = {
      // Define what constitutes a breach requiring notification
      dataAccess: { 
        recordCount: 100, 
        timeWindowMs: 60 * 60 * 1000, // 1 hour
        severity: BREACH_SEVERITY.HIGH 
      },
      failedLogins: { 
        attemptCount: 50, 
        timeWindowMs: 15 * 60 * 1000, // 15 minutes
        severity: BREACH_SEVERITY.MEDIUM 
      },
      privilegeEscalation: { 
        attemptCount: 5, 
        timeWindowMs: 30 * 60 * 1000, // 30 minutes
        severity: BREACH_SEVERITY.CRITICAL 
      },
      suspiciousActivity: { 
        eventCount: 25, 
        timeWindowMs: 60 * 60 * 1000, // 1 hour
        severity: BREACH_SEVERITY.HIGH 
      }
    };
  }

  /**
   * Initialize the incident response service
   * @param {Object} customConfig - Optional custom configuration
   */
  async initialize(customConfig = {}) {
    try {
      if (!configService.isInitialized) {
        await configService.initialize();
      }
      
      this.config = configService.getIncidentResponseConfig();
      
      // Override with custom configuration
      if (customConfig.breachThresholds) {
        this.breachThresholds = { ...this.breachThresholds, ...customConfig.breachThresholds };
      }

      // Initialize notification channels
      await this.initializeNotificationChannels();

      // Register incident handlers
      this.registerIncidentHandlers();

      this.isInitialized = true;
      console.log('Incident response service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize incident response service:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Initialize notification channels
   */
  async initializeNotificationChannels() {
    try {
      // Email notification channel
      if (this.config?.email?.enabled) {
        this.notificationChannels.set(NOTIFICATION_CHANNELS.EMAIL, {
          type: NOTIFICATION_CHANNELS.EMAIL,
          config: this.config.email,
          send: this.sendEmailNotification.bind(this)
        });
      }

      // SMS notification channel
      if (this.config?.sms?.enabled) {
        this.notificationChannels.set(NOTIFICATION_CHANNELS.SMS, {
          type: NOTIFICATION_CHANNELS.SMS,
          config: this.config.sms,
          send: this.sendSMSNotification.bind(this)
        });
      }

      // Webhook notification channel
      if (this.config?.webhook?.enabled) {
        this.notificationChannels.set(NOTIFICATION_CHANNELS.WEBHOOK, {
          type: NOTIFICATION_CHANNELS.WEBHOOK,
          config: this.config.webhook,
          send: this.sendWebhookNotification.bind(this)
        });
      }

      // Slack notification channel
      if (this.config?.slack?.enabled) {
        this.notificationChannels.set(NOTIFICATION_CHANNELS.SLACK, {
          type: NOTIFICATION_CHANNELS.SLACK,
          config: this.config.slack,
          send: this.sendSlackNotification.bind(this)
        });
      }

      console.log(`Initialized ${this.notificationChannels.size} notification channels`);
    } catch (error) {
      console.error('Failed to initialize notification channels:', sanitizeForLogging({ 
        error: error.message 
      }));
    }
  }

  /**
   * Register incident handlers for different incident types
   */
  registerIncidentHandlers() {
    this.incidentHandlers.set(INCIDENT_TYPES.DATA_BREACH, this.handleDataBreach.bind(this));
    this.incidentHandlers.set(INCIDENT_TYPES.UNAUTHORIZED_ACCESS, this.handleUnauthorizedAccess.bind(this));
    this.incidentHandlers.set(INCIDENT_TYPES.BRUTE_FORCE_ATTACK, this.handleBruteForceAttack.bind(this));
    this.incidentHandlers.set(INCIDENT_TYPES.PRIVILEGE_ESCALATION, this.handlePrivilegeEscalation.bind(this));
    this.incidentHandlers.set(INCIDENT_TYPES.DDoS_ATTACK, this.handleDDoSAttack.bind(this));
    this.incidentHandlers.set(INCIDENT_TYPES.DATA_EXFILTRATION, this.handleDataExfiltration.bind(this));
    this.incidentHandlers.set(INCIDENT_TYPES.ACCOUNT_TAKEOVER, this.handleAccountTakeover.bind(this));
    this.incidentHandlers.set(INCIDENT_TYPES.SYSTEM_COMPROMISE, this.handleSystemCompromise.bind(this));
  }

  /**
   * Detect and classify security incidents from security events
   * @param {Object} securityEvent - Security event to analyze
   * @returns {Object|null} Incident details or null if no incident detected
   */
  async detectIncident(securityEvent) {
    try {
      const incidents = [];

      // Check for data breach indicators
      const dataBreachIncident = await this.detectDataBreach(securityEvent);
      if (dataBreachIncident) {
        incidents.push(dataBreachIncident);
      }

      // Check for brute force attack
      const bruteForceIncident = await this.detectBruteForceAttack(securityEvent);
      if (bruteForceIncident) {
        incidents.push(bruteForceIncident);
      }

      // Check for privilege escalation
      const privilegeEscalationIncident = await this.detectPrivilegeEscalation(securityEvent);
      if (privilegeEscalationIncident) {
        incidents.push(privilegeEscalationIncident);
      }

      // Check for data exfiltration
      const dataExfiltrationIncident = await this.detectDataExfiltration(securityEvent);
      if (dataExfiltrationIncident) {
        incidents.push(dataExfiltrationIncident);
      }

      // Check for account takeover
      const accountTakeoverIncident = await this.detectAccountTakeover(securityEvent);
      if (accountTakeoverIncident) {
        incidents.push(accountTakeoverIncident);
      }

      // Process detected incidents
      for (const incident of incidents) {
        await this.processIncident(incident);
      }

      return incidents.length > 0 ? incidents : null;
    } catch (error) {
      console.error('Failed to detect incident:', sanitizeForLogging({ 
        correlationId: securityEvent.correlationId,
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect data breach incidents
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Incident details or null
   */
  async detectDataBreach(securityEvent) {
    try {
      if (securityEvent.eventType !== SECURITY_EVENTS.DATA_ACCESS) {
        return null;
      }

      const threshold = this.breachThresholds.dataAccess;
      const windowStart = Date.now() - threshold.timeWindowMs;
      
      // Count data access events in the time window
      const userEventKey = `user_events:${securityEvent.userId}`;
      const recentEvents = await redisService.getSet(userEventKey);
      
      let dataAccessCount = 0;
      const accessedRecords = new Set();
      
      for (const eventId of recentEvents) {
        const eventData = await redisService.get(`security_event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.eventType === SECURITY_EVENTS.DATA_ACCESS && 
              new Date(event.timestamp).getTime() > windowStart) {
            dataAccessCount++;
            if (event.details.recordId) {
              accessedRecords.add(event.details.recordId);
            }
          }
        }
      }

      if (dataAccessCount >= threshold.recordCount || accessedRecords.size >= threshold.recordCount) {
        return {
          type: INCIDENT_TYPES.DATA_BREACH,
          severity: threshold.severity,
          status: INCIDENT_STATUS.DETECTED,
          details: {
            userId: securityEvent.userId,
            dataAccessCount,
            uniqueRecordsAccessed: accessedRecords.size,
            timeWindow: threshold.timeWindowMs,
            triggerEvent: securityEvent.correlationId,
            detectedAt: new Date().toISOString(),
            requiresNotification: true
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect data breach:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect brute force attack incidents
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Incident details or null
   */
  async detectBruteForceAttack(securityEvent) {
    try {
      if (securityEvent.eventType !== SECURITY_EVENTS.LOGIN_FAILURE) {
        return null;
      }

      const threshold = this.breachThresholds.failedLogins;
      const windowStart = Date.now() - threshold.timeWindowMs;
      
      // Count failed login attempts from this IP
      const ipEventKey = `ip_events:${securityEvent.deviceInfo.ip}`;
      const recentEvents = await redisService.getSet(ipEventKey);
      
      let failedLoginCount = 0;
      const targetedAccounts = new Set();
      
      for (const eventId of recentEvents) {
        const eventData = await redisService.get(`security_event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.eventType === SECURITY_EVENTS.LOGIN_FAILURE && 
              new Date(event.timestamp).getTime() > windowStart) {
            failedLoginCount++;
            if (event.details.email) {
              targetedAccounts.add(event.details.email);
            }
          }
        }
      }

      if (failedLoginCount >= threshold.attemptCount) {
        return {
          type: INCIDENT_TYPES.BRUTE_FORCE_ATTACK,
          severity: threshold.severity,
          status: INCIDENT_STATUS.DETECTED,
          details: {
            sourceIP: securityEvent.deviceInfo.ip,
            failedAttempts: failedLoginCount,
            targetedAccounts: Array.from(targetedAccounts),
            timeWindow: threshold.timeWindowMs,
            triggerEvent: securityEvent.correlationId,
            detectedAt: new Date().toISOString(),
            requiresNotification: failedLoginCount >= 100 // High threshold for notification
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect brute force attack:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect privilege escalation incidents
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Incident details or null
   */
  async detectPrivilegeEscalation(securityEvent) {
    try {
      if (securityEvent.eventType !== SECURITY_EVENTS.PRIVILEGE_ESCALATION) {
        return null;
      }

      const threshold = this.breachThresholds.privilegeEscalation;
      const windowStart = Date.now() - threshold.timeWindowMs;
      
      // Count privilege escalation attempts from this user
      const userEventKey = `user_events:${securityEvent.userId}`;
      const recentEvents = await redisService.getSet(userEventKey);
      
      let escalationCount = 0;
      const attemptedPrivileges = new Set();
      
      for (const eventId of recentEvents) {
        const eventData = await redisService.get(`security_event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.eventType === SECURITY_EVENTS.PRIVILEGE_ESCALATION && 
              new Date(event.timestamp).getTime() > windowStart) {
            escalationCount++;
            if (event.details.targetPrivilege) {
              attemptedPrivileges.add(event.details.targetPrivilege);
            }
          }
        }
      }

      if (escalationCount >= threshold.attemptCount) {
        return {
          type: INCIDENT_TYPES.PRIVILEGE_ESCALATION,
          severity: threshold.severity,
          status: INCIDENT_STATUS.DETECTED,
          details: {
            userId: securityEvent.userId,
            escalationAttempts: escalationCount,
            attemptedPrivileges: Array.from(attemptedPrivileges),
            timeWindow: threshold.timeWindowMs,
            triggerEvent: securityEvent.correlationId,
            detectedAt: new Date().toISOString(),
            requiresNotification: true // Always notify for privilege escalation
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect privilege escalation:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect data exfiltration incidents
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Incident details or null
   */
  async detectDataExfiltration(securityEvent) {
    try {
      if (securityEvent.eventType !== SECURITY_EVENTS.DATA_ACCESS) {
        return null;
      }

      // Look for patterns indicating data exfiltration
      const suspiciousPatterns = [
        'bulk_download',
        'rapid_access',
        'unusual_time',
        'sensitive_data_access'
      ];

      const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
        securityEvent.details.pattern === pattern ||
        securityEvent.details.flags?.includes(pattern)
      );

      if (hasSuspiciousPattern) {
        return {
          type: INCIDENT_TYPES.DATA_EXFILTRATION,
          severity: BREACH_SEVERITY.CRITICAL,
          status: INCIDENT_STATUS.DETECTED,
          details: {
            userId: securityEvent.userId,
            suspiciousPattern: securityEvent.details.pattern,
            dataType: securityEvent.details.dataType,
            accessVolume: securityEvent.details.accessVolume,
            triggerEvent: securityEvent.correlationId,
            detectedAt: new Date().toISOString(),
            requiresNotification: true
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect data exfiltration:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect account takeover incidents
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Incident details or null
   */
  async detectAccountTakeover(securityEvent) {
    try {
      if (securityEvent.eventType !== SECURITY_EVENTS.LOGIN_SUCCESS) {
        return null;
      }

      // Check for suspicious login patterns
      const suspiciousIndicators = [
        'new_device',
        'new_location',
        'unusual_time',
        'rapid_location_change'
      ];

      const hasSuspiciousIndicator = suspiciousIndicators.some(indicator => 
        securityEvent.details.flags?.includes(indicator)
      );

      if (hasSuspiciousIndicator && securityEvent.details.riskScore > 0.7) {
        return {
          type: INCIDENT_TYPES.ACCOUNT_TAKEOVER,
          severity: BREACH_SEVERITY.HIGH,
          status: INCIDENT_STATUS.DETECTED,
          details: {
            userId: securityEvent.userId,
            suspiciousIndicators: securityEvent.details.flags,
            riskScore: securityEvent.details.riskScore,
            deviceInfo: securityEvent.deviceInfo,
            triggerEvent: securityEvent.correlationId,
            detectedAt: new Date().toISOString(),
            requiresNotification: true
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to detect account takeover:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Process detected incident
   * @param {Object} incident - Incident details
   */
  async processIncident(incident) {
    try {
      const incidentId = generateCorrelationId();
      incident.id = incidentId;
      incident.createdAt = new Date().toISOString();
      incident.updatedAt = incident.createdAt;

      // Store incident
      await this.storeIncident(incident);

      // Add to active incidents
      this.activeIncidents.set(incidentId, incident);

      // Log incident creation
      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.SECURITY_INCIDENT,
        SEVERITY_LEVELS.HIGH,
        {
          incidentId,
          incidentType: incident.type,
          severity: incident.severity,
          details: incident.details
        }
      );

      // Execute incident handler
      const handler = this.incidentHandlers.get(incident.type);
      if (handler) {
        await handler(incident);
      }

      // Send notifications if required
      if (incident.details.requiresNotification) {
        await this.sendBreachNotifications(incident);
      }

      // Create audit trail entry
      await auditTrailService.logEvent({
        eventType: 'incident_detected',
        severity: incident.severity,
        details: {
          incidentId,
          incidentType: incident.type,
          detectedAt: incident.createdAt
        },
        userId: incident.details.userId,
        correlationId: incidentId
      });

      console.log(`Security incident processed: ${incidentId} (${incident.type})`);
      return incident;
    } catch (error) {
      console.error('Failed to process incident:', sanitizeForLogging({ 
        incidentType: incident.type,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Store incident in Redis and database
   * @param {Object} incident - Incident to store
   */
  async storeIncident(incident) {
    try {
      const incidentKey = `security_incident:${incident.id}`;
      const ttl = Math.floor(TIMEOUTS.SECURITY_EVENT_TTL / 1000);
      
      await redisService.setWithTTL(incidentKey, JSON.stringify(incident), ttl);

      // Store in time-series for reporting
      const incidentTimeSeriesKey = `security_incidents:${new Date().toISOString().split('T')[0]}`;
      await redisService.addToSet(incidentTimeSeriesKey, incident.id, ttl);

      // Store by type for analysis
      const typeKey = `incidents_by_type:${incident.type}`;
      await redisService.addToSet(typeKey, incident.id, ttl);

      // Store by severity
      const severityKey = `incidents_by_severity:${incident.severity}`;
      await redisService.addToSet(severityKey, incident.id, ttl);
    } catch (error) {
      console.error('Failed to store incident:', sanitizeForLogging({ 
        incidentId: incident.id,
        error: error.message 
      }));
    }
  }

  /**
   * Send breach notifications through configured channels
   * @param {Object} incident - Incident requiring notification
   */
  async sendBreachNotifications(incident) {
    try {
      const notification = {
        id: generateCorrelationId(),
        incidentId: incident.id,
        type: 'security_breach',
        severity: incident.severity,
        title: `Security Incident: ${incident.type.replace('_', ' ').toUpperCase()}`,
        message: this.generateNotificationMessage(incident),
        timestamp: new Date().toISOString(),
        channels: []
      };

      // Send through all configured channels
      for (const [channelType, channel] of this.notificationChannels) {
        try {
          await channel.send(notification);
          notification.channels.push({
            type: channelType,
            status: 'sent',
            sentAt: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Failed to send notification via ${channelType}:`, sanitizeForLogging({ 
            error: error.message 
          }));
          notification.channels.push({
            type: channelType,
            status: 'failed',
            error: error.message,
            attemptedAt: new Date().toISOString()
          });
        }
      }

      // Store notification record
      await this.storeNotification(notification);

      console.log(`Breach notifications sent for incident: ${incident.id}`);
      return notification;
    } catch (error) {
      console.error('Failed to send breach notifications:', sanitizeForLogging({ 
        incidentId: incident.id,
        error: error.message 
      }));
    }
  }

  /**
   * Generate notification message for incident
   * @param {Object} incident - Incident details
   * @returns {string} Formatted notification message
   */
  generateNotificationMessage(incident) {
    const timestamp = new Date(incident.createdAt).toLocaleString();
    let message = `🚨 SECURITY INCIDENT DETECTED\n\n`;
    message += `Incident ID: ${incident.id}\n`;
    message += `Type: ${incident.type.replace('_', ' ').toUpperCase()}\n`;
    message += `Severity: ${incident.severity.toUpperCase()}\n`;
    message += `Detected: ${timestamp}\n`;
    message += `Status: ${incident.status.toUpperCase()}\n\n`;

    // Add specific details based on incident type
    switch (incident.type) {
      case INCIDENT_TYPES.DATA_BREACH:
        message += `Data Access Count: ${incident.details.dataAccessCount}\n`;
        message += `Unique Records: ${incident.details.uniqueRecordsAccessed}\n`;
        break;
      case INCIDENT_TYPES.BRUTE_FORCE_ATTACK:
        message += `Source IP: ${incident.details.sourceIP}\n`;
        message += `Failed Attempts: ${incident.details.failedAttempts}\n`;
        message += `Targeted Accounts: ${incident.details.targetedAccounts.length}\n`;
        break;
      case INCIDENT_TYPES.PRIVILEGE_ESCALATION:
        message += `User ID: ${incident.details.userId}\n`;
        message += `Escalation Attempts: ${incident.details.escalationAttempts}\n`;
        break;
      case INCIDENT_TYPES.DATA_EXFILTRATION:
        message += `User ID: ${incident.details.userId}\n`;
        message += `Suspicious Pattern: ${incident.details.suspiciousPattern}\n`;
        message += `Data Type: ${incident.details.dataType}\n`;
        break;
      case INCIDENT_TYPES.ACCOUNT_TAKEOVER:
        message += `User ID: ${incident.details.userId}\n`;
        message += `Risk Score: ${incident.details.riskScore}\n`;
        message += `Suspicious Indicators: ${incident.details.suspiciousIndicators.join(', ')}\n`;
        break;
    }

    message += `\nImmediate action may be required. Please review the incident details and take appropriate measures.`;
    
    return message;
  }

  /**
   * Store notification record
   * @param {Object} notification - Notification details
   */
  async storeNotification(notification) {
    try {
      const notificationKey = `breach_notification:${notification.id}`;
      const ttl = Math.floor(TIMEOUTS.SECURITY_EVENT_TTL / 1000);
      
      await redisService.setWithTTL(notificationKey, JSON.stringify(notification), ttl);

      // Store in time-series for reporting
      const notificationTimeSeriesKey = `breach_notifications:${new Date().toISOString().split('T')[0]}`;
      await redisService.addToSet(notificationTimeSeriesKey, notification.id, ttl);
    } catch (error) {
      console.error('Failed to store notification:', sanitizeForLogging({ 
        notificationId: notification.id,
        error: error.message 
      }));
    }
  }

  // Incident handlers for different types
  async handleDataBreach(incident) {
    console.log(`Handling data breach incident: ${incident.id}`);
    // Implement specific data breach response procedures
    await this.updateIncidentStatus(incident.id, INCIDENT_STATUS.INVESTIGATING);
  }

  async handleUnauthorizedAccess(incident) {
    console.log(`Handling unauthorized access incident: ${incident.id}`);
    await this.updateIncidentStatus(incident.id, INCIDENT_STATUS.INVESTIGATING);
  }

  async handleBruteForceAttack(incident) {
    console.log(`Handling brute force attack incident: ${incident.id}`);
    // Could trigger IP blocking or rate limiting adjustments
    await this.updateIncidentStatus(incident.id, INCIDENT_STATUS.CONTAINED);
  }

  async handlePrivilegeEscalation(incident) {
    console.log(`Handling privilege escalation incident: ${incident.id}`);
    // Could trigger account suspension or privilege review
    await this.updateIncidentStatus(incident.id, INCIDENT_STATUS.INVESTIGATING);
  }

  async handleDDoSAttack(incident) {
    console.log(`Handling DDoS attack incident: ${incident.id}`);
    await this.updateIncidentStatus(incident.id, INCIDENT_STATUS.CONTAINED);
  }

  async handleDataExfiltration(incident) {
    console.log(`Handling data exfiltration incident: ${incident.id}`);
    await this.updateIncidentStatus(incident.id, INCIDENT_STATUS.INVESTIGATING);
  }

  async handleAccountTakeover(incident) {
    console.log(`Handling account takeover incident: ${incident.id}`);
    // Could trigger account lockdown and user notification
    await this.updateIncidentStatus(incident.id, INCIDENT_STATUS.INVESTIGATING);
  }

  async handleSystemCompromise(incident) {
    console.log(`Handling system compromise incident: ${incident.id}`);
    await this.updateIncidentStatus(incident.id, INCIDENT_STATUS.INVESTIGATING);
  }

  /**
   * Update incident status
   * @param {string} incidentId - Incident ID
   * @param {string} newStatus - New status
   * @param {string} notes - Optional notes
   */
  async updateIncidentStatus(incidentId, newStatus, notes = '') {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      incident.status = newStatus;
      incident.updatedAt = new Date().toISOString();
      if (notes) {
        incident.notes = incident.notes || [];
        incident.notes.push({
          timestamp: incident.updatedAt,
          note: notes
        });
      }

      // Update stored incident
      await this.storeIncident(incident);

      // Log status change
      await securityMonitorService.logSecurityEvent(
        SECURITY_EVENTS.INCIDENT_STATUS_CHANGE,
        SEVERITY_LEVELS.MEDIUM,
        {
          incidentId,
          oldStatus: incident.status,
          newStatus,
          notes
        }
      );

      console.log(`Incident ${incidentId} status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Failed to update incident status:', sanitizeForLogging({ 
        incidentId,
        newStatus,
        error: error.message 
      }));
      throw error;
    }
  }

  // Notification channel implementations
  async sendEmailNotification(notification) {
    // Email notification implementation would go here
    console.log(`Email notification sent: ${notification.title}`);
  }

  async sendSMSNotification(notification) {
    // SMS notification implementation would go here
    console.log(`SMS notification sent: ${notification.title}`);
  }

  async sendWebhookNotification(notification) {
    // Webhook notification implementation would go here
    console.log(`Webhook notification sent: ${notification.title}`);
  }

  async sendSlackNotification(notification) {
    // Slack notification implementation would go here
    console.log(`Slack notification sent: ${notification.title}`);
  }

  /**
   * Get incident by ID
   * @param {string} incidentId - Incident ID
   * @returns {Object|null} Incident details or null
   */
  async getIncident(incidentId) {
    try {
      const incidentKey = `security_incident:${incidentId}`;
      const incidentData = await redisService.get(incidentKey);
      
      if (incidentData) {
        return JSON.parse(incidentData);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get incident:', sanitizeForLogging({ 
        incidentId,
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Get incidents for a time range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} incidentType - Optional incident type filter
   * @returns {Array} Array of incidents
   */
  async getIncidents(startDate, endDate, incidentType = null) {
    try {
      const incidents = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Generate date range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const incidentTimeSeriesKey = `security_incidents:${dateKey}`;
        const incidentIds = await redisService.getSet(incidentTimeSeriesKey);
        
        for (const incidentId of incidentIds) {
          const incident = await this.getIncident(incidentId);
          if (incident) {
            const incidentTime = new Date(incident.createdAt);
            if (incidentTime >= start && incidentTime <= end) {
              if (!incidentType || incident.type === incidentType) {
                incidents.push(incident);
              }
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Sort by creation time
      return incidents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Failed to get incidents:', sanitizeForLogging({ 
        startDate,
        endDate,
        incidentType,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      activeIncidents: this.activeIncidents.size,
      notificationChannels: this.notificationChannels.size,
      incidentHandlers: this.incidentHandlers.size,
      breachThresholds: this.breachThresholds,
    };
  }
}

// Export singleton instance
module.exports = new IncidentResponseService();