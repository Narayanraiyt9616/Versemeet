import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import meetingRoutes from './routes/meetingRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getDatabaseStatus } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow WebRTC and local cross-origin previews
}));

const allowedOrigins = [
  'https://versemeet-1.onrender.com',
  'https://versemeet.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow local development, Render deployments, and configured origins
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.onrender.com') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('http://192.168.')
    ) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for local peer tests
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health and status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'CampusVerse Meet',
    version: '1.0.0',
    frontendUrl: process.env.CLIENT_URL || 'https://versemeet-1.onrender.com',
    backendUrl: process.env.BACKEND_URL || 'https://versemeet.onrender.com',
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/meetings', meetingRoutes);

// Static client build serving & SPA fallback
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Central error handler
app.use(errorHandler);

export default app;
