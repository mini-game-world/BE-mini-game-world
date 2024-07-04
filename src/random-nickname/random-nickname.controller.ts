import { Controller, Get, UseFilters } from '@nestjs/common';
import { RandomNicknameService } from './random-nickname.service.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';

@Controller('random-nickname')
export class RandomNicknameController {
  constructor(private readonly appService: RandomNicknameService) {}

  @Get('random-nickname')
  @UseFilters(HttpExceptionFilter)
  async getRandomNickname() {
    const nickname: string = await this.appService.getRandomNickname();
    return { nickname };
  }
}
