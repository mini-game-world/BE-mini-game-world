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
  HITRADIUS = 40;
  private logger: Logger = new Logger('Status-Gateway');

  private clientsPosition: Map<string, { room: string, x: string, y: string, isStun: number }> = new Map();

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
    this.clientsPosition.set(client.id, { room, x: data.x, y: data.y, isStun: 0 });

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
      this.clientsPosition.set(client.id, { room, x: data.x, y: data.y, isStun: 0 });

      client.to(room).emit('playerMoved', { playerId: client.id, x: data.x, y: data.y });
    }
  }

  @SubscribeMessage('attackPosition')
  handleAttackPosition(client: Socket, data: { x: string; y: string }): void {
    const clientData = this.clientsPosition.get(client.id);
    if (!clientData) {
      this.logger.warn(`Client ${client.id} sent attack position but is not in any room`);
      return;
    }

    // isStun이 1이면 return
    if (clientData.isStun === 1) {
      this.logger.warn(`Client ${client.id} is stunned and cannot attack`);
      return;
    }

    const room = clientData.room;
    const logMessage = `attackPosition [${client.id}] x: ${data.x}, y: ${data.y} in room ${room}`;
    this.logger.log(logMessage);
    const attackPosition = { x: parseFloat(data.x), y: parseFloat(data.y) };

    this.logger.log(`Client ${client.id} attacked position x: ${attackPosition.x}, y: ${attackPosition.y} in room ${room}`);

    // 같은 방의 다른 클라이언트들의 위치와 비교하여 히트된 유저들의 아이디만 추출
    const hitResults = Array.from(this.clientsPosition.entries())
      .filter(([playerId, pos]) => pos.room === room && playerId !== client.id)
      .filter(([_, pos]) => {
        const playerPosition = { x: parseFloat(pos.x), y: parseFloat(pos.y) };
        const distance = Math.sqrt(Math.pow(attackPosition.x - playerPosition.x, 2) + Math.pow(attackPosition.y - playerPosition.y, 2));
        return distance <= this.HITRADIUS;
      })
      .filter(([playerId]) => {
        // Check if the player is not stunned
        const playerData = this.clientsPosition.get(playerId);
        return playerData && playerData.isStun !== 1;
      })
      .map(([playerId]) => playerId);

    // 히트된 유저들에게 개별적으로 히트 여부 알림
    hitResults.forEach(async (playerId) => {
      const targetClient = this.server.sockets.sockets.get(playerId);
      if (targetClient) {
        targetClient.emit('attacked', 1);

        // 유저의 isStun을 1초간 1로 바꿨다가 다시 0으로 바꾸는 비동기 코드
        const clientPosition = this.clientsPosition.get(playerId);
        if (clientPosition) {
          clientPosition.isStun = 1;
          this.clientsPosition.set(playerId, clientPosition);

          // 1초 후에 isStun을 0으로 변경
          await new Promise(resolve => setTimeout(resolve, 1000));

          clientPosition.isStun = 0;
          this.clientsPosition.set(playerId, clientPosition);
        }
      }
    });

    // 히트 결과를 해당 룸의 모든 클라이언트에게 알림
    this.server.to(room).emit('attackedPlayers', hitResults);

    // 공격중인 유저를 모두에게 전파(화면에 공격중인것을 표시하기 위해)
    client.to(room).emit('attackPlayer', client.id);

    this.logger.log(`Attack results: ${JSON.stringify(hitResults)}`);
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
