import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

let isConnected = false;
let isInMemoryFallback = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/versemeet';

  try {
    // Attempt connection with a short timeout to prevent blocking startup
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    isInMemoryFallback = false;
    logger.info(`Connected to MongoDB database at ${uri}`);
  } catch (err) {
    logger.warn(`MongoDB not available at ${uri} (${err.message}).`);
    logger.info('Activating VerseMeet resilient in-memory database store for seamless local execution.');
    isConnected = true;
    isInMemoryFallback = true;
  }
}

export function getDatabaseStatus() {
  return {
    connected: isConnected,
    isInMemoryFallback,
    ready: isConnected
  };
}
