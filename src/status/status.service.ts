import { Injectable } from "@nestjs/common";

@Injectable()
export class StatusBombGameService {
  private playGameUser: Map<string, { room: string, x: string; y: string }> = new Map();
  private bombUserList: string[] = [];
  private playUserCount: number;
  private BOMB_USER_PERCENT: number = 0.2;

  setPlayGameUser(playList: Map<string, { room: string; x: string; y: string }>) {
    // 기존 관리되고 있던 유저 초기화
    this.playGameUser.clear();
    this.bombUserList = [];
    playList.forEach((value, key) => {
      this.playGameUser.set(key, { room: value.room, x: value.x, y: value.y });
    });
    this.playUserCount = this.playGameUser.size;

    // 랜덤으로 폭탄 유저를 선정
    this.bombUserList = this.selectRandomBombUsers();

    return this.playGameUser;
  }

  getBombUsers() {
    return this.bombUserList;
  }

  getNewBombUsers() {
    this.bombUserList = this.selectRandomBombUsers();
    return this.bombUserList;
  }


  getPlayGameUserList(): { [key: string]: { x: string; y: string } } {
    return Object.fromEntries(this.playGameUser);
  }

  getPlayGameUserMap() {
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

  checkWinner() {
    if (this.playUserCount <= 1) {
      return this.getPlayGameUserList();
    }
    return null;
  }

  private selectRandomBombUsers(): string[] {
    const bombUserCount = Math.max(1, Math.floor(this.playUserCount * this.BOMB_USER_PERCENT));
    const userIds = Array.from(this.playGameUser.keys());

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