import { Router } from 'express';
import { detectController } from '../controllers/detection.controller';
import { env } from '../config/env';
import { createTimeoutMiddleware } from '../middlewares/timeout.middleware';
import { validateDetectRequest } from '../middlewares/validation.middleware';

const router = Router();

/**
 * @openapi
 * /detect:
 *   post:
 *     tags:
 *       - Detection
 *     summary: Detect and extract XHR/fetch API calls from a webpage
 *     description: Launches headless Chromium, visits the target URL, listens to XHR/fetch responses, and returns deduplicated API calls filtered by optional terms.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DetectRequest'
 *           examples:
 *             basic:
 *               value:
 *                 url: https://example.com/page
 *                 filters:
 *                   - matchOdds
 *                   - nextmatch
 *     responses:
 *       200:
 *         description: Detected API calls and total records found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetectResponse'
 *             examples:
 *               success:
 *                 value:
 *                   matchId: "4803340"
 *                   teamIds:
 *                     - "10233"
 *                     - "9885"
 *                   totalRecords: 1
 *                   records:
 *                     - url: https://example.com/api/users
 *                       method: GET
 *                       status: 200
 *                       size: 12345
 *                       timestamp: 171234567
 *                       data:
 *                         users:
 *                           - id: 1
 *                             name: Jane
 *       400:
 *         description: Invalid request payload
 *       408:
 *         description: Detection timed out
 *       500:
 *         description: Unexpected server error
 */
router.post('/detect', validateDetectRequest, createTimeoutMiddleware(env.requestTimeoutMs), detectController);

export default router;
