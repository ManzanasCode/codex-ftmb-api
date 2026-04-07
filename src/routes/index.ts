import { Router } from 'express';
import detectionRoutes from './detection.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use(healthRoutes);
router.use(detectionRoutes);

export default router;
