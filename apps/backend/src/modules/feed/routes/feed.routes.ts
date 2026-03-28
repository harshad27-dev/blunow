import { Router } from 'express';
import { FeedController } from '../controllers/feed.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';

const router = Router();
const controller = new FeedController();

router.use(authenticate);

// GET /api/feed — paginated discovery feed
router.get('/', controller.getFeed);

// GET /api/feed/vibes — trending posts / vibes feed
router.get('/vibes', controller.getVibesFeed);

export default router;
