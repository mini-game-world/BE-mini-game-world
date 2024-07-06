import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WaitingService {
  constructor(
    private eventEmitter: EventEmitter2,
  ) {}

  private logger: Logger = new Logger('WaitingService');

  private waitingRoomPosition: Map<string, { x: number, y: number, avatar: number, nickname: string, }> = new Map();

  setWaitingRoomPosition(socketID:string,x:number, y:number,avatar:number,nickname:string) {
    this.waitingRoomPosition.set(socketID,{ x:x,y:y,avatar:avatar,nickname:nickname});
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
    return Object.fromEntries(this.waitingRoomPosition);
  }
  getWaitingRoomPositionSize(){
    return this.waitingRoomPosition.size;
  }

  disconnectUser(socketID: string) {
    this.waitingRoomPosition.delete(socketID);
  }
}
