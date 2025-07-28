const SecureCookieMiddleware = require('../secureCookieMiddleware');

describe('SecureCookieMiddleware - Simple Tests', () => {
  beforeEach(() => {
    // Set environment variables for testing
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SECRET = 'test-secret-key-that-is-very-long-and-secure';
    process.env.COOKIE_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.NODE_ENV;
    delete process.env.COOKIE_SECRET;
    delete process.env.COOKIE_ENCRYPTION_KEY;
  });

  test('should create instance with provided environment variables', () => {
    const secureCookies = new SecureCookieMiddleware();
    
    expect(secureCookies.isDevelopment).toBe(true);
    expect(secureCookies.cookieSecret).toBe('test-secret-key-that-is-very-long-and-secure');
    expect(secureCookies.encryptionKey).toBe('a'.repeat(64));
  });

  test('should return secure cookie configuration', () => {
    const secureCookies = new SecureCookieMiddleware();
    const config = secureCookies.getSecureCookieConfig();
    
    expect(config).toHaveProperty('httpOnly', true);
    expect(config).toHaveProperty('secure', false); // development
    expect(config).toHaveProperty('sameSite', 'lax'); // development
    expect(config).toHaveProperty('signed', true);
  });

  test('should return middleware stack', () => {
    const secureCookies = new SecureCookieMiddleware();
    const stack = secureCookies.getMiddlewareStack();
    
    expect(Array.isArray(stack)).toBe(true);
    expect(stack).toHaveLength(2);
    expect(typeof stack[0]).toBe('function');
    expect(typeof stack[1]).toBe('function');
  });

  test('should validate cookie configuration', () => {
    const secureCookies = new SecureCookieMiddleware();
    const validation = secureCookies.validateCookieConfig();
    
    expect(validation).toHaveProperty('valid');
    expect(validation).toHaveProperty('issues');
    expect(validation).toHaveProperty('warnings');
    expect(validation).toHaveProperty('config');
  });
});