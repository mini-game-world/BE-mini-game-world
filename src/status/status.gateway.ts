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
import { WaitingService } from './waiting.service.js';

@WebSocketGateway({ cors: { origin: "*" } })
export class StatusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private CHECK_INTERVAL = 5000;
  private MIN_PLAYERS_FOR_BOMB_GAME = 3; // 최소 플레이어 수, 예시로 4명 설정
  private isCheckingBombRooms = false; // checkBombRooms 실행 여부를 추적
  constructor(
    private readonly statusService: StatusBombGameService,
    private readonly randomNicknameService: RandomNicknameService,
    private readonly rankService: RankService,
    private readonly geckosIoService: GeckosIoService,
    private readonly waitingService: WaitingService
  ) {
    setInterval(this.safeCheckBombRooms.bind(this), this.CHECK_INTERVAL);
  }
  private logger: Logger = new Logger("Status-Gateway");


  private HITRADIUS = 100;

  private STUN_DURATION_MS: number = 1000;
  private bombGameStartFlag = 0;
  private generator = new RandomNumberGenerator(1, 30);

  readonly WAITING_ROOM: string = 'wait';
  readonly PLAY_ROOM: string = 'play';

  async afterInit() {
    this.logger.log('Init StatusGateway');

    await this.geckosIoService.waitForInitialization();

    this.geckosIoService.io.onConnection((channel: any) => {
      this.handleConnection(channel);
    });
  }

  async handleConnection(channel: any): Promise<void> {
    // const x = Math.floor(Math.random() * (1760 - 960 + 1)) + 960;
    // const y = Math.floor(Math.random() * (640 - 320 + 1)) + 320;
    const randomNum = this.generator.getRandomNumber();
    const randomNickname = await this.randomNicknameService.getRandomNickname();
    const dot =this.getRandomWaitingRoomPosition()
    //임시
    this.statusService.bombGameRoomPosition.set(channel.id, {
      x:dot.x,
      y:dot.y,
      avatar: randomNum,
      nickname: randomNickname,
      isStun: 0,
      isPlay: 0,
      isDead: 0,
    });

    //처음들어올시 waiting room 에 입장.
    this.waitingService.setWaitingRoomPosition(channel.id,dot.x,dot.y,randomNum,randomNickname);

    console.log(
      `${JSON.stringify(this.statusService.bombGameRoomPosition.get(channel.id))}`,
    );

    channel.join(this.WAITING_ROOM);

    channel.broadcast.emit("newPlayer", {
      playerId: channel.id,
      x:dot.x,
      y:dot.y,
      avatar: randomNum,
      nickname: randomNickname,
      isPlay: 0
    });

    // channel.emit('currentPlayers', Object.fromEntries(this.statusService.bombGameRoomPosition),);
    channel.emit('currentPlayers', this.waitingService.getAllWaitingRoomUser());
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

    channel.on('changeRoom', () => this.changeRoom(channel));
  }

  handleDisconnect(channel: any): any {

    const room = channel._roomId;
    switch (room) {
      case this.PLAY_ROOM:
        const position = this.statusService.bombGameRoomPosition.get(channel.id);
        if (position) {
          this.generator.restoreNumber(position.avatar);
        } else {
          console.error(`Channel ID ${channel.id} not found in bombGameRoomPosition.`);
        }
        this.statusService.disconnectBombUser(channel.id);
        this.logger.log(`Client disconnected: ${channel.id}`);
        break;
      case this.WAITING_ROOM:
        const waitingRoomPosition = this.waitingService.getWaitingRoomPosition(channel.id);
        if (waitingRoomPosition) {
          this.generator.restoreNumber(waitingRoomPosition.avatar);
        } else {
          console.error(`Channel ID ${channel.id} not found in bombGameRoomPosition.`);
        }
        this.waitingService.disconnectUser(channel.id);
    }

    this.geckosIoService.io.emit("playerDisconnected", channel.id);
    const boomPlayerSize = this.statusService.bombGameRoomPosition.size;
    const waitPlayerSize=this.waitingService.getWaitingRoomPositionSize();
    this.logger.log(`Number of connected clients: ${boomPlayerSize+waitPlayerSize}`);
  }

  playerPosition(channel: any, data: playerMovementDTO): void {
    // emits a message to all channels, in the same room, except sender
    channel.broadcast.emit("playerMoved", { playerId: channel.id, x: data.x, y: data.y });

    const room = channel._roomId
    switch (room) {
      case this.WAITING_ROOM:
        this.waitingService.setWaitingRoomMove(channel.id, data.x, data.y);
        break;
      case this.PLAY_ROOM:
        this.statusService.setBombGameRoomPosition(channel.id, data.x, data.y);
        this.statusService.checkOverlappingBombUser(channel.id, data.x, data.y);
        this.statusService.checkOverlappingItemUser(channel.id, data.x, data.y);
        break;
    }
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
        return (
          !this.statusService.getBombUserList().includes(playerId) ||
          !this.statusService.checkIsNotPlayer(playerId)
        );
      })
      .filter(([_, pos]) => {
        const distance = Math.sqrt(
          Math.pow(data.x - pos.x, 2) + Math.pow(data.y - pos.y, 2),
        );
        return distance <= this.HITRADIUS;
      })
      .filter(([playerId]) => {
        // Check if the player is not stunned
        const playerData =
          this.statusService.bombGameRoomPosition.get(playerId);
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
    this.geckosIoService.io.emit("attackedPlayers", hitResults);

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
    this.geckosIoService.io.emit("playingGame", this.bombGameStartFlag);
    this.statusService.startBombGameWithTimer();
  }

  @OnEvent('bombGame.start')
  handleBombGameStart(playGameUserList: string[], bombUserList: string[]) {
    this.geckosIoService.io.emit("bombUsers", bombUserList);
  }

  @OnEvent('bombGame.timer')
  handleBombGameTimer(remainingTime: number) {
    this.geckosIoService.io.emit("bombTimer", { remainingTime });
  }

  @OnEvent('bombGame.deadUsers')
  handleBombGameDeadUsers(bombUserList: string[]) {
    this.geckosIoService.io.emit("deadUsers", bombUserList);
  }

  @OnEvent('bombGame.newBombUsers')
  handleBombGameNewBombUsers(bombUserList: string[]) {
    this.logger.log(`새로운 폭탄멤버는 ${bombUserList}`);
    this.geckosIoService.io.emit("bombUsers", bombUserList);
  }

  @OnEvent('bombGame.changeBombUser')
  handleBombGameChangeBombUsers(changeBombUserList: string[]) {
    this.logger.log(
      `${changeBombUserList[1]}에서 ${changeBombUserList[0]}으로 폭탄이 옮겨졌습니다.`,
    );
    //폭탄 옮긴유저 카운트
    this.rankService.processEvent({ playerId: changeBombUserList[1], eventType: this.rankService.BOMB })
    this.geckosIoService.io.emit("changeBombUser", changeBombUserList);
  }

  @OnEvent('bombGame.winner')
  handleBombGameWinner(winner: string[]) {
    let timeCount = 1;
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
      this.geckosIoService.io.emit("gameWinner", result);
      if (bombMaster) timeCount += 1;
      if (punchingBag) timeCount += 1;
    }

    setTimeout(() => {
      this.bombGameStartFlag = 0;
      this.geckosIoService.io.emit("playingGame", this.bombGameStartFlag);
    }, this.CHECK_INTERVAL * timeCount);
  }

  @OnEvent('bombGame.newItems')
  makeNewItem(itemDotList) {
    if (itemDotList.length === 0) return;
    this.logger.log(`새로 생성된 아이템 ==> ${JSON.stringify(itemDotList)}`);
    this.geckosIoService.io.emit('newItems', itemDotList);
  }

  @OnEvent('bombGame.itemPickedUp')
  itemPickedUp(item) {
    this.logger.log(`먹은 아이템 ==> ${JSON.stringify(item)}`);
    this.geckosIoService.io.emit('itemPickedUp', item);
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
          this.geckosIoService.io.emit("bombGameReady", countdown);
          if (!this.isBombGameStart()) {
            this.geckosIoService.io.emit("bombGameReady", -1);
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
              this.geckosIoService.io.emit("bombGameReady", -1);
            }
            resolve(); // Resolve the Promise here
          }
        }, 1000);
      });
    }
  }

  private isBombGameStart(): boolean {
    if (
      this.statusService.getBombGamePlayerMap().size >=
        this.MIN_PLAYERS_FOR_BOMB_GAME &&
      !this.bombGameStartFlag
    ) {
      return true;
    }
    return false;
  }

  private changeRoom(channel:any) {
    if(channel._roomId === this.WAITING_ROOM) {
      this.logger.log(` 대기방에서 나간 플레이어 입니다 ${channel.id}`);
      channel.broadcast.emit('leavedRoom', channel.id);
      channel.leave()
      channel.join(this.PLAY_ROOM)
      const x = Math.floor(Math.random() * (1760 - 960 + 1)) + 960;
      const y = Math.floor(Math.random() * (640 - 320 + 1)) + 320;
      const player =this.waitingService.getWaitingRoomPosition(channel.id)
      this.waitingService.disconnectUser(channel.id);

      this.statusService.bombGameRoomPosition.set(channel.id, {
        x,
        y,
        avatar: player.avatar,
        nickname: player.nickname,
        isStun: 0,
        isPlay: 0,
        isDead: 0,
      });

      channel.broadcast.emit("newPlayer", {
        playerId: channel.id,
        x,
        y,
        avatar: player.avatar,
        nickname: player.nickname,
        isPlay: 0
      });
      channel.emit('currentPlayers', Object.fromEntries(this.statusService.bombGameRoomPosition),);
      channel.emit("gamestatus", this.bombGameStartFlag);
      return
    }
    if(channel._roomId === this.PLAY_ROOM) {
      this.logger.log(` 게임방에서 나간 플레이어 입니다 ${channel.id}`);
      channel.broadcast.emit('leavedRoom', channel.id);
      channel.leave()
      channel.join(this.WAITING_ROOM)
      const player = this.statusService.bombGameRoomPosition.get(channel.id);
      const dot = this.getRandomWaitingRoomPosition()
      this.waitingService.setWaitingRoomPosition(channel.id,dot.x,dot.y,player.avatar,player.nickname)
      this.statusService.disconnectBombUser(channel.id);
      /** TODD
       * 대기방에서 나간 플레이어를 룸전체한테 뿌려주는게필요
       */
      channel.broadcast.emit("newPlayer", {
        playerId: channel.id,
        x:dot.x,
        y:dot.y,
        avatar: player.avatar,
        nickname: player.nickname,
      });
      channel.emit('currentPlayers',this.waitingService.getAllWaitingRoomUser());
      return
    }
  }
  private getRandomWaitingRoomPosition() {
    const xRanges = [
      { min: 320, max: 639 },
      { min: 1601, max: 1920 }
    ];

    const yRanges = [
      { min: 384, max: 575 },
      { min: 961, max: 1280 }
    ];

    const xRange = xRanges[Math.floor(Math.random() * xRanges.length)];
    const yRange = yRanges[Math.floor(Math.random() * yRanges.length)];

    const x = Math.floor(Math.random() * (xRange.max - xRange.min + 1)) + xRange.min;
    const y = Math.floor(Math.random() * (yRange.max - yRange.min + 1)) + yRange.min;

    return { x, y };
  }
}
