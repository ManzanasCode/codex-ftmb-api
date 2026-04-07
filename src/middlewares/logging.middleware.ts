import { RequestHandler } from 'express';
import { logger } from '../utils/logger';

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    logger.info(`Completed request: ${req.method} ${req.originalUrl} ${res.statusCode} in ${duration}ms`);
  });

  next();
};
