import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChattingService } from './chatting.service';
import { ChattingRepository } from './chatting.repository';
import { ChattingGateway } from './chatting.gateway';
import { BadWord, BadWordSchema } from './schema/badWord.schema';
import { StatusModule } from '../status/status.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BadWord.name, schema: BadWordSchema }]),
    ScheduleModule.forRoot(),
    StatusModule,
  ],
  controllers: [WebhookController],
  providers: [ChattingService, ChattingRepository, ChattingGateway],
  exports: [ChattingService],
})
export class ChattingModule {}
