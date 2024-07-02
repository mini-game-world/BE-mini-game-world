import {
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ChattingService } from './chatting.service';
import * as dotenv from 'dotenv';

dotenv.config();

@Controller('webhooks')
export class WebhookController {
  private readonly logger: Logger = new Logger('[Chatting]webhooks controller');
  constructor(private readonly chattingService: ChattingService) {}

  @Post('trigger')
  handleTrigger(@Req() request: Request): void {
    // 헤더에 담긴값 확인.!
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== process.env.MY_CHATTING_WEBHOOK_API_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }

    this.logger.log(`Received trigger even by new word ${JSON.stringify(request.body.fullDocument.word)}`);

    this.chattingService.scheduleForbiddenWordUpdate();
  }
}
