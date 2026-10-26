import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { setupMeetingSockets } from './sockets/meetingSocket.js';
import { logger } from './utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // Connect database (with automatic resilient in-memory fallback)
  await connectDB();

  const server = http.createServer(app);

  // Configure Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // Attach meeting socket signaling & handlers
  setupMeetingSockets(io);

  server.listen(PORT, () => {
    logger.info(`===============================================`);
    logger.info(` VerseMeet Backend Server Running on Port ${PORT}`);
    logger.info(` Ready for WebRTC Educational Video Conferencing`);
    logger.info(` Health check: http://localhost:${PORT}/api/health`);
    logger.info(`===============================================`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    logger.info('Shutting down VerseMeet server gracefully...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error(`Fatal bootstrap error: ${err.message}`, err);
});
