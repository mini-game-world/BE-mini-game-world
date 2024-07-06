import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ChattingService } from './chatting.service.js';
import { StatusBombGameService } from '../status/status.service.js';
import { StatusGateway } from '../status/status.gateway.js';
import { WaitingService } from '../status/waiting.service.js'
import { GeckosIoService } from '../geckos/geckos.service.js';


@WebSocketGateway({ cors: { origin: '*' } })
export class ChattingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('Chatting-Gateway');

  constructor(
    private readonly chattingService: ChattingService,
    private readonly statusBombGameService: StatusBombGameService,
    private readonly geckosIoService: GeckosIoService,
    private readonly statusGateway:StatusGateway,
    private readonly waitingService: WaitingService,
  ) {}

  async afterInit() {
    this.logger.log('Init StatusGateway');

    await this.geckosIoService.waitForInitialization();

    this.geckosIoService.io.onConnection((channel: any) => {
      this.handleConnection(channel);
    });
  }

  handleConnection(channel: any) {
    channel.on('message', (data: string) => this.handleMessage(channel, data),);

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

    let nickname:string ='';
    let room:string='';
    switch (channel._roomId) {
      case this.statusGateway.PLAY_ROOM :
        nickname = this.statusBombGameService.bombGameRoomPosition.get(channel.id).nickname;
        room=this.statusGateway.PLAY_ROOM;
        break;
      case this.statusGateway.WAITING_ROOM :
        nickname = this.waitingService.getWaitingRoomPosition(channel.id).nickname;
        room=this.statusGateway.WAITING_ROOM;
        break;
    }

    const sendMessage: string =
      this.chattingService.checkChattingLen(censoredMessage);

    this.logger.log(`[Chatting message] ${nickname} : ${sendMessage} `);

    channel.room.emit('broadcastMessage', {
      playerId: channel.id,
      nickname: nickname,
      message: sendMessage,
      room: room,
    });
  }
}
