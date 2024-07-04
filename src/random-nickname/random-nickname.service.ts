import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class RandomNicknameService {
  constructor(private readonly httpService: HttpService) {}
  private logger: Logger = new Logger('Random-nicknameService');

  async getRandomNickname(): Promise<string> {
    const response = this.httpService.post(
      'https://www.rivestsoft.com/nickname/getRandomNickname.ajax',
      {
        lang: 'ko',
      },
    );
    const data = await lastValueFrom(response);

    this.logger.log(`RandomNickname  => ${JSON.stringify(data.data.data)}`);

    if (data.data.code === 'true') {
      return data.data.data;
    }
    throw new HttpException(data.data.msg, HttpStatus.BAD_REQUEST);
  }
}
