import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';

@WebSocketGateway()
export class RoomGateway {
  @WebSocketServer() server: Server;

  // Структура данных для отслеживания клиентов в комнатах
  private roomsMap = new Map<string, Set<string>>(); // roomId -> Set<playerId>

  constructor(private readonly roomService: RoomService) {}

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);

    // Генерируем playerId для нового подключения
    const playerId = client.id;
    this.roomService.setPlayerSocket(playerId, client);

    // Связываем playerId с сокетом в RoomService
    this.roomService.setPlayerSocket(playerId, client);

    client.on('disconnect', () => {
      console.log(`Client disconnected: ${client.id}`);
      // Удаляем сокет игрока при отключении
      this.roomService.removePlayerSocket(playerId);

      this.roomsMap.forEach((playersInRoom, roomId) => {
        if (playersInRoom.has(playerId)) {
          playersInRoom.delete(playerId);
          console.log(`Player ${playerId} left room ${roomId}`);
        }
      });
    });
  }

  @SubscribeMessage('joinOrCreate')
  handleMessage(client: Socket, payload: { playerId: string }) {
    const { playerId } = payload;
    console.log('playerId on subscribe message:', playerId);

    // Получаем сокет по playerId из RoomService
    const socket = this.roomService.getPlayerSocket(playerId);

    if (socket) {
      this.roomService.joinOrCreateGame(playerId, (gameId) => {
        // Отправляем событие gameReady с gameId только этому клиенту
        socket.join(gameId);
        client.emit('gameReady', gameId);

        // Добавляем playerId в комнату с gameId
        if (!this.roomsMap.has(gameId)) {
          this.roomsMap.set(gameId, new Set<string>());
        }
        this.roomsMap.get(gameId).add(playerId);
        console.log(`Player ${playerId} joined room ${gameId}`);
      });
    } else {
      console.error(`Socket not found for playerId: ${playerId}`);
    }
  }

  @SubscribeMessage('makeMove')
  handleMakeMove(
    client: Socket,
    payload: {
      gameId: string;
      playerId: string;
      moveFrom: string;
      moveTo: string;
      event: any;
    },
  ) {
    const { gameId, playerId, moveFrom, moveTo, event } = payload;

    if (this.roomService.isPlayerInRoom(playerId, gameId)) {
      // Отправляем ход другому игроку в той же комнате игры
      console.log('Player make move', playerId, moveFrom, moveTo, event);
      client.to(gameId).emit('opponentMove', moveFrom, moveTo, event);
    } else {
      console.log(`Player ${playerId} is not in game room ${gameId}`);
    }
  }
}
