import { Router } from 'express';
import { ConfessionsController } from '../controllers/confessions.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateCreateConfession } from '../middleware/confessions.validate.middleware';
import { anonymityMiddleware } from '../middleware/confessions.anonymity.middleware';

const router = Router();
const controller = new ConfessionsController();

router.use(authenticate);

// GET /api/confessions — get feed of confessions (anonymous display)
router.get('/', anonymityMiddleware, controller.getConfessions);

// POST /api/confessions
router.post('/', validateCreateConfession, controller.createConfession);

// POST /api/confessions/:id/reveal-request
router.post('/:id/reveal-request', controller.requestReveal);

// POST /api/confessions/:id/reveal-accept
router.post('/:id/reveal-accept', controller.acceptReveal);

export default router;
