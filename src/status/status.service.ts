import { Injectable } from '@nestjs/common';

@Injectable()
export class StatusBombGameService {
  private playGameUser: Map<string, { isBoom: boolean }> = new Map();

  setPlayGameUser(playList:Map<string,{ room: string; x: string; y: string }>){
    //기존 관리되고 있던 유저 초기화
    this.playGameUser.clear();
    playList.forEach((value, key) => {
      this.playGameUser.set(key, { isBoom: false });
    });
  }

}
