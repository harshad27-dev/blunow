import { Router } from 'express';
import { FeedController } from '../controllers/feed.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';

const router = Router();
const controller = new FeedController();

router.use(authenticate);

// GET /api/feed — paginated discovery feed with complex filters
router.get('/', controller.getFeed);

// GET /api/feed/people-near-you — distance sorted discovery
router.get('/people-near-you', controller.getPeopleNearYou);

// GET /api/feed/people-you-may-vibe-with — algorithmic scoring
router.get('/people-you-may-vibe-with', controller.getPeopleYouMayVibeWith);

export default router;
