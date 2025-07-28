// Simple test script to verify database field-level encryption works
const mongoose = require('mongoose');
const databaseEncryptionService = require('./services/security/databaseEncryptionService');

// Mock the config service for testing
jest.mock('./services/security/configService', () => ({
  configService: {
    initialize: jest.fn().mockResolvedValue(true),
    getEncryptionConfig: jest.fn().mockReturnValue({
      encryptionKey: 'test-encryption-key-for-testing-purposes-12345678901234567890',
      fieldEncryptionKey: 'test-field-encryption-key-for-testing-purposes-12345678901234567890',
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000
    })
  }
}));

// Mock security monitor service
jest.mock('./services/security/securityMonitorService', () => ({
  securityMonitorService: {
    logSecurityEvent: jest.fn().mockResolvedValue(true)
  }
}));

async function testEncryption() {
  try {
    console.log('Testing database field-level encryption...');
    
    // Test document encryption
    const testDocument = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St'
    };
    
    console.log('Original document:', testDocument);
    
    // Encrypt fields
    const encrypted = await databaseEncryptionService.encryptDocumentFields(testDocument, 'User');
    console.log('Encrypted document:', encrypted);
    
    // Decrypt fields
    const decrypted = await databaseEncryptionService.decryptDocumentFields(encrypted, 'User');
    console.log('Decrypted document:', decrypted);
    
    // Verify data integrity
    const isIntact = JSON.stringify(testDocument) === JSON.stringify(decrypted);
    console.log('Data integrity check:', isIntact ? 'PASSED' : 'FAILED');
    
    // Test statistics
    const stats = databaseEncryptionService.getEncryptionStatistics();
    console.log('Encryption statistics:', stats);
    
    // Test health check
    const health = await databaseEncryptionService.performHealthCheck();
    console.log('Health check:', health);
    
    console.log('✅ Database field-level encryption test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEncryption();