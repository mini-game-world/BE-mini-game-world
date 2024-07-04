import { ResponsePickUpItemDTO } from '../status.DTO';

export class ResponsePickUpItemBuilder {
  private readonly responsePickUpItemDTO: ResponsePickUpItemDTO;
  private isPlayerIdSet: boolean = false;
  private isItemNumberSet: boolean = false;
  private isXDotSet: boolean = false;
  private isYDotSet: boolean = false;

  constructor() {
    this.responsePickUpItemDTO = new ResponsePickUpItemDTO();
  }

  setPlayerId(socketId: string): ResponsePickUpItemBuilder {
    this.responsePickUpItemDTO.playerId = socketId;
    this.isPlayerIdSet = true;
    return this;
  }

  setItemNumber(itemNumber: number): ResponsePickUpItemBuilder {
    this.responsePickUpItemDTO.item = itemNumber;
    this.isItemNumberSet = true;
    return this;
  }

  setXDot(xdot: number): ResponsePickUpItemBuilder {
    this.responsePickUpItemDTO.x = xdot;
    this.isXDotSet = true;
    return this;
  }

  setYDot(ydot: number): ResponsePickUpItemBuilder {
    this.responsePickUpItemDTO.y = ydot;
    this.isYDotSet = true;
    return this;
  }

  build(): ResponsePickUpItemDTO {
    if (!this.isPlayerIdSet || !this.isItemNumberSet || !this.isXDotSet || !this.isYDotSet) {
      throw new Error('ResponsePickUpItemDTO 필드를 전부 채워야 합니다.');
    }
    return this.responsePickUpItemDTO;
  }
}
