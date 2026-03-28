import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateUpdateProfile, validateUpdatePreferences, validateUpdateInterests } from '../middleware/users.validate.middleware';

const router = Router();
const controller = new UsersController();

// All users routes require authentication
router.use(authenticate);

// GET  /api/users/:id — get user profile
router.get('/:id', controller.getUser);

// PATCH /api/users/me/profile — update own profile
router.patch('/me/profile', validateUpdateProfile, controller.updateProfile);

// PATCH /api/users/me/preferences — update discovery preferences
router.patch('/me/preferences', validateUpdatePreferences, controller.updatePreferences);

// PATCH /api/users/me/interests — update interest tags
router.patch('/me/interests', validateUpdateInterests, controller.updateInterests);

// DELETE /api/users/me — deactivate account
router.delete('/me', controller.deactivateAccount);

export default router;
