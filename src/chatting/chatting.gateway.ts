import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ChattingService } from './chatting.service.js';
import { StatusBombGameService } from '../status/status.service.js';
import { GeckosIoService } from '../geckos/geckos.service.js';


@WebSocketGateway({ cors: { origin: '*' } })
export class ChattingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('Chatting-Gateway');
  private io: any;

  constructor(
    private readonly chattingService: ChattingService,
    private readonly statusBombGameService: StatusBombGameService,
    private readonly geckosIoService: GeckosIoService
  ) {}

  onModuleInit() {
    if (this.geckosIoService.io) {
      this.logger.log('Geckos.io server is already initialized');
      this.geckosIoService.io.onConnection((channel: any) => {
        this.handleConnection(channel);
      });
    } else {
      this.logger.error('Geckos.io server is not initialized');
    }
  }

  afterInit() {
    this.logger.log('Init StatusGateway');
  }

  handleConnection(channel: any) {
    channel.on('message', (data: string) =>
      this.handleMessage(channel, data),
    );

    channel.on('disconnect', () => this.handleDisconnect(channel));
  }

  handleDisconnect(channel: any): any {
    this.logger.log(`chatting disconnect client.id --->${channel.id}`);
  }

  async handleMessage(channel: any, data: string) {
    if (!data) {
      this.logger.log(`message was not found.`);
      return;
    }
    const censoredMessage = await this.chattingService.censorBadWords(data);
    const nickname = this.statusBombGameService.bombGameRoomPosition.get(channel.id).nickname;

    const sendMessage: string =
      this.chattingService.checkChattingLen(censoredMessage);

    this.logger.log(`[Chatting message] ${nickname} : ${sendMessage} `);

    this.io.emit('broadcastMessage', {
      playerId: channel.id,
      nickname: nickname,
      message: sendMessage,
    });
  }
}
