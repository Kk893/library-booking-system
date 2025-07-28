const ValidationService = require('../validationService');

describe('XSS and Injection Prevention', () => {
  let validationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('Enhanced HTML Sanitization', () => {
    test('should remove script tags and dangerous content', () => {
      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p><img src="x" onerror="alert(1)">';
      const sanitized = validationService.sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    test('should remove iframe and object tags', () => {
      const maliciousHTML = '<iframe src="javascript:alert(1)"></iframe><object data="malicious.swf"></object><p>Safe</p>';
      const sanitized = validationService.sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).not.toContain('<object>');
      expect(sanitized).toContain('<p>Safe</p>');
    });

    test('should remove javascript and vbscript protocols', () => {
      const maliciousHTML = '<a href="javascript:alert(1)">Click</a><a href="vbscript:msgbox(1)">Click</a>';
      const sanitized = validationService.sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('vbscript:');
    });

    test('should preserve allowed tags and content', () => {
      const safeHTML = '<p>This is <strong>bold</strong> and <em>italic</em> text with a <br> break</p>';
      const sanitized = validationService.sanitizeHTML(safeHTML);
      
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('<em>');
      expect(sanitized).toContain('<br>');
    });

    test('should handle custom sanitization options', () => {
      const html = '<div><p>Content</p></div>';
      const sanitized = validationService.sanitizeHTML(html, {
        ALLOWED_TAGS: ['div', 'p']
      });
      
      expect(sanitized).toContain('<div>');
      expect(sanitized).toContain('<p>');
    });
  });

  describe('Enhanced Query Sanitization', () => {
    test('should detect and block SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const sanitized = validationService.sanitizeQuery(sqlInjection);
      
      expect(sanitized).toBe('');
    });

    test('should detect and block NoSQL injection attempts', () => {
      const noSqlInjection = '{"$where": "this.username == this.password"}';
      const sanitized = validationService.sanitizeQuery(noSqlInjection);
      
      expect(sanitized).toBe('');
    });

    test('should remove dangerous characters while preserving safe content', () => {
      const input = 'search term with spaces';
      const sanitized = validationService.sanitizeQuery(input);
      
      expect(sanitized).toBe('search term with spaces');
    });

    test('should handle wildcard options', () => {
      const input = 'search*term%';
      const sanitizedWithWildcards = validationService.sanitizeQuery(input, { allowWildcards: true });
      const sanitizedWithoutWildcards = validationService.sanitizeQuery(input, { allowWildcards: false });
      
      expect(sanitizedWithWildcards).toContain('*');
      expect(sanitizedWithWildcards).toContain('%');
      expect(sanitizedWithoutWildcards).not.toContain('*');
      expect(sanitizedWithoutWildcards).not.toContain('%');
    });

    test('should respect length limits', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = validationService.sanitizeQuery(longInput, { maxLength: 100 });
      
      expect(sanitized.length).toBe(100);
    });
  });

  describe('Content Security Policy Validation', () => {
    test('should detect inline script violations', () => {
      const content = '<script>alert("inline script")</script>';
      const result = validationService.validateCSP(content);
      
      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].directive).toBe('script-src');
      expect(result.violations[0].violation).toBe('inline-script');
    });

    test('should detect inline style violations', () => {
      const content = '<div style="color: red;">Styled content</div>';
      const result = validationService.validateCSP(content);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.directive === 'style-src')).toBe(true);
    });

    test('should detect eval usage violations', () => {
      const content = '<script>eval("alert(1)")</script>';
      const result = validationService.validateCSP(content);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.violation === 'unsafe-eval')).toBe(true);
    });

    test('should validate external resources against CSP', () => {
      const content = '<script src="https://evil.com/malicious.js"></script>';
      const result = validationService.validateCSP(content);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.violation === 'external-resource')).toBe(true);
    });

    test('should generate proper CSP header', () => {
      const cspConfig = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"]
      };
      const header = validationService.generateCSPHeader(cspConfig);
      
      expect(header).toContain("default-src 'self'");
      expect(header).toContain("script-src 'self' 'unsafe-inline'");
    });
  });

  describe('Comprehensive Injection Attack Detection', () => {
    test('should detect SQL injection attempts', () => {
      const sqlAttack = "1' OR '1'='1";
      const result = validationService.detectInjectionAttacks(sqlAttack);
      
      expect(result.isClean).toBe(false);
      expect(result.threats.some(t => t.type.includes('SQL'))).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    test('should detect NoSQL injection attempts', () => {
      const noSqlAttack = '{"$ne": null}';
      const result = validationService.detectInjectionAttacks(noSqlAttack);
      
      expect(result.isClean).toBe(false);
      expect(result.threats.some(t => t.type.includes('NOSQL'))).toBe(true);
    });

    test('should detect XSS attempts', () => {
      const xssAttack = '<script>alert("xss")</script>';
      const result = validationService.detectInjectionAttacks(xssAttack);
      
      expect(result.isClean).toBe(false);
      expect(result.threats.some(t => t.type.includes('XSS'))).toBe(true);
    });

    test('should detect LDAP injection attempts', () => {
      const ldapAttack = '*)(uid=*))(|(uid=*';
      const result = validationService.detectInjectionAttacks(ldapAttack);
      
      expect(result.isClean).toBe(false);
      expect(result.threats.some(t => t.type.includes('LDAP'))).toBe(true);
    });

    test('should detect XPath injection attempts', () => {
      const xpathAttack = "' or '1'='1";
      const result = validationService.detectInjectionAttacks(xpathAttack);
      
      expect(result.isClean).toBe(false);
      expect(result.threats.some(t => t.type.includes('XPATH'))).toBe(true);
    });

    test('should detect command injection attempts', () => {
      const commandAttack = '; cat /etc/passwd';
      const result = validationService.detectInjectionAttacks(commandAttack);
      
      expect(result.isClean).toBe(false);
      expect(result.threats.some(t => t.type.includes('COMMAND'))).toBe(true);
    });

    test('should calculate appropriate risk scores', () => {
      const lowRiskInput = 'normal user input';
      const highRiskInput = '<script>alert("xss")</script>; DROP TABLE users; --';
      
      const lowRiskResult = validationService.detectInjectionAttacks(lowRiskInput);
      const highRiskResult = validationService.detectInjectionAttacks(highRiskInput);
      
      expect(lowRiskResult.riskScore).toBe(0);
      expect(highRiskResult.riskScore).toBeGreaterThan(50);
    });

    test('should allow selective threat detection', () => {
      const mixedAttack = '<script>alert("xss")</script>; DROP TABLE users;';
      
      const xssOnlyResult = validationService.detectInjectionAttacks(mixedAttack, {
        checkXSS: true,
        checkSQL: false
      });
      
      expect(xssOnlyResult.threats.some(t => t.type.includes('XSS'))).toBe(true);
      expect(xssOnlyResult.threats.some(t => t.type.includes('SQL'))).toBe(false);
    });
  });

  describe('Enhanced User Input Processing', () => {
    test('should process HTML input with enhanced sanitization', () => {
      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>';
      const processed = validationService.processUserInput(maliciousHTML, 'html');
      
      expect(processed).not.toContain('<script>');
      expect(processed).toContain('<p>Safe content</p>');
    });

    test('should process query input with enhanced sanitization', () => {
      const maliciousQuery = "'; DROP TABLE users; --";
      const processed = validationService.processUserInput(maliciousQuery, 'query');
      
      expect(processed).toBe('');
    });

    test('should process text input with length limits', () => {
      const longText = 'a'.repeat(2000);
      const processed = validationService.processUserInput(longText, 'text', { maxLength: 500 });
      
      expect(processed.length).toBe(500);
    });

    test('should handle non-string inputs gracefully', () => {
      const processed1 = validationService.processUserInput(null, 'html');
      const processed2 = validationService.processUserInput(123, 'query');
      const processed3 = validationService.processUserInput(undefined, 'text');
      
      expect(processed1).toBe('');
      expect(processed2).toBe('');
      expect(processed3).toBe('');
    });
  });

  describe('Security Logging and Monitoring', () => {
    test('should log XSS attempts during sanitization', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const maliciousHTML = '<script>alert("xss")</script>';
      validationService.sanitizeHTML(maliciousHTML);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('XSS attempt detected and blocked'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });

    test('should log injection attempts during query sanitization', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const sqlInjection = "'; DROP TABLE users; --";
      validationService.sanitizeQuery(sqlInjection);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Injection attempt detected and blocked'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty strings', () => {
      const htmlResult = validationService.sanitizeHTML('');
      const queryResult = validationService.sanitizeQuery('');
      const detectionResult = validationService.detectInjectionAttacks('');
      
      expect(htmlResult).toBe('');
      expect(queryResult).toBe('');
      expect(detectionResult.isClean).toBe(true);
    });

    test('should handle very long inputs', () => {
      const veryLongInput = 'a'.repeat(100000);
      
      expect(() => {
        validationService.sanitizeHTML(veryLongInput);
        validationService.sanitizeQuery(veryLongInput);
        validationService.detectInjectionAttacks(veryLongInput);
      }).not.toThrow();
    });

    test('should handle special characters and unicode', () => {
      const unicodeInput = '测试内容 🚀 émojis and spëcial chars';
      
      const htmlResult = validationService.sanitizeHTML(unicodeInput);
      const queryResult = validationService.sanitizeQuery(unicodeInput);
      
      expect(htmlResult).toContain('测试内容');
      expect(queryResult).toContain('测试内容');
    });
  });
});