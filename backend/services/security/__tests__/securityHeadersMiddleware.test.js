const SecurityHeadersMiddleware = require('../securityHeadersMiddleware');
const express = require('express');
const request = require('supertest');

describe('SecurityHeadersMiddleware', () => {
  let securityHeaders;
  let app;

  beforeEach(() => {
    securityHeaders = new SecurityHeadersMiddleware();
    app = express();
  });

  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
  });

  describe('CSP Configuration', () => {
    test('should return base CSP configuration', () => {
      const cspConfig = securityHeaders.getCSPConfig();
      
      expect(cspConfig).toHaveProperty('defaultSrc');
      expect(cspConfig.defaultSrc).toContain("'self'");
      expect(cspConfig.objectSrc).toContain("'none'");
      expect(cspConfig.scriptSrc).toContain("'self'");
      expect(cspConfig.styleSrc).toContain("'self'");
    });

    test('should include development-specific CSP rules in development', () => {
      process.env.NODE_ENV = 'development';
      securityHeaders = new SecurityHeadersMiddleware();
      
      const cspConfig = securityHeaders.getCSPConfig();
      
      expect(cspConfig.scriptSrc).toContain("'unsafe-eval'");
      expect(cspConfig.connectSrc).toContain("ws://localhost:*");
      expect(cspConfig.connectSrc).toContain("http://localhost:*");
    });

    test('should not include development rules in production', () => {
      process.env.NODE_ENV = 'production';
      securityHeaders = new SecurityHeadersMiddleware();
      
      const cspConfig = securityHeaders.getCSPConfig();
      
      expect(cspConfig.scriptSrc).not.toContain("'unsafe-eval'");
      expect(cspConfig.connectSrc).not.toContain("ws://localhost:*");
    });
  });

  describe('HSTS Configuration', () => {
    test('should return proper HSTS configuration', () => {
      const hstsConfig = securityHeaders.getHSTSConfig();
      
      expect(hstsConfig).toEqual({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      });
    });
  });

  describe('Security Headers Middleware', () => {
    test('should apply security headers to responses', async () => {
      const middleware = securityHeaders.getSecurityHeadersMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
      expect(response.headers).toHaveProperty('content-security-policy');
    });

    test('should include HSTS header in production', async () => {
      process.env.NODE_ENV = 'production';
      securityHeaders = new SecurityHeadersMiddleware();
      
      const middleware = securityHeaders.getSecurityHeadersMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');

      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    test('should not include HSTS header in development', async () => {
      process.env.NODE_ENV = 'development';
      securityHeaders = new SecurityHeadersMiddleware();
      
      const middleware = securityHeaders.getSecurityHeadersMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');

      expect(response.headers).not.toHaveProperty('strict-transport-security');
    });

    test('should hide X-Powered-By header', async () => {
      const middleware = securityHeaders.getSecurityHeadersMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');

      expect(response.headers).not.toHaveProperty('x-powered-by');
    });
  });

  describe('Custom Security Headers', () => {
    test('should add custom security headers', async () => {
      const customMiddleware = securityHeaders.getCustomSecurityHeaders();
      app.use(customMiddleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');

      expect(response.headers).toHaveProperty('x-api-version', '1.0');
      expect(response.headers).toHaveProperty('x-request-id');
    });

    test('should add cache control headers for auth endpoints', async () => {
      const customMiddleware = securityHeaders.getCustomSecurityHeaders();
      app.use(customMiddleware);
      app.get('/api/auth/login', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/api/auth/login');

      expect(response.headers).toHaveProperty('cache-control', 'no-store, no-cache, must-revalidate, private');
      expect(response.headers).toHaveProperty('pragma', 'no-cache');
      expect(response.headers).toHaveProperty('expires', '0');
    });

    test('should add cache control headers for admin endpoints', async () => {
      const customMiddleware = securityHeaders.getCustomSecurityHeaders();
      app.use(customMiddleware);
      app.get('/api/admin/users', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/api/admin/users');

      expect(response.headers).toHaveProperty('cache-control', 'no-store, no-cache, must-revalidate, private');
    });

    test('should use request ID from headers if provided', async () => {
      const customMiddleware = securityHeaders.getCustomSecurityHeaders();
      app.use(customMiddleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('x-request-id', 'test-request-123');

      expect(response.headers).toHaveProperty('x-request-id', 'test-request-123');
    });
  });

  describe('Middleware Stack', () => {
    test('should return array of middleware functions', () => {
      const stack = securityHeaders.getMiddlewareStack();
      
      expect(Array.isArray(stack)).toBe(true);
      expect(stack).toHaveLength(2);
      expect(typeof stack[0]).toBe('function');
      expect(typeof stack[1]).toBe('function');
    });

    test('should apply all middleware in stack', async () => {
      const stack = securityHeaders.getMiddlewareStack();
      stack.forEach(middleware => app.use(middleware));
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');

      // Check helmet headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      
      // Check custom headers
      expect(response.headers).toHaveProperty('x-api-version');
      expect(response.headers).toHaveProperty('x-request-id');
    });
  });

  describe('Header Validation', () => {
    test('should validate required security headers', () => {
      const headers = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'content-security-policy': "default-src 'self'"
      };

      const result = securityHeaders.validateSecurityHeaders(headers);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.present).toHaveLength(5);
      expect(result.score).toBe(100);
    });

    test('should identify missing security headers', () => {
      const headers = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY'
      };

      const result = securityHeaders.validateSecurityHeaders(headers);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('x-xss-protection');
      expect(result.missing).toContain('referrer-policy');
      expect(result.missing).toContain('content-security-policy');
      expect(result.present).toHaveLength(2);
      expect(result.score).toBeLessThan(100);
    });

    test('should check HSTS header in production', () => {
      process.env.NODE_ENV = 'production';
      securityHeaders = new SecurityHeadersMiddleware();

      const headers = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'content-security-policy': "default-src 'self'"
      };

      const result = securityHeaders.validateSecurityHeaders(headers);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('strict-transport-security');
    });

    test('should not require HSTS header in development', () => {
      process.env.NODE_ENV = 'development';
      securityHeaders = new SecurityHeadersMiddleware();

      const headers = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'content-security-policy': "default-src 'self'"
      };

      const result = securityHeaders.validateSecurityHeaders(headers);

      expect(result.valid).toBe(true);
      expect(result.missing).not.toContain('strict-transport-security');
    });

    test('should calculate correct score', () => {
      const headers = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block'
      };

      const result = securityHeaders.validateSecurityHeaders(headers);

      expect(result.score).toBe(60); // 3 out of 5 headers = 60%
    });
  });

  describe('Environment-specific behavior', () => {
    test('should handle undefined NODE_ENV', () => {
      delete process.env.NODE_ENV;
      securityHeaders = new SecurityHeadersMiddleware();

      expect(securityHeaders.isDevelopment).toBe(false);
      expect(securityHeaders.isProduction).toBe(false);
    });

    test('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development';
      securityHeaders = new SecurityHeadersMiddleware();

      expect(securityHeaders.isDevelopment).toBe(true);
      expect(securityHeaders.isProduction).toBe(false);
    });

    test('should correctly identify production environment', () => {
      process.env.NODE_ENV = 'production';
      securityHeaders = new SecurityHeadersMiddleware();

      expect(securityHeaders.isDevelopment).toBe(false);
      expect(securityHeaders.isProduction).toBe(true);
    });
  });
});