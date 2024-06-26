import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";

import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { StatusBombGameService } from "./status.service";
import { RandomNumberGenerator } from './Utils/utils.RandomNumberGenerator'
import { OnEvent } from "@nestjs/event-emitter";
import { playerAttackPositionDTO, playerMovementDTO } from "./DTO/status.DTO";
import { RandomNicknameService } from '../random-nickname/random-nickname.service';

@WebSocketGateway({ cors: { origin: "*" } })
export class statusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private CHECK_INTERVAL = 5000;
  private MIN_PLAYERS_FOR_BOMB_GAME = 3; // 최소 플레이어 수, 예시로 4명 설정
  private isCheckingBombRooms = false; // checkBombRooms 실행 여부를 추적
  constructor(private readonly statusService: StatusBombGameService,
    private readonly randomNicknameService: RandomNicknameService
  ) {
    setInterval(this.safeCheckBombRooms.bind(this), this.CHECK_INTERVAL);
  }

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger("Status-Gateway");


  private HITRADIUS = 50;

  private STUN_DURATION_MS: number = 1000;
  private bombGameStartFlag = 0;
  private generator = new RandomNumberGenerator(1, 30);

  @SubscribeMessage("playerMovement")
  playerPosition(client: Socket, data: playerMovementDTO): void {
    const status = this.statusService.bombGameRoomPosition.get(client.id);

    // x와 y 값만 업데이트
    if (status) {
      status.x = data.x;
      status.y = data.y;

      // 업데이트된 status 객체를 다시 설정
      this.statusService.bombGameRoomPosition.set(client.id, status);
    }
    client.broadcast.emit("playerMoved", { playerId: client.id, x: data.x, y: data.y });

    // bombUserList가 비어 있으면 로직을 실행하지 않음
    if (this.statusService.getBombUserList().length === 0) {
      return;
    }
    if (this.statusService.checkIsPlayer(client.id)) {
      return;
    }
    this.statusService.checkOverlappingUser(client.id, data.x, data.y);
  }

  @SubscribeMessage("attackPosition")
  handleAttackPosition(client: Socket, data: playerAttackPositionDTO): void {
    const clientData = this.statusService.bombGameRoomPosition.get(client.id);
    if (!clientData) {
      this.logger.warn(`Client ${client.id} sent attack position but is not in any room`);
      return;
    }

    // isStun이 1이면 return
    if (clientData.isStun === 1) {
      this.logger.warn(`Client ${client.id} is stunned and cannot attack`);
      return;
    }

    const logMessage = `attackPosition [${client.id}] x: ${data.x}, y: ${data.y}}`;
    this.logger.log(logMessage);

    this.logger.log(`Client ${client.id} attacked position x: ${data.x}, y: ${data.y}`);

    // 같은 방의 다른 클라이언트들의 위치와 비교하여 히트된 유저들의 아이디만 추출
    const hitResults = Array.from(this.statusService.bombGameRoomPosition.entries())
      .filter(([playerId]) => playerId !== client.id)
      .filter(([playerId]) => {
        // Exclude users in bombUserList
        return !this.statusService.getBombUserList().includes(playerId);
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
      const targetClient = this.server.sockets.sockets.get(playerId);
      if (targetClient) {
        // 유저의 isStun을 1초간 1로 바꿨다가 다시 0으로 바꾸는 비동기 코드
        const clientPosition = this.statusService.bombGameRoomPosition.get(playerId);
        if (clientPosition) {
          clientPosition.isStun = 1;
          this.statusService.bombGameRoomPosition.set(playerId, clientPosition);

          // 1초 후에 isStun을 0으로 변경
          await new Promise(resolve => setTimeout(resolve, this.STUN_DURATION_MS));

          clientPosition.isStun = 0;
          this.statusService.bombGameRoomPosition.set(playerId, clientPosition);
        }
      }
    });

    // 히트 결과를 해당 룸의 모든 클라이언트에게 알림
    this.server.emit("attackedPlayers", hitResults);

    // 공격중인 유저를 모두에게 전파(화면에 공격중인것을 표시하기 위해)
    client.broadcast.emit("attackPlayer", client.id);

    this.logger.log(`Attack results: ${JSON.stringify(hitResults)}`);
  }

  afterInit(server: any): any {
    this.logger.log("Init");
  }

  //연결이 되었다면.. 뭔가 행위를 할 수있다 .~!
  async handleConnection(client: any, ...args: any[]) {
    const x = Math.floor(Math.random() * (1760 - 960 + 1)) + 960;
    const y = Math.floor(Math.random() * (640 - 320 + 1)) + 320;
    const randomNum = this.generator.getRandomNumber();
    const randomNickname = await this.randomNicknameService.getRandomNickname();
    this.statusService.bombGameRoomPosition.set(client.id, { x, y, avatar: randomNum, nickname: randomNickname, isStun: 0, isPlay: 0, isDead: 0 });
    console.log(`${JSON.stringify(this.statusService.bombGameRoomPosition.get(client.id))}`)
    // this.server.to(room).emit("nickname", { [client.id]: "bestplayer" });
    client.broadcast.emit("newPlayer", {
      playerId: client.id,
      x,
      y,
      avatar: randomNum,
      nickname: randomNickname,
      isPlay: 0
    });

    const allClientsInRoomObject = Object.fromEntries(this.statusService.bombGameRoomPosition);

    client.emit("currentPlayers", allClientsInRoomObject);
    client.emit("gamestatus", this.bombGameStartFlag);

    this.logger.log(`Client ${client.id} joined`);
    this.logger.log(`Number of connected clients: ${this.statusService.bombGameRoomPosition.size}`);
  }

  handleDisconnect(client: any): any {
    this.generator.restoreNumber(this.statusService.bombGameRoomPosition.get(client.id).avatar);
    this.server.emit("playerDisconnected", client.id);
    this.statusService.disconnectBombUser(client.id);

    this.logger.log(`Client disconnected: ${client.id}`);
    const size = this.statusService.bombGameRoomPosition.size;
    this.logger.log(`Number of connected clients: ${size}`);
  }

  bombGameStart() {
    this.bombGameStartFlag = 1;
    this.server.emit("playingGame", this.bombGameStartFlag);
    this.statusService.startBombGameWithTimer();
  }

  @OnEvent("bombGame.start")
  handleBombGameStart(playGameUserList: string[], bombUserList: string[]) {
    this.server.emit("bombUsers", bombUserList);
  }

  @OnEvent("bombGame.timer")
  handleBombGameTimer(remainingTime: number) {
    this.server.emit("bombTimer", { remainingTime });
  }

  @OnEvent("bombGame.deadUsers")
  handleBombGameDeadUsers(bombUserList: string[]) {
    this.server.emit("deadUsers", bombUserList);
  }

  @OnEvent("bombGame.newBombUsers")
  handleBombGameNewBombUsers(bombUserList: string[]) {
    this.logger.log(`새로운 폭탄멤버는 ${bombUserList}`);
    this.server.emit("bombUsers", bombUserList);
  }

  @OnEvent("bombGame.changeBombUser")
  handleBombGameChangeBombUsers(changeBombUserList: string[]) {
    this.logger.log(`${changeBombUserList[1]}에서 ${changeBombUserList[0]}으로 폭탄이 옮겨졌습니다.`);
    this.server.emit("changeBombUser", changeBombUserList);
  }

  @OnEvent("bombGame.winner")
  handleBombGameWinner(winner: string[]) {
    if (winner) this.server.emit("gameWinner", winner[0]);
    setTimeout(() => {
      this.bombGameStartFlag = 0;
      this.server.emit("playingGame", this.bombGameStartFlag);
    }, 5000);
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
          this.server.emit("bombGameReady", countdown);
          if (!this.isBombGameStart()) {
            this.server.emit("bombGameReady", -1);
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
              this.server.emit("bombGameReady", -1);
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
