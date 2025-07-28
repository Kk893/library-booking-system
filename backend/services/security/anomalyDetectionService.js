/**
 * Anomaly Detection Service
 * Advanced behavioral analysis and threat detection for security monitoring
 */

const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS,
  TIMEOUTS 
} = require('./utils/constants');
const { 
  sanitizeForLogging,
  isValidIP
} = require('./utils/securityHelpers');
const redisService = require('./redisService');
const configService = require('./configService');

class AnomalyDetectionService {
  constructor() {
    this.isInitialized = false;
    this.config = null;
    this.behaviorBaselines = new Map();
    this.threatPatterns = new Map();
    this.detectionRules = [];
  }

  /**
   * Initialize the anomaly detection service
   * @param {Object} customConfig - Optional custom configuration
   */
  async initialize(customConfig = {}) {
    try {
      if (!configService.isInitialized) {
        await configService.initialize();
      }
      
      this.config = configService.getMonitoringConfig();
      
      // Initialize detection rules
      this.initializeDetectionRules();
      
      // Load behavioral baselines
      await this.loadBehaviorBaselines();

      this.isInitialized = true;
      console.log('Anomaly detection service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize anomaly detection service:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Initialize built-in detection rules
   */
  initializeDetectionRules() {
    this.detectionRules = [
      {
        name: 'rapid_failed_logins',
        description: 'Detect rapid failed login attempts',
        eventType: SECURITY_EVENTS.LOGIN_FAILURE,
        threshold: { count: 5, windowMs: 15 * 60 * 1000 },
        severity: SEVERITY_LEVELS.HIGH,
        groupBy: 'ip',
        alertType: 'brute_force_attack'
      },
      {
        name: 'privilege_escalation_attempts',
        description: 'Detect privilege escalation attempts',
        eventType: SECURITY_EVENTS.PRIVILEGE_ESCALATION,
        threshold: { count: 3, windowMs: 30 * 60 * 1000 },
        severity: SEVERITY_LEVELS.CRITICAL,
        groupBy: 'userId',
        alertType: 'privilege_escalation_attack'
      },
      {
        name: 'suspicious_activity_pattern',
        description: 'Detect patterns of suspicious activity',
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        threshold: { count: 10, windowMs: 60 * 60 * 1000 },
        severity: SEVERITY_LEVELS.HIGH,
        groupBy: 'ip',
        alertType: 'suspicious_activity_pattern'
      },
      {
        name: 'data_exfiltration_attempt',
        description: 'Detect potential data exfiltration',
        eventType: SECURITY_EVENTS.DATA_ACCESS,
        threshold: { count: 100, windowMs: 60 * 60 * 1000 },
        severity: SEVERITY_LEVELS.CRITICAL,
        groupBy: 'userId',
        alertType: 'data_exfiltration_attempt'
      },
      {
        name: 'account_lockout_pattern',
        description: 'Detect account lockout patterns',
        eventType: SECURITY_EVENTS.ACCOUNT_LOCKOUT,
        threshold: { count: 5, windowMs: 60 * 60 * 1000 },
        severity: SEVERITY_LEVELS.MEDIUM,
        groupBy: 'ip',
        alertType: 'account_lockout_pattern'
      },
      {
        name: 'unusual_login_times',
        description: 'Detect logins at unusual times',
        eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
        threshold: { deviation: 2 }, // Standard deviations from normal
        severity: SEVERITY_LEVELS.MEDIUM,
        groupBy: 'userId',
        alertType: 'unusual_login_time',
        customDetection: true
      },
      {
        name: 'geographic_anomaly',
        description: 'Detect logins from unusual locations',
        eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
        threshold: { distance: 1000 }, // km from usual locations
        severity: SEVERITY_LEVELS.HIGH,
        groupBy: 'userId',
        alertType: 'geographic_anomaly',
        customDetection: true
      }
    ];
  }

  /**
   * Load behavioral baselines from Redis
   */
  async loadBehaviorBaselines() {
    try {
      const baselineKeys = await redisService.getSet('behavior_baselines:keys') || new Set();
      
      for (const key of baselineKeys) {
        const baseline = await redisService.get(`behavior_baseline:${key}`);
        if (baseline) {
          this.behaviorBaselines.set(key, JSON.parse(baseline));
        }
      }

      console.log(`Loaded ${this.behaviorBaselines.size} behavioral baselines`);
    } catch (error) {
      console.error('Failed to load behavior baselines:', sanitizeForLogging({ 
        error: error.message 
      }));
    }
  }

  /**
   * Analyze security event for anomalies
   * @param {Object} securityEvent - Security event to analyze
   * @returns {Array} Array of detected anomalies
   */
  async analyzeEvent(securityEvent) {
    try {
      const anomalies = [];

      // Run standard threshold-based detection
      for (const rule of this.detectionRules) {
        if (rule.eventType === securityEvent.eventType) {
          if (rule.customDetection) {
            const customAnomaly = await this.runCustomDetection(rule, securityEvent);
            if (customAnomaly) {
              anomalies.push(customAnomaly);
            }
          } else {
            const thresholdAnomaly = await this.runThresholdDetection(rule, securityEvent);
            if (thresholdAnomaly) {
              anomalies.push(thresholdAnomaly);
            }
          }
        }
      }

      // Run behavioral analysis
      const behaviorAnomaly = await this.runBehavioralAnalysis(securityEvent);
      if (behaviorAnomaly) {
        anomalies.push(behaviorAnomaly);
      }

      // Update behavioral baselines
      await this.updateBehaviorBaseline(securityEvent);

      return anomalies;
    } catch (error) {
      console.error('Failed to analyze event for anomalies:', sanitizeForLogging({ 
        correlationId: securityEvent.correlationId,
        error: error.message 
      }));
      return [];
    }
  }

  /**
   * Run threshold-based anomaly detection
   * @param {Object} rule - Detection rule
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Detected anomaly or null
   */
  async runThresholdDetection(rule, securityEvent) {
    try {
      const groupValue = this.getGroupValue(rule.groupBy, securityEvent);
      if (!groupValue) return null;

      const windowStart = Date.now() - rule.threshold.windowMs;
      const eventKey = `${rule.groupBy}_events:${groupValue}`;
      const recentEvents = await redisService.getSet(eventKey) || new Set();
      
      let eventCount = 0;
      for (const eventId of recentEvents) {
        const eventData = await redisService.get(`security_event:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.eventType === rule.eventType && 
              new Date(event.timestamp).getTime() > windowStart) {
            eventCount++;
          }
        }
      }

      if (eventCount >= rule.threshold.count) {
        return {
          type: rule.alertType,
          rule: rule.name,
          severity: rule.severity,
          details: {
            [rule.groupBy]: groupValue,
            eventCount: eventCount,
            threshold: rule.threshold.count,
            timeWindow: rule.threshold.windowMs,
            description: rule.description
          },
          timestamp: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error(`Failed to run threshold detection for rule ${rule.name}:`, sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Run custom anomaly detection
   * @param {Object} rule - Detection rule
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Detected anomaly or null
   */
  async runCustomDetection(rule, securityEvent) {
    try {
      switch (rule.name) {
        case 'unusual_login_times':
          return await this.detectUnusualLoginTimes(rule, securityEvent);
        case 'geographic_anomaly':
          return await this.detectGeographicAnomaly(rule, securityEvent);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to run custom detection for rule ${rule.name}:`, sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Detect unusual login times based on user's historical patterns
   * @param {Object} rule - Detection rule
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Detected anomaly or null
   */
  async detectUnusualLoginTimes(rule, securityEvent) {
    if (!securityEvent.userId) return null;

    const baselineKey = `login_times:${securityEvent.userId}`;
    const baseline = this.behaviorBaselines.get(baselineKey);
    
    if (!baseline || baseline.samples < 10) {
      // Not enough data for analysis
      return null;
    }

    const currentHour = new Date(securityEvent.timestamp).getHours();
    const hourlyStats = baseline.hourlyStats || {};
    const avgActivity = baseline.avgHourlyActivity || 0;
    const stdDev = baseline.stdDevHourlyActivity || 0;

    const currentHourActivity = hourlyStats[currentHour] || 0;
    const zScore = stdDev > 0 ? Math.abs(currentHourActivity - avgActivity) / stdDev : 0;

    if (zScore > rule.threshold.deviation) {
      return {
        type: rule.alertType,
        rule: rule.name,
        severity: rule.severity,
        details: {
          userId: securityEvent.userId,
          loginHour: currentHour,
          zScore: zScore,
          threshold: rule.threshold.deviation,
          description: rule.description,
          normalLoginHours: Object.keys(hourlyStats)
            .filter(hour => hourlyStats[hour] > avgActivity)
            .map(Number)
        },
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Detect geographic anomalies based on user's location patterns
   * @param {Object} rule - Detection rule
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Detected anomaly or null
   */
  async detectGeographicAnomaly(rule, securityEvent) {
    if (!securityEvent.userId || !securityEvent.deviceInfo?.ip) return null;

    // This is a simplified implementation
    // In a real system, you would use IP geolocation services
    const baselineKey = `locations:${securityEvent.userId}`;
    const baseline = this.behaviorBaselines.get(baselineKey);
    
    if (!baseline || baseline.samples < 5) {
      // Not enough data for analysis
      return null;
    }

    const currentIP = securityEvent.deviceInfo.ip;
    const knownIPs = baseline.knownIPs || [];
    const ipRanges = baseline.ipRanges || [];

    // Check if IP is in known ranges (simplified)
    const isKnownIP = knownIPs.includes(currentIP) || 
                     ipRanges.some(range => this.isIPInRange(currentIP, range));

    if (!isKnownIP) {
      return {
        type: rule.alertType,
        rule: rule.name,
        severity: rule.severity,
        details: {
          userId: securityEvent.userId,
          currentIP: currentIP,
          knownIPs: knownIPs.slice(0, 3), // Show only first 3 for privacy
          description: rule.description
        },
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Run behavioral analysis for patterns
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Detected behavioral anomaly or null
   */
  async runBehavioralAnalysis(securityEvent) {
    try {
      // Analyze request frequency patterns
      const frequencyAnomaly = await this.analyzeRequestFrequency(securityEvent);
      if (frequencyAnomaly) return frequencyAnomaly;

      // Analyze session duration patterns
      const sessionAnomaly = await this.analyzeSessionPatterns(securityEvent);
      if (sessionAnomaly) return sessionAnomaly;

      // Analyze user agent patterns
      const userAgentAnomaly = await this.analyzeUserAgentPatterns(securityEvent);
      if (userAgentAnomaly) return userAgentAnomaly;

      return null;
    } catch (error) {
      console.error('Failed to run behavioral analysis:', sanitizeForLogging({ 
        error: error.message 
      }));
      return null;
    }
  }

  /**
   * Analyze request frequency patterns
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Detected anomaly or null
   */
  async analyzeRequestFrequency(securityEvent) {
    if (!securityEvent.userId) return null;

    const baselineKey = `request_frequency:${securityEvent.userId}`;
    const baseline = this.behaviorBaselines.get(baselineKey);
    
    if (!baseline || baseline.samples < 20) return null;

    const currentMinute = Math.floor(Date.now() / 60000);
    const recentRequests = baseline.recentRequests || [];
    
    // Count requests in the last minute
    const requestsThisMinute = recentRequests.filter(
      timestamp => Math.floor(timestamp / 60000) === currentMinute
    ).length;

    const avgRequestsPerMinute = baseline.avgRequestsPerMinute || 0;
    const maxRequestsPerMinute = baseline.maxRequestsPerMinute || 0;

    // Detect if current frequency is significantly higher than normal
    if (requestsThisMinute > avgRequestsPerMinute * 5 && 
        requestsThisMinute > maxRequestsPerMinute * 2) {
      return {
        type: 'unusual_request_frequency',
        rule: 'behavioral_analysis',
        severity: SEVERITY_LEVELS.MEDIUM,
        details: {
          userId: securityEvent.userId,
          currentFrequency: requestsThisMinute,
          avgFrequency: avgRequestsPerMinute,
          maxFrequency: maxRequestsPerMinute,
          description: 'Unusual request frequency detected'
        },
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Analyze session duration patterns
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Detected anomaly or null
   */
  async analyzeSessionPatterns(securityEvent) {
    if (securityEvent.eventType !== SECURITY_EVENTS.LOGIN_SUCCESS || !securityEvent.userId) {
      return null;
    }

    const baselineKey = `session_duration:${securityEvent.userId}`;
    const baseline = this.behaviorBaselines.get(baselineKey);
    
    if (!baseline || baseline.samples < 10) return null;

    // This would require tracking session start/end times
    // Simplified implementation for demonstration
    const avgSessionDuration = baseline.avgSessionDuration || 0;
    const currentTime = new Date(securityEvent.timestamp).getHours();
    
    // Check if login is happening at an unusual time for long sessions
    if (avgSessionDuration > 4 * 60 * 60 * 1000 && // 4 hours
        (currentTime < 6 || currentTime > 22)) { // Late night/early morning
      return {
        type: 'unusual_session_timing',
        rule: 'behavioral_analysis',
        severity: SEVERITY_LEVELS.LOW,
        details: {
          userId: securityEvent.userId,
          loginTime: currentTime,
          avgSessionDuration: avgSessionDuration,
          description: 'Login at unusual time for typical session duration'
        },
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Analyze user agent patterns
   * @param {Object} securityEvent - Security event
   * @returns {Object|null} Detected anomaly or null
   */
  async analyzeUserAgentPatterns(securityEvent) {
    if (!securityEvent.userId || !securityEvent.deviceInfo?.userAgent) return null;

    const baselineKey = `user_agents:${securityEvent.userId}`;
    const baseline = this.behaviorBaselines.get(baselineKey);
    
    if (!baseline || baseline.samples < 5) return null;

    const currentUserAgent = securityEvent.deviceInfo.userAgent;
    const knownUserAgents = baseline.knownUserAgents || [];
    
    // Check if user agent is completely new
    const isKnownUserAgent = knownUserAgents.some(ua => 
      this.calculateUserAgentSimilarity(currentUserAgent, ua) > 0.8
    );

    if (!isKnownUserAgent) {
      return {
        type: 'new_user_agent',
        rule: 'behavioral_analysis',
        severity: SEVERITY_LEVELS.LOW,
        details: {
          userId: securityEvent.userId,
          newUserAgent: currentUserAgent,
          knownUserAgents: knownUserAgents.length,
          description: 'New user agent detected'
        },
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Update behavioral baseline with new event data
   * @param {Object} securityEvent - Security event
   */
  async updateBehaviorBaseline(securityEvent) {
    try {
      if (!securityEvent.userId) return;

      // Update login times baseline
      if (securityEvent.eventType === SECURITY_EVENTS.LOGIN_SUCCESS) {
        await this.updateLoginTimesBaseline(securityEvent);
      }

      // Update location baseline
      if (securityEvent.deviceInfo?.ip) {
        await this.updateLocationBaseline(securityEvent);
      }

      // Update request frequency baseline
      await this.updateRequestFrequencyBaseline(securityEvent);

      // Update user agent baseline
      if (securityEvent.deviceInfo?.userAgent) {
        await this.updateUserAgentBaseline(securityEvent);
      }
    } catch (error) {
      console.error('Failed to update behavior baseline:', sanitizeForLogging({ 
        error: error.message 
      }));
    }
  }

  /**
   * Update login times behavioral baseline
   * @param {Object} securityEvent - Security event
   */
  async updateLoginTimesBaseline(securityEvent) {
    const baselineKey = `login_times:${securityEvent.userId}`;
    let baseline = this.behaviorBaselines.get(baselineKey) || {
      samples: 0,
      hourlyStats: {},
      avgHourlyActivity: 0,
      stdDevHourlyActivity: 0
    };

    const loginHour = new Date(securityEvent.timestamp).getHours();
    baseline.hourlyStats[loginHour] = (baseline.hourlyStats[loginHour] || 0) + 1;
    baseline.samples++;

    // Recalculate statistics
    const hours = Object.keys(baseline.hourlyStats).map(Number);
    const activities = Object.values(baseline.hourlyStats);
    baseline.avgHourlyActivity = activities.reduce((a, b) => a + b, 0) / activities.length;
    
    const variance = activities.reduce((sum, activity) => 
      sum + Math.pow(activity - baseline.avgHourlyActivity, 2), 0) / activities.length;
    baseline.stdDevHourlyActivity = Math.sqrt(variance);

    // Store updated baseline
    this.behaviorBaselines.set(baselineKey, baseline);
    await this.saveBehaviorBaseline(baselineKey, baseline);
  }

  /**
   * Update location behavioral baseline
   * @param {Object} securityEvent - Security event
   */
  async updateLocationBaseline(securityEvent) {
    const baselineKey = `locations:${securityEvent.userId}`;
    let baseline = this.behaviorBaselines.get(baselineKey) || {
      samples: 0,
      knownIPs: [],
      ipRanges: []
    };

    const currentIP = securityEvent.deviceInfo.ip;
    if (!baseline.knownIPs.includes(currentIP)) {
      baseline.knownIPs.push(currentIP);
      // Keep only last 10 IPs for privacy
      if (baseline.knownIPs.length > 10) {
        baseline.knownIPs = baseline.knownIPs.slice(-10);
      }
    }

    baseline.samples++;

    // Store updated baseline
    this.behaviorBaselines.set(baselineKey, baseline);
    await this.saveBehaviorBaseline(baselineKey, baseline);
  }

  /**
   * Update request frequency baseline
   * @param {Object} securityEvent - Security event
   */
  async updateRequestFrequencyBaseline(securityEvent) {
    const baselineKey = `request_frequency:${securityEvent.userId}`;
    let baseline = this.behaviorBaselines.get(baselineKey) || {
      samples: 0,
      recentRequests: [],
      avgRequestsPerMinute: 0,
      maxRequestsPerMinute: 0
    };

    const currentTimestamp = Date.now();
    baseline.recentRequests.push(currentTimestamp);
    
    // Keep only last hour of requests
    const oneHourAgo = currentTimestamp - 60 * 60 * 1000;
    baseline.recentRequests = baseline.recentRequests.filter(ts => ts > oneHourAgo);
    
    baseline.samples++;

    // Recalculate statistics
    const requestsPerMinute = baseline.recentRequests.length / 60;
    baseline.avgRequestsPerMinute = (baseline.avgRequestsPerMinute * 0.9) + (requestsPerMinute * 0.1);
    baseline.maxRequestsPerMinute = Math.max(baseline.maxRequestsPerMinute, requestsPerMinute);

    // Store updated baseline
    this.behaviorBaselines.set(baselineKey, baseline);
    await this.saveBehaviorBaseline(baselineKey, baseline);
  }

  /**
   * Update user agent baseline
   * @param {Object} securityEvent - Security event
   */
  async updateUserAgentBaseline(securityEvent) {
    const baselineKey = `user_agents:${securityEvent.userId}`;
    let baseline = this.behaviorBaselines.get(baselineKey) || {
      samples: 0,
      knownUserAgents: []
    };

    const currentUserAgent = securityEvent.deviceInfo.userAgent;
    const isKnown = baseline.knownUserAgents.some(ua => 
      this.calculateUserAgentSimilarity(currentUserAgent, ua) > 0.9
    );

    if (!isKnown) {
      baseline.knownUserAgents.push(currentUserAgent);
      // Keep only last 5 user agents
      if (baseline.knownUserAgents.length > 5) {
        baseline.knownUserAgents = baseline.knownUserAgents.slice(-5);
      }
    }

    baseline.samples++;

    // Store updated baseline
    this.behaviorBaselines.set(baselineKey, baseline);
    await this.saveBehaviorBaseline(baselineKey, baseline);
  }

  /**
   * Save behavioral baseline to Redis
   * @param {string} key - Baseline key
   * @param {Object} baseline - Baseline data
   */
  async saveBehaviorBaseline(key, baseline) {
    try {
      const ttl = Math.floor(TIMEOUTS.SECURITY_EVENT_TTL / 1000);
      await redisService.setWithTTL(`behavior_baseline:${key}`, JSON.stringify(baseline), ttl);
      await redisService.addToSet('behavior_baselines:keys', key, ttl);
    } catch (error) {
      console.error('Failed to save behavior baseline:', sanitizeForLogging({ 
        key, 
        error: error.message 
      }));
    }
  }

  /**
   * Get group value from security event based on groupBy field
   * @param {string} groupBy - Field to group by
   * @param {Object} securityEvent - Security event
   * @returns {string|null} Group value
   */
  getGroupValue(groupBy, securityEvent) {
    switch (groupBy) {
      case 'ip':
        return securityEvent.deviceInfo?.ip;
      case 'userId':
        return securityEvent.userId;
      case 'userAgent':
        return securityEvent.deviceInfo?.userAgent;
      default:
        return null;
    }
  }

  /**
   * Check if IP is in range (simplified implementation)
   * @param {string} ip - IP address to check
   * @param {string} range - IP range (e.g., "192.168.1.0/24")
   * @returns {boolean} True if IP is in range
   */
  isIPInRange(ip, range) {
    // Simplified implementation - in production use proper CIDR matching
    const [rangeIP, mask] = range.split('/');
    const ipParts = ip.split('.').map(Number);
    const rangeParts = rangeIP.split('.').map(Number);
    
    // Simple subnet matching for demonstration
    const maskBits = parseInt(mask, 10);
    const bytes = Math.floor(maskBits / 8);
    
    for (let i = 0; i < bytes; i++) {
      if (ipParts[i] !== rangeParts[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Calculate similarity between user agents
   * @param {string} ua1 - First user agent
   * @param {string} ua2 - Second user agent
   * @returns {number} Similarity score (0-1)
   */
  calculateUserAgentSimilarity(ua1, ua2) {
    if (ua1 === ua2) return 1;
    
    // Simple similarity based on common tokens
    const tokens1 = ua1.toLowerCase().split(/[\s\/\(\)]+/);
    const tokens2 = ua2.toLowerCase().split(/[\s\/\(\)]+/);
    
    const commonTokens = tokens1.filter(token => tokens2.includes(token));
    const totalTokens = new Set([...tokens1, ...tokens2]).size;
    
    return commonTokens.length / totalTokens;
  }

  /**
   * Add custom detection rule
   * @param {Object} rule - Custom detection rule
   */
  addDetectionRule(rule) {
    // Validate rule structure
    if (!rule.name || !rule.eventType || !rule.alertType) {
      throw new Error('Invalid detection rule: missing required fields');
    }
    
    this.detectionRules.push(rule);
    console.log(`Added custom detection rule: ${rule.name}`);
  }

  /**
   * Remove detection rule
   * @param {string} ruleName - Name of rule to remove
   */
  removeDetectionRule(ruleName) {
    const index = this.detectionRules.findIndex(rule => rule.name === ruleName);
    if (index !== -1) {
      this.detectionRules.splice(index, 1);
      console.log(`Removed detection rule: ${ruleName}`);
    }
  }

  /**
   * Get all detection rules
   * @returns {Array} Array of detection rules
   */
  getDetectionRules() {
    return [...this.detectionRules];
  }

  /**
   * Get behavioral baseline for a user
   * @param {string} userId - User ID
   * @param {string} type - Baseline type
   * @returns {Object|null} Behavioral baseline
   */
  getBehaviorBaseline(userId, type) {
    const key = `${type}:${userId}`;
    return this.behaviorBaselines.get(key) || null;
  }

  /**
   * Clear behavioral baselines (for testing or reset)
   * @param {string} userId - Optional user ID to clear specific user's baselines
   */
  async clearBehaviorBaselines(userId = null) {
    try {
      if (userId) {
        // Clear specific user's baselines
        const keysToRemove = [];
        for (const [key] of this.behaviorBaselines) {
          if (key.endsWith(`:${userId}`)) {
            keysToRemove.push(key);
          }
        }
        
        for (const key of keysToRemove) {
          this.behaviorBaselines.delete(key);
          await redisService.delete(`behavior_baseline:${key}`);
        }
        
        console.log(`Cleared behavioral baselines for user: ${userId}`);
      } else {
        // Clear all baselines
        this.behaviorBaselines.clear();
        const baselineKeys = await redisService.getSet('behavior_baselines:keys') || new Set();
        
        for (const key of baselineKeys) {
          await redisService.delete(`behavior_baseline:${key}`);
        }
        
        await redisService.delete('behavior_baselines:keys');
        console.log('Cleared all behavioral baselines');
      }
    } catch (error) {
      console.error('Failed to clear behavior baselines:', sanitizeForLogging({ 
        userId, 
        error: error.message 
      }));
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
      detectionRules: this.detectionRules.length,
      behaviorBaselines: this.behaviorBaselines.size,
    };
  }
}

// Export singleton instance
module.exports = new AnomalyDetectionService();