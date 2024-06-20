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

import { OnEvent } from "@nestjs/event-emitter";
import { playerAttackPositionDTO, playerJoinRoomDTO, playerMovementDTO } from "./DTO/status.DTO";

@WebSocketGateway({ cors: { origin: "*" } })
export class statusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly statusService: StatusBombGameService) {
  }

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger("Status-Gateway");

  private MIN_PLAYERS_FOR_BOMB_GAME: number = 3;

  private HITRADIUS = 40;

  private STUN_DURATION_MS: number = 1000;
  private PLAYING_ROOM: number[] = [0, 0, 0];
  private bombGameStartFlag = true;

  private clientsPosition: Map<string, { room: string, x: string, y: string, isStun: number }> = new Map();

  @SubscribeMessage("joinRoom")
  handleJoinRoom(client: Socket, data: playerJoinRoomDTO): void {
    // 클라이언트가 기존에 속해있던 방에서 떠납니다.
    const clientData = this.clientsPosition.get(client.id);
    if (clientData) {
      const oldRoom = clientData.room;
      client.leave(oldRoom);
      client.to(oldRoom).emit("playerLeft", { playerId: client.id });
      this.logger.log(`Client ${client.id} left room ${oldRoom}`);
    }

    // 새로운 방에 조인합니다.
    const room = data.room;
    client.join(room);
    this.clientsPosition.set(client.id, { room, x: data.x, y: data.y, isStun: 0 });
    this.statusService.setBombGamePlayerRoomPosition(client.id, { room, x: data.x, y: data.y, isStun: 0 });

    client.to(room).emit("newPlayer", {
      playerId: client.id,
      x: data.x,
      y: data.y
    });
    const allClientsInRoom = Array.from(this.clientsPosition.entries())
      .filter(([_, pos]) => pos.room === room)
      .map(([playerId, pos]) => ({ playerId, x: pos.x, y: pos.y }));

    client.emit("currentPlayers", allClientsInRoom);
    client.emit("playingGame", this.PLAYING_ROOM);
    client.emit("startBombGame", this.statusService.getPlayGameUserList());

    this.logger.log(`Client ${client.id} joined room ${room}`);
    this.logger.log(`Number of connected clients in room ${room}: ${allClientsInRoom.length}`);

    // 방에 n 명 이상 존재시 게임시작 신호를 보내줘야해~
    if (this.clientsPosition.size > this.MIN_PLAYERS_FOR_BOMB_GAME && this.bombGameStartFlag) {
      setTimeout(() => {
        // 다시 조건을 체크
        if (!(this.clientsPosition.size > this.MIN_PLAYERS_FOR_BOMB_GAME && this.bombGameStartFlag)) {
          return; // 조건이 만족되지 않으면 return
        }
        this.bombGameStart(room); // 조건이 만족되면 게임 시작
      }, 5000); // 5초 후에 실행
    }
  }


  @SubscribeMessage("playerMovement")
  playerPosition(client: Socket, data: playerMovementDTO): void {
    const clientData = this.clientsPosition.get(client.id);
    if (clientData) {
      const room = clientData.room;

      /**
       * todo : room 종류에 따라서 포지션 업데이트를 해야함
       */
      this.clientsPosition.set(client.id, { room, x: data.x, y: data.y, isStun: 0 });
      this.statusService.setBombGamePlayerRoomPosition(client.id, { room, x: data.x, y: data.y, isStun: 0 });

      client.to(room).emit("playerMoved", { playerId: client.id, x: data.x, y: data.y });
      // this.logger.log(`player : ${client.id}, x : ${data.x}, y : ${data.y}`);

      // bombUserList가 비어 있으면 로직을 실행하지 않음
      if (this.statusService.getBombUserList().length === 0) {
        return;
      }
      if (this.statusService.checkIsPlayer(client.id)) {
        return;
      }

      this.statusService.checkOverlappingUser(client.id, data.x, data.y)
    }
  }

  @SubscribeMessage("attackPosition")
  handleAttackPosition(client: Socket, data: playerAttackPositionDTO): void {
    const clientData = this.clientsPosition.get(client.id);
    if (!clientData) {
      this.logger.warn(`Client ${client.id} sent attack position but is not in any room`);
      return;
    }

    // isStun이 1이면 return
    if (clientData.isStun === 1) {
      this.logger.warn(`Client ${client.id} is stunned and cannot attack`);
      return;
    }

    const room = clientData.room;
    const logMessage = `attackPosition [${client.id}] x: ${data.x}, y: ${data.y} in room ${room}`;
    this.logger.log(logMessage);
    const attackPosition = { x: parseFloat(data.x), y: parseFloat(data.y) };

    this.logger.log(`Client ${client.id} attacked position x: ${attackPosition.x}, y: ${attackPosition.y} in room ${room}`);

    // 같은 방의 다른 클라이언트들의 위치와 비교하여 히트된 유저들의 아이디만 추출
    const hitResults = Array.from(this.clientsPosition.entries())
      .filter(([playerId, pos]) => pos.room === room && playerId !== client.id)
      .filter(([_, pos]) => {
        const playerPosition = { x: parseFloat(pos.x), y: parseFloat(pos.y) };
        const distance = Math.sqrt(Math.pow(attackPosition.x - playerPosition.x, 2) + Math.pow(attackPosition.y - playerPosition.y, 2));
        return distance <= this.HITRADIUS;
      })
      .filter(([playerId]) => {
        // Check if the player is not stunned
        const playerData = this.clientsPosition.get(playerId);
        return playerData && playerData.isStun !== 1;
      })
      .map(([playerId]) => playerId);

    // 히트된 유저들에게 개별적으로 히트 여부 알림
    hitResults.forEach(async (playerId) => {
      const targetClient = this.server.sockets.sockets.get(playerId);
      if (targetClient) {
        targetClient.emit("attacked", 1);

        // 유저의 isStun을 1초간 1로 바꿨다가 다시 0으로 바꾸는 비동기 코드
        const clientPosition = this.clientsPosition.get(playerId);
        if (clientPosition) {
          clientPosition.isStun = 1;
          this.clientsPosition.set(playerId, clientPosition);

          // 1초 후에 isStun을 0으로 변경
          await new Promise(resolve => setTimeout(resolve, this.STUN_DURATION_MS));

          clientPosition.isStun = 0;
          this.clientsPosition.set(playerId, clientPosition);
        }
      }
    });

    // 히트 결과를 해당 룸의 모든 클라이언트에게 알림
    this.server.to(room).emit("attackedPlayers", hitResults);

    // 공격중인 유저를 모두에게 전파(화면에 공격중인것을 표시하기 위해)
    client.to(room).emit("attackPlayer", client.id);

    this.logger.log(`Attack results: ${JSON.stringify(hitResults)}`);
  }

  afterInit(server: any): any {
    this.logger.log("Init");
  }

  //연결이 되었다면.. 뭔가 행위를 할 수있다 .~!
  handleConnection(client: any, ...args: any[]): any {
    this.logger.log(`Client connected: ${client.id}`);
    const randomNumber = Math.floor(Math.random() * (30)) + 1
    client.emit("playerNum", randomNumber);
  }

  handleDisconnect(client: any): any {
    this.clientsPosition.delete(client.id);
    this.statusService.disconnectPlayUser(client.id);

    const size = this.clientsPosition.size;
    client.broadcast.emit("disconnected", client.id);

    this.logger.log(`Client disconnected: ${client.id}`);
    this.logger.log(`Number of connected clients: ${size}`);
  }

  bombGameStart(room: string) {

    this.PLAYING_ROOM[0] = 1;
    this.bombGameStartFlag = false;
    this.server.emit("playingGame", this.PLAYING_ROOM);
    this.statusService.startBombGameWithTimer(room);
  }

  @OnEvent("bombGame.start")
  handleBombGameStart(room: string, playGameUserList: string[], bombUserList: string[]) {
    this.server.to(room).emit("startBombGame", playGameUserList);
    this.server.to(room).emit("bombUsers", bombUserList);
  }

  @OnEvent("bombGame.timer")
  handleBombGameTimer(room: string, remainingTime: number) {
    this.server.to(room).emit("bombTimer", { remainingTime });
  }

  @OnEvent("bombGame.deadUsers")
  handleBombGameDeadUsers(room: string, bombUserList: string[]) {
    this.server.to(room).emit("deadUsers", bombUserList);
  }

  @OnEvent("bombGame.newBombUsers")
  handleBombGameNewBombUsers(room: string, bombUserList: string[]) {
    this.server.to(room).emit("bombUsers", bombUserList);
  }

  @OnEvent("bombGame.winner")
  handleBombGameWinner(room: string, winner: string[]) {
    this.server.to(room).emit("gameWinner", winner);
    this.bombGameStartFlag = true;
    this.PLAYING_ROOM[0] = 0;
    this.server.emit("playingGame", this.PLAYING_ROOM);
  }

}
