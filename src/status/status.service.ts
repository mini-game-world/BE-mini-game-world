import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class StatusBombGameService {
  private playGameUser: Set<string> = new Set();
  private bombUserList: string[] = [];
  private playUserCount: number;
  private BOMB_USER_PERCENT: number = 0.2;
  private BOMB_RADIUS: number = 40;
  private TAG_HOLD_DURATION_MS: number = 1500;

  private bombGameRoomPosition: Map<string, { room: string, x: string, y: string, isStun: number }> = new Map();
  private temporarilyExcludedUsers = new Map<string, NodeJS.Timeout>();

  private logger: Logger = new Logger("BombGameService");

  setBombGamePlayerRoomPosition(playId,{room, x, y, isStun}){
    this.bombGameRoomPosition.set(playId,{room:room,x:x,y:x,isStun:isStun})
  }

  setPlayGameUser(playList: Set<string>) {
    // 기존 관리되고 있던 유저 초기화
    this.bombUserList = [];
    this.playGameUser = playList;
    this.playUserCount = this.playGameUser.size;

    // 랜덤으로 폭탄 유저를 선정
    this.bombUserList = this.selectRandomBombUsers();

    return this.playGameUser;
  }
  
  getNewBombUsers(): string[] {
    this.bombUserList = this.selectRandomBombUsers();
    return this.bombUserList;
  }
  
  getPlayGameUserList(): string[] {
    return Array.from(this.playGameUser);
  }

  getPlayGameUserSet(): Set<string> {
    return this.playGameUser;
  }

  deleteBombUserInPlayUserList(newBombList: string[]) {
    newBombList.forEach(userId => {
      this.playGameUser.delete(userId);
    });
    this.playUserCount = this.playGameUser.size;
  }

  disconnectPlayUser(deleteUserId: string): void {
    if (this.playGameUser.has(deleteUserId)) {
      this.playGameUser.delete(deleteUserId);
      this.playUserCount = this.playGameUser.size;
    }
  }

  checkWinner(): string[] {
    if (this.playUserCount <= 1) {
      return this.getPlayGameUserList();
    }
    return null;
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
}