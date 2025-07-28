const HTTPSEnforcementMiddleware = require('../httpsEnforcementMiddleware');
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Mock fs module for certificate testing
jest.mock('fs');
jest.mock('https');

describe('HTTPSEnforcementMiddleware', () => {
  let httpsMiddleware;
  let app;

  beforeEach(() => {
    httpsMiddleware = new HTTPSEnforcementMiddleware();
    app = express();
    
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.FORCE_HTTPS;
    delete process.env.HTTPS_PORT;
    delete process.env.HTTP_PORT;
    delete process.env.SSL_CERT_PATH;
    delete process.env.SSL_KEY_PATH;
    delete process.env.SSL_CA_PATH;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Constructor and Environment Detection', () => {
    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      expect(httpsMiddleware.isProduction).toBe(true);
      expect(httpsMiddleware.forceHTTPS).toBe(true);
    });

    test('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      expect(httpsMiddleware.isDevelopment).toBe(true);
      expect(httpsMiddleware.forceHTTPS).toBe(false);
    });

    test('should force HTTPS when explicitly configured', () => {
      process.env.NODE_ENV = 'development';
      process.env.FORCE_HTTPS = 'true';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      expect(httpsMiddleware.forceHTTPS).toBe(true);
    });

    test('should use custom ports when configured', () => {
      process.env.HTTPS_PORT = '8443';
      process.env.HTTP_PORT = '8080';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      expect(httpsMiddleware.httpsPort).toBe('8443');
      expect(httpsMiddleware.httpPort).toBe('8080');
    });
  });

  describe('HTTPS Redirect Middleware', () => {
    test('should skip redirect in development without force', async () => {
      process.env.NODE_ENV = 'development';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getHTTPSRedirectMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ secure: req.secure }));

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
      expect(response.body.secure).toBe(false);
    });

    test('should redirect HTTP to HTTPS in production', async () => {
      process.env.NODE_ENV = 'production';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getHTTPSRedirectMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('Host', 'example.com');
      
      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('https://example.com/test');
    });

    test('should not redirect when request is already secure', async () => {
      process.env.NODE_ENV = 'production';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getHTTPSRedirectMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('x-forwarded-proto', 'https');
      
      expect(response.status).toBe(200);
      expect(response.body.test).toBe(true);
    });

    test('should handle x-forwarded-ssl header', async () => {
      process.env.NODE_ENV = 'production';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getHTTPSRedirectMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('x-forwarded-ssl', 'on');
      
      expect(response.status).toBe(200);
      expect(response.body.test).toBe(true);
    });

    test('should redirect with query parameters', async () => {
      process.env.NODE_ENV = 'production';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getHTTPSRedirectMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test?param=value')
        .set('Host', 'example.com');
      
      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('https://example.com/test?param=value');
    });
  });

  describe('URL Construction', () => {
    test('should construct HTTPS URL correctly', () => {
      const req = {
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/test?param=value'
      };

      const httpsUrl = httpsMiddleware.constructHTTPSUrl(req);
      
      expect(httpsUrl).toBe('https://example.com/test?param=value');
    });

    test('should handle port mapping', () => {
      process.env.HTTP_PORT = '8080';
      process.env.HTTPS_PORT = '8443';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const req = {
        get: jest.fn().mockReturnValue('example.com:8080'),
        originalUrl: '/test'
      };

      const httpsUrl = httpsMiddleware.constructHTTPSUrl(req);
      
      expect(httpsUrl).toBe('https://example.com:8443/test');
    });

    test('should handle default HTTPS port', () => {
      process.env.HTTP_PORT = '8080';
      process.env.HTTPS_PORT = '443';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const req = {
        get: jest.fn().mockReturnValue('example.com:8080'),
        originalUrl: '/test'
      };

      const httpsUrl = httpsMiddleware.constructHTTPSUrl(req);
      
      expect(httpsUrl).toBe('https://example.com/test');
    });
  });

  describe('Mixed Content Protection', () => {
    test('should add upgrade-insecure-requests directive', async () => {
      process.env.FORCE_HTTPS = 'true';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getMixedContentProtectionMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toContain('upgrade-insecure-requests');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should append to existing CSP', async () => {
      process.env.FORCE_HTTPS = 'true';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getMixedContentProtectionMiddleware();
      app.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        next();
      });
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toBe("default-src 'self'; upgrade-insecure-requests");
    });

    test('should skip in development without force', async () => {
      process.env.NODE_ENV = 'development';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getMixedContentProtectionMiddleware();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toBeUndefined();
    });
  });

  describe('SSL Configuration', () => {
    test('should return basic SSL configuration', () => {
      const sslConfig = httpsMiddleware.getSSLConfig();
      
      expect(sslConfig).toHaveProperty('secureProtocol', 'TLSv1_2_method');
      expect(sslConfig).toHaveProperty('ciphers');
      expect(sslConfig).toHaveProperty('honorCipherOrder', true);
      expect(sslConfig).toHaveProperty('secureOptions');
    });

    test('should load SSL certificates when paths are provided', () => {
      process.env.SSL_CERT_PATH = '/path/to/cert.pem';
      process.env.SSL_KEY_PATH = '/path/to/key.pem';
      process.env.SSL_CA_PATH = '/path/to/ca.pem';
      
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('cert.pem')) return 'cert-content';
        if (path.includes('key.pem')) return 'key-content';
        if (path.includes('ca.pem')) return 'ca-content';
        throw new Error('File not found');
      });

      const sslConfig = httpsMiddleware.getSSLConfig();
      
      expect(sslConfig.cert).toBe('cert-content');
      expect(sslConfig.key).toBe('key-content');
      expect(sslConfig.ca).toBe('ca-content');
    });

    test('should handle missing certificates in development', () => {
      process.env.NODE_ENV = 'development';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const sslConfig = httpsMiddleware.getSSLConfig();
      
      expect(sslConfig.cert).toBeUndefined();
      expect(sslConfig.key).toBeUndefined();
    });

    test('should throw error for missing certificates in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.SSL_CERT_PATH = '/path/to/cert.pem';
      process.env.SSL_KEY_PATH = '/path/to/key.pem';
      
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      expect(() => httpsMiddleware.getSSLConfig()).toThrow('SSL certificates are required in production');
    });
  });

  describe('HTTPS Server Creation', () => {
    test('should create HTTPS server with valid certificates', () => {
      process.env.SSL_CERT_PATH = '/path/to/cert.pem';
      process.env.SSL_KEY_PATH = '/path/to/key.pem';
      
      const mockCert = '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----';
      const mockKey = '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----';
      
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('cert.pem')) return mockCert;
        if (path.includes('key.pem')) return mockKey;
        throw new Error('File not found');
      });

      const mockServer = { listen: jest.fn() };
      https.createServer.mockReturnValue(mockServer);

      const mockApp = {};
      const server = httpsMiddleware.createHTTPSServer(mockApp);
      
      expect(server).toBe(mockServer);
      expect(https.createServer).toHaveBeenCalledWith(
        expect.objectContaining({
          cert: mockCert,
          key: mockKey
        }),
        mockApp
      );
    });

    test('should return null in development without certificates', () => {
      process.env.NODE_ENV = 'development';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const mockApp = {};
      const server = httpsMiddleware.createHTTPSServer(mockApp);
      
      expect(server).toBeNull();
    });

    test('should throw error in production without certificates', () => {
      process.env.NODE_ENV = 'production';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const mockApp = {};
      
      expect(() => httpsMiddleware.createHTTPSServer(mockApp)).toThrow('SSL certificates are required to create HTTPS server in production');
    });
  });

  describe('HTTPS Security Headers', () => {
    test('should add HSTS header for HTTPS requests in production', async () => {
      process.env.NODE_ENV = 'production';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getHTTPSSecurityHeaders();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('x-forwarded-proto', 'https');
      
      expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload');
      expect(response.headers['x-forwarded-proto']).toBe('https');
      expect(response.headers['x-secure-connection']).toBe('true');
    });

    test('should not add HSTS header in development', async () => {
      process.env.NODE_ENV = 'development';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const middleware = httpsMiddleware.getHTTPSSecurityHeaders();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('x-forwarded-proto', 'https');
      
      expect(response.headers['strict-transport-security']).toBeUndefined();
      expect(response.headers['x-forwarded-proto']).toBe('https');
      expect(response.headers['x-secure-connection']).toBe('true');
    });

    test('should not add headers for HTTP requests', async () => {
      const middleware = httpsMiddleware.getHTTPSSecurityHeaders();
      app.use(middleware);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['strict-transport-security']).toBeUndefined();
      expect(response.headers['x-forwarded-proto']).toBeUndefined();
      expect(response.headers['x-secure-connection']).toBeUndefined();
    });
  });

  describe('SSL Certificate Validation', () => {
    test('should validate valid certificate format', () => {
      const certContent = '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(certContent);

      const result = httpsMiddleware.validateSSLCertificate('/path/to/cert.pem');
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Certificate format is valid');
    });

    test('should reject invalid certificate format', () => {
      const certContent = 'invalid certificate content';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(certContent);

      const result = httpsMiddleware.validateSSLCertificate('/path/to/cert.pem');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid certificate format');
    });

    test('should handle missing certificate file', () => {
      fs.existsSync.mockReturnValue(false);

      const result = httpsMiddleware.validateSSLCertificate('/path/to/cert.pem');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Certificate file not found');
    });

    test('should handle file read errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = httpsMiddleware.validateSSLCertificate('/path/to/cert.pem');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('Middleware Stack', () => {
    test('should return array of middleware functions', () => {
      const stack = httpsMiddleware.getMiddlewareStack();
      
      expect(Array.isArray(stack)).toBe(true);
      expect(stack).toHaveLength(3);
      expect(typeof stack[0]).toBe('function');
      expect(typeof stack[1]).toBe('function');
      expect(typeof stack[2]).toBe('function');
    });

    test('should apply all middleware in stack', async () => {
      process.env.FORCE_HTTPS = 'true';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const stack = httpsMiddleware.getMiddlewareStack();
      stack.forEach(middleware => app.use(middleware));
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app)
        .get('/test')
        .set('x-forwarded-proto', 'https');
      
      // Check that mixed content protection is applied
      expect(response.headers['content-security-policy']).toContain('upgrade-insecure-requests');
      
      // Check that HTTPS security headers are applied
      expect(response.headers['x-forwarded-proto']).toBe('https');
      expect(response.headers['x-secure-connection']).toBe('true');
    });
  });

  describe('HTTPS Status Check', () => {
    test('should return correct status in production with certificates', () => {
      process.env.NODE_ENV = 'production';
      process.env.SSL_CERT_PATH = '/path/to/cert.pem';
      process.env.SSL_KEY_PATH = '/path/to/key.pem';
      
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('cert.pem')) return 'cert-content';
        if (path.includes('key.pem')) return 'key-content';
        throw new Error('File not found');
      });
      
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      const status = httpsMiddleware.getHTTPSStatus();
      
      expect(status.httpsEnforced).toBe(true);
      expect(status.environment).toBe('production');
      expect(status.sslConfigured).toBe(true);
      expect(status.certificatesFound).toBe(true);
      expect(status.errors).toHaveLength(0);
    });

    test('should return correct status in development without certificates', () => {
      process.env.NODE_ENV = 'development';
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      
      const status = httpsMiddleware.getHTTPSStatus();
      
      expect(status.httpsEnforced).toBe(false);
      expect(status.environment).toBe('development');
      expect(status.sslConfigured).toBe(true);
      expect(status.certificatesFound).toBe(false);
      expect(status.errors).toHaveLength(0);
    });

    test('should report errors when SSL configuration fails', () => {
      process.env.NODE_ENV = 'production';
      process.env.SSL_CERT_PATH = '/path/to/cert.pem';
      process.env.SSL_KEY_PATH = '/path/to/key.pem';
      
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      httpsMiddleware = new HTTPSEnforcementMiddleware();
      const status = httpsMiddleware.getHTTPSStatus();
      
      expect(status.sslConfigured).toBe(false);
      expect(status.errors).toContain('SSL certificates are required in production');
    });
  });
});