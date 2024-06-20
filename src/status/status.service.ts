import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class StatusBombGameService {
  constructor(private eventEmitter: EventEmitter2) {
  }

  // bomb 게임방에 입장유저
  private bombGameRoomPosition: Map<string, { room: string, x: string, y: string, isStun: number }> = new Map();
  // bomb 게임 플레이 유저
  private playGameUser: Set<string> = new Set();
  //
  private deadPlayers: string[] = [];

  // 폭탄들고 있는 유저
  private bombUserList: Map<string, number> = new Map();

  // 일시적 무적유저
  private temporarilyExcludedUsers = new Map<string, NodeJS.Timeout>();
  private playUserCount: number;

  private BOMB_USER_PERCENT: number = 0.2;
  private BOMB_TIME: number = 30;
  private BOMB_RADIUS: number = 40;
  private TAG_HOLD_DURATION_MS: number = 1500;
  private TIMER_INTERVAL_MS: number = 1000;
  private ROOM_NUMBER: string = "0";

  private logger: Logger = new Logger("BombGameService");

  setBombGamePlayerRoomPosition(playId:string, { room, x, y, isStun }) {
    this.bombGameRoomPosition.set(playId, { room: this.ROOM_NUMBER, x: x, y: x, isStun: isStun });
  }

  getPlayGameUserList(): string[] {
    return Array.from(this.playGameUser);
  }

  disconnectPlayUser(deleteUserId: string): void {
    if (this.playGameUser.has(deleteUserId)) {
      this.playGameUser.delete(deleteUserId);
      this.playUserCount = this.playGameUser.size;
    }
  }

  checkOverlappingUser(clientId: string, x: string, y: string){
    const myPosition = { x: parseFloat(x), y: parseFloat(y) };
    // 이 유저가 폭탄 유저라면
    if (this.bombUserList.has(clientId)) {
      if (this.bombUserList.get(clientId) === 1) return;

      const userWithinRadius = this.getPlayGameUserList().filter((user) => {
        return !this.bombUserList.has(user);
      }).find(user => {
          const player = this.bombGameRoomPosition.get(user);
          const playerPosition = { x: parseFloat(player.x), y: parseFloat(player.y) };
          const distance = Math.sqrt(Math.pow(myPosition.x - playerPosition.x, 2) + Math.pow(myPosition.y - playerPosition.y, 2));
          return distance <= this.BOMB_RADIUS;
        }
      );
      if (userWithinRadius) {
        this.bombUserList.delete(clientId);
        this.deadPlayers.forEach(userId => {
          this.bombUserList.delete(userId);
        });
        this.bombUserList.set(userWithinRadius, 1);
        //신호 보내기
        this.eventEmitter.emit("bombGame.newBombUsers", this.ROOM_NUMBER, this.getBombUserList());
        this.logger.error(`Updated bombUserList: ${JSON.stringify(Array.from(this.bombUserList.entries()))}`);
        // 1.5초 뒤에 userWithinRadius의 값을 0으로 설정하는 비동기 작업 수행
        setTimeout(() => {
          this.bombUserList.set(userWithinRadius, 0);
        }, this.TAG_HOLD_DURATION_MS);
      }
    } else { // 폭탄유저가 아니라면
      const userWithinRadius = this.getPlayGameUserList().filter((user) => {
        return this.bombUserList.has(user);
      }).find(user => {
          const player = this.bombGameRoomPosition.get(user);
          const playerPosition = { x: parseFloat(player.x), y: parseFloat(player.y) };
          const distance = Math.sqrt(Math.pow(myPosition.x - playerPosition.x, 2) + Math.pow(myPosition.y - playerPosition.y, 2));
          return distance <= this.BOMB_RADIUS && this.bombUserList.get(user) === 0;
        }
      );
      if (userWithinRadius) {
        this.bombUserList.delete(userWithinRadius);
        this.deadPlayers.forEach(userId => {
          this.bombUserList.delete(userId);
        });
        this.bombUserList.set(clientId, 1);
        this.eventEmitter.emit("bombGame.newBombUsers", this.ROOM_NUMBER, this.getBombUserList());
        this.logger.fatal(`Updated bombUserList: ${JSON.stringify(Array.from(this.bombUserList.entries()))}`);
        // 1초 뒤에 userWithinRadius의 값을 0으로 설정하는 비동기 작업 수행
        setTimeout(() => {
          this.bombUserList.set(clientId, 0);
        }, this.TAG_HOLD_DURATION_MS);
      }
    }
  }

  checkIsPlayer(userId: string) {
    return !this.playGameUser.has(userId);
  }

  startBombGameWithTimer(room: string): void {
    const clientsInRoom: Set<string> = new Set();
    for (const [client, position] of this.bombGameRoomPosition.entries()) {
      if (position.room === room) {
        clientsInRoom.add(client);
      }
    }
    //게임 시작유저 + 폭탄유저 설정
    this.setPlayGameUser(clientsInRoom);

    this.logger.log(`Bomb game started in room ${room} and userlist ${this.getPlayGameUserList()}`);

    this.eventEmitter.emit("bombGame.start", room, this.getPlayGameUserList(), this.getBombUserList());

    let remainingTime = this.BOMB_TIME;
    const timerInterval = setInterval(() => {
      remainingTime -= 1;
      this.eventEmitter.emit("bombGame.timer", room, remainingTime);

      this.logger.debug(`bombTimer ${remainingTime}`);

      if (remainingTime <= 0) {
        this.eventEmitter.emit("bombGame.timer", room, remainingTime);

        const bombUserMapToList: string[] = Array.from(this.bombUserList.keys());

        this.logger.log(`bombUserMapToList ${bombUserMapToList}`);
        this.eventEmitter.emit("bombGame.deadUsers", room, bombUserMapToList);

        this.deleteBombUserInPlayUserList(bombUserMapToList);

        const checkWinner = this.checkWinner();
        if (checkWinner) {
          this.logger.debug(`checkWinner ${JSON.stringify(checkWinner)}`);
          this.eventEmitter.emit("bombGame.winner", room, checkWinner);
          clearInterval(timerInterval);
          return;
        }

        this.bombUserList.clear();
        this.bombUserList = this.getNewBombUsers();

        const newBombUsers: string[] = Array.from(this.bombUserList.keys());

        this.logger.debug(`newBombUser ${newBombUsers}`);

        this.eventEmitter.emit("bombGame.newBombUsers", room, newBombUsers);

        remainingTime = this.BOMB_TIME;
      }
    }, this.TIMER_INTERVAL_MS);
  }

  getBombUserList(): string[] {
    return Array.from(this.bombUserList.keys());
  }

  checkOverlappingUser(): boolean{
    const updatedBombUserList: string[] = [];
    let updated = false;

    this.bombUserList.forEach(bombUserId => {
      const bombUserPosition = this.bombGameRoomPosition.get(bombUserId);
      if (bombUserPosition) {
        const overlappingUser = Array.from(this.bombGameRoomPosition.entries()).find(([userId, position]) => {
          if (userId !== bombUserId && this.bombGameRoomPosition.has(userId) && position.room === bombUserPosition.room && !this.temporarilyExcludedUsers.has(userId)) {
            const distance = Math.sqrt(Math.pow(parseFloat(bombUserPosition.x) - parseFloat(position.x), 2) + Math.pow(parseFloat(bombUserPosition.y) - parseFloat(position.y), 2));
            return distance <= this.BOMB_RADIUS;
          }
          return false;
        });

        if (overlappingUser) {
          updatedBombUserList.push(overlappingUser[0]);
          updated = true;
          // 새롭게 술래가 된 유저를 일정 시간 동안 술래 상태에서 유지
          const timeout = setTimeout(() => {
            this.temporarilyExcludedUsers.delete(overlappingUser[0]);
            this.temporarilyExcludedUsers.delete(bombUserId);
          }, this.TAG_HOLD_DURATION_MS); // 술래 상태를 유지

          this.temporarilyExcludedUsers.set(overlappingUser[0], timeout);
          this.temporarilyExcludedUsers.set(bombUserId, timeout);
        } else {
          updatedBombUserList.push(bombUserId);
        }
      }
    });
    this.bombUserList=updatedBombUserList
    this.logger.debug(`Updated bombUserList: ${this.bombUserList}`);
    return updated
  }

  startBombGameWithTimer(room: string): void {
    const clientsInRoom: Set<string> = new Set();
    for (const [client, position] of this.bombGameRoomPosition.entries()) {
      console.log(position.room,'===========',room)
      if (position.room === room) {
        clientsInRoom.add(client);
      }
    }
    //게임 시작유저 + 폭탄유저 설정
    this.setPlayGameUser(clientsInRoom);

    this.logger.log(`Bomb game started in room ${room} and userlist ${this.getPlayGameUserList()}`);

    this.eventEmitter.emit('bombGame.start', room, this.getPlayGameUserList(), this.getBombUserList());

    let remainingTime = this.BOMB_TIME;
    const timerInterval = setInterval(() => {
      remainingTime -= 1;
      this.eventEmitter.emit('bombGame.timer', room, remainingTime);

      this.logger.debug(`bombTimer ${remainingTime}`);

      if (remainingTime <= 0) {
        this.eventEmitter.emit('bombGame.timer', room, remainingTime);
        this.eventEmitter.emit('bombGame.deadUsers', room, this.bombUserList);

        this.deleteBombUserInPlayUserList(this.bombUserList);
        this.playGameUser =this.getPlayGameUserSet();

        const checkWinner = this.checkWinner();
        if (checkWinner) {
          this.logger.debug(`checkWinner ${JSON.stringify(checkWinner)}`);
          this.eventEmitter.emit('bombGame.winner', room, checkWinner);
          clearInterval(timerInterval);
          return;
        }

        this.bombUserList = this.getNewBombUsers();
        
        this.logger.debug(`newBombUser ${this.bombUserList}`);
        this.eventEmitter.emit('bombGame.newBombUsers', room, this.bombUserList);

        remainingTime = this.BOMB_TIME;
      }
    }, this.TIMER_INTERVAL_MS);
  }

  getBombUserList():string[]{
      return this.bombUserList;
  }

  private selectRandomBombUsers(): string[] {
    const bombUserCount = Math.max(1, Math.floor(this.playUserCount * this.BOMB_USER_PERCENT));
    const userIds = Array.from(this.playGameUser);

    // Fisher-Yates 셔플 알고리즘으로 배열을 무작위로 섞음
    for (let i = userIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [userIds[i], userIds[j]] = [userIds[j], userIds[i]];
    }

    // 폭탄 유저 리스트를 생성
    const bombUsers = [];
    for (let i = 0; i < bombUserCount; i++) {
      bombUsers.push(userIds[i]);
    }
    return bombUsers;
  }

  private setPlayGameUser(playList: Set<string>) {
    // 기존 관리되고 있던 유저 초기화
    this.bombUserList.clear();
    this.playGameUser = playList;
    this.playUserCount = this.playGameUser.size;

    // 랜덤으로 폭탄 유저를 선정
    this.selectRandomBombUsers().forEach(userId => {
      this.bombUserList.set(userId, 0);
    });

    return this.playGameUser;
  }

  private getNewBombUsers(): Map<string, number> {
    this.bombUserList.clear();
    this.selectRandomBombUsers().forEach(userId => {
      this.bombUserList.set(userId, 0);
    });
    return this.bombUserList;
  }

  private deleteBombUserInPlayUserList(bombList: string[]) {
    bombList.forEach(userId => {
      this.playGameUser.delete(userId);
    });
    this.playUserCount = this.playGameUser.size;
  }

  private checkWinner(): string[] {
    if (this.playUserCount <= 1) {
      return this.getPlayGameUserList();
    }
    return null;
  }
}

