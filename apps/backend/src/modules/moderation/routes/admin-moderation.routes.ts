import { Router } from 'express';
import { AdminModerationController } from '../controllers/admin-moderation.controller';
import { authenticate, requireRole } from '../../../common/middleware/auth.middleware';

const router = Router();
const controller = new AdminModerationController();

// Open Webhook for ML service
router.post('/auto-flag', controller.autoFlagWebhook);

// Admin / Moderator routes
router.use(authenticate);
router.use(requireRole('ADMIN', 'MODERATOR'));

// Queue management
router.get('/queue', controller.getQueue);
router.get('/queue/:id', controller.getReport);
router.patch('/queue/:id', controller.resolveReport);

export default router;
