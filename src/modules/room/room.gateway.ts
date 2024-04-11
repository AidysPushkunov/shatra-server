import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class GameRoomGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('joinGameRoom')
  handleJoinGameRoom(client: Socket, gameId: string) {
    client.join(gameId); // Присоединить клиента к комнате игры с gameId
  }

  @SubscribeMessage('makeMove')
  handleMakeMove(client: Socket, payload: { gameId: string; move: string }) {
    const { gameId, move } = payload;
    // Отправить ход другому игроку в той же комнате игры
    console.log('Oponent move: ', move);
    client.to(gameId).emit('opponentMove', move);
  }
}
