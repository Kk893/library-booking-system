/**
 * Unit Tests for Redis Service
 * Tests Redis connection management and security-specific operations
 */

const redisService = require('../redisService');
const { REDIS_PREFIXES } = require('../utils/constants');

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  quit: jest.fn(),
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  incrByFloat: jest.fn(),
  expire: jest.fn(),
  multi: jest.fn(),
  on: jest.fn(),
  isReady: true,
};

// Mock multi transaction
const mockMulti = {
  incr: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  incrByFloat: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('RedisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient.multi.mockReturnValue(mockMulti);
    redisService.isConnected = false;
    redisService.client = null;
  });

  afterEach(async () => {
    if (redisService.isConnected) {
      await redisService.disconnect();
    }
  });

  describe('initialize', () => {
    it('should initialize Redis connection with default configuration', async () => {
      mockRedisClient.connect.mockResolvedValue();
      
      const result = await redisService.initialize();
      
      expect(result).toBe(true);
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(redisService.isConnected).toBe(true);
    });

    it('should initialize Redis connection with custom configuration', async () => {
      mockRedisClient.connect.mockResolvedValue();
      
      const config = {
        host: 'custom-host',
        port: 6380,
        password: 'custom-password',
        db: 1,
        tls: true,
      };
      
      const result = await redisService.initialize(config);
      
      expect(result).toBe(true);
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValue(connectionError);
      
      await expect(redisService.initialize()).rejects.toThrow('Connection failed');
      expect(redisService.isConnected).toBe(false);
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue();
      await redisService.initialize();
    });

    it('should store session data with TTL', async () => {
      const sessionId = 'test-session-id';
      const sessionData = { userId: '123', role: 'user' };
      
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await redisService.setSession(sessionId, sessionData);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.SESSION}${sessionId}`,
        expect.any(Number),
        JSON.stringify(sessionData)
      );
    });

    it('should retrieve session data', async () => {
      const sessionId = 'test-session-id';
      const sessionData = { userId: '123', role: 'user' };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));
      
      const result = await redisService.getSession(sessionId);
      
      expect(result).toEqual(sessionData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.SESSION}${sessionId}`
      );
    });

    it('should return null for non-existent session', async () => {
      const sessionId = 'non-existent-session';
      
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await redisService.getSession(sessionId);
      
      expect(result).toBeNull();
    });

    it('should delete session data', async () => {
      const sessionId = 'test-session-id';
      
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await redisService.deleteSession(sessionId);
      
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.SESSION}${sessionId}`
      );
    });
  });

  describe('token blacklisting', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue();
      await redisService.initialize();
    });

    it('should blacklist a token', async () => {
      const token = 'test-token';
      
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await redisService.blacklistToken(token);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.TOKEN_BLACKLIST}${token}`,
        expect.any(Number),
        'blacklisted'
      );
    });

    it('should check if token is blacklisted', async () => {
      const token = 'blacklisted-token';
      
      mockRedisClient.get.mockResolvedValue('blacklisted');
      
      const result = await redisService.isTokenBlacklisted(token);
      
      expect(result).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.TOKEN_BLACKLIST}${token}`
      );
    });

    it('should return false for non-blacklisted token', async () => {
      const token = 'valid-token';
      
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await redisService.isTokenBlacklisted(token);
      
      expect(result).toBe(false);
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue();
      await redisService.initialize();
    });

    it('should increment rate limit counter', async () => {
      const identifier = 'test-ip';
      const windowMs = 900000; // 15 minutes
      
      mockMulti.exec.mockResolvedValue([5, 'OK']); // incr result, expire result
      
      const result = await redisService.incrementRateLimit(identifier, windowMs);
      
      expect(result).toBe(5);
      expect(mockMulti.incr).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.RATE_LIMIT}${identifier}`
      );
      expect(mockMulti.expire).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.RATE_LIMIT}${identifier}`,
        900 // seconds
      );
    });

    it('should get current rate limit count', async () => {
      const identifier = 'test-ip';
      
      mockRedisClient.get.mockResolvedValue('3');
      
      const result = await redisService.getRateLimitCount(identifier);
      
      expect(result).toBe(3);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.RATE_LIMIT}${identifier}`
      );
    });

    it('should return 0 for non-existent rate limit', async () => {
      const identifier = 'new-ip';
      
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await redisService.getRateLimitCount(identifier);
      
      expect(result).toBe(0);
    });

    it('should reset rate limit counter', async () => {
      const identifier = 'test-ip';
      
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await redisService.resetRateLimit(identifier);
      
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.RATE_LIMIT}${identifier}`
      );
    });
  });

  describe('IP reputation', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue();
      await redisService.initialize();
    });

    it('should update IP reputation score', async () => {
      const ip = '192.168.1.1';
      const score = -10;
      
      mockMulti.exec.mockResolvedValue([-15.5, 'OK']); // incrByFloat result, expire result
      
      const result = await redisService.updateIPReputation(ip, score);
      
      expect(result).toBe(-15.5);
      expect(mockMulti.incrByFloat).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.IP_REPUTATION}${ip}`,
        score
      );
    });

    it('should get IP reputation score', async () => {
      const ip = '192.168.1.1';
      
      mockRedisClient.get.mockResolvedValue('-5.5');
      
      const result = await redisService.getIPReputation(ip);
      
      expect(result).toBe(-5.5);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `${REDIS_PREFIXES.IP_REPUTATION}${ip}`
      );
    });

    it('should return 0 for new IP', async () => {
      const ip = '192.168.1.2';
      
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await redisService.getIPReputation(ip);
      
      expect(result).toBe(0);
    });
  });

  describe('connection management', () => {
    it('should check if Redis is ready', () => {
      redisService.isConnected = true;
      redisService.client = mockRedisClient;
      
      const result = redisService.isReady();
      
      expect(result).toBe(true);
    });

    it('should return false when not connected', () => {
      redisService.isConnected = false;
      redisService.client = null;
      
      const result = redisService.isReady();
      
      expect(result).toBe(false);
    });

    it('should disconnect gracefully', async () => {
      redisService.isConnected = true;
      redisService.client = mockRedisClient;
      
      mockRedisClient.quit.mockResolvedValue();
      
      await redisService.disconnect();
      
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(redisService.isConnected).toBe(false);
      expect(redisService.client).toBeNull();
    });

    it('should get health status', () => {
      redisService.isConnected = true;
      redisService.client = mockRedisClient;
      redisService.connectionAttempts = 2;
      
      const status = redisService.getHealthStatus();
      
      expect(status).toEqual({
        connected: true,
        ready: true,
        connectionAttempts: 2,
        lastError: null,
      });
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue();
      await redisService.initialize();
    });

    it('should throw error when Redis is not ready for session operations', async () => {
      redisService.isConnected = false;
      
      await expect(redisService.setSession('test', {})).rejects.toThrow(
        'Redis connection not available'
      );
    });

    it('should throw error when Redis is not ready for rate limiting', async () => {
      redisService.isConnected = false;
      
      await expect(redisService.incrementRateLimit('test')).rejects.toThrow(
        'Redis connection not available'
      );
    });

    it('should handle Redis operation errors', async () => {
      const error = new Error('Redis operation failed');
      mockRedisClient.setEx.mockRejectedValue(error);
      
      await expect(redisService.setSession('test', {})).rejects.toThrow(
        'Redis operation failed'
      );
    });
  });
});