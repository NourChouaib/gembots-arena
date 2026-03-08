import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { initializeArenaManager, getArenaManager } from '../../../../lib/arena-websocket';
import type { LiveEvent } from '../../../../types/arena';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// Global WebSocket instance
let io: SocketIOServer;

export async function GET(req: NextRequest) {
  if (!io) {
    console.log('Initializing Arena Socket.IO server...');
    
    // В production нужен отдельный WebSocket сервер
    // Для development используем Next.js API routes
    const httpServer: any = (req as any).socket?.server || {};
    
    io = new SocketIOServer(httpServer, {
      path: '/api/arena/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'development' 
          ? ['http://localhost:3005', 'http://localhost:3000']
          : process.env.NEXT_PUBLIC_APP_URL,
        methods: ['GET', 'POST'],
      },
    });

    // Инициализируем Arena WebSocket Manager
    initializeArenaManager(io);

    // Делаем io глобально доступным
    (global as any).io = io;
    
    console.log('Arena WebSocket server initialized successfully');
  }

  return NextResponse.json({ 
    message: 'Arena Socket.IO server is running',
    connectedClients: getConnectedClients()
  });
}

// Функция для отправки событий (будем использовать из других API)
export function broadcastArenaEvent(event: LiveEvent) {
  const manager = getArenaManager();
  if (manager) {
    manager['broadcastEvent'](event); // Доступ к приватному методу
  }
}

// Функция для получения количества подключенных клиентов
export function getConnectedClients(): number {
  const manager = getArenaManager();
  return manager ? manager.getConnectedClientsCount() : 0;
}