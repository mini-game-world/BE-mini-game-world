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

  private clientsPosition: Map<string, { x: string, y: string }> = new Map();

  @SubscribeMessage('playerMovement')
  playerPosition(client: Socket, data: { x: string; y: string }): void {
    const logMessage = `playerPosition [${client.id}] x: ${data.x}, y: ${data.y}`;
    this.logger.log(logMessage);
    this.clientsPosition.set(client.id, data);

    client.broadcast.emit('playerMoved', { playerId:client.id, x:data.x, y:data.y });
  }


  afterInit(server: any): any {
    this.logger.log('Init');
  }

  @SubscribeMessage('newPlayer')
  newPlayer(client: Socket, data: { x: string; y: string }): void {

    client.broadcast.emit('newPlayer',{
      playerId: client.id,
      x: data.x,
      y: data.y
    });
    this.clientsPosition.set(client.id, data);

    const allClientsPositions = Array.from(this.clientsPosition.entries())
        .map(([playerId, pos]) => ({ playerId, ...pos }));

    client.emit('currentPlayers', allClientsPositions);

    console.log(allClientsPositions);
    const size = this.clientsPosition.size;
    this.logger.log(`Number of connected clients: ${size}`);
  }

  //연결이 되었다면.. 뭔가 행위를 할 수있다 .~!
  handleConnection(client: any, ...args: any[]): any {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any): any {
    this.clientsPosition.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
    const size = this.clientsPosition.size;
    this.logger.log(`Number of connected clients: ${size}`);
    client.broadcast.emit('disconnected',client.id);
  }
}
