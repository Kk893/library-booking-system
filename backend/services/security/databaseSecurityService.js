const mongoose = require('mongoose');

class DatabaseSecurityService {
  constructor() {
    this.connectionOptions = null;
    this.isSecureConnection = false;
  }

  async initializeSecureConnection() {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is required');
      }

      // Basic connection options
      this.connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      };

      // Connect to MongoDB
      await mongoose.connect(mongoUri, this.connectionOptions);
      
      this.isSecureConnection = true;
      console.log('MongoDB connection established');
      return true;

    } catch (error) {
      console.error('Failed to establish database connection:', error);
      throw error;
    }
  }

  async closeConnection() {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('Database connection closed');
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

module.exports = new DatabaseSecurityService();