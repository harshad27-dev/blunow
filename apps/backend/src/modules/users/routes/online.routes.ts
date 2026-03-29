import { Router } from 'express';
import { RealtimeController } from '../../chat/controllers/realtime.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';

const router = Router();
const rtController = new RealtimeController();

router.use(authenticate);

// Map to /api/users...
router.get('/batch-status', rtController.getBatchOnlineStatus);
router.get('/:userId/online-status', rtController.getOnlineStatus);

export default router;
