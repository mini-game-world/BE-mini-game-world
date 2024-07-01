import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChattingService } from './chatting.service';
import { StatusBombGameService } from '../status/status.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChattingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('Chatting-Gateway');

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chattingService: ChattingService,
    private readonly statusBombGameService: StatusBombGameService,
  ) {}

  afterInit(server: any) {
    this.logger.log('Init----Chatting-Gateway');
  }

  handleConnection(client: any, ...args: any[]) {
    this.logger.log(`chatting connect client.id --->${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`chatting disconnect client.id --->${client.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(client: any, data: string) {
    if (!data) {
      this.logger.log(`message was not found.`);
      return;
    }
    const censoredMessage = await this.chattingService.censorBadWords(data);
    const nickname = this.statusBombGameService.bombGameRoomPosition.get(client.id).nickname;
    this.logger.log(`[Chatting message] ${nickname} : ${censoredMessage} `);

    this.server.emit('broadcastMessage', {
      playerId: client.id,
      message: censoredMessage,
    });
  }
}
