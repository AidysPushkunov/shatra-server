import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { Colors, Player } from './models';

@WebSocketGateway()
export class RoomGateway {
  @WebSocketServer() server: Server;
  private onlineCount = 0;
  private gameIdLocal;

  private roomsMap = new Map<string, Set<string>>(); // roomId -> Set<playerId>

  constructor(private readonly roomService: RoomService) {}

  private assignPlayerColor(playerId: string): Player {
    const whitePlayer = this.roomService.getWhitePlayer();
    if (!whitePlayer) {
      this.roomService.setWhitePlayer(new Player(Colors.WHITE, playerId));
      return this.roomService.getWhitePlayer();
    } else {
      this.roomService.setBlackPlayer(new Player(Colors.BLACK, playerId));
      return this.roomService.getBlackPlayer();
    }
  }

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

  private determineCurrentPlayerColor(
    playersInRoom: Set<string>,
    playerId: string,
  ): Colors {
    const currentPlayerId = Array.from(playersInRoom)[0]; // Первый игрок в комнате
    return currentPlayerId === playerId ? Colors.WHITE : Colors.BLACK;
  }

  private findPlayersInRoomByGameId(gameId: string): Set<string> | undefined {
    return this.roomsMap.get(gameId);
  }

  @SubscribeMessage('swapPlayer')
  handleSwapPlayer(client: Socket): void {
    const playerId = client.id;
    const playersInRoom = this.findPlayersInRoomByGameId(this.gameIdLocal);

    if (!playersInRoom) {
      console.log(`Error: Room not found for player ${playerId}`);
      return;
    }

    if (playersInRoom.size !== 2) {
      console.log(`Error: Incorrect number of players in room.`);
      return;
    }

    const currentPlayerColor = this.determineCurrentPlayerColor(
      playersInRoom,
      playerId,
    );
    const newPlayerColor =
      currentPlayerColor === Colors.WHITE ? Colors.BLACK : Colors.WHITE;
    const newPlayer = new Player(newPlayerColor, playerId);

    // Обновляем текущего игрока на сервере
    if (newPlayerColor === Colors.WHITE) {
      this.roomService.setWhitePlayer(newPlayer);
    } else {
      this.roomService.setBlackPlayer(newPlayer);
    }

    // Отправляем сообщение об обновлении игрока на всех клиентах в комнате
    this.server
      .to(Array.from(playersInRoom))
      .emit('playerUpdated', newPlayerColor);
  }

  private broadcastOnlineCount(): void {
    this.server.emit('onlineCount', this.onlineCount);
  }

  @SubscribeMessage('joinOrCreate')
  handleMessage(client: Socket, payload: { playerId: string }) {
    const { playerId } = payload;
    const socket = this.roomService.getPlayerSocket(playerId);

    if (socket) {
      this.roomService.joinOrCreateGame(playerId, (gameId) => {
        this.gameIdLocal = gameId;
        let playersInRoom = this.roomsMap.get(gameId);

        if (!playersInRoom) {
          playersInRoom = new Set<string>();
          this.roomsMap.set(gameId, playersInRoom);
        }

        playersInRoom?.add(playerId);
        console.log(`Игрок ${playerId} присоединился к комнате ${gameId}`);

        if (playersInRoom?.size === 2) {
          // Уведомляем игроков, что игра готова, и назначаем цвета
          const playersArray = Array.from(playersInRoom);
          const whitePlayer = this.assignPlayerColor(playersArray[0]);
          const blackPlayer = this.assignPlayerColor(playersArray[1]);

          this.notifyPlayersGameReady(
            gameId,
            playersInRoom,
            whitePlayer,
            blackPlayer,
          );
        } else {
          console.log(
            `Комната ${gameId} содержит ${playersInRoom?.size} игроков.`,
          );
        }
      });
    } else {
      console.error(`Сокет не найден для playerId: ${playerId}`);
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
      const playersInRoom = this.roomsMap.get(gameId);

      if (playersInRoom) {
        const currentPlayerColor =
          playersInRoom.values().next().value === playerId ? 'white' : 'black';
        client
          .to(gameId)
          .emit('opponentMove', moveFrom, moveTo, currentPlayerColor, playerId);
      }
    } else {
      console.log(`Player ${playerId} is not in game room ${gameId}`);
    }
  }

  private notifyPlayersGameReady(
    gameId: string,
    playersInRoom: Set<string>,
    whitePlayer: Player,
    blackPlayer: Player,
  ): void {
    console.log(`Room ${gameId} has two players: ${Array.from(playersInRoom)}`);

    playersInRoom.forEach((player) => {
      const playerSocket = this.roomService.getPlayerSocket(player);
      if (playerSocket) {
        console.log(
          `Sending gameReady event to player ${player} in room ${gameId}`,
        );
        playerSocket.join(gameId);
        console.log(
          'player: ',
          player,
          ' whitePlayerId: ',
          whitePlayer.id,
          ' blackPlayerId: ',
          blackPlayer.id,
        );
        if (player === whitePlayer.id) {
          console.log('Player ready!!! 149');
          playerSocket.emit('gameReady', gameId, 'white');
        } else if (player === blackPlayer.id) {
          console.log('Player ready!!! 152 black');
          playerSocket.emit('gameReady', gameId, 'black');
        }
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
