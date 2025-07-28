const CORSSecurityMiddleware = require('../corsSecurityMiddleware');
const express = require('express');
const request = require('supertest');

describe('CORSSecurityMiddleware', () => {
  let corsMiddleware;
  let app;

  beforeEach(() => {
    corsMiddleware = new CORSSecurityMiddleware();
    app = express();
    
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.CORS_ALLOWED_METHODS;
    delete process.env.CORS_ALLOWED_HEADERS;
    delete process.env.CORS_MAX_AGE;
  });

  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
  });

  describe('Constructor and Environment Detection', () => {
    test('should detect production environment and use restrictive defaults', () => {
      process.env.NODE_ENV = 'production';
      corsMiddleware = new CORSSecurityMiddleware();
      
      expect(corsMiddleware.isProduction).toBe(true);
      expect(corsMiddleware.allowedOrigins).toEqual([
        'https://yourdomain.com',
        'https://www.yourdomain.com',
        'https://app.yourdomain.com'
      ]);
      expect(corsMiddleware.allowedMethods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    });

    test('should detect development environment and use permissive defaults', () => {
      process.env.NODE_ENV = 'development';
      corsMiddleware = new CORSSecurityMiddleware();
      
      expect(corsMiddleware.isDevelopment).toBe(true);
      expect(corsMiddleware.allowedOrigins).toContain('http://localhost:3000');
      expect(corsMiddleware.allowedMethods).toContain('PATCH');
    });

    test('should parse custom origins from environment', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com, https://api.example.com';
      corsMiddleware = new CORSSecurityMiddleware();
      
      expect(corsMiddleware.allowedOrigins).toEqual(['https://example.com', 'https://api.example.com']);
    });

    test('should parse custom methods from environment', () => {
      process.env.CORS_ALLOWED_METHODS = 'GET, POST, PUT';
      corsMiddleware = new CORSSecurityMiddleware();
      
      expect(corsMiddleware.allowedMethods).toEqual(['GET', 'POST', 'PUT']);
    });

    test('should parse custom headers from environment', () => {
      process.env.CORS_ALLOWED_HEADERS = 'Content-Type, Authorization';
      corsMiddleware = new CORSSecurityMiddleware();
      
      expect(corsMiddleware.allowedHeaders).toEqual(['Content-Type', 'Authorization']);
    });

    test('should use custom max age from environment', () => {
      process.env.CORS_MAX_AGE = '3600';
      corsMiddleware = new CORSSecurityMiddleware();
      
      expect(corsMiddleware.maxAge).toBe(3600);
    });
  });

  describe('Origin Validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      corsMiddleware = new CORSSecurityMiddleware();
    });

    test('should allow exact origin matches', () => {
      expect(corsMiddleware.isOriginAllowed('http://localhost:3000')).toBe(true);
    });

    test('should reject non-allowed origins', () => {
      expect(corsMiddleware.isOriginAllowed('https://malicious.com')).toBe(false);
    });

    test('should allow localhost with any port in development', () => {
      expect(corsMiddleware.isOriginAllowed('http://localhost:8080')).toBe(true);
      expect(corsMiddleware.isOriginAllowed('http://127.0.0.1:9000')).toBe(true);
    });

    test('should handle wildcard subdomains', () => {
      corsMiddleware.allowedOrigins = ['*.example.com'];
      
      expect(corsMiddleware.isOriginAllowed('https://api.example.com')).toBe(true);
      expect(corsMiddleware.isOriginAllowed('https://app.example.com')).toBe(true);
      expect(corsMiddleware.isOriginAllowed('https://other.com')).toBe(false);
    });

    test('should reject null or undefined origins', () => {
      expect(corsMiddleware.isOriginAllowed(null)).toBe(false);
      expect(corsMiddleware.isOriginAllowed(undefined)).toBe(false);
    });
  });

  describe('CORS Configuration', () => {
    test('should return proper CORS configuration', () => {
      const config = corsMiddleware.getCORSConfig();
      
      expect(config).toHaveProperty('origin');
      expect(config).toHaveProperty('methods');
      expect(config).toHaveProperty('allowedHeaders');
      expect(config.credentials).toBe(true);
      expect(config.optionsSuccessStatus).toBe(204);
    });

    test('should handle origin validation in config', (done) => {
      const config = corsMiddleware.getCORSConfig();
      
      config.origin('http://localhost:3000', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
        done();
      });
    });

    test('should reject invalid origins in config', (done) => {
      const config = corsMiddleware.getCORSConfig();
      
      config.origin('https://malicious.com', (err, allowed) => {
        expect(err).toBeInstanceOf(Error);
        expect(allowed).toBe(false);
        done();
      });
    });
  });

  describe('Dynamic CORS Configuration', () => {
    test('should adjust config for API endpoints', () => {
      const mockReq = {
        path: '/api/users',
        get: jest.fn().mockReturnValue(''),
        method: 'GET'
      };

      const config = corsMiddleware.getDynamicCORSConfig(mockReq);
      
      expect(config.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    });

    test('should be more restrictive for auth endpoints', () => {
      const mockReq = {
        path: '/api/auth/login',
        get: jest.fn().mockReturnValue(''),
        method: 'POST'
      };

      const config = corsMiddleware.getDynamicCORSConfig(mockReq);
      
      expect(config.methods).toEqual(['POST', 'OPTIONS']);
      expect(config.exposedHeaders).toEqual(['X-Request-ID']);
    });
  });

  describe('CORS Middleware', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      corsMiddleware = new CORSSecurityMiddleware();
    });

    test('should handle preflight OPTIONS requests', async () => {
      const middleware = corsMiddleware.getCORSMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should reject preflight from invalid origin', async () => {
      const middleware = corsMiddleware.getCORSMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://malicious.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(403);
    });

    test('should reject preflight with invalid method', async () => {
      const middleware = corsMiddleware.getCORSMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'TRACE');

      expect(response.status).toBe(405);
    });

    test('should reject preflight with invalid headers', async () => {
      const middleware = corsMiddleware.getCORSMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'X-Invalid-Header');

      expect(response.status).toBe(400);
    });

    test('should apply CORS headers to actual requests', async () => {
      const middleware = corsMiddleware.getCORSMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['vary']).toBe('Origin');
    });

    test('should not apply CORS headers for invalid origins', async () => {
      const middleware = corsMiddleware.getCORSMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://malicious.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('CORS Security Middleware', () => {
    test('should block suspicious origins', async () => {
      const securityMiddleware = corsMiddleware.getCORSSecurityMiddleware();
      app.use(securityMiddleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://192.168.1.1:8080');

      expect(response.status).toBe(403);
    });

    test('should allow legitimate origins', async () => {
      const securityMiddleware = corsMiddleware.getCORSSecurityMiddleware();
      app.use(securityMiddleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
    });
  });

  describe('Suspicious Origin Detection', () => {
    test('should detect IP address origins as suspicious', () => {
      expect(corsMiddleware.isSuspiciousOrigin('http://192.168.1.1')).toBe(true);
      expect(corsMiddleware.isSuspiciousOrigin('https://10.0.0.1:8080')).toBe(true);
    });

    test('should detect high port numbers as suspicious', () => {
      expect(corsMiddleware.isSuspiciousOrigin('http://localhost:65535')).toBe(true);
    });

    test('should detect script injection attempts', () => {
      expect(corsMiddleware.isSuspiciousOrigin('javascript:alert(1)')).toBe(true);
      expect(corsMiddleware.isSuspiciousOrigin('data:text/html,<script>')).toBe(true);
    });

    test('should not flag legitimate origins as suspicious', () => {
      expect(corsMiddleware.isSuspiciousOrigin('https://example.com')).toBe(false);
      expect(corsMiddleware.isSuspiciousOrigin('http://localhost:3000')).toBe(false);
    });
  });

  describe('CORS Request Tracking', () => {
    test('should track CORS requests', () => {
      corsMiddleware.trackCORSRequest('http://localhost:3000', '127.0.0.1');
      
      expect(corsMiddleware.corsRequestTracker).toBeDefined();
      expect(corsMiddleware.corsRequestTracker.has('http://localhost:3000:127.0.0.1')).toBe(true);
    });

    test('should increment request count', () => {
      corsMiddleware.trackCORSRequest('http://localhost:3000', '127.0.0.1');
      corsMiddleware.trackCORSRequest('http://localhost:3000', '127.0.0.1');
      
      const tracker = corsMiddleware.corsRequestTracker.get('http://localhost:3000:127.0.0.1');
      expect(tracker.count).toBe(2);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate secure production configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com,https://api.example.com';
      corsMiddleware = new CORSSecurityMiddleware();
      
      const validation = corsMiddleware.validateCORSConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should identify wildcard origin in production as issue', () => {
      process.env.NODE_ENV = 'production';
      corsMiddleware = new CORSSecurityMiddleware();
      corsMiddleware.allowedOrigins = ['*'];
      
      const validation = corsMiddleware.validateCORSConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Wildcard origin (*) should not be used in production');
    });

    test('should warn about insecure HTTP origins in production', () => {
      process.env.NODE_ENV = 'production';
      corsMiddleware = new CORSSecurityMiddleware();
      corsMiddleware.allowedOrigins = ['http://example.com'];
      
      const validation = corsMiddleware.validateCORSConfig();
      
      expect(validation.warnings).toContain('Insecure HTTP origins in production: http://example.com');
    });

    test('should warn about dangerous HTTP methods', () => {
      corsMiddleware.allowedMethods = ['GET', 'POST', 'TRACE'];
      
      const validation = corsMiddleware.validateCORSConfig();
      
      expect(validation.warnings).toContain('Potentially dangerous HTTP methods allowed: TRACE');
    });

    test('should warn about high max age', () => {
      corsMiddleware.maxAge = 172800; // 48 hours
      
      const validation = corsMiddleware.validateCORSConfig();
      
      expect(validation.warnings).toContain('CORS max age is very high, consider reducing for better security');
    });
  });

  describe('Middleware Stack', () => {
    test('should return array of middleware functions', () => {
      const stack = corsMiddleware.getMiddlewareStack();
      
      expect(Array.isArray(stack)).toBe(true);
      expect(stack).toHaveLength(2);
      expect(typeof stack[0]).toBe('function');
      expect(typeof stack[1]).toBe('function');
    });

    test('should apply all middleware in stack', async () => {
      const stack = corsMiddleware.getMiddlewareStack();
      stack.forEach(middleware => app.use(middleware));
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('CORS Status', () => {
    test('should return comprehensive CORS status', () => {
      const status = corsMiddleware.getCORSStatus();
      
      expect(status).toHaveProperty('enabled', true);
      expect(status).toHaveProperty('environment');
      expect(status).toHaveProperty('allowedOrigins');
      expect(status).toHaveProperty('allowedMethods');
      expect(status).toHaveProperty('allowedHeaders');
      expect(status).toHaveProperty('maxAge');
      expect(status).toHaveProperty('credentialsAllowed', true);
      expect(status).toHaveProperty('validation');
    });

    test('should include validation results in status', () => {
      const status = corsMiddleware.getCORSStatus();
      
      expect(status.validation).toHaveProperty('valid');
      expect(status.validation).toHaveProperty('issues');
      expect(status.validation).toHaveProperty('warnings');
      expect(status.validation).toHaveProperty('config');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle requests without origin header', async () => {
      const middleware = corsMiddleware.getCORSMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should handle malformed origin headers', async () => {
      const securityMiddleware = corsMiddleware.getCORSSecurityMiddleware();
      app.use(securityMiddleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'not-a-valid-origin');

      expect(response.status).toBe(200); // Should not crash, just not apply CORS
    });

    test('should handle empty environment variables gracefully', () => {
      process.env.CORS_ALLOWED_ORIGINS = '';
      process.env.CORS_ALLOWED_METHODS = '';
      process.env.CORS_ALLOWED_HEADERS = '';
      
      expect(() => new CORSSecurityMiddleware()).not.toThrow();
    });
  });
});