import { MatchRepository } from '../models/match.repository';
import { ChatRepository } from '../../chat/models/chat.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

const DEFAULT_REQUEST_MESSAGE = 'Hi, I would like to chat with you.';

export class MatchRequestService {
  private matchRepository = new MatchRepository();
  private chatRepository = new ChatRepository();

  async sendRequest(senderId: string, dto: { receiverId: string; message?: string }) {
    if (senderId === dto.receiverId) {
      throw new AppError('Cannot send match request to yourself', 400);
    }

    const message = dto.message?.trim() || DEFAULT_REQUEST_MESSAGE;
    const existing = await this.matchRepository.findRequest(senderId, dto.receiverId);
    if (existing?.status === 'PENDING') {
      const chat = existing.chat ?? await this.chatRepository.createRequestChat({
        requestId: existing.id,
        senderId,
        receiverId: dto.receiverId,
        message,
      });
      return { ...existing, chat };
    }
    if (existing) throw new AppError('Match request already sent', 409);

    const incoming = await this.matchRepository.findRequest(dto.receiverId, senderId);
    if (incoming?.status === 'PENDING') {
      await this.matchRepository.updateRequestStatus(incoming.id, 'ACCEPTED');
      const match = await this.matchRepository.createMatch(dto.receiverId, senderId);
      const chat = incoming.chat
        ? await this.chatRepository.activateRequestChat(incoming.id, match.id)
        : await this.chatRepository.create(match.id, dto.receiverId, senderId);

      eventBus.emit(EVENTS.MATCH.MATCHED, {
        matchId: match.id,
        user1Id: dto.receiverId,
        user2Id: senderId,
      });
      eventBus.emit(EVENTS.CHAT.CHAT_CREATED, {
        chatId: chat.id,
        matchId: match.id,
        user1Id: dto.receiverId,
        user2Id: senderId,
      });

      return { ...match, chat };
    }

    const request = await this.matchRepository.createRequest({
      senderId,
      receiverId: dto.receiverId,
      message,
    });
    const chat = await this.chatRepository.createRequestChat({
      requestId: request.id,
      senderId,
      receiverId: dto.receiverId,
      message,
    });

    eventBus.emit(EVENTS.MATCH.REQUEST_SENT, { requestId: request.id, senderId, receiverId: dto.receiverId });
    eventBus.emit(EVENTS.CHAT.CHAT_CREATED, {
      chatId: chat?.id,
      requestId: request.id,
      user1Id: senderId,
      user2Id: dto.receiverId,
      status: 'REQUESTED',
    });
    return { ...request, chat };
  }

  async getIncoming(userId: string) {
    return this.matchRepository.findIncomingRequests(userId);
  }

  async getOutgoing(userId: string) {
    return this.matchRepository.findOutgoingRequests(userId);
  }

  async respond(requestId: string, userId: string, status: 'ACCEPTED' | 'REJECTED') {
    const request = await this.matchRepository.findRequestById(requestId);
    if (!request) throw new AppError('Request not found', 404);
    if (request.receiverId !== userId) throw new AppError('Forbidden', 403);

    await this.matchRepository.updateRequestStatus(requestId, status);

    if (status === 'ACCEPTED') {
      const match = await this.matchRepository.createMatch(request.senderId, request.receiverId);
      const chat = request.chat
        ? await this.chatRepository.activateRequestChat(request.id, match.id)
        : await this.chatRepository.create(match.id, request.senderId, request.receiverId);

      eventBus.emit(EVENTS.MATCH.MATCHED, {
        matchId: match.id,
        user1Id: request.senderId,
        user2Id: request.receiverId,
      });
      eventBus.emit(EVENTS.CHAT.CHAT_CREATED, {
        chatId: chat.id,
        matchId: match.id,
        user1Id: request.senderId,
        user2Id: request.receiverId,
      });
      return { ...match, chat };
    }

    await this.chatRepository.rejectRequestChat(request.id);
    eventBus.emit(EVENTS.MATCH.REQUEST_REJECTED, { requestId, receiverId: userId });
    return { status: 'REJECTED' };
  }
}
