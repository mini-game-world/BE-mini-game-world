import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from "@nestjs/event-emitter";
import { StatusBombGameService } from "./status.service";
import { RandomNumberGenerator } from './Utils/utils.RandomNumberGenerator';
import { RandomNicknameService } from '../random-nickname/random-nickname.service';
import { playerAttackPositionDTO, playerMovementDTO } from './DTO/status.DTO';

@Injectable()
export class StatusGateway {
  private readonly CHECK_INTERVAL = 5000;
  private readonly MIN_PLAYERS_FOR_BOMB_GAME = 3;
  private readonly HITRADIUS = 50;
  private readonly STUN_DURATION_MS = 1000;
  private bombGameStartFlag = 0;
  private readonly logger = new Logger("Status-Gateway");
  private readonly generator = new RandomNumberGenerator(1, 30);
  private isCheckingBombRooms = false;

  constructor(
    private readonly statusService: StatusBombGameService,
    private readonly randomNicknameService: RandomNicknameService,
  ) {
    setInterval(this.safeCheckBombRooms.bind(this), this.CHECK_INTERVAL);
  }

  handleConnection(stream: any) {
    this.logger.log('Client connected');
    stream.on('data', (chunk) => {
      const message = JSON.parse(chunk.toString());
      this.handleMessage(stream, message);
    });
  }

  async handleMessage(stream: any, message: any) {
    switch (message.type) {
      case 'connect':
        await this.handleClientConnect(stream, message);
        break;
      case 'playerMovement':
        this.handlePlayerMovement(stream, message);
        break;
      case 'attackPosition':
        this.handleAttackPosition(stream, message);
        break;
      // Add more message handlers as needed
    }
  }

  async handleClientConnect(stream: any, message: any) {
    const clientId = stream.session.localPort.toString();
    const x = Math.floor(Math.random() * (1760 - 960 + 1)) + 960;
    const y = Math.floor(Math.random() * (640 - 320 + 1)) + 320;
    const randomNum = this.generator.getRandomNumber();
    const randomNickname = await this.randomNicknameService.getRandomNickname();
    this.statusService.bombGameRoomPosition.set(clientId, { x, y, avatar: randomNum, nickname: randomNickname, isStun: 0, isPlay: 0, isDead: 0 });
    
    this.broadcast(stream, JSON.stringify({
      type: 'newPlayer',
      playerId: clientId,
      x,
      y,
      avatar: randomNum,
      nickname: randomNickname,
      isPlay: 0,
    }));

    const allClientsInRoomObject = Object.fromEntries(this.statusService.bombGameRoomPosition);
    stream.write(JSON.stringify({ type: 'currentPlayers', data: allClientsInRoomObject }));
    stream.write(JSON.stringify({ type: 'gamestatus', data: this.bombGameStartFlag }));

    this.logger.log(`Client ${clientId} joined`);
    this.logger.log(`Number of connected clients: ${this.statusService.bombGameRoomPosition.size}`);
  }

  handlePlayerMovement(stream: any, data: playerMovementDTO): void {
    const clientId = stream.session.localPort.toString();
    const status = this.statusService.bombGameRoomPosition.get(clientId);

    if (status) {
      status.x = data.x;
      status.y = data.y;
      this.statusService.bombGameRoomPosition.set(clientId, status);
    }

    this.broadcast(stream, JSON.stringify({ type: 'playerMoved', playerId: clientId, x: data.x, y: data.y }));

    if (this.statusService.getBombUserList().length === 0 || this.statusService.checkIsPlayer(clientId)) {
      return;
    }

    this.statusService.checkOverlappingUser(clientId, data.x, data.y);
  }

  handleAttackPosition(stream: any, data: playerAttackPositionDTO): void {
    const clientId = stream.session.localPort.toString();
    const clientData = this.statusService.bombGameRoomPosition.get(clientId);
    if (!clientData) {
      this.logger.warn(`Client ${clientId} sent attack position but is not in any room`);
      return;
    }

    if (clientData.isStun === 1) {
      this.logger.warn(`Client ${clientId} is stunned and cannot attack`);
      return;
    }

    const logMessage = `attackPosition [${clientId}] x: ${data.x}, y: ${data.y}}`;
    this.logger.log(logMessage);

    const hitResults = Array.from(this.statusService.bombGameRoomPosition.entries())
      .filter(([playerId]) => playerId !== clientId)
      .filter(([playerId]) => !this.statusService.getBombUserList().includes(playerId))
      .filter(([_, pos]) => {
        const distance = Math.sqrt(Math.pow(data.x - pos.x, 2) + Math.pow(data.y - pos.y, 2));
        return distance <= this.HITRADIUS;
      })
      .filter(([playerId]) => {
        const playerData = this.statusService.bombGameRoomPosition.get(playerId);
        return playerData && playerData.isStun !== 1;
      })
      .map(([playerId]) => playerId);

    hitResults.forEach(async (playerId) => {
      const clientPosition = this.statusService.bombGameRoomPosition.get(playerId);
      if (clientPosition) {
        clientPosition.isStun = 1;
        this.statusService.bombGameRoomPosition.set(playerId, clientPosition);

        await new Promise(resolve => setTimeout(resolve, this.STUN_DURATION_MS));

        clientPosition.isStun = 0;
        this.statusService.bombGameRoomPosition.set(playerId, clientPosition);
      }
    });

    this.broadcast(stream, JSON.stringify({ type: 'attackedPlayers', data: hitResults }));
    this.broadcast(stream, JSON.stringify({ type: 'attackPlayer', playerId: clientId }));

    this.logger.log(`Attack results: ${JSON.stringify(hitResults)}`);
  }

  private broadcast(stream: any, message: string) {
    stream.session.connection.write(message);
  }

  private safeCheckBombRooms() {
    if (this.isCheckingBombRooms) {
      return;
    }
    this.isCheckingBombRooms = true;
    this.checkBombRooms().finally(() => {
      this.isCheckingBombRooms = false;
    });
  }

  private async checkBombRooms() {
    if (this.isBombGameStart()) {
      let countdown = 10;
      await new Promise<void>((resolve) => {
        const countdownInterval = setInterval(() => {
          this.broadcast(null, JSON.stringify({ type: 'bombGameReady', data: countdown }));
          if (!this.isBombGameStart()) {
            this.broadcast(null, JSON.stringify({ type: 'bombGameReady', data: -1 }));
            clearInterval(countdownInterval);
            resolve();
            return;
          }
          countdown--;

          if (countdown === -1) {
            clearInterval(countdownInterval);
            if (this.isBombGameStart()) {
              this.bombGameStart();
            } else {
              this.broadcast(null, JSON.stringify({ type: 'bombGameReady', data: -1 }));
            }
            resolve();
          }
        }, 1000);
      });
    }
  }

  private isBombGameStart(): boolean {
    return this.statusService.getBombGamePlayerMap().size >= this.MIN_PLAYERS_FOR_BOMB_GAME && !this.bombGameStartFlag;
  }

  bombGameStart() {
    this.bombGameStartFlag = 1;
    this.broadcast(null, JSON.stringify({ type: 'playingGame', data: this.bombGameStartFlag }));
    this.statusService.startBombGameWithTimer();
  }

  @OnEvent("bombGame.start")
  handleBombGameStart(playGameUserList: string[], bombUserList: string[]) {
    this.broadcast(null, JSON.stringify({ type: 'bombUsers', data: bombUserList }));
  }

  @OnEvent("bombGame.timer")
  handleBombGameTimer(remainingTime: number) {
    this.broadcast(null, JSON.stringify({ type: 'bombTimer', data: { remainingTime } }));
  }

  @OnEvent("bombGame.deadUsers")
  handleBombGameDeadUsers(bombUserList: string[]) {
    this.broadcast(null, JSON.stringify({ type: 'deadUsers', data: bombUserList }));
  }

  @OnEvent("bombGame.newBombUsers")
  handleBombGameNewBombUsers(bombUserList: string[]) {
    this.logger.log(`새로운 폭탄멤버는 ${bombUserList}`);
    this.broadcast(null, JSON.stringify({ type: 'bombUsers', data: bombUserList }));
  }

  @OnEvent("bombGame.changeBombUser")
  handleBombGameChangeBombUsers(changeBombUserList: string[]) {
    this.logger.log(`${changeBombUserList[1]}에서 ${changeBombUserList[0]}으로 폭탄이 옮겨졌습니다.`);
    this.broadcast(null, JSON.stringify({ type: 'changeBombUser', data: changeBombUserList }));
  }

  @OnEvent("bombGame.winner")
  handleBombGameWinner(winner: string[]) {
    if (winner) this.broadcast(null, JSON.stringify({ type: 'gameWinner', data: winner[0] }));
    setTimeout(() => {
      this.bombGameStartFlag = 0;
      this.broadcast(null, JSON.stringify({ type: 'playingGame', data: this.bombGameStartFlag }));
    }, 5000);
  }
}
