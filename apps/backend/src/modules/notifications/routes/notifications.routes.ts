import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';

const router = Router();
const controller = new NotificationsController();

router.use(authenticate);

// GET /api/notifications
router.get('/', controller.getNotifications);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', controller.markAsRead);

// PATCH /api/notifications/read-all
router.patch('/read-all', controller.markAllAsRead);

// DELETE /api/notifications/:id
router.delete('/:id', controller.deleteNotification);

export default router;
