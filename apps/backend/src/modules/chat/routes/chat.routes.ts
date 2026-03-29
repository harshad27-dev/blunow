import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { RealtimeController } from '../controllers/realtime.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';

const router = Router();
const controller = new ChatController();
const rtController = new RealtimeController();

router.use(authenticate);

// List chats with unread count
router.get('/conversations', controller.getChats); // Alias to match prompt spec
router.get('/', controller.getChats);

router.patch('/conversations/:chatId', controller.updateChatSettings);

router.get('/:chatId', controller.getChat);
router.get('/:chatId/messages', controller.getMessages);
router.delete('/:chatId', controller.deleteChat);

// Realtime Endpoints
router.post('/:conversationId/typing', rtController.setTyping);
router.patch('/messages/:messageId/read', rtController.markMessageRead);
router.patch('/conversations/:conversationId/read', rtController.markConversationRead);

export default router;
