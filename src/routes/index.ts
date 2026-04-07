import { Router } from 'express';
import appInfoRoutes from './app-info.routes';
import detectionRoutes from './detection.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use(healthRoutes);
router.use(appInfoRoutes);
router.use(detectionRoutes);

export default router;
