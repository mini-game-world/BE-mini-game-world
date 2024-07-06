import { SetWaitingRoomPositionDTO } from '../status.DTO.js';
import { flatMap } from 'rxjs';

export class SetWaitingRoomPositionBuilder {
  private readonly setWaitingRoomPositionDTO: SetWaitingRoomPositionDTO;
  private isPlayerId: boolean = false;
  private isX: boolean = false;
  private isY: boolean = false;
  private isAvatar: boolean = false;
  private isNickname: boolean = false;

  constructor() {
    this.setWaitingRoomPositionDTO = new SetWaitingRoomPositionDTO();
  }

  setPlayerId(socketId: string): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.playerId = socketId;
    this.isPlayerId = true;
    return this;
  }

  setAvatar(number: number): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.avatar = number;
    this.isAvatar = true;
    return this;
  }

  setXDot(xdot: number): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.x = xdot;
    this.isX=true;
    return this;
  }

  setYDot(ydot: number): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.y = ydot;
    this.isY=true;
    return this;
  }

  setNickname(nickname: string): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.nickname = nickname;
    this.isNickname = true;
    return this;
  }

  build(): SetWaitingRoomPositionDTO {
    if ( !this.isPlayerId || !this.isX || !this.isY || !this.isAvatar || !this.isNickname) {
      throw new Error('All fields are required');
    }
    return this.setWaitingRoomPositionDTO;
  }
}
