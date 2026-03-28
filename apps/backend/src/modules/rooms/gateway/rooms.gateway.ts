import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export function registerRoomsGateway(io: Server): void {
  const roomsNamespace = io.of('/rooms');

  roomsNamespace.use((socket: Socket, next) => {
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

  roomsNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`[Rooms] User ${userId} connected`);

    socket.on('room:join', (roomId: string) => {
      socket.join(`platform-room:${roomId}`);
    });

    socket.on('room:leave', (roomId: string) => {
      socket.leave(`platform-room:${roomId}`);
    });

    socket.on('room:message', (data: { roomId: string; message: any }) => {
      // Basic broadcast logic for prototype
      roomsNamespace.to(`platform-room:${data.roomId}`).emit('room:message:new', {
        roomId: data.roomId,
        senderId: userId,
        message: data.message,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Rooms] User ${userId} disconnected`);
    });
  });
}
