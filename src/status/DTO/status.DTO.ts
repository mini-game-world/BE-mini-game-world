import { ResponsePickUpItemBuilder } from './builder/responsePickUpItemBuilder.js';
import { SetWaitingRoomPositionBuilder } from './builder/SetWaitingRoomPositionBuilder.js';

export class playerJoinRoomDTO {
  room: string;

  x: number;

  y: number;
}

export class playerMovementDTO {
  x: number;

  y: number;
}

export class playerAttackPositionDTO {
  x: number;

  y: number;
}

export class ResponsePickUpItemDTO {
  playerId: string;
  item: number;
  x: number;
  y: number;
  static builder() {
    return new ResponsePickUpItemBuilder();
  }
}


export class SetWaitingRoomPositionDTO {
  playerId: string;
  x:number;
  y:number;
  avatar:number;
  nickname: string;
  static builder() {
    return new SetWaitingRoomPositionBuilder();
  }
}