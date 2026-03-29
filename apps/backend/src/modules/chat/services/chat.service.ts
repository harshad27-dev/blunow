import { ChatRepository } from '../models/chat.repository';
import { AppError } from '../../../common/middleware/error.middleware';

export class ChatService {
  private chatRepository = new ChatRepository();

  async getChatsForUser(userId: string) {
    return this.chatRepository.findByUser(userId);
  }

  async getChatById(chatId: string, userId: string) {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) throw new AppError('Chat not found', 404);
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      throw new AppError('Forbidden', 403);
    }
    return chat;
  }

  async deleteChat(chatId: string, userId: string) {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) throw new AppError('Chat not found', 404);
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      throw new AppError('Forbidden', 403);
    }
    await this.chatRepository.delete(chatId);
  }

  async updateChatSettings(chatId: string, userId: string, settings: { muted?: boolean; archived?: boolean }) {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) throw new AppError('Chat not found', 404);
    if (chat.user1Id !== userId && chat.user2Id !== userId) {
      throw new AppError('Forbidden', 403);
    }
    return this.chatRepository.updateSettings(chatId, chat.user1Id, chat.user2Id, userId, settings);
  }
}
