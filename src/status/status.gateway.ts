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

import { playerJoinRoomDTO, playerMovementDTO, playerAttackPositionDTO } from './DTO/status.DTO'

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
  private HITRADIUS = 40;

  private TAG_HOLD_DURATION_MS: number = 1500;
  private TIMER_INTERVAL_MS: number = 1000;
  private STUN_DURATION_MS: number = 1000;
  private PLAYING_ROOM: number[] = [0, 0, 0];


  private bombUserList: Map<string, number> = new Map();
  private clientsPosition: Map<string, { room: string, x: string, y: string, isStun: number }> = new Map();
  // 일시적으로 술래 상태에서 제외된 유저들을 저장하는 Map
  private temporarilyExcludedUsers = new Map<string, NodeJS.Timeout>();
  private playGameuserList: Set<string> = new Set();
  private deadPlayers: string[] = [];


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
    if (this.clientsPosition.size > this.MIN_PLAYERS_FOR_BOMB_GAME && this.gameStartFlag) {
      setTimeout(() => {
        // 다시 조건을 체크
        if (!(this.clientsPosition.size > this.MIN_PLAYERS_FOR_BOMB_GAME && this.gameStartFlag)) {
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


      this.clientsPosition.set(client.id, { room, x: data.x, y: data.y, isStun: 0 });


      client.to(room).emit("playerMoved", { playerId: client.id, x: data.x, y: data.y });

      // bombUserList가 비어 있으면 로직을 실행하지 않음
      if (this.bombUserList.size === 0) {
        return;
      }

      if (!this.playGameuserList.has(client.id)) {
        return;
      }

      const myPosition = { x: parseFloat(data.x), y: parseFloat(data.y) };
      // 이 유저가 폭탄 유저라면
      if (this.bombUserList.has(client.id)) {
        if (this.bombUserList.get(client.id) === 1) {
          return;
        }
        const userWithinRadius = this.statusService.getPlayGameUserList().filter((user) => {
          return !this.bombUserList.has(user) && this.playGameuserList.has(user);
        }).find(user => {
          const player = this.clientsPosition.get(user);
          const playerPosition = { x: parseFloat(player.x), y: parseFloat(player.y) };
          const distance = Math.sqrt(Math.pow(myPosition.x - playerPosition.x, 2) + Math.pow(myPosition.y - playerPosition.y, 2));
          return distance <= this.BOMB_RADIUS
        }
        )
        if (userWithinRadius) {
          this.bombUserList.delete(client.id);
          this.deadPlayers.forEach(userId => {
            this.bombUserList.delete(userId);
          })
          this.bombUserList.set(userWithinRadius, 1);
          this.server.to(room).emit("bombUsers", Array.from(this.bombUserList.keys()));
          this.logger.error(`Updated bombUserList: ${JSON.stringify(Array.from(this.bombUserList.entries()))}`);
          // 1초 뒤에 userWithinRadius의 값을 0으로 설정하는 비동기 작업 수행
          setTimeout(() => {
            this.bombUserList.set(userWithinRadius, 0);
          }, 1000);
        }
      } else { // 폭탄유저가 아니라면
        const userWithinRadius = this.statusService.getPlayGameUserList().filter((user) => {
          return this.bombUserList.has(user) && this.playGameuserList.has(user);
        }).find(user => {
          const player = this.clientsPosition.get(user);
          const playerPosition = { x: parseFloat(player.x), y: parseFloat(player.y) };
          const distance = Math.sqrt(Math.pow(myPosition.x - playerPosition.x, 2) + Math.pow(myPosition.y - playerPosition.y, 2));
          return distance <= this.BOMB_RADIUS && this.bombUserList.get(user) === 0
        }
        )
        if (userWithinRadius) {
          console.log(userWithinRadius);
          this.bombUserList.delete(userWithinRadius);
          this.deadPlayers.forEach(userId => {
            this.bombUserList.delete(userId);
          })
          this.bombUserList.set(client.id, 1);
          this.server.to(room).emit("bombUsers", Array.from(this.bombUserList.keys()));
          this.logger.fatal(`Updated bombUserList: ${JSON.stringify(Array.from(this.bombUserList.entries()))}`);
          // 1초 뒤에 userWithinRadius의 값을 0으로 설정하는 비동기 작업 수행
          setTimeout(() => {
            this.bombUserList.set(client.id, 0);
          }, 1000);
        }
      }
    }
  }

  @SubscribeMessage('attackPosition')
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
        targetClient.emit('attacked', 1);

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
    this.server.to(room).emit('attackedPlayers', hitResults);

    // 공격중인 유저를 모두에게 전파(화면에 공격중인것을 표시하기 위해)
    client.to(room).emit('attackPlayer', client.id);

    this.logger.log(`Attack results: ${JSON.stringify(hitResults)}`);
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

    // Initialize an array to store rooms of clients in the specified room
    const clientsInRoom: Set<string> = new Set();

    // Filter clients based on the room
    for (const [client, position] of this.clientsPosition.entries()) {
      if (position.room === room) {
        clientsInRoom.add(client);
      }
    }

    this.statusService.setPlayGameUser(clientsInRoom);


    this.playGameuserList = this.statusService.getPlayGameUserSet();
    this.logger.log(`Bomb game started in room ${room}  and usrlist ${this.statusService.getPlayGameUserList()}`);
    this.server.to(room).emit("startBombGame", this.statusService.getPlayGameUserList());
    this.PLAYING_ROOM[0] = 1
    this.server.emit("playingGame", this.PLAYING_ROOM);

    this.statusService.getBombUsers().forEach(userId => {
      this.bombUserList.set(userId, 0);
    });

    this.server.to(room).emit("bombUsers", Array.from(this.bombUserList.keys()));

    let remainingTime = this.BOMB_TIME; // 타이머
    const timerInterval = setInterval(() => {
      remainingTime -= 1;
      this.server.to(room).emit("bombTimer", { remainingTime });

      this.logger.debug(`bombTimer ${remainingTime}`)

      if (remainingTime <= 0) {
        this.server.to(room).emit("bombTimer", { remainingTime });
        this.server.to(room).emit("deadUsers", Array.from(this.bombUserList.keys())); // 죽은 유저들 보내주기
        /**
         * 1. 폭탄리스트에 포함되어있는 유저 플레이 상태에서 제외
         * 2. 남은 유저들 중에서 새로운 폭탄 리스트를 보내줘야함.
         */
        this.statusService.deleteBombUserInPlayUserList(Array.from(this.bombUserList.keys()));
        Array.from(this.bombUserList.keys()).forEach(userId => {
          this.deadPlayers.push(userId);
        });
        this.bombUserList.clear();
        this.playGameuserList = this.statusService.getPlayGameUserSet();
        this.logger.debug(`current player count ${this.statusService.getPlayGameUserList.length}`);
        const checkWinner = this.statusService.checkWinner();
        if (checkWinner) {
          this.logger.debug(`checkWinner ${JSON.stringify(checkWinner)}`)
          this.server.to(room).emit("gameWinner", checkWinner);
          this.gameStartFlag = true;
          this.PLAYING_ROOM[0] = 0
          this.server.emit("playingGame", this.PLAYING_ROOM);
          clearInterval(timerInterval); // 루프 종료
          return;
        }
        this.statusService.getNewBombUsers().forEach(userId => {
          this.bombUserList.set(userId, 1);
          setTimeout(() => {
            this.bombUserList.set(userId, 0);
          }, 1000);
        });

        this.logger.warn(`newBombUser ${Array.from(this.bombUserList.keys())}`);
        this.server.to(room).emit("bombUsers", Array.from(this.bombUserList.keys()));

        remainingTime = this.BOMB_TIME; // 타이머를 다시셋
      }
    }, this.TIMER_INTERVAL_MS);
  }

}
