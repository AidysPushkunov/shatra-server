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
  private onlineCount = 0;

  private roomsMap = new Map<string, Set<string>>(); // roomId -> Set<playerId>

  constructor(private readonly roomService: RoomService) {}

  handleConnection(client: Socket): void {
    this.onlineCount++;
    this.broadcastOnlineCount();

    console.log(`Client connected: ${client.id}`);
    const playerId = client.id;
    this.roomService.setPlayerSocket(playerId, client);

    client.on('disconnect', () => {
      console.log(`Client disconnected: ${client.id}`);
      this.roomService.removePlayerSocket(playerId);

      this.onlineCount--;
      this.broadcastOnlineCount();

      this.roomsMap.forEach((playersInRoom, roomId) => {
        if (playersInRoom.has(playerId)) {
          playersInRoom.delete(playerId);
          console.log(`Player ${playerId} left room ${roomId}`);

          if (playersInRoom.size === 0) {
            this.roomsMap.delete(roomId);
            console.log(`Room ${roomId} has been deleted.`);
          }
        }
      });
    });
  }

  private broadcastOnlineCount(): void {
    this.server.emit('onlineCount', this.onlineCount);
  }

  @SubscribeMessage('joinOrCreate')
  handleMessage(client: Socket, payload: { playerId: string }) {
    const { playerId } = payload;
    console.log('playerId on subscribe message:', playerId);

    const socket = this.roomService.getPlayerSocket(playerId);

    if (socket) {
      this.roomService.joinOrCreateGame(playerId, (gameId) => {
        let playersInRoom = this.roomsMap.get(gameId);

        if (!playersInRoom) {
          playersInRoom = new Set<string>();
          this.roomsMap.set(gameId, playersInRoom);
        }

        playersInRoom?.add(playerId);
        console.log(`Player ${playerId} joined room ${gameId}`);

        if (playersInRoom?.size === 2) {
          this.notifyPlayersGameReady(gameId, playersInRoom);
        } else {
          console.log(`Room ${gameId} has ${playersInRoom?.size} players.`);
        }
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
      console.log('Player make move', playerId, moveFrom, moveTo, event);
      client.to(gameId).emit('opponentMove', moveFrom, moveTo, event);
    } else {
      console.log(`Player ${playerId} is not in game room ${gameId}`);
    }
  }

  private notifyPlayersGameReady(gameId: string, playersInRoom: Set<string>) {
    console.log(`Room ${gameId} has two players: ${Array.from(playersInRoom)}`);

    playersInRoom.forEach((player) => {
      const playerSocket = this.roomService.getPlayerSocket(player);
      if (playerSocket) {
        console.log(
          `Sending gameReady event to player ${player} in room ${gameId}`,
        );
        playerSocket.join(gameId);
        playerSocket.emit('gameReady', gameId);
      }
    });
  }

  @SubscribeMessage('stopSearch')
  handleStopSearch(client: Socket) {
    const playerId = client.id;
    console.log(`Player ${playerId} stopped searching and left the room.`);

    this.roomsMap.forEach((playersInRoom, roomId) => {
      if (playersInRoom.has(playerId)) {
        playersInRoom.delete(playerId);
        console.log(`Player ${playerId} left room ${roomId}`);

        if (playersInRoom.size === 0) {
          this.roomsMap.delete(roomId);
          console.log(`Room ${roomId} has been deleted.`);
        }
      }
    });

    // Отправить сообщение клиенту об успешном выходе из комнаты
    client.emit('leftRoom');
  }
}
