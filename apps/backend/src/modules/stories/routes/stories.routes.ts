import { Router } from 'express';
import { StoriesController } from '../controllers/stories.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateCreateStory } from '../middleware/stories.validate.middleware';
import {
  contentCreationRateLimitMiddleware,
  socialActionRateLimitMiddleware,
} from '../../../common/middleware/rate-limit.middleware';

const router = Router();
const controller = new StoriesController();

router.use(authenticate);

router.get('/', controller.getStories);
router.post('/', contentCreationRateLimitMiddleware, validateCreateStory, controller.createStory);
router.get('/user/:userId', controller.getUserStories);
router.get('/:id', controller.getStory);
router.delete('/:id', controller.deleteStory);
router.post('/:id/view', socialActionRateLimitMiddleware, controller.viewStory);

export default router;
