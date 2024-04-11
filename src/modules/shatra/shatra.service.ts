import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class ShatraService {
  private games: Map<string, string[]> = new Map(); // Map<gameId, [player1Id, player2Id]>
  private sockets: Map<string, Socket> = new Map(); // Map<playerId, Socket>

  constructor() {}

  joinOrCreateGame(playerId: string, callback: (gameId: string) => void): void {
    console.log('JoinOrCreateGame worked!!');
    let gameId: string;

    const availableGameId = Array.from(this.games.keys()).find((gameId) => {
      const players = this.games.get(gameId);
      return players && players.length === 1;
    });

    if (availableGameId) {
      const game = this.games.get(availableGameId);
      if (game) {
        game.push(playerId);
        gameId = availableGameId;
      }
    } else {
      gameId = Math.random().toString(36).substr(2, 8);
      this.games.set(gameId, [playerId]);
    }

    const socket = this.sockets.get(playerId);
    if (socket) {
      console.log(`Emitting gameReady event with gameId: ${gameId}`);
      socket.emit('gameReady', gameId); // Отправляем событие gameReady с gameId
    } else {
      console.error(`Socket not found for playerId: ${playerId}`);
    }

    callback(gameId);
  }

  handleGameReady(gameId: string): void {
    console.log(`Game is ready with ID: ${gameId}`);
    // Здесь можно добавить логику для перехода на страницу игры
    // this.navigateToGamePage(gameId);
  }

  setPlayerSocket(playerId: string, socket: Socket): void {
    this.sockets.set(playerId, socket);
  }

  removePlayerSocket(playerId: string): void {
    this.sockets.delete(playerId);
  }
}
