import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { StatusBombGameService } from './status.service.js';
import { RandomNumberGenerator } from './Utils/utils.RandomNumberGenerator.js';
import { OnEvent } from '@nestjs/event-emitter';
import {
  playerAttackPositionDTO,
  playerMovementDTO,
} from './DTO/status.DTO.js';
import { RandomNicknameService } from '../random-nickname/random-nickname.service.js';

import * as dotenv from 'dotenv';

dotenv.config();

@WebSocketGateway({ cors: { origin: '*' } })
export class StatusGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private CHECK_INTERVAL = 5000; // 5초 간격으로 체크
  private MIN_PLAYERS_FOR_BOMB_GAME = 4; // 최소 플레이어 수, 예시로 4명 설정

  private io: any;

  constructor(
    private readonly statusService: StatusBombGameService,
    private readonly randomNicknameService: RandomNicknameService,
  ) {
    setInterval(this.checkBombRooms.bind(this), this.CHECK_INTERVAL);
  }

  private logger: Logger = new Logger('Status-Gateway');

  private HITRADIUS = 40;
  private STUN_DURATION_MS: number = 1000;
  private PLAYING_ROOM: number = 0;
  private bombGameStartFlag = true;
  private generator = new RandomNumberGenerator(1, 30);

  async afterInit(server: any) {
    const geckosModule = await import('@geckos.io/server');
    const geckos = geckosModule.default;

    this.logger.log('Init~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    this.io = geckos();
    this.io.addServer(server);

    this.io.onConnection((channel: any) => {
      this.handleConnection(channel);
    });
  }

  async handleConnection(channel: any): Promise<void> {
    const x = Math.floor(Math.random() * 700) + 50;
    const y = Math.floor(Math.random() * 500) + 50;
    const randomNum = this.generator.getRandomNumber();
    const randomNickname = await this.randomNicknameService.getRandomNickname();
    this.statusService.bombGameRoomPosition.set(channel.id, {
      x,
      y,
      avatar: randomNum,
      nickname: randomNickname,
      isStun: 0,
      isPlay: 0,
      isDead: 0,
    });
    channel.broadcast.emit("newPlayer", {
      playerId: channel.id,
      x,
      y,
      avatar: randomNum,
      nickname: randomNickname,
      isPlay: 0
    });
    console.log(
      `${JSON.stringify(this.statusService.bombGameRoomPosition.get(channel.id))}`,
    );

    channel.emit(
      'currentPlayers',
      Object.fromEntries(this.statusService.bombGameRoomPosition),
    );

    this.logger.log(`Client connected: ${channel.id}`);
    this.logger.log(`Client ${channel.id} joined`);
    this.logger.log(
      `Number of connected clients: ${this.statusService.bombGameRoomPosition.size}`,
    );

    channel.on('playerMovement', (data: playerMovementDTO) =>
      this.playerPosition(channel, data),
    );
    channel.on('attackPosition', (data: playerAttackPositionDTO) =>
      this.handleAttackPosition(channel, data),
    );

    channel.on('disconnect', () => this.handleDisconnect(channel));
  }

  handleDisconnect(channel: any): any {
    this.generator.restoreNumber(
      this.statusService.bombGameRoomPosition.get(channel.id).avatar,
    );
    this.statusService.disconnectBombUser(channel.id);

    this.logger.log(`Client disconnected: ${channel.id}`);
    const size = this.statusService.bombGameRoomPosition.size;
    this.logger.log(`Number of connected clients: ${size}`);
  }

  playerPosition(channel: any, data: playerMovementDTO): void {
    const status = this.statusService.bombGameRoomPosition.get(channel.id);

    if (status) {
      status.x = data.x;
      status.y = data.y;
      this.statusService.bombGameRoomPosition.set(channel.id, status);
    }

    channel.broadcast.emit('playerMoved', {
      playerId: channel.id,
      x: data.x,
      y: data.y,
    });

    if (this.statusService.getBombUserList().length === 0) {
      return;
    }
    if (this.statusService.checkIsPlayer(channel.id)) {
      return;
    }
    this.statusService.checkOverlappingUser(channel.id, data.x, data.y);
  }

  handleAttackPosition(channel: any, data: playerAttackPositionDTO): void {
    const clientData = this.statusService.bombGameRoomPosition.get(channel.id);
    if (!clientData) {
      this.logger.warn(
        `Client ${channel.id} sent attack position but is not in any room`,
      );
      return;
    }

    if (clientData.isStun === 1) {
      this.logger.warn(`Client ${channel.id} is stunned and cannot attack`);
      return;
    }

    this.logger.log(
      `Client ${channel.id} attacked position x: ${data.x}, y: ${data.y}`,
    );

    const hitResults = Array.from(
      this.statusService.bombGameRoomPosition.entries(),
    )
      .filter(([playerId]) => playerId !== channel.id)
      .filter(
        ([playerId]) =>
          !this.statusService.getBombUserList().includes(playerId),
      )
      .filter(([_, pos]) => {
        const distance = Math.sqrt(
          Math.pow(data.x - pos.x, 2) + Math.pow(data.y - pos.y, 2),
        );
        return distance <= this.HITRADIUS;
      })
      .filter(([playerId]) => {
        const playerData =
          this.statusService.bombGameRoomPosition.get(playerId);
        return playerData && playerData.isStun !== 1;
      })
      .map(([playerId]) => playerId);

    hitResults.forEach(async (playerId) => {
      const clientPosition =
        this.statusService.bombGameRoomPosition.get(playerId);
      if (clientPosition) {
        clientPosition.isStun = 1;
        this.statusService.bombGameRoomPosition.set(playerId, clientPosition);

        await new Promise((resolve) =>
          setTimeout(resolve, this.STUN_DURATION_MS),
        );

        clientPosition.isStun = 0;
        this.statusService.bombGameRoomPosition.set(playerId, clientPosition);
      }
    });

    this.io.emit('attackedPlayers', hitResults);
    channel.broadcast.emit('attackPlayer', channel.id);

    this.logger.log(`Attack results: ${JSON.stringify(hitResults)}`);
  }

  bombGameStart() {
    this.PLAYING_ROOM = 1;
    this.bombGameStartFlag = false;
    this.io.emit('playingGame', this.PLAYING_ROOM);
    this.io.emit('bombGameStart', 1);
    this.statusService.startBombGameWithTimer();
  }

  @OnEvent('bombGame.start')
  handleBombGameStart(playGameUserList: string[], bombUserList: string[]) {
    this.io.emit('startBombGame', playGameUserList);
    this.io.emit('bombUsers', bombUserList);
  }

  @OnEvent('bombGame.timer')
  handleBombGameTimer(remainingTime: number) {
    this.io.emit('bombTimer', { remainingTime });
  }

  @OnEvent('bombGame.deadUsers')
  handleBombGameDeadUsers(bombUserList: string[]) {
    this.io.emit('deadUsers', bombUserList);
  }

  @OnEvent('bombGame.newBombUsers')
  handleBombGameNewBombUsers(bombUserList: string[]) {
    this.logger.log(`새로운 폭탄멤버는 ${bombUserList}`);
    this.io.emit('bombUsers', bombUserList);
  }

  @OnEvent('bombGame.changeBombUser')
  handleBombGameChangeBombUsers(changeBombUserList: string[]) {
    this.logger.log(
      `${changeBombUserList[1]}에서 ${changeBombUserList[0]}으로 폭탄이 옮겨졌습니다.`,
    );
    this.io.emit('changeBombUser', changeBombUserList);
  }

  @OnEvent('bombGame.winner')
  handleBombGameWinner(winner: string[]) {
    if (winner) this.io.emit('gameWinner', winner[0]);
    this.bombGameStartFlag = true;
    this.PLAYING_ROOM = 0;
    this.io.emit('playingGame', this.PLAYING_ROOM);
  }

  private checkBombRooms() {
    if (this.isBombGameStart()) {
      this.io.emit('bombGameReady', 1);
      setTimeout(() => {
        if (this.isBombGameStart()) {
          this.bombGameStart();
        }
      }, 5000);
    }
  }

  private isBombGameStart(): boolean {
    if (
      this.statusService.getBombGamePlayerMap().size >
      this.MIN_PLAYERS_FOR_BOMB_GAME &&
      this.bombGameStartFlag
    ) {
      return true;
    }
    return false;
  }
}
