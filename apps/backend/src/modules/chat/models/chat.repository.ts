import { prisma } from '../../../prisma/prisma';
import { MessageRepository } from './message.repository';

export class ChatRepository {
  private messageRepository = new MessageRepository();

  async findByUser(userId: string) {
    const chats = await prisma.chat.findMany({
      where: {
        status: { in: ['ACTIVE', 'REQUESTED'] },
        OR: [
          { user1Id: userId, deletedBy1: false },
          { user2Id: userId, deletedBy2: false },
        ],
      },
      include: {
        request: true,
        user1: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        user2: { include: { profile: { select: { username: true, avatarUrl: true } } } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { include: { profile: { select: { username: true, avatarUrl: true } } } },
            readReceipts: true,
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });

    const unreadCounts = await this.messageRepository.countUnreadByChatIds(
      chats.map((chat) => chat.id),
      userId,
    );

    return chats.map((chat) => ({
      ...chat,
      unreadCount: unreadCounts.get(chat.id) ?? 0,
    }));
  }

  async findById(id: string) {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        request: true,
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async create(matchId: string, user1Id: string, user2Id: string) {
    return prisma.chat.upsert({
      where: { matchId },
      update: { status: 'ACTIVE', deletedBy1: false, deletedBy2: false },
      create: { matchId, user1Id, user2Id, status: 'ACTIVE' },
    });
  }

  async createRequestChat(data: {
    requestId: string;
    senderId: string;
    receiverId: string;
    message?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const chat = await tx.chat.upsert({
        where: { requestId: data.requestId },
        update: { status: 'REQUESTED', deletedBy1: false, deletedBy2: false },
        create: {
          requestId: data.requestId,
          user1Id: data.senderId,
          user2Id: data.receiverId,
          requestedById: data.senderId,
          status: 'REQUESTED',
        },
      });

      const content = data.message?.trim();
      if (content) {
        const existingFirstMessage = await tx.message.findFirst({
          where: { chatId: chat.id, senderId: data.senderId },
          select: { id: true },
        });

        if (!existingFirstMessage) {
          const message = await tx.message.create({
            data: {
              chatId: chat.id,
              senderId: data.senderId,
              type: 'TEXT',
              content,
              deliveredAt: new Date(),
            },
          });

          await tx.chat.update({
            where: { id: chat.id },
            data: {
              lastMessageAt: message.createdAt,
              lastMessageContent: content,
              lastMessageId: message.id,
              unreadCount: { increment: 1 },
            },
          });
        }
      }

      const hydratedChat = await tx.chat.findUnique({
        where: { id: chat.id },
        include: {
          request: true,
          user1: { include: { profile: { select: { username: true, avatarUrl: true } } } },
          user2: { include: { profile: { select: { username: true, avatarUrl: true } } } },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: { include: { profile: { select: { username: true, avatarUrl: true } } } },
              readReceipts: true,
            },
          },
          _count: { select: { messages: true } },
        },
      });

      if (!hydratedChat) throw new Error('Request chat was not created');
      return hydratedChat;
    });
  }

  async activateRequestChat(requestId: string, matchId: string) {
    return prisma.chat.update({
      where: { requestId },
      data: { matchId, status: 'ACTIVE', deletedBy1: false, deletedBy2: false },
    });
  }

  async rejectRequestChat(requestId: string) {
    return prisma.chat.updateMany({
      where: { requestId },
      data: { status: 'REJECTED', deletedBy1: true, deletedBy2: true },
    });
  }

  async updateSettings(chatId: string, user1Id: string, user2Id: string, currentUserId: string, settings: { muted?: boolean; archived?: boolean }) {
    const dataToUpdate: any = {};
    if (settings.muted !== undefined) {
      if (currentUserId === user1Id) dataToUpdate.mutedBy1 = settings.muted;
      if (currentUserId === user2Id) dataToUpdate.mutedBy2 = settings.muted;
    }
    if (settings.archived !== undefined) {
      if (currentUserId === user1Id) dataToUpdate.archivedBy1 = settings.archived;
      if (currentUserId === user2Id) dataToUpdate.archivedBy2 = settings.archived;
    }
    return prisma.chat.update({ where: { id: chatId }, data: dataToUpdate });
  }

  async hideForUser(id: string, user1Id: string, user2Id: string, currentUserId: string) {
    const dataToUpdate: any = {};
    if (currentUserId === user1Id) dataToUpdate.deletedBy1 = true;
    if (currentUserId === user2Id) dataToUpdate.deletedBy2 = true;

    return prisma.chat.update({ where: { id }, data: dataToUpdate });
  }
}
