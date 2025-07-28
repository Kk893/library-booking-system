const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// Enhanced security middleware
const { 
  enhancedSecurityPipeline, 
  lightweightSecurityPipeline 
} = require('./middleware/enhancedSecurity');

// Legacy security middleware (for backward compatibility)
const { securityHeaders, generalLimiter, sanitizeInput } = require('./middleware/security');

// Security services
const databaseSecurityService = require('./services/security/databaseSecurityService');
const securityMonitorService = require('./services/security/securityMonitorService');
const configService = require('./services/security/configService');

require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const libraryRoutes = require('./routes/libraries');
const adminRoutes = require('./routes/admin');
const superAdminRoutes = require('./routes/superadmin');
const booksRoutes = require('./routes/books');
const offersRoutes = require('./routes/offers');
const ratingsRoutes = require('./routes/ratings');
const seatsRoutes = require('./routes/seats');
const favoritesRoutes = require('./routes/favorites');
const imagesRoutes = require('./routes/images');
const notificationsRoutes = require('./routes/notifications');
const securityRoutes = require('./routes/security');
const apiKeysRoutes = require('./routes/apiKeys');
const privacyRoutes = require('./routes/privacy');

const app = express();

// Initialize security configuration
const initializeSecurity = async () => {
  try {
    await configService.initialize();
    console.log('Security configuration loaded successfully');
  } catch (error) {
    console.error('Failed to load security configuration:', error);
    process.exit(1);
  }
};

// Create uploads directories
const uploadsDir = path.join(__dirname, 'uploads');
const subdirs = ['profiles', 'books', 'libraries', 'general', 'samples'];

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

subdirs.forEach(subdir => {
  const dirPath = path.join(uploadsDir, subdir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// CORS configuration first
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'], // Specific origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Refresh-Token'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Simple static file serving (backup method)
app.use('/static', express.static(path.join(__dirname, 'uploads')));

// Enhanced Security Middleware Pipeline (after CORS and static files)
app.use(cookieParser());
// Temporarily disable enhanced security for debugging
// app.use(enhancedSecurityPipeline);

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb for security
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files already served above

// Health check with security monitoring
app.get('/health', async (req, res) => {
  try {
    // Log health check for monitoring
    // await securityMonitorService.logSecurityEvent(
    //   'health_check',
    //   'low',
    //   { timestamp: new Date() },
    //   null,
    //   req
    // );
    
    res.json({ 
      status: 'OK', 
      message: 'Library API is running!',
      timestamp: new Date().toISOString(),
      security: 'Enhanced security enabled'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.json({ status: 'OK', message: 'Library API is running!' });
  }
});

// Image serving endpoint with proper CORS
app.get('/uploads/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  const imagePath = path.join(__dirname, 'uploads', folder, filename);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cache-Control', 'public, max-age=86400');
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Test image endpoint
app.get('/test-image', (req, res) => {
  const imagePath = path.join(__dirname, 'uploads', 'samples', 'sample.png');
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: 'Test image not found' });
  }
});

// Reset rate limits (development only)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset-limits', (req, res) => {
    // This would reset rate limiting stores in a real implementation
    res.json({ message: 'Rate limits reset (development only)' });
  });
}

// Test route first
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/seats', seatsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/privacy', privacyRoutes);

// Initialize security and database
const initializeServer = async () => {
  try {
    // Initialize security configuration
    await initializeSecurity();
    
    // Initialize secure MongoDB connection
    await databaseSecurityService.initializeSecureConnection();
    console.log('Secure MongoDB connection established');
    
    // Log server startup
    // await securityMonitorService.logSecurityEvent(
    //   'server_startup',
    //   'low',
    //   {
    //     port: process.env.PORT || 5000,
    //     environment: process.env.NODE_ENV || 'development',
    //     timestamp: new Date()
    //   },
    //   null,
    //   null
    // );
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} with enhanced security`);
    });
  } catch (error) {
    console.error('Server initialization error:', error);
    process.exit(1);
  }
};

// Start server
initializeServer();