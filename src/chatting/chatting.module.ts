import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChattingService } from './chatting.service';
import { ChattingRepository } from './chatting.repository';
import { ChattingGateway } from './chatting.gateway';
import { BadWord, BadWordSchema } from './schema/badWord.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BadWord.name, schema: BadWordSchema }]),
  ],
  providers: [ChattingService, ChattingRepository, ChattingGateway],
  exports: [ChattingService],
})
export class ChattingModule {}
