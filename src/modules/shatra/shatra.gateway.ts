import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ShatraService } from './shatra.service';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway()
export class ShatraGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly service: ShatraService) {}

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);

    client.on('disconnect', () => {
      console.log(`Client disconnected: ${client.id}`);
    });
  }

  @SubscribeMessage('joinOrCreate')
  handleMessage(client: Socket, payload: { playerId: string }) {
    const playerId = payload.playerId;

    // Define a callback function to handle the game ID result
    const callback = (gameId: string) => {
      // Send the game ID back to the client
      this.server.to(client.id).emit('gameReady', gameId);
    };

    // Call the service method with playerId and callback
    this.service.joinOrCreateGame(playerId, callback);
  }
}
