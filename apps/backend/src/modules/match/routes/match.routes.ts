import { RequestHandler, Router } from 'express';
import { MatchController } from '../controllers/match.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateMatchRequest, validateRespondRequest } from '../middleware/match.validate.middleware';
import { matchRateLimitMiddleware } from '../middleware/match.ratelimit.middleware';

const router = Router();
const controller = new MatchController();

const noStoreRecommendations: RequestHandler = (req, res, next) => {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });
  res.removeHeader('ETag');
  next();
};

router.use(authenticate);

router.post('/request', matchRateLimitMiddleware, validateMatchRequest, controller.sendRequest);
router.get('/requests/incoming', controller.getIncomingRequests);
router.get('/requests/outgoing', controller.getOutgoingRequests);
router.delete('/request/:receiverId', controller.cancelPendingRequest);
router.patch('/requests/:id', validateRespondRequest, controller.respondToRequest);
router.get('/recommendations', noStoreRecommendations, controller.getRecommendations);
router.post('/recommendations/:userId/dismiss', controller.dismissRecommendation);
router.delete('/recommendations/:userId/dismiss', controller.restoreDismissedRecommendation);
router.get('/', controller.getMatches);
router.delete('/:id', controller.unmatch);

export default router;
