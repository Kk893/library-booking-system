const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { securityHeaders, generalLimiter, sanitizeInput } = require('./middleware/security');
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

const app = express();

// Static file serving FIRST (before security middleware)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cache-Control', 'public, max-age=86400');
  }
}));

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

// Security Middleware (skip for uploads)
app.use('/uploads', (req, res, next) => next()); // Skip security for images
app.use(securityHeaders);
app.use(generalLimiter);
app.use(cookieParser());
app.use(sanitizeInput);

// CORS Middleware - Allow all origins for images
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb for security
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files already served above

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Library API is running!' });
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/seats', seatsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/images', imagesRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library-booking')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});