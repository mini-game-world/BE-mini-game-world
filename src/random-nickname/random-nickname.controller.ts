import { Controller, Get, UseFilters } from '@nestjs/common';
import { RandomNicknameService } from './random-nickname.service';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';

@Controller('random-nickname')
export class RandomNicknameController {
  constructor(private readonly appService: RandomNicknameService) {}

  @Get('random-nickname')
  @UseFilters(HttpExceptionFilter)
  async getRandomNickname() {
    const nickname:string = await this.appService.getRandomNickname();
    return { nickname };
  }
}
