import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { RealtimeController } from "../controllers/realtime.controller";
import { authenticate } from "../../../common/middleware/auth.middleware";

const router = Router();
const controller = new ChatController();
const rtController = new RealtimeController();

router.use(authenticate);

// List chats with unread count
router.get("/conversations", controller.getChats); // Alias to match prompt spec
router.get("/", controller.getChats);

router.patch("/conversations/:chatId", controller.updateChatSettings);
router.patch("/conversations/:chatId/read", controller.markChatRead);
router.get("/online/batch", rtController.getBatchOnlineStatus);
router.get("/online/:userId", rtController.getOnlineStatus);

router.post("/share/post", controller.sharePost);

router.get("/:chatId", controller.getChat);
router.get("/:chatId/messages", controller.getMessages);
router.post("/:chatId/messages", controller.sendMessage);
router.delete("/:chatId/messages/:messageId", controller.deleteMessageForEveryone);
router.patch("/:chatId/read", controller.markChatRead);
router.delete("/:chatId", controller.deleteChat);

// Realtime Endpoints
router.post("/:conversationId/typing", rtController.setTyping);
router.patch("/messages/:messageId/read", rtController.markMessageRead);
router.patch(
  "/conversations/:conversationId/read",
  rtController.markConversationRead,
);

export default router;

