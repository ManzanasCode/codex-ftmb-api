import { RequestHandler } from 'express';
import { DetectRequest, DetectResponse } from '../types/detection';
import { detectionService } from '../services/detection.service';
import { logger } from '../utils/logger';

export const detectController: RequestHandler<unknown, DetectResponse, DetectRequest> = async (
  req,
  res,
  next,
) => {
  try {
    const filters = (req.body.filters ?? [])
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    logger.info(`Starting detection for url=${req.body.url} filtersCount=${filters.length}`);

    const result = await detectionService.detect(req.body.url, { filters });
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};
