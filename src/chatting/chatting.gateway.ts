import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';


@WebSocketGateway({ cors: { origin: "*" } })
export class ChattingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{

  private logger: Logger = new Logger("Chatting-Gateway");

  @WebSocketServer()
  server: Server;

  afterInit(server: any) {
    this.logger.log("Init");
  }

  handleConnection(client: any, ...args: any[]) {
      throw new Error('Method not implemented.');
  }

  handleDisconnect(client: any) {
      throw new Error('Method not implemented.');
  }

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }
}
