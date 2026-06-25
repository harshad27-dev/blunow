import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { prisma } from './prisma/prisma';
import { registerChatGateway } from './modules/chat/gateway/chat.gateway';
import { registerRoomsGateway } from './modules/rooms/gateway/rooms.gateway';
import { closeWorkers, startWorkers } from './queues/workers';

const PORT = process.env.PORT ?? 3001;

const httpServer = http.createServer(app);

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Register socket gateways
registerChatGateway(io);
registerRoomsGateway(io);

async function start() {
  try {
    await prisma.$connect();
    startWorkers();
    console.log('✅ Database connected');

    httpServer.listen(PORT, () => {
      console.log(`🚀 Blunow backend running on http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.io listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(async () => {
    await closeWorkers();
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  httpServer.close(async () => {
    await closeWorkers();
    await prisma.$disconnect();
    process.exit(0);
  });
});

start();

export { io };
