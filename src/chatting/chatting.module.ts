import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChattingService } from './chatting.service.js';
import { ChattingRepository } from './chatting.repository.js';
import { ChattingGateway } from './chatting.gateway.js';
import { BadWord, BadWordSchema } from './schema/badWord.schema.js';
import { StatusModule } from '../status/status.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookController } from './webhook.controller.js';
import { GeckosIoModule } from '../geckos/geckos.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BadWord.name, schema: BadWordSchema }]),
    ScheduleModule.forRoot(),
    StatusModule,
    GeckosIoModule,
  ],
  controllers: [WebhookController],
  providers: [ChattingService, ChattingRepository, ChattingGateway],
  exports: [ChattingService],
})
export class ChattingModule {}
