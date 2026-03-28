import { Router } from 'express';
import { MediaController } from '../controllers/media.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/media.upload.middleware';

const router = Router();
const controller = new MediaController();

router.use(authenticate);

// POST /api/media/upload
router.post('/upload', uploadMiddleware.single('file'), controller.uploadMedia);

// GET /api/media/:id
router.get('/:id', controller.getMedia);

// DELETE /api/media/:id
router.delete('/:id', controller.deleteMedia);

export default router;
