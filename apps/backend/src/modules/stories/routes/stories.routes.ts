import { Router } from 'express';
import { StoriesController } from '../controllers/stories.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateCreateStory } from '../middleware/stories.validate.middleware';

const router = Router();
const controller = new StoriesController();

router.use(authenticate);

router.get('/', controller.getStories);
router.post('/', validateCreateStory, controller.createStory);
router.get('/user/:userId', controller.getUserStories);
router.get('/:id', controller.getStory);
router.delete('/:id', controller.deleteStory);
router.post('/:id/view', controller.viewStory);

export default router;
