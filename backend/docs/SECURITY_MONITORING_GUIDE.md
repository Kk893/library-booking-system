# Security Monitoring and Alerting Guide

This guide provides comprehensive instructions for setting up, configuring, and maintaining security monitoring and alerting for the Library Booking System.

## Table of Contents

1. [Overview](#overview)
2. [Security Event Types](#security-event-types)
3. [Monitoring Configuration](#monitoring-configuration)
4. [Alert Configuration](#alert-configuration)
5. [Dashboard Setup](#dashboard-setup)
6. [Log Management](#log-management)
7. [Anomaly Detection](#anomaly-detection)
8. [Incident Response](#incident-response)
9. [Reporting](#reporting)
10. [Maintenance](#maintenance)

## Overview

The security monitoring system provides real-time visibility into security events, anomalous behavior, and potential threats. It includes:

- **Event Logging**: Comprehensive logging of all security-related events
- **Real-time Monitoring**: Continuous monitoring of security metrics
- **Anomaly Detection**: Automated detection of unusual patterns
- **Alerting**: Immediate notifications for critical security events
- **Reporting**: Regular security reports and metrics
- **Dashboard**: Visual representation of security status

## Security Event Types

### Authentication Events

| Event Type | Severity | Description | Retention |
|------------|----------|-------------|-----------|
| `login_attempt` | Low | User login attempt | 90 days |
| `login_success` | Low | Successful login | 30 days |
| `login_failed` | Medium | Failed login attempt | 90 days |
| `login_failed_user_not_found` | Medium | Login attempt with non-existent user | 90 days |
| `login_failed_invalid_password` | Medium | Login attempt with wrong password | 90 days |
| `login_attempt_locked_account` | High | Login attempt on locked account | 365 days |
| `logout` | Low | User logout | 30 days |
| `token_refresh` | Low | Token refresh request | 30 days |
| `token_expired` | Low | Expired token usage attempt | 30 days |
| `token_invalid` | Medium | Invalid token usage attempt | 90 days |
| `token_blacklisted` | High | Blacklisted token usage attempt | 365 days |

### Authorization Events

| Event Type | Severity | Description | Retention |
|------------|----------|-------------|-----------|
| `privilege_escalation_attempt` | High | Attempt to access higher privilege resource | 365 days |
| `access_denied` | Medium | Access denied to resource | 90 days |
| `privilege_access` | Low | Successful privileged access | 90 days |
| `role_change` | High | User role modification | 365 days |
| `permission_denied` | Medium | Permission denied for action | 90 days |

### Security Violation Events

| Event Type | Severity | Description | Retention |
|------------|----------|-------------|-----------|
| `rate_limit_exceeded` | Medium | Rate limit threshold exceeded | 90 days |
| `input_validation_failed` | Medium | Input validation failure | 90 days |
| `suspicious_input_detected` | Medium | Suspicious input patterns detected | 90 days |
| `file_upload_security_violation` | High | File upload security violation | 365 days |
| `xss_attempt` | High | Cross-site scripting attempt | 365 days |
| `sql_injection_attempt` | High | SQL injection attempt | 365 days |
| `csrf_attempt` | High | Cross-site request forgery attempt | 365 days |

### Anomaly Events

| Event Type | Severity | Description | Retention |
|------------|----------|-------------|-----------|
| `anomaly_detected` | Variable | Anomalous behavior detected | 180 days |
| `unusual_location` | Medium | Login from unusual location | 180 days |
| `unusual_time` | Low | Login at unusual time | 90 days |
| `unusual_device` | Medium | Login from unusual device | 180 days |
| `velocity_anomaly` | High | Unusual request velocity | 180 days |
| `pattern_anomaly` | Medium | Unusual access pattern | 180 days |

### System Events

| Event Type | Severity | Description | Retention |
|------------|----------|-------------|-----------|
| `security_error` | High | Security system error | 365 days |
| `configuration_change` | Medium | Security configuration change | 180 days |
| `service_start` | Low | Security service started | 30 days |
| `service_stop` | Medium | Security service stopped | 90 days |
| `health_check` | Low | Security health check | 7 days |

## Monitoring Configuration

### Environment Variables

```bash
# Security Monitoring Configuration
SECURITY_MONITORING_ENABLED=true
SECURITY_LOG_LEVEL=info
SECURITY_LOG_FILE=/var/log/security.log
SECURITY_LOG_MAX_SIZE=100MB
SECURITY_LOG_MAX_FILES=10

# Alert Configuration
ALERT_WEBHOOK_URL=https://your-monitoring-system.com/webhook
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=security@yourdomain.com,admin@yourdomain.com
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# SIEM Integration
SIEM_ENABLED=true
SIEM_ENDPOINT=https://your-siem-system.com/api/events
SIEM_API_KEY=your-siem-api-key
SIEM_BATCH_SIZE=100
SIEM_FLUSH_INTERVAL=30000

# Anomaly Detection
ANOMALY_DETECTION_ENABLED=true
ANOMALY_THRESHOLD_LOW=0.3
ANOMALY_THRESHOLD_MEDIUM=0.6
ANOMALY_THRESHOLD_HIGH=0.8
ANOMALY_LEARNING_PERIOD=604800000  # 7 days

# Metrics Collection
METRICS_ENABLED=true
METRICS_ENDPOINT=http://localhost:9090/metrics
METRICS_INTERVAL=60000  # 1 minute
```

### Service Configuration

```javascript
// backend/services/security/config/monitoring.config.js
module.exports = {
  monitoring: {
    enabled: process.env.SECURITY_MONITORING_ENABLED === 'true',
    logLevel: process.env.SECURITY_LOG_LEVEL || 'info',
    
    storage: {
      type: 'mongodb', // or 'elasticsearch', 'file'
      connection: process.env.MONGODB_URI,
      collection: 'security_events',
      indexing: true,
      compression: true
    },
    
    retention: {
      low: 30 * 24 * 60 * 60 * 1000,      // 30 days
      medium: 90 * 24 * 60 * 60 * 1000,   // 90 days
      high: 365 * 24 * 60 * 60 * 1000,    // 365 days
      critical: 1095 * 24 * 60 * 60 * 1000 // 3 years
    },
    
    batching: {
      enabled: true,
      batchSize: 100,
      flushInterval: 30000, // 30 seconds
      maxBatchAge: 60000    // 1 minute
    },
    
    correlation: {
      enabled: true,
      windowSize: 300000,   // 5 minutes
      sessionTracking: true,
      userTracking: true,
      ipTracking: true
    }
  },
  
  alerting: {
    enabled: true,
    channels: {
      webhook: {
        enabled: !!process.env.ALERT_WEBHOOK_URL,
        url: process.env.ALERT_WEBHOOK_URL,
        timeout: 10000,
        retries: 3
      },
      email: {
        enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
        recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        }
      },
      slack: {
        enabled: !!process.env.ALERT_SLACK_WEBHOOK,
        webhook: process.env.ALERT_SLACK_WEBHOOK,
        channel: '#security-alerts',
        username: 'Security Bot'
      }
    },
    
    rules: {
      immediate: {
        events: ['privilege_escalation_attempt', 'sql_injection_attempt', 'xss_attempt'],
        threshold: 1,
        window: 60000 // 1 minute
      },
      high_frequency: {
        events: ['login_failed', 'rate_limit_exceeded'],
        threshold: 10,
        window: 300000 // 5 minutes
      },
      anomaly: {
        events: ['anomaly_detected'],
        threshold: 1,
        window: 60000,
        minSeverity: 'high'
      }
    }
  },
  
  anomalyDetection: {
    enabled: process.env.ANOMALY_DETECTION_ENABLED === 'true',
    
    algorithms: {
      statistical: {
        enabled: true,
        windowSize: 3600000, // 1 hour
        sensitivity: 0.05
      },
      behavioral: {
        enabled: true,
        learningPeriod: parseInt(process.env.ANOMALY_LEARNING_PERIOD) || 604800000,
        adaptationRate: 0.1
      },
      temporal: {
        enabled: true,
        timeWindows: [300000, 900000, 3600000], // 5min, 15min, 1hour
        seasonality: true
      }
    },
    
    thresholds: {
      low: parseFloat(process.env.ANOMALY_THRESHOLD_LOW) || 0.3,
      medium: parseFloat(process.env.ANOMALY_THRESHOLD_MEDIUM) || 0.6,
      high: parseFloat(process.env.ANOMALY_THRESHOLD_HIGH) || 0.8
    },
    
    features: {
      requestRate: { weight: 0.3, enabled: true },
      errorRate: { weight: 0.4, enabled: true },
      locationVariance: { weight: 0.2, enabled: true },
      timeVariance: { weight: 0.1, enabled: true },
      deviceVariance: { weight: 0.2, enabled: true }
    }
  }
};
```

## Alert Configuration

### Alert Rules

```javascript
// Alert rule configuration
const alertRules = {
  // Critical security events - immediate alert
  critical: {
    events: [
      'privilege_escalation_attempt',
      'sql_injection_attempt',
      'xss_attempt',
      'csrf_attempt',
      'file_upload_security_violation'
    ],
    threshold: 1,
    window: 60000, // 1 minute
    channels: ['webhook', 'email', 'slack'],
    escalation: {
      enabled: true,
      delay: 300000, // 5 minutes
      channels: ['phone', 'pager']
    }
  },
  
  // High frequency events
  highFrequency: {
    events: [
      'login_failed',
      'rate_limit_exceeded',
      'input_validation_failed'
    ],
    threshold: 10,
    window: 300000, // 5 minutes
    channels: ['webhook', 'slack'],
    cooldown: 900000 // 15 minutes
  },
  
  // Anomaly detection
  anomaly: {
    events: ['anomaly_detected'],
    threshold: 1,
    window: 60000,
    minSeverity: 'high',
    channels: ['webhook', 'email'],
    requiresManualReview: true
  },
  
  // System health
  systemHealth: {
    events: [
      'security_error',
      'service_stop',
      'configuration_change'
    ],
    threshold: 1,
    window: 60000,
    channels: ['webhook', 'email']
  },
  
  // Brute force detection
  bruteForce: {
    events: ['login_failed'],
    threshold: 5,
    window: 900000, // 15 minutes
    groupBy: ['ip', 'email'],
    channels: ['webhook', 'slack'],
    autoResponse: {
      enabled: true,
      action: 'block_ip',
      duration: 3600000 // 1 hour
    }
  }
};
```

### Alert Templates

```javascript
// Alert message templates
const alertTemplates = {
  webhook: {
    critical: {
      title: '🚨 Critical Security Alert',
      color: '#ff0000',
      fields: [
        { name: 'Event Type', value: '{{eventType}}', inline: true },
        { name: 'Severity', value: '{{severity}}', inline: true },
        { name: 'User ID', value: '{{userId}}', inline: true },
        { name: 'IP Address', value: '{{ip}}', inline: true },
        { name: 'Timestamp', value: '{{timestamp}}', inline: true },
        { name: 'Details', value: '{{details}}', inline: false }
      ]
    },
    
    anomaly: {
      title: '⚠️ Security Anomaly Detected',
      color: '#ffa500',
      fields: [
        { name: 'Anomaly Type', value: '{{anomalyType}}', inline: true },
        { name: 'Score', value: '{{score}}', inline: true },
        { name: 'Threshold', value: '{{threshold}}', inline: true },
        { name: 'User ID', value: '{{userId}}', inline: true },
        { name: 'Reasons', value: '{{reasons}}', inline: false }
      ]
    }
  },
  
  email: {
    subject: '[SECURITY ALERT] {{eventType}} - {{severity}}',
    html: `
      <h2>Security Alert</h2>
      <table>
        <tr><td><strong>Event Type:</strong></td><td>{{eventType}}</td></tr>
        <tr><td><strong>Severity:</strong></td><td>{{severity}}</td></tr>
        <tr><td><strong>Timestamp:</strong></td><td>{{timestamp}}</td></tr>
        <tr><td><strong>User ID:</strong></td><td>{{userId}}</td></tr>
        <tr><td><strong>IP Address:</strong></td><td>{{ip}}</td></tr>
        <tr><td><strong>User Agent:</strong></td><td>{{userAgent}}</td></tr>
      </table>
      <h3>Details</h3>
      <pre>{{details}}</pre>
      <p><a href="{{dashboardUrl}}">View in Security Dashboard</a></p>
    `
  },
  
  slack: {
    text: '{{title}}',
    attachments: [{
      color: '{{color}}',
      fields: '{{fields}}',
      footer: 'Security Monitoring System',
      ts: '{{timestamp}}'
    }]
  }
};
```

## Dashboard Setup

### Metrics Collection

```javascript
// Security metrics configuration
const securityMetrics = {
  authentication: {
    loginAttempts: {
      type: 'counter',
      labels: ['status', 'method'],
      description: 'Total login attempts'
    },
    activeSessions: {
      type: 'gauge',
      description: 'Number of active user sessions'
    },
    tokenRefreshes: {
      type: 'counter',
      description: 'Total token refresh requests'
    }
  },
  
  authorization: {
    accessDenied: {
      type: 'counter',
      labels: ['resource', 'role'],
      description: 'Access denied events'
    },
    privilegeEscalation: {
      type: 'counter',
      labels: ['fromRole', 'toRole'],
      description: 'Privilege escalation attempts'
    }
  },
  
  security: {
    rateLimitHits: {
      type: 'counter',
      labels: ['endpoint', 'ip'],
      description: 'Rate limit violations'
    },
    validationFailures: {
      type: 'counter',
      labels: ['type', 'field'],
      description: 'Input validation failures'
    },
    anomalies: {
      type: 'counter',
      labels: ['type', 'severity'],
      description: 'Security anomalies detected'
    }
  },
  
  system: {
    securityErrors: {
      type: 'counter',
      labels: ['service', 'error'],
      description: 'Security system errors'
    },
    responseTime: {
      type: 'histogram',
      buckets: [0.1, 0.5, 1, 2, 5],
      description: 'Security middleware response time'
    }
  }
};
```

### Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Security Monitoring Dashboard",
    "refresh": "30s",
    "panels": [
      {
        "title": "Authentication Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(login_attempts_total[5m])",
            "legendFormat": "Login Rate"
          },
          {
            "expr": "login_attempts_total{status=\"failed\"}",
            "legendFormat": "Failed Logins"
          }
        ]
      },
      {
        "title": "Security Events Timeline",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(security_events_total[1m])",
            "legendFormat": "{{severity}} - {{type}}"
          }
        ]
      },
      {
        "title": "Rate Limiting",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(rate_limit_hits_total[5m])",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "Anomaly Detection",
        "type": "table",
        "targets": [
          {
            "expr": "anomalies_total",
            "format": "table",
            "instant": true
          }
        ]
      },
      {
        "title": "Top Failed Login IPs",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, sum by (ip) (login_attempts_total{status=\"failed\"}))",
            "format": "table"
          }
        ]
      },
      {
        "title": "Security Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(security_response_time_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

## Log Management

### Log Format

```javascript
// Structured log format
const logFormat = {
  timestamp: '2024-01-27T10:30:00.000Z',
  level: 'WARN',
  service: 'security-monitor',
  correlationId: 'req-123456789',
  event: {
    type: 'login_failed',
    severity: 'medium',
    category: 'authentication'
  },
  user: {
    id: 'user123',
    email: 'user@example.com',
    role: 'user'
  },
  request: {
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    method: 'POST',
    endpoint: '/api/auth/login',
    sessionId: 'session123'
  },
  details: {
    reason: 'invalid_password',
    attemptCount: 3,
    lockoutThreshold: 5
  },
  metadata: {
    environment: 'production',
    version: '1.0.0',
    hostname: 'app-server-01'
  }
};
```

### Log Aggregation

```yaml
# Logstash configuration for security logs
input {
  file {
    path => "/var/log/security.log"
    codec => json
    type => "security"
  }
}

filter {
  if [type] == "security" {
    # Parse timestamp
    date {
      match => [ "timestamp", "ISO8601" ]
    }
    
    # Extract IP geolocation
    geoip {
      source => "[request][ip]"
      target => "geoip"
    }
    
    # Classify threat level
    if [event][severity] == "high" or [event][severity] == "critical" {
      mutate {
        add_tag => [ "threat" ]
      }
    }
    
    # Add alert flag for immediate events
    if [event][type] in ["privilege_escalation_attempt", "sql_injection_attempt"] {
      mutate {
        add_tag => [ "alert" ]
      }
    }
  }
}

output {
  # Send to Elasticsearch
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "security-logs-%{+YYYY.MM.dd}"
  }
  
  # Send alerts to monitoring system
  if "alert" in [tags] {
    http {
      url => "https://monitoring.example.com/webhook"
      http_method => "post"
      format => "json"
    }
  }
}
```

## Anomaly Detection

### Detection Algorithms

```javascript
// Anomaly detection configuration
const anomalyDetection = {
  algorithms: {
    // Statistical anomaly detection
    statistical: {
      enabled: true,
      methods: ['zscore', 'iqr', 'isolation_forest'],
      windowSize: 3600000, // 1 hour
      sensitivity: 0.05,
      features: [
        'request_rate',
        'error_rate',
        'response_time',
        'unique_ips',
        'failed_logins'
      ]
    },
    
    // Behavioral anomaly detection
    behavioral: {
      enabled: true,
      learningPeriod: 604800000, // 7 days
      adaptationRate: 0.1,
      profiles: {
        user: ['login_times', 'access_patterns', 'locations'],
        system: ['resource_usage', 'error_patterns', 'traffic_patterns']
      }
    },
    
    // Temporal anomaly detection
    temporal: {
      enabled: true,
      timeWindows: [300000, 900000, 3600000], // 5min, 15min, 1hour
      seasonality: {
        daily: true,
        weekly: true,
        monthly: false
      },
      holidays: true
    },
    
    // Sequence anomaly detection
    sequence: {
      enabled: true,
      maxSequenceLength: 10,
      minSupport: 0.01,
      patterns: [
        'login_sequence',
        'access_sequence',
        'error_sequence'
      ]
    }
  },
  
  thresholds: {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
    critical: 0.95
  },
  
  responses: {
    low: ['log'],
    medium: ['log', 'alert'],
    high: ['log', 'alert', 'investigate'],
    critical: ['log', 'alert', 'investigate', 'block']
  }
};
```

### Machine Learning Models

```python
# Anomaly detection model training
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

class SecurityAnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.features = [
            'request_rate',
            'error_rate',
            'unique_ips',
            'failed_logins',
            'response_time_avg',
            'response_time_p95'
        ]
    
    def train(self, training_data):
        # Prepare features
        X = training_data[self.features]
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model.fit(X_scaled)
        
    def detect_anomalies(self, data):
        # Scale features
        X = data[self.features]
        X_scaled = self.scaler.transform(X)
        
        # Predict anomalies
        predictions = self.model.predict(X_scaled)
        scores = self.model.decision_function(X_scaled)
        
        # Convert to anomaly scores (0-1)
        anomaly_scores = (scores.max() - scores) / (scores.max() - scores.min())
        
        return {
            'is_anomaly': predictions == -1,
            'anomaly_score': anomaly_scores,
            'threshold': 0.6
        }
```

## Incident Response

### Automated Response Actions

```javascript
// Automated incident response configuration
const incidentResponse = {
  triggers: {
    bruteForce: {
      event: 'login_failed',
      threshold: 5,
      window: 900000, // 15 minutes
      groupBy: 'ip',
      actions: [
        {
          type: 'block_ip',
          duration: 3600000, // 1 hour
          scope: 'authentication'
        },
        {
          type: 'alert',
          channels: ['webhook', 'slack']
        }
      ]
    },
    
    privilegeEscalation: {
      event: 'privilege_escalation_attempt',
      threshold: 1,
      window: 60000,
      actions: [
        {
          type: 'lock_account',
          duration: 1800000 // 30 minutes
        },
        {
          type: 'invalidate_sessions',
          scope: 'user'
        },
        {
          type: 'alert',
          channels: ['webhook', 'email', 'slack'],
          priority: 'critical'
        }
      ]
    },
    
    sqlInjection: {
      event: 'sql_injection_attempt',
      threshold: 1,
      window: 60000,
      actions: [
        {
          type: 'block_ip',
          duration: 86400000, // 24 hours
          scope: 'global'
        },
        {
          type: 'alert',
          channels: ['webhook', 'email', 'phone'],
          priority: 'critical'
        },
        {
          type: 'create_incident',
          severity: 'high',
          assignee: 'security-team'
        }
      ]
    }
  },
  
  escalation: {
    timeouts: {
      low: 3600000,    // 1 hour
      medium: 1800000, // 30 minutes
      high: 900000,    // 15 minutes
      critical: 300000 // 5 minutes
    },
    
    levels: [
      {
        name: 'L1 - Security Analyst',
        contacts: ['analyst@example.com'],
        methods: ['email', 'slack']
      },
      {
        name: 'L2 - Security Engineer',
        contacts: ['engineer@example.com'],
        methods: ['email', 'phone']
      },
      {
        name: 'L3 - Security Manager',
        contacts: ['manager@example.com'],
        methods: ['email', 'phone', 'sms']
      }
    ]
  }
};
```

## Reporting

### Automated Reports

```javascript
// Security reporting configuration
const reportingConfig = {
  schedules: {
    daily: {
      time: '08:00',
      timezone: 'UTC',
      recipients: ['security@example.com'],
      format: 'html',
      sections: [
        'summary',
        'authentication_events',
        'security_violations',
        'top_threats',
        'system_health'
      ]
    },
    
    weekly: {
      day: 'monday',
      time: '09:00',
      timezone: 'UTC',
      recipients: ['security@example.com', 'management@example.com'],
      format: 'pdf',
      sections: [
        'executive_summary',
        'threat_landscape',
        'incident_analysis',
        'trends',
        'recommendations'
      ]
    },
    
    monthly: {
      day: 1,
      time: '10:00',
      timezone: 'UTC',
      recipients: ['security@example.com', 'management@example.com', 'board@example.com'],
      format: 'pdf',
      sections: [
        'executive_summary',
        'security_metrics',
        'compliance_status',
        'risk_assessment',
        'strategic_recommendations'
      ]
    }
  },
  
  metrics: {
    authentication: [
      'total_login_attempts',
      'failed_login_rate',
      'account_lockouts',
      'password_resets',
      'mfa_adoption'
    ],
    
    security: [
      'security_events_total',
      'high_severity_events',
      'blocked_ips',
      'rate_limit_violations',
      'anomalies_detected'
    ],
    
    system: [
      'uptime',
      'response_time',
      'error_rate',
      'security_service_health'
    ]
  }
};
```

## Maintenance

### Regular Maintenance Tasks

```bash
#!/bin/bash
# Security monitoring maintenance script

# Daily tasks
daily_maintenance() {
    echo "Running daily security monitoring maintenance..."
    
    # Clean up old logs
    find /var/log -name "security.log.*" -mtime +30 -delete
    
    # Rotate security logs
    logrotate /etc/logrotate.d/security
    
    # Update anomaly detection models
    python /opt/security/update_models.py
    
    # Generate daily security report
    node /opt/security/generate_report.js --type daily
    
    # Check alert system health
    curl -f http://localhost:3000/api/health/alerts || echo "Alert system unhealthy"
    
    echo "Daily maintenance completed"
}

# Weekly tasks
weekly_maintenance() {
    echo "Running weekly security monitoring maintenance..."
    
    # Archive old security events
    node /opt/security/archive_events.js --days 90
    
    # Update threat intelligence feeds
    python /opt/security/update_threat_feeds.py
    
    # Retrain anomaly detection models
    python /opt/security/retrain_models.py
    
    # Generate weekly security report
    node /opt/security/generate_report.js --type weekly
    
    # Backup security configuration
    tar -czf /backup/security-config-$(date +%Y%m%d).tar.gz /opt/security/config/
    
    echo "Weekly maintenance completed"
}

# Monthly tasks
monthly_maintenance() {
    echo "Running monthly security monitoring maintenance..."
    
    # Full system security audit
    python /opt/security/security_audit.py
    
    # Update security policies
    node /opt/security/update_policies.js
    
    # Generate monthly security report
    node /opt/security/generate_report.js --type monthly
    
    # Review and update alert thresholds
    python /opt/security/optimize_thresholds.py
    
    echo "Monthly maintenance completed"
}

# Run based on argument
case "$1" in
    daily)
        daily_maintenance
        ;;
    weekly)
        weekly_maintenance
        ;;
    monthly)
        monthly_maintenance
        ;;
    *)
        echo "Usage: $0 {daily|weekly|monthly}"
        exit 1
        ;;
esac
```

### Performance Optimization

```javascript
// Performance optimization for security monitoring
const optimizationConfig = {
  indexing: {
    // Database indexes for fast queries
    indexes: [
      { fields: ['timestamp', 'event.type'], background: true },
      { fields: ['user.id', 'timestamp'], background: true },
      { fields: ['request.ip', 'timestamp'], background: true },
      { fields: ['event.severity', 'timestamp'], background: true }
    ],
    
    // TTL indexes for automatic cleanup
    ttlIndexes: [
      { field: 'timestamp', expireAfterSeconds: 7776000 } // 90 days
    ]
  },
  
  caching: {
    // Redis caching for frequent queries
    enabled: true,
    ttl: 300, // 5 minutes
    patterns: [
      'user_events:*',
      'ip_events:*',
      'daily_stats:*'
    ]
  },
  
  aggregation: {
    // Pre-computed aggregations
    enabled: true,
    interval: 300000, // 5 minutes
    metrics: [
      'events_per_minute',
      'events_by_severity',
      'events_by_type',
      'unique_users',
      'unique_ips'
    ]
  },
  
  batching: {
    // Batch processing for better performance
    enabled: true,
    batchSize: 1000,
    flushInterval: 30000, // 30 seconds
    maxMemory: '100MB'
  }
};
```

This comprehensive monitoring guide ensures that the security system is properly monitored, alerts are configured correctly, and incidents are responded to promptly and effectively.