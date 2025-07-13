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

// Security Middleware
app.use(securityHeaders);
app.use(generalLimiter);
app.use(cookieParser());
app.use(sanitizeInput);

// CORS Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb for security
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static file serving with proper headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Library API is running!' });
});

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