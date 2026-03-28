import { MessageRepository } from '../models/message.repository';
import { ChatRepository } from '../models/chat.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class MessageService {
  private messageRepository = new MessageRepository();
  private chatRepository = new ChatRepository();

  async getMessages(chatId: string, userId: string, pagination: { page: number; limit: number }) {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) throw new AppError('Chat not found', 404);
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      throw new AppError('Forbidden', 403);
    }
    return this.messageRepository.findByChatId(chatId, pagination);
  }

  async sendMessage(chatId: string, senderId: string, data: {
    type: any;
    content?: string;
    mediaUrl?: string;
  }) {
    const message = await this.messageRepository.create({ chatId, senderId, ...data });
    eventBus.emit(EVENTS.CHAT.MESSAGE_SENT, { chatId, messageId: message.id, senderId });
    return message;
  }

  async markAsRead(chatId: string, userId: string) {
    return this.messageRepository.markAllRead(chatId, userId);
  }
}
