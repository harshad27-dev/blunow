import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MessageService } from '../services/message.service';

const messageService = new MessageService();

export function registerChatGateway(io: Server): void {
  const chatNamespace = io.of('/chat');

  // JWT authentication for socket connections
  chatNamespace.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      (socket as any).userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  chatNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;

    // Join personal room for targeted delivery
    socket.join(`user:${userId}`);
    console.log(`[Chat] User ${userId} connected`);

    // Join a specific chat room
    socket.on('chat:join', (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    // Leave a chat room
    socket.on('chat:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    // Send message
    socket.on('chat:message', async (data: { chatId: string; type: string; content?: string; mediaUrl?: string }) => {
      try {
        const message = await messageService.sendMessage(data.chatId, userId, {
          type: data.type as any,
          content: data.content,
          mediaUrl: data.mediaUrl,
        });

        // Broadcast to chat room
        chatNamespace.to(`chat:${data.chatId}`).emit('chat:message:new', message);
      } catch (error: any) {
        socket.emit('chat:error', { message: error.message });
      }
    });

    // Typing indicator
    socket.on('chat:typing', (data: { chatId: string; isTyping: boolean }) => {
      socket.to(`chat:${data.chatId}`).emit('chat:typing', { userId, isTyping: data.isTyping });
    });

    // Mark messages as read
    socket.on('chat:read', async (chatId: string) => {
      await messageService.markAsRead(chatId, userId);
      socket.to(`chat:${chatId}`).emit('chat:read', { chatId, userId });
    });

    socket.on('disconnect', () => {
      console.log(`[Chat] User ${userId} disconnected`);
    });
  });
}
