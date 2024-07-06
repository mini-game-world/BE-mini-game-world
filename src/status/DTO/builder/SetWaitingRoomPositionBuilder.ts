import { SetWaitingRoomPositionDTO } from '../status.DTO.js';

export class SetWaitingRoomPositionBuilder {
  private readonly setWaitingRoomPositionDTO: SetWaitingRoomPositionDTO;
  private playerId: string;
  private x: number;
  private y: number;
  private avatar: number;
  private nickname: string;

  constructor() {
    this.setWaitingRoomPositionDTO = new SetWaitingRoomPositionDTO();
  }

  setPlayerId(socketId: string): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.playerId = socketId;
    return this;
  }

  setAvatar(number: number): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.avatar = number;
    return this;
  }

  setXDot(xdot: number): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.x = xdot;
    return this;
  }

  setYDot(ydot: number): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.y = ydot;
    return this;
  }

  setNickname(nickname: string): SetWaitingRoomPositionBuilder {
    this.setWaitingRoomPositionDTO.nickname = nickname;
    return this;
  }

  build(): SetWaitingRoomPositionDTO {
    if (!this.playerId || this.x === undefined || this.y === undefined || !this.avatar || !this.nickname) {
      throw new Error('All fields are required');
    }
    return this.setWaitingRoomPositionDTO;
  }
}
