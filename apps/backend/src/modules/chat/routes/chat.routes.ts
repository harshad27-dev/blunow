import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';

const router = Router();
const controller = new ChatController();

router.use(authenticate);

// GET /api/chat — list all chats for current user
router.get('/', controller.getChats);

// GET /api/chat/:chatId — get single chat details
router.get('/:chatId', controller.getChat);

// GET /api/chat/:chatId/messages — paginated messages
router.get('/:chatId/messages', controller.getMessages);

// DELETE /api/chat/:chatId — delete/leave chat
router.delete('/:chatId', controller.deleteChat);

export default router;
