import { Response } from 'express';
import { ChatService } from '../services/chat.service';
import { MessageService } from '../services/message.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class ChatController {
  private chatService = new ChatService();
  private messageService = new MessageService();

  getChats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const chats = await this.chatService.getChatsForUser(req.user!.id);
      res.status(200).json({ success: true, data: chats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getChat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const chat = await this.chatService.getChatById(req.params.chatId, req.user!.id);
      res.status(200).json({ success: true, data: chat });
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json({ success: false, message: error.message });
    }
  };

  getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const messages = await this.messageService.getMessages(req.params.chatId, req.user!.id, { page, limit });
      res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };

  deleteChat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.chatService.deleteChat(req.params.chatId, req.user!.id);
      res.status(200).json({ success: true, message: 'Chat deleted' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  updateChatSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { muted, archived } = req.body;
      const result = await this.chatService.updateChatSettings(req.params.chatId, req.user!.id, { muted, archived });
      res.status(200).json({ success: true, conversationId: req.params.chatId, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
