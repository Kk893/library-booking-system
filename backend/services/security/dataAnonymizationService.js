const crypto = require('crypto');

class DataAnonymizationService {
  constructor() {
    this.anonymizationMethods = {
      FULL_ANONYMIZATION: 'full_anonymization',
      PSEUDONYMIZATION: 'pseudonymization',
      GENERALIZATION: 'generalization',
      SUPPRESSION: 'suppression',
      NOISE_ADDITION: 'noise_addition'
    };
    this.pseudonymizationKey = process.env.PSEUDONYMIZATION_KEY || 'default-pseudo-key-change-in-production';
    this.retentionPeriods = {
      USER_DATA: 730,
      ANALYTICS_DATA: 1095,
      AUDIT_LOGS: 2555,
      SESSION_DATA: 90,
      SECURITY_LOGS: 1825
    };
  }

  async anonymizeUserData(userData, method = this.anonymizationMethods.FULL_ANONYMIZATION, options = {}) {
    try {
      const anonymizedData = JSON.parse(JSON.stringify(userData));
      const anonymizationId = crypto.randomUUID();

      switch (method) {
        case this.anonymizationMethods.FULL_ANONYMIZATION:
          return await this.performFullAnonymization(anonymizedData, anonymizationId, options);
        case this.anonymizationMethods.PSEUDONYMIZATION:
          return await this.performPseudonymization(anonymizedData, anonymizationId, options);
        case this.anonymizationMethods.GENERALIZATION:
          return await this.performGeneralization(anonymizedData, anonymizationId, options);
        case this.anonymizationMethods.SUPPRESSION:
          return await this.performSuppression(anonymizedData, anonymizationId, options);
        case this.anonymizationMethods.NOISE_ADDITION:
          return await this.performNoiseAddition(anonymizedData, anonymizationId, options);
        default:
          throw new Error(`Unknown anonymization method: ${method}`);
      }
    } catch (error) {
      console.error('Error anonymizing user data:', error);
      throw error;
    }
  }

  generatePseudonym(value, context) {
    const hmac = crypto.createHmac('sha256', this.pseudonymizationKey);
    hmac.update(`${context}:${value}`);
    return `${context}_${hmac.digest('hex').substring(0, 16)}`;
  }

  generateDataHash(data) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data, Object.keys(data).sort()));
    return hash.digest('hex');
  }
}

module.exports = new DataAnonymizationService();