import { Injectable } from '@nestjs/common';

@Injectable()
export class StatusBombGameService {
  private playGameUser: Map<string, {x:string,y:string}> = new Map();

  private bombUserList: string[];

  private playUserCount: number;

  setPlayGameUser(playList:Map<string,{ room: string; x: string; y: string }>) {
    //기존 관리되고 있던 유저 초기화
    this.playGameUser.clear();
    playList.forEach((value, key) => {
      this.playGameUser.set(key, {x:value.x,y:value.y});
    });
    this.playUserCount = this.playGameUser.size;

    const bombUserCount = Math.max(1, Math.floor(this.playUserCount * 0.1));

    const userIds = Array.from(this.playGameUser.keys());

    // Fisher-Yates 셔플 알고리즘으로 배열을 무작위로 섞음
    for (let i = userIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [userIds[i], userIds[j]] = [userIds[j], userIds[i]];
    }
    // 앞에서부터 bombUserCount 만큼 isBomb를 true로 설정
    for (let i = 0; i < bombUserCount; i++) {
      const userId = userIds[i];
      const user = this.playGameUser.get(userId);
      if (user) {
        this.bombUserList.push(userId);
        this.playGameUser.set(userId, user);
      }
    }
    return this.playGameUser;
  }

  getBombUsers(){
    return this.bombUserList;
  }

  getPlayGameUserList(): { [key: string]: { x:string, y:string} } {
    return Object.fromEntries(this.playGameUser);
  }

  deleteBombUserInPlayUserList() {
    this.bombUserList.forEach(userId => {
      this.playGameUser.delete(userId);
    });
  }
}
