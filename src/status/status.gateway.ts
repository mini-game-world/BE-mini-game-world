import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { StatusBombGameService } from "./status.service.js";
import { RandomNumberGenerator } from './Utils/utils.RandomNumberGenerator.js'
import { OnEvent } from "@nestjs/event-emitter";
import { playerAttackPositionDTO, playerMovementDTO } from "./DTO/status.DTO.js";
import { RandomNicknameService } from '../random-nickname/random-nickname.service.js';
import { RankService } from './rank.service.js';
import { GeckosIoService } from '../geckos/geckos.service.js';

@WebSocketGateway({ cors: { origin: "*" } })
export class StatusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private CHECK_INTERVAL = 5000;
  private MIN_PLAYERS_FOR_BOMB_GAME = 3; // 최소 플레이어 수, 예시로 4명 설정
  private isCheckingBombRooms = false; // checkBombRooms 실행 여부를 추적
  private io: any;
  constructor(
    private readonly statusService: StatusBombGameService,
    private readonly randomNicknameService: RandomNicknameService,
    private readonly rankService: RankService,
    private readonly geckosIoService: GeckosIoService
  ) {
    setInterval(this.safeCheckBombRooms.bind(this), this.CHECK_INTERVAL);
  }

  private logger: Logger = new Logger("Status-Gateway");


  private HITRADIUS = 100;

  private STUN_DURATION_MS: number = 1000;
  private bombGameStartFlag = 0;
  private generator = new RandomNumberGenerator(1, 30);

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

  async handleConnection(channel: any): Promise<void> {
    const x = Math.floor(Math.random() * (1760 - 960 + 1)) + 960;
    const y = Math.floor(Math.random() * (640 - 320 + 1)) + 320;
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
    console.log(
      `${JSON.stringify(this.statusService.bombGameRoomPosition.get(channel.id))}`,
    );

    channel.broadcast.emit("newPlayer", {
      playerId: channel.id,
      x,
      y,
      avatar: randomNum,
      nickname: randomNickname,
      isPlay: 0
    });

    channel.emit(
      'currentPlayers',
      Object.fromEntries(this.statusService.bombGameRoomPosition),
    );
    channel.emit("gamestatus", this.bombGameStartFlag);

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
    channel.broadcast.emit("playerDisconnected", channel.id);
    this.statusService.disconnectBombUser(channel.id);

    this.logger.log(`Client disconnected: ${channel.id}`);
    const size = this.statusService.bombGameRoomPosition.size;
    this.logger.log(`Number of connected clients: ${size}`);
  }

  playerPosition(channel: any, data: playerMovementDTO): void {
    const status = this.statusService.bombGameRoomPosition.get(channel.id);

    // x와 y 값만 업데이트
    if (status) {
      status.x = data.x;
      status.y = data.y;

      // 업데이트된 status 객체를 다시 설정
      this.statusService.bombGameRoomPosition.set(channel.id, status);
    }
    channel.broadcast.emit("playerMoved", { playerId: channel.id, x: data.x, y: data.y });

    // bombUserList가 비어 있으면 로직을 실행하지 않음
    if (this.statusService.getBombUserList().length === 0) {
      return;
    }
    if (this.statusService.checkIsNotPlayer(channel.id)) {
      return;
    }
    this.statusService.checkOverlappingUser(channel.id, data.x, data.y);
  }

  handleAttackPosition(channel: any, data: playerAttackPositionDTO): void {
    const clientData = this.statusService.bombGameRoomPosition.get(channel.id);
    if (!clientData) {
      this.logger.warn(`Client ${channel.id} sent attack position but is not in any room`);
      return;
    }

    // isStun이 1이면 return
    if (clientData.isStun === 1) {
      this.logger.warn(`Client ${channel.id} is stunned and cannot attack`);
      return;
    }

    this.logger.log(`Client ${channel.id} attacked position x: ${data.x}, y: ${data.y}`);

    // 같은 방의 다른 클라이언트들의 위치와 비교하여 히트된 유저들의 아이디만 추출
    const hitResults = Array.from(this.statusService.bombGameRoomPosition.entries())
      .filter(([playerId]) => playerId !== channel.id)
      .filter(([playerId]) => {
        // Exclude users in bombUserList
        return !this.statusService.getBombUserList().includes(playerId) || !this.statusService.checkIsNotPlayer(playerId);
      })
      .filter(([_, pos]) => {
        const distance = Math.sqrt(Math.pow(data.x - pos.x, 2) + Math.pow(data.y - pos.y, 2));
        return distance <= this.HITRADIUS;
      })
      .filter(([playerId]) => {
        // Check if the player is not stunned
        const playerData = this.statusService.bombGameRoomPosition.get(playerId);
        return playerData && playerData.isStun !== 1;
      })
      .map(([playerId]) => playerId);

    // 히트된 유저들에게 개별적으로 히트 여부 알림
    hitResults.forEach(async (playerId) => {
      const clientPosition = this.statusService.bombGameRoomPosition.get(playerId);
      if (clientPosition) {
        clientPosition.isStun = 1;
        this.statusService.bombGameRoomPosition.set(playerId, clientPosition);

        // 1초 후에 isStun을 0으로 변경
        await new Promise(resolve => setTimeout(resolve, this.STUN_DURATION_MS));

        clientPosition.isStun = 0;
        this.statusService.bombGameRoomPosition.set(playerId, clientPosition);
      }
    });

    // 히트 결과를 해당 룸의 모든 클라이언트에게 알림
    this.io.emit("attackedPlayers", hitResults);

    // 공격중인 유저를 모두에게 전파(화면에 공격중인것을 표시하기 위해)
    channel.broadcast.emit("attackPlayer", channel.id);

    this.logger.log(`Attack results: ${JSON.stringify(hitResults)}`);

    //맞은 정보 업데이트 시킴
    hitResults.forEach(async (playerId) => {
      this.rankService.processEvent({
        playerId: playerId,
        eventType: this.rankService.HIT,
      });
      this.logger.log(`hitResults playerId: ${playerId}`);
    });
  }

  bombGameStart() {
    this.bombGameStartFlag = 1;
    this.io.emit("playingGame", this.bombGameStartFlag);
    this.statusService.startBombGameWithTimer();
  }

  @OnEvent("bombGame.start")
  handleBombGameStart(playGameUserList: string[], bombUserList: string[]) {
    this.io.emit("bombUsers", bombUserList);
  }

  @OnEvent("bombGame.timer")
  handleBombGameTimer(remainingTime: number) {
    this.io.emit("bombTimer", { remainingTime });
  }

  @OnEvent("bombGame.deadUsers")
  handleBombGameDeadUsers(bombUserList: string[]) {
    this.io.emit("deadUsers", bombUserList);
  }

  @OnEvent("bombGame.newBombUsers")
  handleBombGameNewBombUsers(bombUserList: string[]) {
    this.logger.log(`새로운 폭탄멤버는 ${bombUserList}`);
    this.io.emit("bombUsers", bombUserList);
  }

  @OnEvent("bombGame.changeBombUser")
  handleBombGameChangeBombUsers(changeBombUserList: string[]) {
    this.logger.log(`${changeBombUserList[1]}에서 ${changeBombUserList[0]}으로 폭탄이 옮겨졌습니다.`);
    //폭탄 옮긴유저 카운트
    this.rankService.processEvent({ playerId: changeBombUserList[1], eventType: this.rankService.BOMB })
    this.io.emit("changeBombUser", changeBombUserList);
  }

  @OnEvent("bombGame.winner")
  handleBombGameWinner(winner: string[]) {
    if (winner) {
      const gameWinner = winner[0];
      const bombMaster = this.rankService.getMVP(this.rankService.BOMB);
      const punchingBag = this.rankService.getMVP(this.rankService.HIT);
      const result = {
        gameWinner: gameWinner,
        BombMaster: bombMaster || { playerId: '', count: 0 },
        PunchingBag: punchingBag || { playerId: '', count: 0 },
      };
      this.logger.log("gameResult", result);
      this.rankService.gameEnd();
      this.io.emit("gameWinner", result);
    }
    setTimeout(() => {
      this.bombGameStartFlag = 0;
      this.io.emit("playingGame", this.bombGameStartFlag);
    }, 15000);
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

      // Return a new Promise that resolves when the countdown finishes
      await new Promise<void>((resolve) => {
        const countdownInterval = setInterval(() => {
          this.io.emit("bombGameReady", countdown);
          if (!this.isBombGameStart()) {
            this.io.emit("bombGameReady", -1);
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
              this.io.emit("bombGameReady", -1);
            }
            resolve(); // Resolve the Promise here
          }
        }, 1000);
      });
    }
  }

  private isBombGameStart(): boolean {
    if (this.statusService.getBombGamePlayerMap().size >= this.MIN_PLAYERS_FOR_BOMB_GAME && !this.bombGameStartFlag) {
      return true;
    }
    return false;
  }
}
