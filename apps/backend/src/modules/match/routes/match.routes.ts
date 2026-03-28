import { Router } from 'express';
import { MatchController } from '../controllers/match.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateMatchRequest, validateRespondRequest } from '../middleware/match.validate.middleware';
import { matchRateLimitMiddleware } from '../middleware/match.ratelimit.middleware';

const router = Router();
const controller = new MatchController();

router.use(authenticate);

router.post('/request', matchRateLimitMiddleware, validateMatchRequest, controller.sendRequest);
router.get('/requests/incoming', controller.getIncomingRequests);
router.get('/requests/outgoing', controller.getOutgoingRequests);
router.patch('/requests/:id', validateRespondRequest, controller.respondToRequest);
router.get('/', controller.getMatches);
router.delete('/:id', controller.unmatch);

export default router;
