import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateRequestLoginOtp,
} from '../middleware/auth.validate.middleware';
import { strictRateLimitMiddleware } from '../middleware/auth.ratelimit.middleware';
import { authenticate } from '../../../common/middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

// POST /api/auth/register
router.post('/register', validateRegister, controller.register);

// POST /api/auth/login
router.post('/login', strictRateLimitMiddleware, validateLogin, controller.login);

// POST /api/auth/login/otp
router.post(
  '/login/otp',
  strictRateLimitMiddleware,
  validateRequestLoginOtp,
  controller.requestLoginOtp,
);

// POST /api/auth/refresh
router.post('/refresh', validateRefreshToken, controller.refreshToken);

// POST /api/auth/logout
router.post('/logout', authenticate, controller.logout);

// GET  /api/auth/me
router.get('/me', authenticate, controller.getMe);

export default router;
