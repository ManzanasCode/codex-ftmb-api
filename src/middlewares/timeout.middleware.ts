import { RequestHandler } from 'express';
import { TimeoutError } from '../utils/errors';

export const createTimeoutMiddleware = (timeoutMs: number): RequestHandler => {
  return (_req, res, next) => {
    const timeoutHandle = setTimeout(() => {
      if (!res.headersSent) {
        next(new TimeoutError(`Request timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeoutHandle);
    });

    res.on('close', () => {
      clearTimeout(timeoutHandle);
    });

    next();
  };
};
