import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error: ${err.message}`, err.stack);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
}
