const FileUploadSecurityService = require('../fileUploadSecurityService');
const crypto = require('crypto');
const path = require('path');

describe('File Upload Security Service', () => {
  let fileUploadSecurity;

  beforeEach(() => {
    fileUploadSecurity = new FileUploadSecurityService();
  });

  describe('Basic File Validation', () => {
    test('should validate a valid image file', async () => {
      const validImageFile = {
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        fieldname: 'profileImage',
        buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]) // JPEG header
      };

      const result = await fileUploadSecurity.validateFile(validImageFile);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.securityScore).toBeGreaterThan(70);
    });

    test('should reject file with no name', async () => {
      const invalidFile = {
        originalname: '',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'profileImage'
      };

      const result = await fileUploadSecurity.validateFile(invalidFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_FILENAME')).toBe(true);
    });

    test('should reject file with dangerous characters in filename', async () => {
      const dangerousFile = {
        originalname: 'test<script>.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'profileImage'
      };

      const result = await fileUploadSecurity.validateFile(dangerousFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'DANGEROUS_FILENAME')).toBe(true);
    });

    test('should reject file with filename too long', async () => {
      const longNameFile = {
        originalname: 'a'.repeat(300) + '.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'profileImage'
      };

      const result = await fileUploadSecurity.validateFile(longNameFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'FILENAME_TOO_LONG')).toBe(true);
    });
  });

  describe('MIME Type Validation', () => {
    test('should accept allowed MIME types', async () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      
      for (const mimeType of allowedTypes) {
        const file = {
          originalname: `test.${mimeType.split('/')[1]}`,
          mimetype: mimeType,
          size: 1024,
          fieldname: 'upload'
        };

        const result = await fileUploadSecurity.validateFile(file);
        expect(result.errors.some(e => e.type === 'INVALID_MIMETYPE')).toBe(false);
      }
    });

    test('should reject disallowed MIME types', async () => {
      const disallowedFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/x-executable',
        size: 1024,
        fieldname: 'upload'
      };

      const result = await fileUploadSecurity.validateFile(disallowedFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_MIMETYPE')).toBe(true);
    });

    test('should handle wildcard MIME type matching', async () => {
      const imageFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload'
      };

      const result = await fileUploadSecurity.validateFile(imageFile, {
        allowedMimeTypes: ['image/*']
      });
      
      expect(result.errors.some(e => e.type === 'INVALID_MIMETYPE')).toBe(false);
    });
  });

  describe('File Extension Validation', () => {
    test('should reject dangerous file extensions', async () => {
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
      
      for (const ext of dangerousExtensions) {
        const dangerousFile = {
          originalname: `malicious${ext}`,
          mimetype: 'application/octet-stream',
          size: 1024,
          fieldname: 'upload'
        };

        const result = await fileUploadSecurity.validateFile(dangerousFile);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.type === 'DANGEROUS_EXTENSION')).toBe(true);
      }
    });

    test('should warn about extension-MIME type mismatch', async () => {
      const mismatchFile = {
        originalname: 'document.pdf',
        mimetype: 'image/jpeg', // Wrong MIME type for PDF extension
        size: 1024,
        fieldname: 'upload'
      };

      const result = await fileUploadSecurity.validateFile(mismatchFile);
      
      expect(result.warnings.some(w => w.type === 'EXTENSION_MISMATCH')).toBe(true);
      expect(result.securityScore).toBeLessThan(100);
    });

    test('should warn about missing file extension', async () => {
      const noExtFile = {
        originalname: 'document',
        mimetype: 'text/plain',
        size: 1024,
        fieldname: 'upload'
      };

      const result = await fileUploadSecurity.validateFile(noExtFile);
      
      expect(result.warnings.some(w => w.type === 'MISSING_EXTENSION')).toBe(true);
    });
  });

  describe('File Size Validation', () => {
    test('should reject files exceeding size limits', async () => {
      const oversizedFile = {
        originalname: 'large-image.jpg',
        mimetype: 'image/jpeg',
        size: 50 * 1024 * 1024, // 50MB (exceeds 10MB limit for images)
        fieldname: 'upload'
      };

      const result = await fileUploadSecurity.validateFile(oversizedFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'FILE_TOO_LARGE')).toBe(true);
    });

    test('should reject empty files', async () => {
      const emptyFile = {
        originalname: 'empty.txt',
        mimetype: 'text/plain',
        size: 0,
        fieldname: 'upload'
      };

      const result = await fileUploadSecurity.validateFile(emptyFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'EMPTY_FILE')).toBe(true);
    });

    test('should respect custom size limits', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
        fieldname: 'upload'
      };

      const result = await fileUploadSecurity.validateFile(file, {
        maxSize: 1024 * 1024 // 1MB limit
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'FILE_TOO_LARGE')).toBe(true);
    });
  });

  describe('File Signature Validation', () => {
    test('should validate correct JPEG signature', async () => {
      const jpegFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])
      };

      const result = await fileUploadSecurity.validateFile(jpegFile);
      
      expect(result.warnings.some(w => w.type === 'INVALID_SIGNATURE')).toBe(false);
      expect(result.metadata.signatureValidated).toBe(true);
    });

    test('should validate correct PNG signature', async () => {
      const pngFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00])
      };

      const result = await fileUploadSecurity.validateFile(pngFile);
      
      expect(result.warnings.some(w => w.type === 'INVALID_SIGNATURE')).toBe(false);
      expect(result.metadata.signatureValidated).toBe(true);
    });

    test('should warn about invalid file signature', async () => {
      const fakeJpegFile = {
        originalname: 'fake.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]) // Wrong signature
      };

      const result = await fileUploadSecurity.validateFile(fakeJpegFile);
      
      expect(result.warnings.some(w => w.type === 'INVALID_SIGNATURE')).toBe(true);
      expect(result.securityScore).toBeLessThan(100);
    });
  });

  describe('Content Analysis', () => {
    test('should detect suspicious script content in images', async () => {
      const maliciousImage = {
        originalname: 'malicious.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from('fake-image-data<script>alert("xss")</script>')
      };

      const result = await fileUploadSecurity.validateFile(maliciousImage);
      
      expect(result.warnings.some(w => w.type === 'SUSPICIOUS_CONTENT')).toBe(true);
      expect(result.securityScore).toBeLessThan(100);
    });

    test('should detect polyglot files', async () => {
      const polyglotFile = {
        originalname: 'polyglot.gif',
        mimetype: 'image/gif',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from('GIF89a<html><script>alert("polyglot")</script></html>')
      };

      const result = await fileUploadSecurity.validateFile(polyglotFile);
      
      expect(result.warnings.some(w => w.type === 'POLYGLOT_FILE')).toBe(true);
      expect(result.securityScore).toBeLessThan(100);
    });
  });

  describe('Virus Scanning', () => {
    test('should detect EICAR test virus', async () => {
      const eicarFile = {
        originalname: 'eicar.txt',
        mimetype: 'text/plain',
        size: 68,
        fieldname: 'upload',
        buffer: Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
      };

      const result = await fileUploadSecurity.validateFile(eicarFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'VIRUS_DETECTED')).toBe(true);
      expect(result.securityScore).toBe(0);
    });

    test('should detect suspicious heuristics', async () => {
      const suspiciousFile = {
        originalname: 'suspicious.js',
        mimetype: 'text/plain',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from('eval(document.write("malicious code"));')
      };

      const result = await fileUploadSecurity.validateFile(suspiciousFile);
      
      expect(result.warnings.some(w => w.type === 'SUSPICIOUS_HEURISTICS')).toBe(true);
      expect(result.securityScore).toBeLessThan(100);
    });
  });

  describe('Security Score Calculation', () => {
    test('should calculate appropriate security scores', async () => {
      // Clean file should have high score
      const cleanFile = {
        originalname: 'clean.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10])
      };

      const cleanResult = await fileUploadSecurity.validateFile(cleanFile);
      expect(cleanResult.securityScore).toBeGreaterThan(90);

      // File with warnings should have lower score
      const suspiciousFile = {
        originalname: 'suspicious.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from('fake-jpeg<script>alert("xss")</script>')
      };

      const suspiciousResult = await fileUploadSecurity.validateFile(suspiciousFile);
      expect(suspiciousResult.securityScore).toBeLessThan(70);
    });
  });

  describe('Secure Filename Generation', () => {
    test('should generate secure filenames', () => {
      const originalName = 'my document.pdf';
      const result = fileUploadSecurity.generateSecureFilename(originalName);
      
      expect(result.secureFilename).toMatch(/^upload_\d+_[a-f0-9]{32}\.pdf$/);
      expect(result.originalName).toBe(originalName);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.hash).toHaveLength(16);
    });

    test('should handle custom prefix', () => {
      const result = fileUploadSecurity.generateSecureFilename('test.jpg', {
        prefix: 'profile'
      });
      
      expect(result.secureFilename).toMatch(/^profile_\d+_[a-f0-9]{32}\.jpg$/);
    });
  });

  describe('Secure Storage Path', () => {
    test('should create secure storage paths', () => {
      const filename = 'secure_file.jpg';
      const storagePath = fileUploadSecurity.createSecureStoragePath(filename);
      
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      expect(storagePath).toContain(`uploads${path.sep}secure${path.sep}${year}${path.sep}${month}${path.sep}${day}`);
      expect(storagePath).toContain(filename);
    });

    test('should handle custom base directory', () => {
      const filename = 'test.jpg';
      const storagePath = fileUploadSecurity.createSecureStoragePath(filename, {
        baseDir: 'custom-uploads'
      });
      
      expect(storagePath).toContain(`custom-uploads${path.sep}secure`);
    });
  });

  describe('File Sanitization', () => {
    test('should sanitize valid files successfully', async () => {
      const validFile = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024, // 1MB
        fieldname: 'upload',
        buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]) // PDF header
      };

      const result = await fileUploadSecurity.sanitizeFile(validFile);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.secureFilename).toMatch(/^upload_\d+_[a-f0-9]{32}\.pdf$/);
      expect(result.originalName).toBe('document.pdf');
      expect(result.storagePath).toContain(`uploads${path.sep}secure`);
      expect(result.metadata.securityScore).toBeGreaterThan(70);
    });

    test('should reject files with low security scores', async () => {
      const suspiciousFile = {
        originalname: 'suspicious.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload',
        buffer: Buffer.from('fake-image-data-with-suspicious-content-but-no-virus')
      };

      // First validate to ensure it passes basic validation but has low score
      const validation = await fileUploadSecurity.validateFile(suspiciousFile);
      expect(validation.isValid).toBe(true); // Should be valid but with low score
      
      await expect(fileUploadSecurity.sanitizeFile(suspiciousFile, {
        minSecurityScore: 95 // Set very high threshold
      })).rejects.toThrow('security score');
    });

    test('should reject invalid files', async () => {
      const invalidFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/x-executable',
        size: 1024,
        fieldname: 'upload'
      };

      await expect(fileUploadSecurity.sanitizeFile(invalidFile)).rejects.toThrow('validation failed');
    });
  });

  describe('Entropy Calculation', () => {
    test('should calculate entropy correctly', () => {
      // Low entropy data (repeated pattern)
      const lowEntropyBuffer = Buffer.from('aaaaaaaaaa');
      const lowEntropy = fileUploadSecurity.calculateEntropy(lowEntropyBuffer);
      expect(lowEntropy).toBeLessThan(2);

      // High entropy data (random)
      const highEntropyBuffer = crypto.randomBytes(100);
      const highEntropy = fileUploadSecurity.calculateEntropy(highEntropyBuffer);
      expect(highEntropy).toBeGreaterThan(6);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing file gracefully', async () => {
      const result = await fileUploadSecurity.validateFile(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'MISSING_FILE')).toBe(true);
    });

    test('should handle files without buffer or path', async () => {
      const fileWithoutContent = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload'
      };

      const result = await fileUploadSecurity.validateFile(fileWithoutContent);
      
      expect(result.warnings.some(w => w.type === 'NO_CONTENT_ACCESS')).toBe(true);
    });

    test('should handle validation errors gracefully', async () => {
      // Create a file that will cause errors during content analysis
      const problematicFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'upload'
        // No buffer or path - will cause warnings during signature validation and content analysis
      };

      const result = await fileUploadSecurity.validateFile(problematicFile);
      
      expect(result.warnings.some(w => w.type === 'NO_CONTENT_ACCESS')).toBe(true);
    });
  });
});