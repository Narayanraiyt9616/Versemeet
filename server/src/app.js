import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import meetingRoutes from './routes/meetingRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getDatabaseStatus } from './config/db.js';

const app = express();

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow WebRTC and local cross-origin previews
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow local development and mobile apps/same network browsers
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://192.168.')) {
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
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/meetings', meetingRoutes);

// Central error handler
app.use(errorHandler);

export default app;
