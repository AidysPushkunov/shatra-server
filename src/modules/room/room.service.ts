import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Player } from './models';

@Injectable()
export class RoomService {
  private rooms: Map<string, Set<string>> = new Map();
  private sockets: Map<string, Socket> = new Map(); // Map<playerId, Socket>
  private whitePlayer: Player | null = null;
  private blackPlayer: Player | null = null;

  constructor() {}

  setWhitePlayer(player: Player): void {
    this.whitePlayer = player;
  }

  getWhitePlayer(): Player | null {
    return this.whitePlayer;
  }

  setBlackPlayer(player: Player): void {
    this.blackPlayer = player;
  }

  getBlackPlayer(): Player | null {
    return this.blackPlayer;
  }

  joinOrCreateGame(playerId: string, callback: (gameId: string) => void): void {
    const socket = this.sockets.get(playerId);

    if (socket) {
      const gameId = this.findOrCreateGame(playerId);
      callback(gameId);
    } else {
      console.error(`Socket not found for playerId: ${playerId}`);
    }
  }

  private findOrCreateGame(playerId: string): string {
    let gameId: string | undefined;

    // Находим первую доступную игру или создаем новую
    for (const [gameIdKey, players] of this.rooms.entries()) {
      if (players.size === 1) {
        gameId = gameIdKey;
        players.add(playerId);
        break;
      }
    }

    if (!gameId) {
      gameId = this.createGame(playerId);
    }

    return gameId;
  }

  private createGame(playerId: string): string {
    const gameId = Math.random().toString(36).substr(2, 8);
    this.rooms.set(gameId, new Set([playerId]));
    return gameId;
  }

  removePlayerSocket(playerId: string): void {
    this.sockets.delete(playerId);
  }

  setPlayerSocket(playerId: string, socket: Socket): void {
    this.sockets.set(playerId, socket);
  }

  getPlayerSocket(playerId: string): Socket | undefined {
    return this.sockets.get(playerId);
  }

  isPlayerInRoom(playerId: string, gameId: string): boolean {
    const players = this.rooms.get(gameId);
    return !!players && players.has(playerId);
  }
}
