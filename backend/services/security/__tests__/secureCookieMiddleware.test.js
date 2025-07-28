const SecureCookieMiddleware = require('../secureCookieMiddleware');
const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

// Mock crypto for consistent testing
jest.mock('crypto');

describe('SecureCookieMiddleware', () => {
  let secureCookies;
  let app;

  beforeEach(() => {
    secureCookies = new SecureCookieMiddleware();
    app = express();
    
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.COOKIE_SECRET;
    delete process.env.COOKIE_ENCRYPTION_KEY;
    delete process.env.COOKIE_DOMAIN;
    delete process.env.COOKIE_MAX_AGE;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock crypto.randomBytes for consistent testing
    crypto.randomBytes.mockReturnValue(Buffer.from('a'.repeat(64), 'hex'));
  });

  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
  });

  describe('Constructor and Environment Detection', () => {
    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECRET = 'production-secret-key-that-is-very-long-and-secure';
      process.env.COOKIE_ENCRYPTION_KEY = 'a'.repeat(64);
      
      secureCookies = new SecureCookieMiddleware();
      
      expect(secureCookies.isProduction).toBe(true);
      expect(secureCookies.cookieSecret).toBe('production-secret-key-that-is-very-long-and-secure');
    });

    test('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      secureCookies = new SecureCookieMiddleware();
      
      expect(secureCookies.isDevelopment).toBe(true);
      expect(secureCookies.isProduction).toBe(false);
    });

    test('should use custom domain when configured', () => {
      process.env.COOKIE_DOMAIN = '.example.com';
      secureCookies = new SecureCookieMiddleware();
      
      expect(secureCookies.domain).toBe('.example.com');
    });

    test('should use custom max age when configured', () => {
      process.env.COOKIE_MAX_AGE = '3600000'; // 1 hour
      secureCookies = new SecureCookieMiddleware();
      
      expect(secureCookies.maxAge).toBe(3600000);
    });

    test('should throw error for missing cookie secret in production', () => {
      process.env.NODE_ENV = 'production';
      
      expect(() => new SecureCookieMiddleware()).toThrow('COOKIE_SECRET environment variable is required in production');
    });

    test('should throw error for missing encryption key in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECRET = 'production-secret';
      
      expect(() => new SecureCookieMiddleware()).toThrow('COOKIE_ENCRYPTION_KEY environment variable is required in production');
    });
  });

  describe('Secret Generation', () => {
    test('should generate cookie secret in development', () => {
      process.env.NODE_ENV = 'development';
      
      const secret = secureCookies.generateCookieSecret();
      
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(crypto.randomBytes).toHaveBeenCalledWith(64);
    });

    test('should generate encryption key in development', () => {
      process.env.NODE_ENV = 'development';
      
      const key = secureCookies.generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });
  });

  describe('Secure Cookie Configuration', () => {
    test('should return secure cookie config for production', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECRET = 'production-secret';
      process.env.COOKIE_ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.COOKIE_DOMAIN = '.example.com';
      
      secureCookies = new SecureCookieMiddleware();
      const config = secureCookies.getSecureCookieConfig();
      
      expect(config).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        signed: true,
        domain: '.example.com'
      });
    });

    test('should return development cookie config', () => {
      process.env.NODE_ENV = 'development';
      secureCookies = new SecureCookieMiddleware();
      
      const config = secureCookies.getSecureCookieConfig();
      
      expect(config).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        signed: true
      });
    });

    test('should merge custom options with defaults', () => {
      const config = secureCookies.getSecureCookieConfig({
        maxAge: 3600000,
        path: '/api',
        customOption: 'value'
      });
      
      expect(config.maxAge).toBe(3600000);
      expect(config.path).toBe('/api');
      expect(config.customOption).toBe('value');
      expect(config.httpOnly).toBe(true);
    });
  });

  describe('Cookie Encryption and Decryption', () => {
    beforeEach(() => {
      // Mock crypto functions for encryption/decryption
      const mockCipher = {
        setAAD: jest.fn(),
        update: jest.fn().mockReturnValue('encrypted'),
        final: jest.fn().mockReturnValue('data'),
        getAuthTag: jest.fn().mockReturnValue(Buffer.from('authtag'))
      };
      
      const mockDecipher = {
        setAAD: jest.fn(),
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue('decrypted'),
        final: jest.fn().mockReturnValue('data')
      };
      
      crypto.createCipher = jest.fn().mockReturnValue(mockCipher);
      crypto.createDecipher = jest.fn().mockReturnValue(mockDecipher);
      crypto.randomBytes.mockReturnValue(Buffer.from('1234567890123456'));
    });

    test('should encrypt cookie data', () => {
      const encrypted = secureCookies.encryptCookieData('sensitive-data');
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.includes(':')).toBe(true);
    });

    test('should decrypt cookie data', () => {
      const encryptedData = '31323334353637383930313233343536:617574687461670000000000000000000000000000000000:encrypteddata';
      
      const decrypted = secureCookies.decryptCookieData(encryptedData);
      
      expect(decrypted).toBe('decrypteddata');
    });

    test('should handle encryption errors', () => {
      crypto.createCipher.mockImplementation(() => {
        throw new Error('Encryption failed');
      });
      
      expect(() => secureCookies.encryptCookieData('data')).toThrow('Failed to encrypt cookie data');
    });

    test('should handle decryption errors', () => {
      crypto.createDecipher.mockImplementation(() => {
        throw new Error('Decryption failed');
      });
      
      expect(() => secureCookies.decryptCookieData('invalid:data:format')).toThrow('Failed to decrypt cookie data');
    });

    test('should handle invalid encrypted data format', () => {
      expect(() => secureCookies.decryptCookieData('invalid-format')).toThrow('Failed to decrypt cookie data');
    });
  });

  describe('Setting and Getting Secure Cookies', () => {
    let mockRes, mockReq;

    beforeEach(() => {
      mockRes = {
        cookie: jest.fn(),
        clearCookie: jest.fn()
      };
      
      mockReq = {
        signedCookies: {},
        cookies: {}
      };

      // Mock encryption for testing
      secureCookies.encryptCookieData = jest.fn().mockReturnValue('encrypted-value');
      secureCookies.decryptCookieData = jest.fn().mockReturnValue('decrypted-value');
    });

    test('should set secure cookie with encryption for sensitive fields', () => {
      secureCookies.setSecureCookie(mockRes, 'refreshToken', 'token-value');
      
      expect(secureCookies.encryptCookieData).toHaveBeenCalledWith('token-value');
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'encrypted-value', expect.objectContaining({
        httpOnly: true,
        signed: true
      }));
    });

    test('should set secure cookie without encryption for non-sensitive fields', () => {
      secureCookies.setSecureCookie(mockRes, 'theme', 'dark');
      
      expect(secureCookies.encryptCookieData).not.toHaveBeenCalled();
      expect(mockRes.cookie).toHaveBeenCalledWith('theme', 'dark', expect.objectContaining({
        httpOnly: true,
        signed: true
      }));
    });

    test('should force encryption when encrypt option is true', () => {
      secureCookies.setSecureCookie(mockRes, 'customData', 'value', { encrypt: true });
      
      expect(secureCookies.encryptCookieData).toHaveBeenCalledWith('value');
    });

    test('should get secure cookie with decryption', () => {
      mockReq.signedCookies.refreshToken = 'iv:tag:encrypted';
      
      const value = secureCookies.getSecureCookie(mockReq, 'refreshToken');
      
      expect(secureCookies.decryptCookieData).toHaveBeenCalledWith('iv:tag:encrypted');
      expect(value).toBe('decrypted-value');
    });

    test('should get secure cookie without decryption for non-sensitive fields', () => {
      mockReq.signedCookies.theme = 'dark';
      
      const value = secureCookies.getSecureCookie(mockReq, 'theme');
      
      expect(secureCookies.decryptCookieData).not.toHaveBeenCalled();
      expect(value).toBe('dark');
    });

    test('should return null for non-existent cookie', () => {
      const value = secureCookies.getSecureCookie(mockReq, 'nonexistent');
      
      expect(value).toBeNull();
    });

    test('should handle cookie decryption errors gracefully', () => {
      mockReq.signedCookies.refreshToken = 'invalid:encrypted:data';
      secureCookies.decryptCookieData = jest.fn().mockImplementation(() => {
        throw new Error('Decryption failed');
      });
      
      const value = secureCookies.getSecureCookie(mockReq, 'refreshToken');
      
      expect(value).toBeNull();
    });

    test('should clear secure cookie', () => {
      secureCookies.clearSecureCookie(mockRes, 'sessionId');
      
      expect(mockRes.clearCookie).toHaveBeenCalledWith('sessionId', expect.objectContaining({
        maxAge: 0,
        expires: new Date(0)
      }));
    });
  });

  describe('Cookie Parser Configuration', () => {
    test('should return cookie parser config', () => {
      const config = secureCookies.getCookieParserConfig();
      
      expect(config).toEqual({
        secret: secureCookies.cookieSecret,
        signed: true
      });
    });
  });

  describe('Session Cookie Configuration', () => {
    test('should return session cookie config', () => {
      const config = secureCookies.getSessionCookieConfig();
      
      expect(config).toEqual({
        name: 'sessionId',
        secret: secureCookies.cookieSecret,
        resave: false,
        saveUninitialized: false,
        cookie: expect.objectContaining({
          httpOnly: true,
          signed: true,
          maxAge: 24 * 60 * 60 * 1000
        }),
        rolling: true
      });
    });
  });

  describe('Secure Cookie Middleware', () => {
    test('should override res.cookie with secure defaults', async () => {
      const middleware = secureCookies.getSecureCookieMiddleware();
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.cookie('testCookie', 'value');
        res.json({ success: true });
      });

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
      // Cookie should be set with secure defaults
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should add helper methods to request and response objects', async () => {
      const middleware = secureCookies.getSecureCookieMiddleware();
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        // Test that helper methods are available
        expect(typeof res.setSecureCookie).toBe('function');
        expect(typeof res.clearSecureCookie).toBe('function');
        expect(typeof req.getSecureCookie).toBe('function');
        
        res.json({ success: true });
      });

      await request(app).get('/test');
    });
  });

  describe('Cookie Configuration Validation', () => {
    test('should validate production configuration with all requirements', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECRET = 'a'.repeat(64);
      process.env.COOKIE_ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.COOKIE_DOMAIN = '.example.com';
      
      secureCookies = new SecureCookieMiddleware();
      const validation = secureCookies.validateCookieConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.config.production).toBe(true);
    });

    test('should identify missing production requirements', () => {
      process.env.NODE_ENV = 'production';
      // Don't set required environment variables
      
      // Mock the constructor to not throw
      secureCookies.isProduction = true;
      secureCookies.cookieSecret = 'short';
      secureCookies.encryptionKey = 'invalid';
      
      const validation = secureCookies.validateCookieConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('COOKIE_SECRET environment variable is required in production');
      expect(validation.issues).toContain('COOKIE_ENCRYPTION_KEY environment variable is required in production');
    });

    test('should identify weak cookie secret', () => {
      secureCookies.cookieSecret = 'short';
      secureCookies.encryptionKey = 'a'.repeat(64);
      
      const validation = secureCookies.validateCookieConfig();
      
      expect(validation.warnings).toContain('Cookie secret should be at least 32 characters long');
    });

    test('should identify invalid encryption key', () => {
      secureCookies.cookieSecret = 'a'.repeat(64);
      secureCookies.encryptionKey = 'invalid-hex';
      
      const validation = secureCookies.validateCookieConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Cookie encryption key must be valid hex string');
    });

    test('should warn about missing domain in production', () => {
      process.env.NODE_ENV = 'production';
      secureCookies.isProduction = true;
      secureCookies.domain = null;
      secureCookies.cookieSecret = 'a'.repeat(64);
      secureCookies.encryptionKey = 'a'.repeat(64);
      
      const validation = secureCookies.validateCookieConfig();
      
      expect(validation.warnings).toContain('COOKIE_DOMAIN should be set in production for security');
    });
  });

  describe('Cookie Security Headers', () => {
    test('should set security headers in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECRET = 'a'.repeat(64);
      process.env.COOKIE_ENCRYPTION_KEY = 'a'.repeat(64);
      
      secureCookies = new SecureCookieMiddleware();
      const middleware = secureCookies.getCookieSecurityHeaders();
      
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['set-cookie-samesite']).toBe('Strict');
      expect(response.headers['set-cookie-secure']).toBe('true');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should not set production headers in development', async () => {
      process.env.NODE_ENV = 'development';
      secureCookies = new SecureCookieMiddleware();
      
      const middleware = secureCookies.getCookieSecurityHeaders();
      
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['set-cookie-samesite']).toBeUndefined();
      expect(response.headers['set-cookie-secure']).toBeUndefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Middleware Stack', () => {
    test('should return array of middleware functions', () => {
      const stack = secureCookies.getMiddlewareStack();
      
      expect(Array.isArray(stack)).toBe(true);
      expect(stack).toHaveLength(2);
      expect(typeof stack[0]).toBe('function');
      expect(typeof stack[1]).toBe('function');
    });

    test('should apply all middleware in stack', async () => {
      const stack = secureCookies.getMiddlewareStack();
      stack.forEach(middleware => app.use(middleware));
      
      app.get('/test', (req, res) => {
        // Test that all middleware effects are applied
        expect(typeof res.setSecureCookie).toBe('function');
        expect(typeof req.getSecureCookie).toBe('function');
        res.json({ test: true });
      });

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Error Handling', () => {
    test('should handle cookie setting errors', () => {
      const mockRes = {
        cookie: jest.fn().mockImplementation(() => {
          throw new Error('Cookie setting failed');
        })
      };
      
      expect(() => secureCookies.setSecureCookie(mockRes, 'test', 'value')).toThrow('Cookie setting failed');
    });

    test('should handle encryption errors during cookie setting', () => {
      const mockRes = { cookie: jest.fn() };
      
      secureCookies.encryptCookieData = jest.fn().mockImplementation(() => {
        throw new Error('Encryption failed');
      });
      
      expect(() => secureCookies.setSecureCookie(mockRes, 'refreshToken', 'value')).toThrow('Encryption failed');
    });
  });
});