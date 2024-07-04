import { ResponsePickUpItemBuilder } from './builder/responsePickUpItemBuilder';

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

