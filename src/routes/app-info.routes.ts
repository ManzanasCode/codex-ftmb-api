import { Router } from 'express';
import { appInfoController } from '../controllers/app-info.controller';

const router = Router();

/**
 * @openapi
 * /app-info:
 *   get:
 *     tags:
 *       - App
 *     summary: Get deployed application metadata
 *     responses:
 *       200:
 *         description: Application metadata and deployed version
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppInfoResponse'
 */
router.get('/app-info', appInfoController);

export default router;
