import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ChattingService } from './chatting.service.js';
import { StatusBombGameService } from '../status/status.service.js';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChattingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('Chatting-Gateway');
  private io: any;

  constructor(
    private readonly chattingService: ChattingService,
    private readonly statusBombGameService: StatusBombGameService,
  ) {}

  async afterInit(server: any) {
    const geckosModule = await import('@geckos.io/server');
    const geckos = geckosModule.default;

    this.logger.log('Init');
    const customIceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
    this.io = geckos({
      iceServers: customIceServers
    });
    this.io.listen(3001, {
      host: '0.0.0.0'  // 모든 네트워크 인터페이스에서 연결을 수락
    });
    this.logger.log(`server는??????????????${server}`);
    // this.logger.log(`server는??????????????${JSON.stringify(server)}`);
    // this.io.addServer(server);

    this.io.onConnection((channel: any) => {
      this.handleConnection(channel);
    });
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
