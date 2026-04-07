import { RequestHandler } from 'express';
import { DetectRequest } from '../types/detection';
import { ValidationError } from '../utils/errors';

export const validateDetectRequest: RequestHandler<unknown, unknown, Partial<DetectRequest>> = (
  req,
  _res,
  next,
) => {
  const targetUrl = req.body?.url;
  const filters = req.body?.filters;

  if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    next(new ValidationError('`url` is required in request body'));
    return;
  }

  try {
    const parsedUrl = new URL(targetUrl);

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      next(new ValidationError('`url` must use http:// or https:// protocol'));
      return;
    }
  } catch {
    next(new ValidationError('`url` must be a valid absolute URL'));
    return;
  }

  if (typeof filters !== 'undefined') {
    if (!Array.isArray(filters)) {
      next(new ValidationError('`filters` must be an array of strings'));
      return;
    }

    const hasInvalidFilter = filters.some((filter) => typeof filter !== 'string');
    if (hasInvalidFilter) {
      next(new ValidationError('`filters` must contain only strings'));
      return;
    }
  }

  next();
};
