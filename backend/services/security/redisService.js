/**
 * Redis Connection Service for Security Features
 * Handles Redis connection management, error handling, and security-specific operations
 */

const redis = require('redis');
const { REDIS_PREFIXES, TIMEOUTS } = require('./utils/constants');
const { generateRedisKey, calculateTTL, sanitizeForLogging } = require('./utils/securityHelpers');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize Redis connection with security configuration
   * @param {Object} config - Redis configuration object
   */
  async initialize(config = {}) {
    const redisConfig = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || process.env.REDIS_PORT || 6379,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || process.env.REDIS_DB || 0,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
    };

    // Configure TLS if enabled
    if (config.tls || process.env.REDIS_TLS_ENABLED === 'true') {
      redisConfig.tls = {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      };
    }

    try {
      this.client = redis.createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port,
          tls: redisConfig.tls,
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              console.error('Redis: Maximum retry attempts reached');
              return new Error('Redis connection failed after maximum retries');
            }
            return Math.min(retries * this.retryDelay, 5000);
          },
        },
        password: redisConfig.password,
        database: redisConfig.db,
      });

      // Set up event listeners
      this.setupEventListeners();

      // Connect to Redis
      await this.client.connect();
      this.isConnected = true;
      this.connectionAttempts = 0;

      console.log('Redis: Successfully connected for security services');
      return true;
    } catch (error) {
      console.error('Redis: Connection failed:', sanitizeForLogging({ error: error.message }));
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Set up Redis event listeners for connection monitoring
   */
  setupEventListeners() {
    this.client.on('connect', () => {
      console.log('Redis: Connection established');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis: Ready to accept commands');
    });

    this.client.on('error', (error) => {
      console.error('Redis: Connection error:', sanitizeForLogging({ error: error.message }));
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('Redis: Connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis: Attempting to reconnect...');
      this.connectionAttempts++;
    });
  }

  /**
   * Check if Redis is connected and ready
   * @returns {boolean} Connection status
   */
  isReady() {
    return this.isConnected && this.client && this.client.isReady;
  }

  /**
   * Store session data with TTL
   * @param {string} sessionId - Session identifier
   * @param {Object} sessionData - Session data to store
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async setSession(sessionId, sessionData, ttl = null) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.SESSION, sessionId);
    const serializedData = JSON.stringify(sessionData);
    const sessionTTL = ttl || calculateTTL('session');

    try {
      await this.client.setEx(key, sessionTTL, serializedData);
      return true;
    } catch (error) {
      console.error('Redis: Failed to set session:', sanitizeForLogging({ 
        sessionId, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Retrieve session data
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session data or null if not found
   */
  async getSession(sessionId) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.SESSION, sessionId);

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis: Failed to get session:', sanitizeForLogging({ 
        sessionId, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Delete session data
   * @param {string} sessionId - Session identifier
   */
  async deleteSession(sessionId) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.SESSION, sessionId);

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis: Failed to delete session:', sanitizeForLogging({ 
        sessionId, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Blacklist a token with TTL
   * @param {string} token - Token to blacklist
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async blacklistToken(token, ttl = null) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.TOKEN_BLACKLIST, token);
    const tokenTTL = ttl || calculateTTL('token_blacklist');

    try {
      await this.client.setEx(key, tokenTTL, 'blacklisted');
      return true;
    } catch (error) {
      console.error('Redis: Failed to blacklist token:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - Token to check
   * @returns {boolean} True if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    if (!this.isReady()) {
      console.warn('Redis connection not available, skipping token blacklist check');
      return false; // Allow access when Redis is not available
    }

    const key = generateRedisKey(REDIS_PREFIXES.TOKEN_BLACKLIST, token);

    try {
      const result = await this.client.get(key);
      return result !== null;
    } catch (error) {
      console.error('Redis: Failed to check token blacklist:', sanitizeForLogging({ 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Increment rate limit counter
   * @param {string} identifier - Rate limit identifier (IP, user, etc.)
   * @param {number} windowMs - Time window in milliseconds
   * @returns {number} Current count
   */
  async incrementRateLimit(identifier, windowMs = TIMEOUTS.RATE_LIMIT_WINDOW) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, identifier);
    const windowSeconds = Math.floor(windowMs / 1000);

    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, windowSeconds);
      
      const results = await multi.exec();
      return results[0]; // Return the incremented count
    } catch (error) {
      console.error('Redis: Failed to increment rate limit:', sanitizeForLogging({ 
        identifier, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get current rate limit count
   * @param {string} identifier - Rate limit identifier
   * @returns {number} Current count
   */
  async getRateLimitCount(identifier) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, identifier);

    try {
      const count = await this.client.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error('Redis: Failed to get rate limit count:', sanitizeForLogging({ 
        identifier, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Reset rate limit counter
   * @param {string} identifier - Rate limit identifier
   */
  async resetRateLimit(identifier) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.RATE_LIMIT, identifier);

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis: Failed to reset rate limit:', sanitizeForLogging({ 
        identifier, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Store security event with TTL
   * @param {string} eventId - Event identifier
   * @param {Object} eventData - Event data
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async storeSecurityEvent(eventId, eventData, ttl = null) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.SECURITY_EVENT, eventId);
    const serializedData = JSON.stringify(sanitizeForLogging(eventData));
    const eventTTL = ttl || calculateTTL('security_event');

    try {
      await this.client.setEx(key, eventTTL, serializedData);
      return true;
    } catch (error) {
      console.error('Redis: Failed to store security event:', sanitizeForLogging({ 
        eventId, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Update IP reputation score
   * @param {string} ip - IP address
   * @param {number} score - Reputation score adjustment
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async updateIPReputation(ip, score, ttl = null) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.IP_REPUTATION, ip);
    const reputationTTL = ttl || calculateTTL('ip_block');

    try {
      const multi = this.client.multi();
      multi.incrByFloat(key, score);
      multi.expire(key, reputationTTL);
      
      const results = await multi.exec();
      return parseFloat(results[0]) || 0;
    } catch (error) {
      console.error('Redis: Failed to update IP reputation:', sanitizeForLogging({ 
        ip, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get IP reputation score
   * @param {string} ip - IP address
   * @returns {number} Reputation score
   */
  async getIPReputation(ip) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.IP_REPUTATION, ip);

    try {
      const score = await this.client.get(key);
      return score ? parseFloat(score) : 0;
    } catch (error) {
      console.error('Redis: Failed to get IP reputation:', sanitizeForLogging({ 
        ip, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get all session IDs for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of session IDs
   */
  async getUserSessions(userId) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      // Search for all session keys and filter by userId
      const sessionPattern = generateRedisKey(REDIS_PREFIXES.SESSION, '*');
      const keys = await this.client.keys(sessionPattern);
      const userSessions = [];

      for (const key of keys) {
        try {
          const sessionData = await this.client.get(key);
          if (sessionData) {
            const parsed = JSON.parse(sessionData);
            if (parsed.userId === userId) {
              // Extract session ID from key
              const sessionId = key.replace(REDIS_PREFIXES.SESSION, '');
              userSessions.push(sessionId);
            }
          }
        } catch (parseError) {
          console.warn('Redis: Failed to parse session data for key:', key);
        }
      }

      return userSessions;
    } catch (error) {
      console.error('Redis: Failed to get user sessions:', sanitizeForLogging({ 
        userId, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Increment user token version (invalidates all existing tokens)
   * @param {string} userId - User ID
   * @returns {number} New token version
   */
  async incrementUserTokenVersion(userId) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.USER_ACTIVITY, `token_version:${userId}`);

    try {
      const newVersion = await this.client.incr(key);
      // Set TTL to match session TTL
      await this.client.expire(key, calculateTTL('session'));
      return newVersion;
    } catch (error) {
      console.error('Redis: Failed to increment user token version:', sanitizeForLogging({ 
        userId, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get user token version
   * @param {string} userId - User ID
   * @returns {number} Current token version
   */
  async getUserTokenVersion(userId) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    const key = generateRedisKey(REDIS_PREFIXES.USER_ACTIVITY, `token_version:${userId}`);

    try {
      const version = await this.client.get(key);
      return version ? parseInt(version, 10) : 0;
    } catch (error) {
      console.error('Redis: Failed to get user token version:', sanitizeForLogging({ 
        userId, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log('Redis: Connection closed gracefully');
      } catch (error) {
        console.error('Redis: Error during disconnect:', sanitizeForLogging({ 
          error: error.message 
        }));
      } finally {
        this.isConnected = false;
        this.client = null;
      }
    }
  }

  /**
   * Set a key-value pair with TTL
   * @param {string} key - Redis key
   * @param {string} value - Value to store
   * @param {number} ttl - Time to live in seconds
   */
  async setWithTTL(key, value, ttl) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Redis: Failed to set key with TTL:', sanitizeForLogging({ 
        key, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get value by key
   * @param {string} key - Redis key
   * @returns {string|null} Value or null if not found
   */
  async get(key) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis: Failed to get key:', sanitizeForLogging({ 
        key, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Delete a key
   * @param {string} key - Redis key to delete
   */
  async delete(key) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis: Failed to delete key:', sanitizeForLogging({ 
        key, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get all fields from a hash
   * @param {string} key - Hash key
   * @returns {Object} Hash fields and values
   */
  async getHash(key) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      console.error('Redis: Failed to get hash:', sanitizeForLogging({ 
        key, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Set a field in a hash with TTL
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @param {string} value - Field value
   * @param {number} ttl - Time to live in seconds
   */
  async setHashField(key, field, value, ttl) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      const multi = this.client.multi();
      multi.hSet(key, field, value);
      multi.expire(key, ttl);
      await multi.exec();
      return true;
    } catch (error) {
      console.error('Redis: Failed to set hash field:', sanitizeForLogging({ 
        key, 
        field, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get a field from a hash
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @returns {string|null} Field value or null if not found
   */
  async getHashField(key, field) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      console.error('Redis: Failed to get hash field:', sanitizeForLogging({ 
        key, 
        field, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get all members of a set
   * @param {string} key - Set key
   * @returns {Set} Set of members
   */
  async getSet(key) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      const members = await this.client.sMembers(key);
      return new Set(members);
    } catch (error) {
      console.error('Redis: Failed to get set:', sanitizeForLogging({ 
        key, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Add member to a set with TTL
   * @param {string} key - Set key
   * @param {string} member - Member to add
   * @param {number} ttl - Time to live in seconds
   */
  async addToSet(key, member, ttl) {
    if (!this.isReady()) {
      throw new Error('Redis connection not available');
    }

    try {
      const multi = this.client.multi();
      multi.sAdd(key, member);
      multi.expire(key, ttl);
      await multi.exec();
      return true;
    } catch (error) {
      console.error('Redis: Failed to add to set:', sanitizeForLogging({ 
        key, 
        member, 
        error: error.message 
      }));
      throw error;
    }
  }

  /**
   * Get Redis connection health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      connected: this.isConnected,
      ready: this.isReady(),
      connectionAttempts: this.connectionAttempts,
      lastError: this.lastError || null,
    };
  }
}

// Export singleton instance
module.exports = new RedisService();