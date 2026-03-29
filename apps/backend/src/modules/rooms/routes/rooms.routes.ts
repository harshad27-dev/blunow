import { Router } from 'express';
import { RoomsController } from '../controllers/rooms.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateCreateRoom } from '../middleware/rooms.validate.middleware';

const router = Router();
const controller = new RoomsController();

router.use(authenticate);

// Rooms CRUD
router.get('/', controller.getRooms);
router.post('/', validateCreateRoom, controller.createRoom);
router.get('/recommended', controller.getRecommendedRooms);
router.get('/:id', controller.getRoom);
router.patch('/:id', controller.updateRoom);
router.delete('/:id', controller.deleteRoom);

// Memberships
router.post('/:id/join', controller.joinRoom);
router.delete('/:id/leave', controller.leaveRoom);
router.get('/:id/members', controller.getMembers);

export default router;
