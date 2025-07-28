/**
 * Security Dashboard Routes
 * Provides API endpoints for security monitoring and reporting
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const securityDashboardService = require('../services/security/securityDashboardService');
const { body, query, validationResult } = require('express-validator');

// Middleware to check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Initialize security dashboard service
const initializeDashboard = async (req, res, next) => {
  try {
    if (!securityDashboardService.isInitialized) {
      await securityDashboardService.initialize();
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to initialize security dashboard',
      message: error.message
    });
  }
};

/**
 * @route GET /api/security/overview
 * @desc Get security overview metrics
 * @access Admin/SuperAdmin
 */
router.get('/overview', 
  auth, 
  requireRole('admin'), 
  initializeDashboard,
  [
    query('timeframe')
      .optional()
      .isIn(['1h', '24h', '7d', '30d'])
      .withMessage('Timeframe must be one of: 1h, 24h, 7d, 30d')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { timeframe = '24h' } = req.query;
      
      const overview = await securityDashboardService.getSecurityOverview(timeframe);
      
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('Security overview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security overview',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/security/metrics/:type
 * @desc Get detailed security metrics by type
 * @access Admin/SuperAdmin
 */
router.get('/metrics/:type',
  auth,
  requireRole('admin'),
  initializeDashboard,
  [
    query('timeframe')
      .optional()
      .isIn(['1h', '24h', '7d', '30d'])
      .withMessage('Timeframe must be one of: 1h, 24h, 7d, 30d'),
    query('eventType')
      .optional()
      .isString()
      .withMessage('Event type must be a string'),
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Severity must be one of: low, medium, high, critical')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type } = req.params;
      const { timeframe = '24h', eventType, severity } = req.query;
      
      const validTypes = ['events', 'alerts', 'users', 'ips', 'audit'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid metric type',
          validTypes
        });
      }

      const filters = {};
      if (eventType) filters.eventType = eventType;
      if (severity) filters.severity = severity;
      
      const metrics = await securityDashboardService.getDetailedMetrics(type, timeframe, filters);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Security metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security metrics',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/security/status
 * @desc Get real-time security status
 * @access Admin/SuperAdmin
 */
router.get('/status',
  auth,
  requireRole('admin'),
  initializeDashboard,
  async (req, res) => {
    try {
      const status = await securityDashboardService.getRealTimeStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Security status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security status',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/security/reports/generate
 * @desc Generate security report
 * @access SuperAdmin only
 */
router.post('/reports/generate',
  auth,
  requireRole('superadmin'),
  initializeDashboard,
  [
    body('reportType')
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Report type must be one of: daily, weekly, monthly'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reportType, options = {} } = req.body;
      
      const report = await securityDashboardService.generateScheduledReport(reportType, options);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Report generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate security report',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/security/reports/schedule
 * @desc Schedule automated security report
 * @access SuperAdmin only
 */
router.post('/reports/schedule',
  auth,
  requireRole('superadmin'),
  initializeDashboard,
  [
    body('reportType')
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Report type must be one of: daily, weekly, monthly'),
    body('schedule')
      .isString()
      .notEmpty()
      .withMessage('Schedule is required and must be a string'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reportType, schedule, options = {} } = req.body;
      
      const scheduleId = securityDashboardService.scheduleReport(reportType, schedule, options);
      
      res.json({
        success: true,
        data: {
          scheduleId,
          reportType,
          schedule,
          options
        }
      });
    } catch (error) {
      console.error('Report scheduling error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule security report',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/security/health
 * @desc Get security system health metrics
 * @access Admin/SuperAdmin
 */
router.get('/health',
  auth,
  requireRole('admin'),
  initializeDashboard,
  async (req, res) => {
    try {
      const health = await securityDashboardService.getSystemHealthMetrics();
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Security health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security health metrics',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/security/dashboard/config
 * @desc Get dashboard configuration
 * @access Admin/SuperAdmin
 */
router.get('/dashboard/config',
  auth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const config = {
        availableTimeframes: ['1h', '24h', '7d', '30d'],
        availableMetricTypes: ['events', 'alerts', 'users', 'ips', 'audit'],
        availableReportTypes: ['daily', 'weekly', 'monthly'],
        availableSeverityLevels: ['low', 'medium', 'high', 'critical'],
        refreshIntervals: {
          overview: 300000, // 5 minutes
          realTimeStatus: 30000, // 30 seconds
          detailedMetrics: 600000 // 10 minutes
        }
      };
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Dashboard config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard configuration',
        message: error.message
      });
    }
  }
);

module.exports = router;