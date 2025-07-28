const ValidationService = require('../validationService');

describe('ValidationService', () => {
  let validationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  test('should initialize validation service', () => {
    expect(validationService).toBeDefined();
    expect(validationService.validateInput).toBeDefined();
    expect(validationService.sanitizeHTML).toBeDefined();
    expect(validationService.sanitizeQuery).toBeDefined();
  });

  describe('User Registration Validation', () => {
    test('should validate valid user registration data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        termsAccepted: true,
        marketingConsent: false
      };

      const result = await validationService.validateUserRegistration(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.value.email).toBe('test@example.com');
    });

    test('should reject invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true
      };

      const result = await validationService.validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'email')).toBe(true);
    });

    test('should reject weak passwords', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true
      };

      const result = await validationService.validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'password')).toBe(true);
    });

    test('should reject mismatched passwords', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true
      };

      const result = await validationService.validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'confirmPassword')).toBe(true);
    });

    test('should reject invalid names with special characters', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John<script>',
        lastName: 'Doe',
        termsAccepted: true
      };

      const result = await validationService.validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'firstName')).toBe(true);
    });

    test('should require terms acceptance', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: false
      };

      const result = await validationService.validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'termsAccepted')).toBe(true);
    });
  });

  describe('User Login Validation', () => {
    test('should validate valid login data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      };

      const result = await validationService.validateUserLogin(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate login with MFA token', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        mfaToken: '123456'
      };

      const result = await validationService.validateUserLogin(validData);
      expect(result.isValid).toBe(true);
      expect(result.value.mfaToken).toBe('123456');
    });

    test('should reject invalid MFA token format', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        mfaToken: 'abc123'
      };

      const result = await validationService.validateUserLogin(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'mfaToken')).toBe(true);
    });
  });

  describe('Profile Update Validation', () => {
    test('should validate valid profile update', async () => {
      const validData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1987654321',
        bio: 'Software developer with a passion for reading',
        preferences: {
          notifications: true,
          newsletter: false,
          language: 'en'
        }
      };

      const result = await validationService.validateProfileUpdate(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject unsafe bio content', async () => {
      const invalidData = {
        firstName: 'Jane',
        bio: 'Bio with <script>alert("xss")</script> content'
      };

      const result = await validationService.validateProfileUpdate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'bio')).toBe(true);
    });
  });

  describe('Password Change Validation', () => {
    test('should validate valid password change', async () => {
      const validData = {
        currentPassword: 'oldPassword123',
        newPassword: 'NewSecurePass123!',
        confirmNewPassword: 'NewSecurePass123!'
      };

      const result = await validationService.validatePasswordChange(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject mismatched new passwords', async () => {
      const invalidData = {
        currentPassword: 'oldPassword123',
        newPassword: 'NewSecurePass123!',
        confirmNewPassword: 'DifferentPass123!'
      };

      const result = await validationService.validatePasswordChange(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'confirmNewPassword')).toBe(true);
    });
  });

  describe('Book Search Validation', () => {
    test('should validate valid search parameters', async () => {
      const validData = {
        query: 'JavaScript programming',
        category: 'Technology',
        author: 'John Doe',
        page: 1,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc'
      };

      const result = await validationService.validateBookSearch(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should apply default values for pagination', async () => {
      const validData = {
        query: 'JavaScript'
      };

      const result = await validationService.validateBookSearch(validData);
      expect(result.isValid).toBe(true);
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(10);
      expect(result.value.sortBy).toBe('title');
    });

    test('should reject invalid ISBN format', async () => {
      const invalidData = {
        isbn: 'invalid-isbn'
      };

      const result = await validationService.validateBookSearch(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'isbn')).toBe(true);
    });

    test('should reject excessive page numbers', async () => {
      const invalidData = {
        page: 1001
      };

      const result = await validationService.validateBookSearch(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'page')).toBe(true);
    });
  });

  describe('File Upload Validation', () => {
    test('should validate valid image file', async () => {
      const validFile = {
        fieldname: 'profileImage',
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      };

      const result = await validationService.validateFileUpload(validFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject unsupported file types', async () => {
      const invalidFile = {
        fieldname: 'document',
        originalname: 'malicious.exe',
        mimetype: 'application/x-executable',
        size: 1024
      };

      const result = await validationService.validateFileUpload(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'mimetype')).toBe(true);
    });

    test('should reject files exceeding size limit', async () => {
      const invalidFile = {
        fieldname: 'document',
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 15 * 1024 * 1024 // 15MB
      };

      const result = await validationService.validateFileUpload(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'size')).toBe(true);
    });
  });

  describe('API Request Validation', () => {
    test('should validate valid API request structure', async () => {
      const validRequest = {
        method: 'POST',
        path: '/api/users',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer token123'
        },
        query: {
          page: 1,
          limit: 10
        },
        body: {
          name: 'John Doe'
        }
      };

      const result = await validationService.validateApiRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid HTTP methods', async () => {
      const invalidRequest = {
        method: 'INVALID',
        path: '/api/users'
      };

      const result = await validationService.validateApiRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'method')).toBe(true);
    });

    test('should reject invalid path format', async () => {
      const invalidRequest = {
        method: 'GET',
        path: 'invalid-path-without-slash'
      };

      const result = await validationService.validateApiRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'path')).toBe(true);
    });
  });

  describe('HTML Sanitization', () => {
    test('should sanitize malicious HTML content', async () => {
      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = validationService.sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    test('should preserve allowed HTML tags', async () => {
      const safeHTML = '<p>This is <strong>bold</strong> and <em>italic</em> text</p>';
      const sanitized = validationService.sanitizeHTML(safeHTML);
      
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('<em>');
      expect(sanitized).toContain('<p>');
    });

    test('should handle non-string input', async () => {
      const result = validationService.sanitizeHTML(null);
      expect(result).toBe('');
      
      const result2 = validationService.sanitizeHTML(123);
      expect(result2).toBe('');
    });
  });

  describe('Query Sanitization', () => {
    test('should remove dangerous characters from queries', async () => {
      const dangerousQuery = "'; DROP TABLE users; --";
      const sanitized = validationService.sanitizeQuery(dangerousQuery);
      
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
    });

    test('should preserve safe query content', async () => {
      const safeQuery = 'search term with spaces';
      const sanitized = validationService.sanitizeQuery(safeQuery);
      
      expect(sanitized).toBe('search term with spaces');
    });

    test('should handle non-string input', async () => {
      const result = validationService.sanitizeQuery(null);
      expect(result).toBe('');
      
      const result2 = validationService.sanitizeQuery(undefined);
      expect(result2).toBe('');
    });
  });

  describe('User Input Processing', () => {
    test('should process text input correctly', async () => {
      const input = '  Some text with spaces  ';
      const processed = validationService.processUserInput(input, 'text');
      
      expect(processed).toBe('Some text with spaces');
    });

    test('should process HTML input with sanitization', async () => {
      const input = '<p>Safe content</p><script>alert("xss")</script>';
      const processed = validationService.processUserInput(input, 'html');
      
      expect(processed).toContain('<p>Safe content</p>');
      expect(processed).not.toContain('<script>');
    });

    test('should process query input with sanitization', async () => {
      const input = "search'; DROP TABLE users; --";
      const processed = validationService.processUserInput(input, 'query');
      
      expect(processed).not.toContain("'");
      expect(processed).not.toContain(';');
      expect(processed).not.toContain('--');
    });

    test('should limit text length', async () => {
      const longInput = 'a'.repeat(2000);
      const processed = validationService.processUserInput(longInput, 'text');
      
      expect(processed.length).toBe(1000);
    });
  });

  describe('Custom Schema Creation', () => {
    test('should create and use custom validation schema', async () => {
      const customSchema = validationService.createCustomSchema({
        customField: validationService.commonPatterns.email.required(),
        anotherField: validationService.commonPatterns.safeString.optional()
      });

      const validData = {
        customField: 'test@example.com',
        anotherField: 'safe text'
      };

      const result = await validationService.validateInput(validData, customSchema);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Error Formatting', () => {
    test('should format validation errors correctly', async () => {
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is too weak' }
      ];

      const formatted = validationService.formatValidationErrors(errors);
      expect(formatted).toContain('email: Email is required');
      expect(formatted).toContain('password: Password is too weak');
    });

    test('should handle empty error array', async () => {
      const formatted = validationService.formatValidationErrors([]);
      expect(formatted).toBe('');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle validation with invalid schema gracefully', async () => {
      const invalidSchema = null;
      
      try {
        await validationService.validateInput({ test: 'data' }, invalidSchema);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle malformed data gracefully', async () => {
      const circularData = {};
      circularData.self = circularData;
      
      const result = await validationService.validateUserLogin(circularData);
      expect(result.isValid).toBe(false);
    });
  });
});