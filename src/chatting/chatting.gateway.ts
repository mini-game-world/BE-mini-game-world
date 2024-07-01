import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { requestMessageDTO } from './DTO/chatting.DTO'
import { ChattingService } from './chatting.service';

@WebSocketGateway({ cors: { origin: "*" } })
export class ChattingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{

  private logger: Logger = new Logger("Chatting-Gateway");

  @WebSocketServer()
  server: Server;

  constructor(private readonly chattingService: ChattingService) {}

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
  handleMessage(client: any, data: string) {
    if(!data){
      this.logger.log(`message was not found.`);
      return
    }
    const censoredMessage =   this.chattingService.censorBadWords(data);
    this.logger.log(`chatting data--->${data}`);

    client.broadcast.emit('broadcastMessage', {playerId: client.id, message: censoredMessage});
  }
}

