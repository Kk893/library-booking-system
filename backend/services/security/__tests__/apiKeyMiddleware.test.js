const { apiKeyAuth, requirePermissions, requireScopes, extractApiKey, getClientIP } = require('../apiKeyMiddleware');
const apiKeyService = require('../apiKeyService');
const { securityMonitorService } = require('../securityMonitorService');

// Mock dependencies
jest.mock('../apiKeyService');
jest.mock('../securityMonitorService', () => ({
  securityMonitorService: {
    logSecurityEvent: jest.fn().mockResolvedValue(true)
  }
}));

describe('API Key Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      get: jest.fn(),
      query: {},
      method: 'GET',
      path: '/api/books',
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('extractApiKey', () => {
    it('should extract API key from Authorization header', () => {
      req.get.mockImplementation((header) => {
        if (header === 'Authorization') return 'Bearer lba_test.keyid.secret';
        return null;
      });

      const apiKey = extractApiKey(req);
      expect(apiKey).toBe('lba_test.keyid.secret');
    });

    it('should extract API key from X-API-Key header', () => {
      req.get.mockImplementation((header) => {
        if (header === 'X-API-Key') return 'lba_test.keyid.secret';
        return null;
      });

      const apiKey = extractApiKey(req);
      expect(apiKey).toBe('lba_test.keyid.secret');
    });

    it('should extract API key from query parameter in development', () => {
      process.env.NODE_ENV = 'development';
      req.query.api_key = 'lba_test.keyid.secret';

      const apiKey = extractApiKey(req);
      expect(apiKey).toBe('lba_test.keyid.secret');
    });

    it('should not extract API key from query parameter in production', () => {
      process.env.NODE_ENV = 'production';
      req.query.api_key = 'lba_test.keyid.secret';

      const apiKey = extractApiKey(req);
      expect(apiKey).toBeNull();
    });

    it('should return null if no API key found', () => {
      const apiKey = extractApiKey(req);
      expect(apiKey).toBeNull();
    });

    it('should ignore JWT tokens in Authorization header', () => {
      req.get.mockImplementation((header) => {
        if (header === 'Authorization') return 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
        return null;
      });

      const apiKey = extractApiKey(req);
      expect(apiKey).toBeNull();
    });
  });

  describe('getClientIP', () => {
    it('should return IP from req.ip', () => {
      req.ip = '192.168.1.1';
      const ip = getClientIP(req);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return IP from connection.remoteAddress', () => {
      req.ip = null;
      req.connection = { remoteAddress: '192.168.1.2' };
      const ip = getClientIP(req);
      expect(ip).toBe('192.168.1.2');
    });

    it('should return default IP if none found', () => {
      req.ip = null;
      const ip = getClientIP(req);
      expect(ip).toBe('127.0.0.1');
    });
  });

  describe('apiKeyAuth middleware', () => {
    it('should authenticate valid API key successfully', async () => {
      const middleware = apiKeyAuth();
      const mockApiKey = {
        id: 'apikey123',
        keyId: 'keyid123',
        userId: 'user123',
        user: { _id: 'user123', name: 'Test User' },
        permissions: ['read:books'],
        scopes: [],
        usage: { 
          requestsThisHour: 10, 
          requestsToday: 100,
          lastResetHour: new Date(),
          lastResetDate: new Date()
        },
        rateLimit: { requestsPerHour: 1000, requestsPerDay: 10000 }
      };

      req.get.mockImplementation((header) => {
        if (header === 'Authorization') return 'Bearer lba_test.keyid.secret';
        if (header === 'User-Agent') return 'Test Agent';
        return null;
      });

      apiKeyService.validateApiKey.mockResolvedValue({ apiKey: mockApiKey });

      await middleware(req, res, next);

      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        'lba_test.keyid.secret',
        expect.objectContaining({
          ip: '127.0.0.1',
          userAgent: 'Test Agent',
          endpoint: 'GET /api/books'
        })
      );
      expect(req.apiKey).toEqual(mockApiKey);
      expect(req.apiKeyAuth).toBe(true);
      expect(req.user).toEqual(mockApiKey.user);
      expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit-Hour': '1000',
        'X-RateLimit-Limit-Day': '10000'
      }));
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 for missing API key when required', async () => {
      const middleware = apiKeyAuth({ required: true });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'API_KEY_REQUIRED',
          message: 'API key is required for this endpoint'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should skip API key requirement if JWT auth is allowed and present', async () => {
      const middleware = apiKeyAuth({ required: true, allowUserAuth: true });
      req.headers.authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid API key', async () => {
      const middleware = apiKeyAuth();
      
      req.get.mockImplementation((header) => {
        if (header === 'Authorization') return 'Bearer lba_test.keyid.invalid';
        return null;
      });

      apiKeyService.validateApiKey.mockResolvedValue(null);

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or expired API key'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 429 for rate limit exceeded', async () => {
      const middleware = apiKeyAuth();
      
      req.get.mockImplementation((header) => {
        if (header === 'Authorization') return 'Bearer lba_test.keyid.secret';
        return null;
      });

      apiKeyService.validateApiKey.mockResolvedValue({
        error: 'rate_limit_exceeded',
        reason: 'hourly_limit_exceeded'
      });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Hourly rate limit exceeded',
          retryAfter: 3600
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for insufficient permissions', async () => {
      const middleware = apiKeyAuth({ permissions: ['write:books'] });
      const mockApiKey = {
        permissions: ['read:books'],
        scopes: []
      };

      req.get.mockImplementation((header) => {
        if (header === 'Authorization') return 'Bearer lba_test.keyid.secret';
        return null;
      });

      apiKeyService.validateApiKey.mockResolvedValue({ apiKey: mockApiKey });
      apiKeyService.hasPermission.mockReturnValue(false);

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'API key does not have required permissions',
          required: ['write:books'],
          granted: ['read:books']
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for insufficient scopes', async () => {
      const middleware = apiKeyAuth({ scopes: ['admin'] });
      const mockApiKey = {
        permissions: ['read:books'],
        scopes: ['user']
      };

      req.get.mockImplementation((header) => {
        if (header === 'Authorization') return 'Bearer lba_test.keyid.secret';
        return null;
      });

      apiKeyService.validateApiKey.mockResolvedValue({ apiKey: mockApiKey });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: 'API key does not have required scopes',
          required: ['admin'],
          granted: ['user']
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle authentication errors gracefully', async () => {
      const middleware = apiKeyAuth();
      
      req.get.mockImplementation((header) => {
        if (header === 'Authorization') return 'Bearer lba_test.keyid.secret';
        return null;
      });

      apiKeyService.validateApiKey.mockRejectedValue(new Error('Database error'));
      securityMonitorService.logSecurityEvent.mockResolvedValue(true);

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Internal authentication error'
        }
      });
      expect(securityMonitorService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'api_key_auth_error',
        severity: 'high',
        details: expect.objectContaining({
          error: 'Database error'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermissions middleware', () => {
    it('should allow access with sufficient API key permissions', () => {
      const middleware = requirePermissions(['read:books']);
      req.apiKey = { permissions: ['read:books', 'write:books'] };
      
      apiKeyService.hasPermission.mockReturnValue(true);

      middleware(req, res, next);

      expect(apiKeyService.hasPermission).toHaveBeenCalledWith(req.apiKey, 'read:books');
      expect(next).toHaveBeenCalled();
    });

    it('should deny access with insufficient API key permissions', () => {
      const middleware = requirePermissions(['write:books']);
      req.apiKey = { permissions: ['read:books'] };
      
      apiKeyService.hasPermission.mockReturnValue(false);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions',
          required: ['write:books'],
          granted: ['read:books']
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access for admin users with JWT auth', () => {
      const middleware = requirePermissions(['read:books']);
      req.user = { role: 'admin' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for regular users with JWT auth', () => {
      const middleware = requirePermissions(['write:books']);
      req.user = { role: 'user' };

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if no authentication present', () => {
      const middleware = requirePermissions(['read:books']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireScopes middleware', () => {
    it('should allow access with sufficient scopes', () => {
      const middleware = requireScopes(['admin']);
      req.apiKey = { scopes: ['admin', 'user'] };

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access with insufficient scopes', () => {
      const middleware = requireScopes(['admin']);
      req.apiKey = { scopes: ['user'] };

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: 'Insufficient scopes',
          required: ['admin'],
          granted: ['user']
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if no API key present', () => {
      const middleware = requireScopes(['admin']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'API_KEY_REQUIRED',
          message: 'API key required for scope validation'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});