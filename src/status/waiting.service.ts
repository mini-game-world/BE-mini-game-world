import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SetWaitingRoomPositionDTO } from '../status/DTO/status.DTO.js'

@Injectable()
export class WaitingService {
  constructor(
    private eventEmitter: EventEmitter2,
  ) {}

  private logger: Logger = new Logger('WaitingService');

  private waitingRoomPosition: Map<string, { x: number, y: number, avatar: number, nickname: string }> = new Map();

  setWaitingRoomPosition(user:SetWaitingRoomPositionDTO) {
    this.waitingRoomPosition.set(user.playerId,{ x:user.x,y:user.y,avatar:user.avatar,nickname:user.nickname});
  }

  setWaitingRoomMove(socketID:string,x:number, y:number){
    const status = this.waitingRoomPosition.get(socketID);
    status.x = x;
    status.y = y;
    this.waitingRoomPosition.set(socketID, status);
  }

  getWaitingRoomPosition(socketID: string) {
    return this.waitingRoomPosition.get(socketID);
  }

  getAllWaitingRoomUser() {
    return Object.fromEntries(
      Array.from(this.waitingRoomPosition.entries()).map(([key, value]) => [key, { ...value, room: 'wait' }])
    );
  }
  getWaitingRoomPositionSize(){
    return this.waitingRoomPosition.size;
  }

  disconnectUser(socketID: string) {
    this.waitingRoomPosition.delete(socketID);
  }
}
