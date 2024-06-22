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
import { playerAttackPositionDTO, playerJoinRoomDTO, playerMovementDTO } from "./DTO/status.DTO";

@WebSocketGateway({ cors: { origin: "*" } })
export class statusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private CHECK_INTERVAL = 5000; // 5초 간격으로 체크
  private MIN_PLAYERS_FOR_BOMB_GAME = 4; // 최소 플레이어 수, 예시로 4명 설정
  constructor(private readonly statusService: StatusBombGameService) {
    setInterval(this.checkBombRooms.bind(this), this.CHECK_INTERVAL);
  }

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger("Status-Gateway");


  private HITRADIUS = 40;

  private STUN_DURATION_MS: number = 1000;
  private PLAYING_ROOM: number[] = [0, 0, 0];
  private bombGameStartFlag = true;
  private generator = new RandomNumberGenerator(1, 5);

  @SubscribeMessage("playerMovement")
  playerPosition(client: Socket, data: playerMovementDTO): void {
    const avatar = this.statusService.bombGameRoomPosition.get(client.id).avatar;
    this.statusService.bombGameRoomPosition.set(client.id, { x: data.x, y: data.y, avatar, isStun: 0 });
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
  handleConnection(client: any, ...args: any[]): any {
    const x = Math.floor(Math.random() * 700) + 50;
    const y = Math.floor(Math.random() * 500) + 50;
    const randomNum = this.generator.getRandomNumber();
    this.statusService.bombGameRoomPosition.set(client.id, { x, y, avatar: randomNum, isStun: 0 });

    // this.server.to(room).emit("nickname", { [client.id]: "bestplayer" });
    client.broadcast.emit("newPlayer", {
      playerId: client.id,
      x,
      y,
      avatar: randomNum
    });

    const allClientsInRoom = {};

    this.statusService.bombGameRoomPosition.forEach((value, key) => {
      const newPlayer = {
        playerId: key,
        x: value.x,
        y: value.y,
        avatar: value.avatar
      };
      allClientsInRoom[key] = newPlayer;
    });

    client.emit("currentPlayers", allClientsInRoom);
    client.emit("playingGame", this.PLAYING_ROOM);

    this.logger.log(`Client connected: ${client.id}`);
    this.logger.log(`Client ${client.id} joined`);
    this.logger.log(`Number of connected clients: ${Object.keys(allClientsInRoom).length}`);
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
    this.PLAYING_ROOM[0] = 1;
    this.bombGameStartFlag = false;
    this.server.emit("playingGame", this.PLAYING_ROOM);
    this.server.emit("bombGameStart", 1);
    this.statusService.startBombGameWithTimer();
  }

  @OnEvent("bombGame.start")
  handleBombGameStart(playGameUserList: string[], bombUserList: string[]) {
    this.server.emit("startBombGame", playGameUserList);
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
    this.logger.log(`바뀐 폭탄멤버는 ${bombUserList}`);
    this.server.emit("bombUsers", bombUserList);
  }

  @OnEvent("bombGame.winner")
  handleBombGameWinner(winner: string[]) {
    this.server.emit("gameWinner", winner);
    this.bombGameStartFlag = true;
    this.PLAYING_ROOM[0] = 0;
    this.server.emit("playingGame", this.PLAYING_ROOM);
  }

  private checkBombRooms() {
    // 방에 n 명 이상 존재시 게임시작 신호를 보내줘야해~
    if (this.isBombGameStart()) {
      this.server.emit("bombGameReady", 1);
      setTimeout(() => {
        if (this.isBombGameStart()) {
          this.bombGameStart();
        }
      }, 5000);
    }
  }

  private isBombGameStart(): boolean {
    if (this.statusService.getBombGamePlayerMap().size > this.MIN_PLAYERS_FOR_BOMB_GAME && this.bombGameStartFlag) {
      return true;
    }
    return false;
  }
}
