import { Router } from 'express';
import { ModerationController } from '../controllers/moderation.controller';
import { ReportsController } from '../controllers/reports.controller';
import { authenticate, requireRole } from '../../../common/middleware/auth.middleware';

const router = Router();
const modController = new ModerationController();
const reportsController = new ReportsController();

router.use(authenticate);

// User-facing reporting routes
router.post('/reports', reportsController.createReport);

// Admin / Moderator routes
router.use(requireRole('ADMIN', 'MODERATOR'));

// Reports management
router.get('/reports', reportsController.getReports);
router.patch('/reports/:id/resolve', reportsController.resolveReport);

// Ban management
router.post('/users/:id/ban', modController.banUser);
router.delete('/bans/:id', modController.unbanUser);
router.get('/bans', modController.getBans);

export default router;
