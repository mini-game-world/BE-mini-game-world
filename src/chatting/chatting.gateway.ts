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
    this.logger.log("Init----Chatting-Gateway");
  }

  handleConnection(client: any, ...args: any[]) {
    this.logger.log(`chatting connect client.id --->${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`chatting disconnect client.id --->${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any) {
    this.logger.log(`chatting payload --->${payload}`);
    this.logger.log(`chatting JSON.stringify(payload)--->${JSON.stringify(payload)}`);
    const message = { [client.id]: payload };
    this.server.emit('broadcastMessage', message);
  }
}
