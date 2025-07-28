/**
 * Device Fingerprinting Service
 * Handles device identification, tracking, and suspicious activity detection
 */

const crypto = require('crypto');
const redisService = require('./redisService');
const NotificationService = require('../notificationService');
const { 
  generateSecureToken, 
  sanitizeForLogging, 
  formatSecurityEvent,
  isValidIP
} = require('./utils/securityHelpers');
const { 
  SECURITY_EVENTS, 
  SEVERITY_LEVELS, 
  REDIS_PREFIXES,
  ERROR_CODES 
} = require('./utils/constants');

class DeviceFingerprintService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize device fingerprint service
   */
  async initialize() {
    try {
      this.isInitialized = true;
      console.log('Device fingerprint service initialized successfully');
    } catch (error) {
      console.error('Device fingerprint service initialization failed:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Extract comprehensive device information from request
   * @param {Object} req - Express request object
   * @returns {Object} Comprehensive device information
   */
  extractDeviceInfo(req) {
    const forwardedFor = req.get('X-Forwarded-For');
    const realIP = req.get('X-Real-IP');
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    return {
      // Network information
      ip: realIP || (forwardedFor ? forwardedFor.split(',')[0].trim() : clientIP) || 'unknown',
      forwardedFor: forwardedFor || null,
      realIP: realIP || null,
      
      // Browser information
      userAgent: req.get('User-Agent') || 'unknown',
      acceptLanguage: req.get('Accept-Language') || 'unknown',
      acceptEncoding: req.get('Accept-Encoding') || 'unknown',
      accept: req.get('Accept') || 'unknown',
      
      // Connection information
      connection: req.get('Connection') || 'unknown',
      upgradeInsecureRequests: req.get('Upgrade-Insecure-Requests') || 'unknown',
      
      // Security headers
      dnt: req.get('DNT') || 'unknown', // Do Not Track
      secFetchSite: req.get('Sec-Fetch-Site') || 'unknown',
      secFetchMode: req.get('Sec-Fetch-Mode') || 'unknown',
      secFetchUser: req.get('Sec-Fetch-User') || 'unknown',
      secFetchDest: req.get('Sec-Fetch-Dest') || 'unknown',
      
      // Additional metadata
      timestamp: new Date().toISOString(),
      timezone: req.get('X-Timezone') || 'unknown',
      screenResolution: req.get('X-Screen-Resolution') || 'unknown',
      colorDepth: req.get('X-Color-Depth') || 'unknown',
      
      // Request metadata
      method: req.method,
      protocol: req.protocol,
      secure: req.secure,
      host: req.get('Host') || 'unknown'
    };
  }

  /**
   * Generate device fingerprint from device information
   * @param {Object} deviceInfo - Device information object
   * @returns {string} Device fingerprint hash
   */
  generateDeviceFingerprint(deviceInfo) {
    // Create fingerprint from stable device characteristics
    const fingerprintData = [
      deviceInfo.userAgent,
      deviceInfo.acceptLanguage,
      deviceInfo.acceptEncoding,
      deviceInfo.accept,
      deviceInfo.dnt,
      deviceInfo.timezone,
      deviceInfo.screenResolution,
      deviceInfo.colorDepth
    ].join('|');
    
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
  }

  /**
   * Generate network fingerprint from network information
   * @param {Object} deviceInfo - Device information object
   * @returns {string} Network fingerprint hash
   */
  generateNetworkFingerprint(deviceInfo) {
    const networkData = [
      deviceInfo.ip,
      deviceInfo.connection,
      deviceInfo.upgradeInsecureRequests,
      deviceInfo.secFetchSite,
      deviceInfo.secFetchMode
    ].join('|');
    
    return crypto.createHash('sha256').update(networkData).digest('hex');
  }

  /**
   * Create comprehensive device profile
   * @param {Object} req - Express request object
   * @returns {Object} Device profile with fingerprints
   */
  createDeviceProfile(req) {
    const deviceInfo = this.extractDeviceInfo(req);
    const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
    const networkFingerprint = this.generateNetworkFingerprint(deviceInfo);
    
    return {
      deviceInfo,
      deviceFingerprint,
      networkFingerprint,
      profileId: generateSecureToken(16),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Track device session
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {Object} deviceProfile - Device profile
   */
  async trackDeviceSession(userId, sessionId, deviceProfile) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const trackingKey = `${REDIS_PREFIXES.USER_ACTIVITY}${userId}:devices`;
      
      // Get existing device tracking data
      const existingData = await redisService.getHash(trackingKey) || {};
      
      // Create device session entry
      const deviceSessionData = {
        sessionId,
        deviceFingerprint: deviceProfile.deviceFingerprint,
        networkFingerprint: deviceProfile.networkFingerprint,
        ip: deviceProfile.deviceInfo.ip,
        userAgent: deviceProfile.deviceInfo.userAgent,
        firstSeen: deviceProfile.createdAt,
        lastSeen: deviceProfile.createdAt,
        sessionCount: 1,
        isActive: true
      };

      // Check if this device has been seen before
      const deviceKey = deviceProfile.deviceFingerprint;
      if (existingData[deviceKey]) {
        const existingDevice = JSON.parse(existingData[deviceKey]);
        deviceSessionData.firstSeen = existingDevice.firstSeen;
        deviceSessionData.sessionCount = (existingDevice.sessionCount || 0) + 1;
      }

      // Store device session data
      await redisService.setHashField(
        trackingKey, 
        deviceKey, 
        JSON.stringify(deviceSessionData),
        90 * 24 * 60 * 60 // 90 days TTL
      );

      // Store session-to-device mapping
      const sessionKey = `${REDIS_PREFIXES.SESSION}${sessionId}:device`;
      await redisService.setWithTTL(
        sessionKey,
        JSON.stringify({
          deviceFingerprint: deviceProfile.deviceFingerprint,
          networkFingerprint: deviceProfile.networkFingerprint,
          userId
        }),
        7 * 24 * 60 * 60 // 7 days TTL
      );

      return deviceSessionData;
    } catch (error) {
      console.error('Device session tracking failed:', sanitizeForLogging({ 
        userId,
        sessionId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Detect suspicious device activity
   * @param {string} userId - User ID
   * @param {Object} deviceProfile - Current device profile
   * @returns {Object} Suspicion analysis result
   */
  async detectSuspiciousActivity(userId, deviceProfile) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const suspicionFactors = [];
      let suspicionScore = 0;
      let riskLevel = 'low';

      // Get user's device history
      const trackingKey = `${REDIS_PREFIXES.USER_ACTIVITY}${userId}:devices`;
      const deviceHistory = await redisService.getHash(trackingKey) || {};

      // Factor 1: New device detection
      const deviceKey = deviceProfile.deviceFingerprint;
      const isNewDevice = !deviceHistory[deviceKey];
      
      if (isNewDevice) {
        suspicionFactors.push('new_device');
        suspicionScore += 30;
      }

      // Factor 2: IP address analysis
      const currentIP = deviceProfile.deviceInfo.ip;
      if (isValidIP(currentIP)) {
        // Check for IP changes from known devices
        const knownIPs = new Set();
        Object.values(deviceHistory).forEach(deviceData => {
          try {
            const device = JSON.parse(deviceData);
            knownIPs.add(device.ip);
          } catch (e) {
            // Skip invalid device data
          }
        });

        if (knownIPs.size > 0 && !knownIPs.has(currentIP)) {
          suspicionFactors.push('new_ip_address');
          suspicionScore += 20;
        }

        // Check for suspicious IP patterns
        if (this.isSuspiciousIP(currentIP)) {
          suspicionFactors.push('suspicious_ip');
          suspicionScore += 40;
        }
      }

      // Factor 3: User agent analysis
      const currentUA = deviceProfile.deviceInfo.userAgent;
      if (this.isSuspiciousUserAgent(currentUA)) {
        suspicionFactors.push('suspicious_user_agent');
        suspicionScore += 25;
      }

      // Factor 4: Rapid device switching
      const recentDeviceCount = await this.getRecentDeviceCount(userId, 24 * 60 * 60 * 1000); // 24 hours
      if (recentDeviceCount > 3) {
        suspicionFactors.push('rapid_device_switching');
        suspicionScore += 35;
      }

      // Factor 5: Geographic anomalies (basic implementation)
      const timezone = deviceProfile.deviceInfo.timezone;
      if (timezone !== 'unknown' && await this.isAnomalousTimezone(userId, timezone)) {
        suspicionFactors.push('geographic_anomaly');
        suspicionScore += 30;
      }

      // Determine risk level
      if (suspicionScore >= 80) {
        riskLevel = 'critical';
      } else if (suspicionScore >= 60) {
        riskLevel = 'high';
      } else if (suspicionScore >= 40) {
        riskLevel = 'medium';
      }

      const result = {
        isSuspicious: suspicionScore >= 40,
        suspicionScore,
        riskLevel,
        factors: suspicionFactors,
        deviceFingerprint: deviceProfile.deviceFingerprint,
        analysis: {
          isNewDevice,
          currentIP,
          recentDeviceCount,
          knownDeviceCount: Object.keys(deviceHistory).length
        }
      };

      // Handle suspicious activity if detected
      if (result.isSuspicious) {
        const securityEvent = formatSecurityEvent(
          SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          riskLevel === 'critical' ? SEVERITY_LEVELS.CRITICAL : 
          riskLevel === 'high' ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
          {
            suspicionScore,
            riskLevel,
            factors: suspicionFactors,
            deviceFingerprint: deviceProfile.deviceFingerprint,
            ip: currentIP,
            userAgent: currentUA,
            analysis: result.analysis
          },
          userId
        );

        await redisService.storeSecurityEvent(
          `suspicious_device_${userId}_${Date.now()}`,
          securityEvent
        );

        // Handle critical suspicious activity (requirement 1.4)
        if (riskLevel === 'critical') {
          await this.handleCriticalSuspiciousActivity(userId, result, deviceProfile);
        }

        // Send real-time alerts for suspicious activity (requirement 5.2)
        await this.sendSuspiciousActivityAlert(userId, result, deviceProfile);
      }

      return result;
    } catch (error) {
      console.error('Suspicious activity detection failed:', sanitizeForLogging({ 
        userId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Check if IP address is suspicious
   * @param {string} ip - IP address to check
   * @returns {boolean} True if IP is suspicious
   */
  isSuspiciousIP(ip) {
    // Basic suspicious IP patterns
    const suspiciousPatterns = [
      /^10\./, // Private network (suspicious for external access)
      /^192\.168\./, // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
      /^127\./, // Loopback
      /^0\./, // Invalid
      /^169\.254\./, // Link-local
      /^224\./, // Multicast
      /^255\./ // Broadcast
    ];

    // Check for Tor exit nodes (basic pattern)
    const torPatterns = [
      /^77\.247\./, // Common Tor exit node range
      /^199\.87\./, // Common Tor exit node range
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ip)) ||
           torPatterns.some(pattern => pattern.test(ip));
  }

  /**
   * Check if user agent is suspicious
   * @param {string} userAgent - User agent string
   * @returns {boolean} True if user agent is suspicious
   */
  isSuspiciousUserAgent(userAgent) {
    if (!userAgent || userAgent === 'unknown') {
      return true;
    }

    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /go-http-client/i,
      /postman/i,
      /insomnia/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Get count of recent devices for a user
   * @param {string} userId - User ID
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {number} Count of recent devices
   */
  async getRecentDeviceCount(userId, timeWindow) {
    try {
      const trackingKey = `${REDIS_PREFIXES.USER_ACTIVITY}${userId}:devices`;
      const deviceHistory = await redisService.getHash(trackingKey) || {};
      
      const cutoffTime = new Date(Date.now() - timeWindow);
      let recentCount = 0;

      Object.values(deviceHistory).forEach(deviceData => {
        try {
          const device = JSON.parse(deviceData);
          const lastSeen = new Date(device.lastSeen);
          if (lastSeen > cutoffTime) {
            recentCount++;
          }
        } catch (e) {
          // Skip invalid device data
        }
      });

      return recentCount;
    } catch (error) {
      console.error('Get recent device count failed:', sanitizeForLogging({ 
        userId,
        error: error.message 
      }));
      return 0;
    }
  }

  /**
   * Check if timezone is anomalous for user
   * @param {string} userId - User ID
   * @param {string} timezone - Current timezone
   * @returns {boolean} True if timezone is anomalous
   */
  async isAnomalousTimezone(userId, timezone) {
    try {
      const trackingKey = `${REDIS_PREFIXES.USER_ACTIVITY}${userId}:timezones`;
      const knownTimezones = await redisService.getSet(trackingKey) || new Set();
      
      // If no known timezones, this is not anomalous (first time)
      if (knownTimezones.size === 0) {
        await redisService.addToSet(trackingKey, timezone, 90 * 24 * 60 * 60); // 90 days TTL
        return false;
      }

      // Check if timezone is known
      const isKnown = knownTimezones.has(timezone);
      
      if (!isKnown) {
        await redisService.addToSet(trackingKey, timezone, 90 * 24 * 60 * 60);
        return true; // New timezone is anomalous
      }

      return false;
    } catch (error) {
      console.error('Timezone anomaly check failed:', sanitizeForLogging({ 
        userId,
        timezone,
        error: error.message 
      }));
      return false;
    }
  }

  /**
   * Get device history for a user
   * @param {string} userId - User ID
   * @returns {Object} Device history
   */
  async getDeviceHistory(userId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const trackingKey = `${REDIS_PREFIXES.USER_ACTIVITY}${userId}:devices`;
      const deviceHistory = await redisService.getHash(trackingKey) || {};
      
      const devices = {};
      Object.entries(deviceHistory).forEach(([fingerprint, deviceData]) => {
        try {
          devices[fingerprint] = JSON.parse(deviceData);
        } catch (e) {
          // Skip invalid device data
        }
      });

      return devices;
    } catch (error) {
      console.error('Get device history failed:', sanitizeForLogging({ 
        userId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Invalidate device session
   * @param {string} sessionId - Session ID to invalidate
   */
  async invalidateDeviceSession(sessionId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const sessionKey = `${REDIS_PREFIXES.SESSION}${sessionId}:device`;
      const deviceData = await redisService.get(sessionKey);
      
      if (deviceData) {
        const { deviceFingerprint, userId } = JSON.parse(deviceData);
        
        // Update device tracking to mark as inactive
        const trackingKey = `${REDIS_PREFIXES.USER_ACTIVITY}${userId}:devices`;
        const existingDevice = await redisService.getHashField(trackingKey, deviceFingerprint);
        
        if (existingDevice) {
          const device = JSON.parse(existingDevice);
          device.isActive = false;
          device.invalidatedAt = new Date().toISOString();
          
          await redisService.setHashField(
            trackingKey,
            deviceFingerprint,
            JSON.stringify(device),
            90 * 24 * 60 * 60 // 90 days TTL
          );
        }
        
        // Remove session-to-device mapping
        await redisService.delete(sessionKey);
      }

      return true;
    } catch (error) {
      console.error('Device session invalidation failed:', sanitizeForLogging({ 
        sessionId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Handle critical suspicious activity (requirement 1.4)
   * Automatically invalidate all user sessions for critical threats
   * @param {string} userId - User ID
   * @param {Object} suspicionResult - Suspicion analysis result
   * @param {Object} deviceProfile - Device profile
   */
  async handleCriticalSuspiciousActivity(userId, suspicionResult, deviceProfile) {
    try {
      // Import sessionService here to avoid circular dependency
      const sessionService = require('./sessionService');
      
      // Invalidate all user sessions for critical threats
      const invalidationResult = await sessionService.invalidateAllUserSessions(
        userId, 
        'critical_suspicious_device_activity', 
        true // blacklist tokens
      );

      // Log the automatic session invalidation
      const securityEvent = formatSecurityEvent(
        SECURITY_EVENTS.SESSION_INVALIDATED,
        SEVERITY_LEVELS.CRITICAL,
        {
          reason: 'automatic_invalidation_critical_suspicious_activity',
          suspicionScore: suspicionResult.suspicionScore,
          riskLevel: suspicionResult.riskLevel,
          factors: suspicionResult.factors,
          deviceFingerprint: deviceProfile.deviceFingerprint,
          ip: deviceProfile.deviceInfo.ip,
          userAgent: deviceProfile.deviceInfo.userAgent,
          invalidatedSessions: invalidationResult.invalidatedSessions,
          blacklistedTokens: invalidationResult.blacklistedTokens
        },
        userId
      );

      await redisService.storeSecurityEvent(
        `critical_auto_invalidation_${userId}_${Date.now()}`,
        securityEvent
      );

      console.log(`Critical suspicious activity detected for user ${userId}. Invalidated ${invalidationResult.invalidatedSessions} sessions and blacklisted ${invalidationResult.blacklistedTokens} token sets.`);
      
      return invalidationResult;
    } catch (error) {
      console.error('Critical suspicious activity handling failed:', sanitizeForLogging({ 
        userId,
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Send real-time alerts for suspicious activity (requirement 5.2)
   * @param {string} userId - User ID
   * @param {Object} suspicionResult - Suspicion analysis result
   * @param {Object} deviceProfile - Device profile
   */
  async sendSuspiciousActivityAlert(userId, suspicionResult, deviceProfile) {
    try {
      // Prepare alert message based on risk level
      const riskEmoji = {
        'medium': '⚠️',
        'high': '🚨',
        'critical': '🔴'
      };

      const factorDescriptions = {
        'new_device': 'New device detected',
        'new_ip_address': 'New IP address',
        'suspicious_ip': 'Suspicious IP address',
        'suspicious_user_agent': 'Suspicious user agent',
        'rapid_device_switching': 'Rapid device switching',
        'geographic_anomaly': 'Geographic anomaly'
      };

      const factorList = suspicionResult.factors
        .map(factor => factorDescriptions[factor] || factor)
        .join(', ');

      const alertMessage = `${riskEmoji[suspicionResult.riskLevel]} Suspicious device activity detected for user ${userId}. Risk Level: ${suspicionResult.riskLevel.toUpperCase()} (Score: ${suspicionResult.suspicionScore}). Factors: ${factorList}. IP: ${deviceProfile.deviceInfo.ip}`;

      // Send notification to super admins for high/critical alerts
      if (suspicionResult.riskLevel === 'high' || suspicionResult.riskLevel === 'critical') {
        await NotificationService.sendSuperAdminNotification(
          alertMessage,
          suspicionResult.riskLevel === 'critical' ? 'critical' : 'high',
          null // system generated
        );
      }

      // Send notification to regular admins for medium+ alerts
      if (suspicionResult.riskLevel !== 'low') {
        await NotificationService.sendAdminNotification(
          alertMessage,
          suspicionResult.riskLevel === 'critical' ? 'critical' : 
          suspicionResult.riskLevel === 'high' ? 'high' : 'medium',
          null // system generated
        );
      }

      // Log the alert sending
      const alertEvent = formatSecurityEvent(
        'suspicious_activity_alert_sent',
        suspicionResult.riskLevel === 'critical' ? SEVERITY_LEVELS.CRITICAL : 
        suspicionResult.riskLevel === 'high' ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
        {
          alertMessage,
          riskLevel: suspicionResult.riskLevel,
          suspicionScore: suspicionResult.suspicionScore,
          factors: suspicionResult.factors,
          deviceFingerprint: deviceProfile.deviceFingerprint,
          ip: deviceProfile.deviceInfo.ip,
          notificationsSent: {
            superAdmin: suspicionResult.riskLevel === 'high' || suspicionResult.riskLevel === 'critical',
            admin: suspicionResult.riskLevel !== 'low'
          }
        },
        userId
      );

      await redisService.storeSecurityEvent(
        `suspicious_alert_${userId}_${Date.now()}`,
        alertEvent
      );

      return true;
    } catch (error) {
      console.error('Suspicious activity alert failed:', sanitizeForLogging({ 
        userId,
        error: error.message 
      }));
      // Don't throw error to avoid breaking the main flow
      return false;
    }
  }

  /**
   * Check if service is initialized
   * @returns {boolean} Initialization status
   */
  isReady() {
    return this.isInitialized && redisService.isReady();
  }
}

// Export singleton instance
module.exports = new DeviceFingerprintService();