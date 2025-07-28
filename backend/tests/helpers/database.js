/**
 * Database Test Helpers
 * Utilities for setting up and tearing down test database
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to in-memory MongoDB instance for testing
 */
const connectDB = async () => {
  try {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to in-memory MongoDB for testing');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error; // Don't exit process in tests
  }
};

/**
 * Clear all data from test database
 */
const clearDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Database clear failed:', error);
  }
};

/**
 * Close database connection and stop MongoDB server
 */
const closeDB = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('Disconnected from test database');
  } catch (error) {
    console.error('Database close failed:', error);
  }
};

module.exports = {
  connectDB,
  clearDB,
  closeDB
};