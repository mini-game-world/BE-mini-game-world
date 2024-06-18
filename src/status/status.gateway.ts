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

@WebSocketGateway({ cors: { origin: "*" } })
export class statusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly statusService: StatusBombGameService) {
  }

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger("Status-Gateway");

  private MIN_PLAYERS_FOR_BOMB_GAME: number = 3;
  private BOMB_TIME: number = 30;
  private BOMB_RADIUS: number = 40;
  private gameStartFlag: boolean = true;

  private bombUserList: string[];
  private clientsPosition: Map<string, { room: string, x: string, y: string }> = new Map();

  @SubscribeMessage("joinRoom")
  handleJoinRoom(client: Socket, data: { room: string, x: string, y: string }): void {
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
    this.clientsPosition.set(client.id, { room, x: data.x, y: data.y });

    client.to(room).emit("newPlayer", {
      playerId: client.id,
      x: data.x,
      y: data.y
    });

    const allClientsInRoom = Array.from(this.clientsPosition.entries())
      .filter(([_, pos]) => pos.room === room)
      .map(([playerId, pos]) => ({ playerId, x: pos.x, y: pos.y }));

    client.emit("currentPlayers", allClientsInRoom);

    this.logger.log(`Client ${client.id} joined room ${room}`);
    this.logger.log(`Number of connected clients in room ${room}: ${allClientsInRoom.length}`);

    // 방에 n 명 이상 존재시 게임시작 신호를 보내줘야해~
    if (this.clientsPosition.size > this.MIN_PLAYERS_FOR_BOMB_GAME && this.gameStartFlag) {
      this.bombGameStart(room);
    }
  }


  @SubscribeMessage("playerMovement")
  playerPosition(client: Socket, data: { x: string; y: string }): void {
    const clientData = this.clientsPosition.get(client.id);
    if (clientData) {
      const room = clientData.room;
      this.clientsPosition.set(client.id, { room, x: data.x, y: data.y });

      client.to(room).emit("playerMoved", { playerId: client.id, x: data.x, y: data.y });

      if (this.bombUserList.length === 0) {
        return; // bombUserList가 비어 있으면 로직을 실행하지 않음
      }

      const playUserList = this.statusService.getPlayGameUserMap();
      let updated = false;

      // 일시적으로 술래 상태에서 제외된 유저들을 저장하는 Set
      const temporarilyExcludedUsers = new Set<string>();

      const updatedBombUserList = this.bombUserList.map(bombUserId => {
        const bombUserPosition = this.clientsPosition.get(bombUserId);
        if (bombUserPosition) {
          const overlappingUser = Array.from(this.clientsPosition.entries()).find(([userId, position]) => {
            if (userId !== bombUserId && position.room === bombUserPosition.room) {
              const distance = Math.sqrt(Math.pow(parseFloat(bombUserPosition.x) - parseFloat(position.x), 2) + Math.pow(parseFloat(bombUserPosition.y) - parseFloat(position.y), 2));
              return distance <= this.BOMB_RADIUS;
            }
            return false;
          });
          if (overlappingUser) {
            // Replace the overlapping bomb user with a non-overlapping user from playUserList
            const nonOverlappingUser = Array.from(this.clientsPosition.keys()).find(
              userId => !this.bombUserList.includes(userId) && userId !== overlappingUser[0] && playUserList.has(userId) && !temporarilyExcludedUsers.has(userId)
            );
            if (nonOverlappingUser) {
              updated = true;
              // 새롭게 술래가 된 유저를 일정 시간 동안 술래 상태에서 제외
              temporarilyExcludedUsers.add(nonOverlappingUser);
              setTimeout(() => {
                temporarilyExcludedUsers.delete(nonOverlappingUser);
              }, 1000); // 1초 동안 술래 상태를 유지
              return nonOverlappingUser;
            }
          }
        }
        return bombUserId;
      });

      if (updated) {
        this.bombUserList = updatedBombUserList;
        this.logger.debug(`Updated bombUserList: ${this.bombUserList}`);
        this.server.to(room).emit("bombUsers", this.bombUserList);
      }
    }
  }


  afterInit(server: any): any {
    this.logger.log("Init");
  }

  //연결이 되었다면.. 뭔가 행위를 할 수있다 .~!
  handleConnection(client: any, ...args: any[]): any {
    this.logger.log(`Client connected: ${client.id}`);
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
    this.gameStartFlag = false;

    this.statusService.setPlayGameUser(this.clientsPosition)


    const playGameuserList = this.statusService.getPlayGameUserList();
    this.logger.log(`Bomb game started in room ${room}  and usrlist ${playGameuserList}`);
    this.server.to(room).emit("startBombGame", playGameuserList);

    this.bombUserList =  this.statusService.getBombUsers();
    this.server.to(room).emit("bombUsers", this.bombUserList);

    let remainingTime = this.BOMB_TIME; // 10초 타이머
    const timerInterval = setInterval(() => {
      remainingTime -= 1;
      this.server.to(room).emit("bombTimer", { remainingTime });

      this.logger.debug(`bombTimer ${remainingTime}`)

      if (remainingTime <= 0) {
        this.server.to(room).emit("bombTimer", { remainingTime });
        /**
         * 1. 폭탄리스트에 포함되어있는 유저 플레이 상태에서 제외
         * 2. 남은 유저들 중에서 새로운 폭탄 리스트를 보내줘야함.
         */
        this.statusService.deleteBombUserInPlayUserList(this.bombUserList);
        const newBombUser = this.statusService.getNewBombUsers();

        this.logger.debug(`newBombUser ${newBombUser}`)
        this.server.to(room).emit("bombUsers", newBombUser);

        const checkWinner = this.statusService.checkWinner();
        if (checkWinner) {
          this.logger.debug(`checkWinner ${checkWinner}`)
          this.server.to(room).emit("gameWinner", checkWinner);
          this.gameStartFlag = true;
          clearInterval(timerInterval); // 루프 종료
        }
        remainingTime = this.BOMB_TIME; // 타이머를 다시셋
      }
    }, 1000);
  }

}
