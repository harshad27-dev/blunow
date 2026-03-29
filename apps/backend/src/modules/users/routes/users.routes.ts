import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { RealtimeController } from '../../chat/controllers/realtime.controller';
import { SocialController } from '../controllers/social.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateUpdateProfile, validateUpdatePreferences, validateUpdateInterests } from '../middleware/users.validate.middleware';

const router = Router();
const controller = new UsersController();
const rtController = new RealtimeController();
const socialController = new SocialController();

router.use(authenticate);

// Priority static routes
router.get('/batch-status', rtController.getBatchOnlineStatus);
router.post('/me/verification', socialController.verifyProfile);

// Social endpoints
router.post('/:id/follow', socialController.followUser);
router.delete('/:id/follow', socialController.unfollowUser);
router.get('/:id/followers', socialController.getFollowers);
router.get('/:id/following', socialController.getFollowing);
router.get('/:userId/stats', socialController.getStats);

// Online status route
router.get('/:userId/online-status', rtController.getOnlineStatus);

// Regular endpoints
router.get('/:id', controller.getUser);
router.patch('/me/profile', validateUpdateProfile, controller.updateProfile);
router.patch('/me/preferences', validateUpdatePreferences, controller.updatePreferences);
router.patch('/me/interests', validateUpdateInterests, controller.updateInterests);
router.delete('/me', controller.deactivateAccount);

export default router;
