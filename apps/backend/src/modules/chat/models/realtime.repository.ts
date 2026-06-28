import Redis from 'ioredis';
import { prisma } from '../../../prisma/prisma';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class RealtimeRepository {
  
  // Redis - Typing
  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    const key = `typing:${conversationId}:${userId}`;
    if (isTyping) {
      await redis.set(key, 'true', 'EX', 5); // 5 sec expiration
    } else {
      await redis.del(key);
    }
  }

  // Redis - Online Status
  async setOnlineStatus(userId: string, isOnline: boolean, status: string = 'online') {
    const key = `online:${userId}`;
    if (isOnline) {
      await redis.hset(key, { isOnline: 'true', lastSeenAt: new Date().toISOString(), status });
      await redis.expire(key, 3600); // 1 hr TTL
    } else {
      await redis.hset(key, { isOnline: 'false', status: 'offline' });
    }
  }

  async getOnlineStatus(userId: string) {
    const privacy = await prisma.userPrivacyPreference.findUnique({
      where: { userId },
      select: { showOnlineStatus: true },
    });
    if (privacy?.showOnlineStatus === false) return null;
    const key = `online:${userId}`;
    const data = await redis.hgetall(key);
    if (!data.isOnline) return null;
    return {
      userId,
      isOnline: data.isOnline === 'true',
      lastSeenAt: data.lastSeenAt,
      status: data.status
    };
  }

  async getBatchOnlineStatus(userIds: string[]) {
    const hiddenUsers = await prisma.userPrivacyPreference.findMany({
      where: {
        userId: { in: userIds },
        showOnlineStatus: false,
      },
      select: { userId: true },
    });
    const hiddenIds = new Set(hiddenUsers.map((item) => item.userId));
    const pipeline = redis.pipeline();
    userIds.forEach(id => pipeline.hgetall(`online:${id}`));
    const results = await pipeline.exec();
    
    return userIds.map((id, idx) => {
      if (hiddenIds.has(id)) return { userId: id, isOnline: false };
      const err = results?.[idx]?.[0];
      const data = results?.[idx]?.[1] as any;
      if (!data || !data.isOnline) return { userId: id, isOnline: false };
      return { userId: id, isOnline: data.isOnline === 'true', lastSeenAt: data.lastSeenAt, status: data.status };
    });
  }

  // Postgres - Messages Read
  async markMessageRead(messageId: string, readByUserId: string) {
    const msg = await prisma.message.findUnique({ where: { id: messageId }, select: { chatId: true, deliveredAt: true }});
    if (!msg) throw new Error('Message not found');

    const receipt = await prisma.messageReadReceipt.upsert({
      where: { messageId_readByUserId: { messageId, readByUserId } },
      update: { readAt: new Date() },
      create: { messageId, readByUserId }
    });
    
    // Decrement unread block efficiently if this is first time read
    // This requires complex logic, MVP: we'll simply recalculate unreadcount or depend on socket.io

    return { ...receipt, conversationId: msg.chatId, deliveredAt: msg.deliveredAt };
  }

  async markConversationAsRead(conversationId: string, readByUserId: string) {
    // Find unread messages for this user
    const unreadMsgs = await prisma.message.findMany({
      where: {
        chatId: conversationId,
        senderId: { not: readByUserId },
        readReceipts: { none: { readByUserId } }
      },
      select: { id: true }
    });

    if (unreadMsgs.length === 0) return { updatedCount: 0 };

    const data = unreadMsgs.map(m => ({ messageId: m.id, readByUserId, readAt: new Date() }));
    const result = await prisma.messageReadReceipt.createMany({
      data,
      skipDuplicates: true
    });

    // Reset conversation unreadCount conceptually (MVP simple approach)
    await prisma.chat.update({
      where: { id: conversationId },
      data: { unreadCount: 0 }
    });

    return { updatedCount: result.count, conversationId };
  }

  async getMessageReadStatus(messageId: string) {
    return prisma.messageReadReceipt.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, profile: { select: { username: true } } } }
      }
    });
  }
}
