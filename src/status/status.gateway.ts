import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';

import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class statusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('Status-Gateway');

  private clientsPosition: Map<string, { room: string, x: string, y: string }> = new Map();

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, data: { room: string, x: string, y: string }): void {
    // 클라이언트가 기존에 속해있던 방에서 떠납니다.
    const clientData = this.clientsPosition.get(client.id);
    if (clientData) {
      const oldRoom = clientData.room;
      client.leave(oldRoom);
      client.to(oldRoom).emit('playerLeft', { playerId: client.id });
      this.logger.log(`Client ${client.id} left room ${oldRoom}`);
    }

    // 새로운 방에 조인합니다.
    const room = data.room;
    client.join(room);
    this.clientsPosition.set(client.id, { room, x: data.x, y: data.y });

    client.to(room).emit('newPlayer', {
      playerId: client.id,
      x: data.x,
      y: data.y,
    });

    const allClientsInRoom = Array.from(this.clientsPosition.entries())
      .filter(([_, pos]) => pos.room === room)
      .map(([playerId, pos]) => ({ playerId, x: pos.x, y: pos.y }));

    client.emit('currentPlayers', allClientsInRoom);

    this.logger.log(`Client ${client.id} joined room ${room}`);
    this.logger.log(`Number of connected clients in room ${room}: ${allClientsInRoom.length}`);
  }

  @SubscribeMessage('playerMovement')
  playerPosition(client: Socket, data: { x: string; y: string }): void {
    const clientData = this.clientsPosition.get(client.id);
    if (clientData) {
      const room = clientData.room;
      const logMessage = `playerPosition [${client.id}] x: ${data.x}, y: ${data.y} in room ${room}`;
      this.logger.log(logMessage);
      this.clientsPosition.set(client.id, { room, x: data.x, y: data.y });

      client.to(room).emit('playerMoved', { playerId: client.id, x: data.x, y: data.y });
    }
  }


  afterInit(server: any): any {
    this.logger.log('Init');
  }

  // @SubscribeMessage('newPlayer')
  // newPlayer(client: Socket, data: { x: string; y: string }): void {
  //   client.broadcast.emit('newPlayer', {
  //     playerId: client.id,
  //     x: data.x,
  //     y: data.y
  //   });
  //   this.clientsPosition.set(client.id, data);

  //   const allClientsPositions = Array.from(this.clientsPosition.entries())
  //     .map(([playerId, pos]) => ({ playerId, ...pos }));

  //   client.emit('currentPlayers', allClientsPositions);

  //   console.log(allClientsPositions);
  //   const size = this.clientsPosition.size;
  //   this.logger.log(`Number of connected clients: ${size}`);
  // }

  //연결이 되었다면.. 뭔가 행위를 할 수있다 .~!
  handleConnection(client: any, ...args: any[]): any {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any): any {
    this.clientsPosition.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
    const size = this.clientsPosition.size;
    this.logger.log(`Number of connected clients: ${size}`);
    client.broadcast.emit('disconnected', client.id);
  }
}
