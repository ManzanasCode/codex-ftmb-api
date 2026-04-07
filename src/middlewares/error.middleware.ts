import { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('Route not found', 404));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  logger.error(`Request failed with status ${statusCode}: ${message}`);
  res.status(statusCode).json({ message });
};
