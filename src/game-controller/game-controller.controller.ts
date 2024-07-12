import { Controller, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { StatusGateway } from '../status/status.gateway.js';
import { ResponseDTO } from '../common/response.DTO.js';
import { Request } from 'express';

@Controller('game-controller')
export class GameControllerController {
  private logger: Logger = new Logger("GameController");

  constructor(private  readonly statusGateway: StatusGateway) {
  }

  @Post('off')
  async manualGameStartOn(@Req() request: Request){
    const apiKey = request.headers['start-api-key'];
    if (apiKey !== process.env.GAME_START_TIMING_ADJUSTMENT_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }

    this.logger.log('게임 자동시작 정지');

    this.statusGateway.manualGameStartOn()

   return  ResponseDTO.builder()
      .setSuccess(true)
      .setData(' 자동 게임시작 일시정지 ')
      .build()
  }

  @Post('on')
  async manualGameStartOff(@Req() request: Request){
    const apiKey = request.headers['start-api-key'];
    if (apiKey !== process.env.GAME_START_TIMING_ADJUSTMENT_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }

    this.logger.log('게임 자동시작');

    this.statusGateway.manualGameStartOff()

   return   ResponseDTO.builder()
      .setSuccess(true)
      .setData(' 자동 게임시작 ')
      .build()
  }
}
