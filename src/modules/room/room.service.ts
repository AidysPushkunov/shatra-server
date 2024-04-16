import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class RoomService {
  private rooms: Map<string, Set<string>> = new Map(); // Map<gameId, Set<playerId>>
  private sockets: Map<string, Socket> = new Map(); // Map<playerId, Socket>

  constructor() {}

  joinOrCreateGame(playerId: string, callback: (gameId: string) => void): void {
    let gameId: string;

    const availableGameId = Array.from(this.rooms.keys()).find((gameId) => {
      const players = this.rooms.get(gameId);
      return players && players.size === 1;
    });

    if (availableGameId) {
      const players = this.rooms.get(availableGameId);
      if (players) {
        players.add(playerId);
        gameId = availableGameId;
      }
    } else {
      gameId = Math.random().toString(36).substr(2, 8);
      this.rooms.set(gameId, new Set([playerId]));
    }

    const socket = this.sockets.get(playerId);
    if (socket) {
      callback(gameId);
    } else {
      console.error(`Socket not found for playerId: ${playerId}`);
    }
  }

  getPlayersInGame(gameId: string): Set<string> | undefined {
    return this.rooms.get(gameId);
  }

  isPlayerInRoom(playerId: string, gameId: string): boolean {
    const players = this.rooms.get(gameId);
    console.log('isPlayerInRoom', players ? players.has(playerId) : false);
    return players ? players.has(playerId) : false;
  }

  setPlayerSocket(playerId: string, socket: Socket): void {
    this.sockets.set(playerId, socket);
  }

  getPlayerSocket(playerId: string): Socket | undefined {
    return this.sockets.get(playerId);
  }

  removePlayerSocket(playerId: string): void {
    this.sockets.delete(playerId);
  }
}
